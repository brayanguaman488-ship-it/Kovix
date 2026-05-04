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

function parseInstallmentCount(value, fallback = 1) {
  const parsed = Number(value || fallback);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 60 ? parsed : null;
}

function parseMonth(value, fallback) {
  const parsed = Number(value || fallback);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 12 ? parsed : fallback;
}

function parseYear(value, fallback) {
  const parsed = Number(value || fallback);
  return Number.isInteger(parsed) && parsed >= 2020 && parsed <= 2100 ? parsed : fallback;
}

function addMonths(date, months) {
  const source = new Date(date);
  const day = source.getUTCDate();
  const target = new Date(Date.UTC(source.getUTCFullYear(), source.getUTCMonth() + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target;
}

function getMonthBounds(year, month) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

function buildInstallmentRows({ customerId, deviceId, amount, dueDate, count, notes, createdByUserId }) {
  return Array.from({ length: count }, (_, index) => ({
    convenioCustomerId: customerId,
    convenioDeviceId: deviceId,
    amount,
    dueDate: addMonths(dueDate, index),
    sequence: index + 1,
    notes,
    createdByUserId,
  }));
}

function calculateMonthlyInstallment(totalAmount, count) {
  return Number((Number(totalAmount || 0) / Number(count || 1)).toFixed(2));
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
  const now = new Date();
  const year = parseYear(req.query?.year, now.getFullYear());
  const month = parseMonth(req.query?.month, now.getMonth() + 1);
  const bounds = getMonthBounds(year, month);
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
  const discountRows = payments.filter((payment) => {
    const dueDate = new Date(payment?.dueDate);
    if (Number.isNaN(dueDate.getTime()) || dueDate < bounds.start || dueDate >= bounds.end) return false;
    return resolveConvenioPaymentStatus(payment) !== PaymentStatus.PAGADO;
  });
  const periodPayments = payments.filter((payment) => {
    const dueDate = new Date(payment?.dueDate);
    return !Number.isNaN(dueDate.getTime()) && dueDate >= bounds.start && dueDate < bounds.end;
  });

  return res.json({
    ok: true,
    canManage: isAdmin(req.user?.role),
    year,
    month,
    customers,
    payments: periodPayments,
    discountRows,
    summary: {
      customersCount: customers.length,
      devicesCount: customers.reduce((sum, customer) => sum + Number(customer.devices?.length || 0), 0),
      payments: summarizePayments(periodPayments),
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
  const dueDate = parseDate(req.body?.dueDate);
  const paymentNotes = asOptionalTrimmedString(req.body?.paymentNotes);
  const installmentCount = parseInstallmentCount(req.body?.installmentCount, 1);

  if (!fullName || !nationalId) {
    return sendBadRequest(res, "Nombre y cedula son obligatorios");
  }

  if (!brand || !model) {
    return sendBadRequest(res, "Marca y modelo del dispositivo son obligatorios");
  }

  if (!Number.isFinite(cashPrice) || cashPrice <= 0) {
    return sendBadRequest(res, "Valor total del telefono es obligatorio");
  }

  if (!installmentCount) {
    return sendBadRequest(res, "Numero de cuotas invalido");
  }

  if (!dueDate) {
    return sendBadRequest(res, "Fecha de corte mensual invalida");
  }

  const paymentAmount = calculateMonthlyInstallment(cashPrice, installmentCount);

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
          installmentCount,
          notes: deviceNotes,
          createdByUserId: req.user.id,
        },
      });

      let payment = null;
      let payments = [];
      if (paymentAmount && dueDate) {
        const rows = buildInstallmentRows({
          customerId: customer.id,
          deviceId: device.id,
          amount: paymentAmount,
          dueDate,
          count: installmentCount,
          notes: paymentNotes,
          createdByUserId: req.user.id,
        });
        await tx.convenioPayment.createMany({ data: rows });
        payments = await tx.convenioPayment.findMany({
          where: { convenioDeviceId: device.id },
          orderBy: { sequence: "asc" },
        });
        payment = payments[0] || null;
      }

      return { customer, device, payment, payments };
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
  const installmentCount = parseInstallmentCount(req.body?.installmentCount, 1);

  if (!customerId || !amount || !dueDate) {
    return sendBadRequest(res, "Cliente, monto y fecha son obligatorios");
  }

  if (!installmentCount) {
    return sendBadRequest(res, "Numero de cuotas invalido");
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

  const createdByUserId = customer.createdByUserId || req.user.id;
  const payment = await prisma.$transaction(async (tx) => {
    const rows = buildInstallmentRows({
      customerId: customer.id,
      deviceId,
      amount,
      dueDate,
      count: installmentCount,
      notes,
      createdByUserId,
    });
    await tx.convenioPayment.createMany({ data: rows });
    return tx.convenioPayment.findFirst({
      where: { convenioCustomerId: customer.id, convenioDeviceId: deviceId || null, createdByUserId },
      orderBy: [{ createdAt: "desc" }],
      include: { customer: true, device: true },
    });
  });

  return res.status(201).json({ ok: true, payment });
}));

router.delete("/customers/:id", asyncHandler(async (req, res) => {
  if (!(await ensureConvenioAccess(req, res))) return;

  const customerId = asTrimmedString(req.params.id);
  if (!customerId) {
    return sendBadRequest(res, "id es obligatorio");
  }

  const customer = await prisma.convenioCustomer.findFirst({
    where: { ...convenioOwnerWhere(req), id: customerId },
    select: { id: true, fullName: true, nationalId: true },
  });

  if (!customer) {
    return sendNotFound(res, "Convenio no encontrado");
  }

  await prisma.convenioCustomer.delete({
    where: { id: customer.id },
  });

  return res.json({ ok: true, customer });
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

router.patch("/payments/:id/skip-discount", asyncHandler(async (req, res) => {
  if (!(await ensureConvenioAccess(req, res))) return;

  const payment = await prisma.convenioPayment.findFirst({
    where: { ...convenioOwnerWhere(req), id: req.params.id },
  });

  if (!payment) {
    return sendNotFound(res, "Pago de convenio no encontrado");
  }

  if (String(payment.status || "").toUpperCase() === PaymentStatus.PAGADO) {
    return sendBadRequest(res, "No se puede pasar al siguiente mes un pago ya pagado");
  }

  const ownerWhere = convenioOwnerWhere(req);
  const scheduleWhere = {
    ...ownerWhere,
    status: { notIn: [PaymentStatus.PAGADO, PaymentStatus.CANCELADO] },
    dueDate: { gte: payment.dueDate },
    ...(payment.convenioDeviceId
      ? { convenioDeviceId: payment.convenioDeviceId }
      : { convenioCustomerId: payment.convenioCustomerId, convenioDeviceId: null }),
  };

  const updated = await prisma.$transaction(async (tx) => {
    const schedule = await tx.convenioPayment.findMany({
      where: scheduleWhere,
      orderBy: [{ dueDate: "asc" }, { sequence: "asc" }],
    });

    for (const entry of schedule) {
      // eslint-disable-next-line no-await-in-loop
      await tx.convenioPayment.update({
        where: { id: entry.id },
        data: {
          dueDate: addMonths(entry.dueDate, 1),
          discountSkippedAt: entry.id === payment.id ? new Date() : entry.discountSkippedAt,
          discountSkippedByUserId: entry.id === payment.id ? req.user.id : entry.discountSkippedByUserId,
        },
      });
    }

    return tx.convenioPayment.findUnique({
      where: { id: payment.id },
      include: { customer: true, device: true },
    });
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
