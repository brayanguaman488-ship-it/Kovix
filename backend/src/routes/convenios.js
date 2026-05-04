import { Router } from "express";
import prismaPackage from "@prisma/client";

import { asyncHandler } from "../lib/asyncHandler.js";
import { isPrismaUniqueConstraintError, sendBadRequest, sendNotFound } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import {
  asOptionalTrimmedString,
  asTrimmedString,
  parseDate,
  parsePositiveAmount,
} from "../lib/validation.js";
import authMiddleware from "../middleware/auth.js";

const router = Router();
const { PaymentStatus } = prismaPackage;

function normalizeRole(role) {
  return String(role || "").trim().toUpperCase();
}

function isAdmin(role) {
  return normalizeRole(role) === "ADMIN";
}

function resolveConvenioPaymentStatus(payment) {
  const status = String(payment?.status || "").toUpperCase();
  if (status !== PaymentStatus.PENDIENTE) return status;

  const dueDate = new Date(payment?.dueDate);
  if (Number.isNaN(dueDate.getTime())) return status;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return dueDate < todayStart ? PaymentStatus.VENCIDO : PaymentStatus.PENDIENTE;
}

async function userCanAccessConvenios(req) {
  if (isAdmin(req.user?.role)) return true;

  const access = await prisma.convenioAccess.findUnique({
    where: { userId: req.user.id },
    select: { enabled: true },
  });

  return Boolean(access?.enabled);
}

async function ensureConvenioAccess(req, res) {
  const allowed = await userCanAccessConvenios(req);
  if (!allowed) {
    res.status(403).json({ ok: false, message: "No tienes acceso a Convenios" });
    return false;
  }
  return true;
}

function convenioOwnerWhere(req, ownerUserId = "") {
  const requestedOwner = String(ownerUserId || "").trim();
  if (isAdmin(req.user?.role) && requestedOwner) {
    return { createdByUserId: requestedOwner };
  }

  if (isAdmin(req.user?.role)) {
    return {};
  }

  return { createdByUserId: req.user.id };
}

function summarizePayments(payments) {
  const totals = {
    pendingAmount: 0,
    overdueAmount: 0,
    paidAmount: 0,
    totalAmount: 0,
    pendingCount: 0,
    overdueCount: 0,
    paidCount: 0,
    totalCount: 0,
  };

  for (const payment of payments) {
    const amount = Number(payment?.amount || 0);
    const status = resolveConvenioPaymentStatus(payment);
    totals.totalAmount += amount;
    totals.totalCount += 1;

    if (status === PaymentStatus.PAGADO) {
      totals.paidAmount += amount;
      totals.paidCount += 1;
    } else if (status === PaymentStatus.VENCIDO) {
      totals.overdueAmount += amount;
      totals.overdueCount += 1;
    } else {
      totals.pendingAmount += amount;
      totals.pendingCount += 1;
    }
  }

  return totals;
}

router.use(authMiddleware);

router.get("/access/me", asyncHandler(async (req, res) => {
  return res.json({
    ok: true,
    canAccess: await userCanAccessConvenios(req),
    canManage: isAdmin(req.user?.role),
  });
}));

router.get("/summary", asyncHandler(async (req, res) => {
  if (!(await ensureConvenioAccess(req, res))) return;

  const ownerUserId = asOptionalTrimmedString(req.query?.ownerUserId);
  const where = convenioOwnerWhere(req, ownerUserId);
  const paymentWhere = Object.keys(where).length ? { createdByUserId: where.createdByUserId } : {};

  const [customers, payments, accessEntries, users] = await Promise.all([
    prisma.convenioCustomer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        devices: { orderBy: { createdAt: "desc" } },
        payments: { orderBy: { dueDate: "asc" } },
      },
    }),
    prisma.convenioPayment.findMany({
      where: paymentWhere,
      orderBy: { dueDate: "asc" },
      include: {
        customer: true,
        device: true,
      },
    }),
    isAdmin(req.user?.role) ? prisma.convenioAccess.findMany() : Promise.resolve([]),
    isAdmin(req.user?.role)
      ? prisma.user.findMany({
          where: { role: { not: "ADMIN" } },
          orderBy: [{ role: "asc" }, { fullName: "asc" }, { username: "asc" }],
          select: { id: true, username: true, fullName: true, role: true, avatarDataUrl: true },
        })
      : Promise.resolve([]),
  ]);

  const accessByUser = new Map(accessEntries.map((entry) => [entry.userId, entry]));
  const accessUsers = users.map((user) => ({
    ...user,
    convenioAccess: Boolean(accessByUser.get(user.id)?.enabled),
  }));

  return res.json({
    ok: true,
    canManage: isAdmin(req.user?.role),
    customers,
    payments,
    summary: {
      customersCount: customers.length,
      devicesCount: customers.reduce((sum, customer) => sum + Number(customer.devices?.length || 0), 0),
      payments: summarizePayments(payments),
    },
    accessUsers,
  });
}));

router.post("/customers", asyncHandler(async (req, res) => {
  if (!(await ensureConvenioAccess(req, res))) return;

  const fullName = asTrimmedString(req.body?.fullName);
  const nationalId = asTrimmedString(req.body?.nationalId);
  const phone = asOptionalTrimmedString(req.body?.phone);
  const notes = asOptionalTrimmedString(req.body?.notes);
  const brand = asTrimmedString(req.body?.brand);
  const model = asTrimmedString(req.body?.model);
  const imei = asOptionalTrimmedString(req.body?.imei);
  const deviceNotes = asOptionalTrimmedString(req.body?.deviceNotes);
  const cashPriceRaw = req.body?.cashPrice;
  const cashPrice = cashPriceRaw === "" || cashPriceRaw === null || cashPriceRaw === undefined ? null : Number(cashPriceRaw);
  const paymentAmount = parsePositiveAmount(req.body?.paymentAmount);
  const dueDate = parseDate(req.body?.dueDate);
  const paymentNotes = asOptionalTrimmedString(req.body?.paymentNotes);

  if (!fullName || !nationalId) {
    return sendBadRequest(res, "Nombre y cedula son obligatorios");
  }

  if (!brand || !model) {
    return sendBadRequest(res, "Marca y modelo del dispositivo son obligatorios");
  }

  if (cashPrice !== null && (!Number.isFinite(cashPrice) || cashPrice < 0)) {
    return sendBadRequest(res, "Costo del equipo invalido");
  }

  if ((req.body?.paymentAmount || req.body?.dueDate) && (!paymentAmount || !dueDate)) {
    return sendBadRequest(res, "Para crear pago debes ingresar monto y fecha validos");
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.convenioCustomer.create({
        data: {
          fullName,
          nationalId,
          phone,
          notes,
          createdByUserId: req.user.id,
        },
      });

      const device = await tx.convenioDevice.create({
        data: {
          convenioCustomerId: customer.id,
          brand,
          model,
          imei,
          cashPrice,
          notes: deviceNotes,
          createdByUserId: req.user.id,
        },
      });

      let payment = null;
      if (paymentAmount && dueDate) {
        payment = await tx.convenioPayment.create({
          data: {
            convenioCustomerId: customer.id,
            convenioDeviceId: device.id,
            amount: paymentAmount,
            dueDate,
            notes: paymentNotes,
            createdByUserId: req.user.id,
          },
        });
      }

      return { customer, device, payment };
    });

    return res.status(201).json({ ok: true, ...result });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      return sendBadRequest(res, "Ya existe un convenio con esa cedula o IMEI");
    }
    throw error;
  }
}));

router.post("/payments", asyncHandler(async (req, res) => {
  if (!(await ensureConvenioAccess(req, res))) return;

  const customerId = asTrimmedString(req.body?.customerId);
  const deviceId = asOptionalTrimmedString(req.body?.deviceId);
  const amount = parsePositiveAmount(req.body?.amount);
  const dueDate = parseDate(req.body?.dueDate);
  const notes = asOptionalTrimmedString(req.body?.notes);

  if (!customerId || !amount || !dueDate) {
    return sendBadRequest(res, "Cliente, monto y fecha son obligatorios");
  }

  const customer = await prisma.convenioCustomer.findFirst({
    where: { ...convenioOwnerWhere(req), id: customerId },
    include: { devices: true },
  });

  if (!customer) {
    return sendBadRequest(res, "Cliente de convenio invalido o fuera de alcance");
  }

  if (deviceId && !customer.devices.some((device) => device.id === deviceId)) {
    return sendBadRequest(res, "Dispositivo invalido para este convenio");
  }

  const payment = await prisma.convenioPayment.create({
    data: {
      convenioCustomerId: customer.id,
      convenioDeviceId: deviceId,
      amount,
      dueDate,
      notes,
      createdByUserId: customer.createdByUserId || req.user.id,
    },
    include: { customer: true, device: true },
  });

  return res.status(201).json({ ok: true, payment });
}));

router.patch("/payments/:id/mark-paid", asyncHandler(async (req, res) => {
  if (!(await ensureConvenioAccess(req, res))) return;

  const payment = await prisma.convenioPayment.findFirst({
    where: { ...convenioOwnerWhere(req), id: req.params.id },
  });

  if (!payment) {
    return sendNotFound(res, "Pago de convenio no encontrado");
  }

  const updated = await prisma.convenioPayment.update({
    where: { id: payment.id },
    data: {
      status: PaymentStatus.PAGADO,
      paidAt: new Date(),
      collectedByUserId: req.user.id,
    },
    include: { customer: true, device: true },
  });

  return res.json({ ok: true, payment: updated });
}));

router.patch("/access/:userId", asyncHandler(async (req, res) => {
  if (!isAdmin(req.user?.role)) {
    return res.status(403).json({ ok: false, message: "Solo ADMIN puede gestionar acceso a Convenios" });
  }

  const userId = asTrimmedString(req.params.userId);
  const enabled = Boolean(req.body?.enabled);

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });

  if (!target || isAdmin(target.role)) {
    return sendBadRequest(res, "Usuario invalido para acceso de Convenios");
  }

  const access = await prisma.convenioAccess.upsert({
    where: { userId },
    update: { enabled, grantedByUserId: req.user.id },
    create: { userId, enabled, grantedByUserId: req.user.id },
  });

  return res.json({ ok: true, access });
}));

export default router;
