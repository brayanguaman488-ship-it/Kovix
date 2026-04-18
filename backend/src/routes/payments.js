import { Router } from "express";
import prismaPackage from "@prisma/client";

import { asyncHandler } from "../lib/asyncHandler.js";
import { sendBadRequest, sendNotFound, sendServerError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { registerTrashEntry } from "../lib/trash.js";
import {
  asOptionalTrimmedString,
  asTrimmedString,
  assertRequiredFields,
  parseDate,
  parsePositiveAmount,
} from "../lib/validation.js";
import { syncAutomaticAgingStatuses } from "../lib/creditAging.js";
import { syncDeviceStatus } from "../lib/deviceStatus.js";
import authMiddleware from "../middleware/auth.js";

const router = Router();
const { PaymentStatus, InstallmentStatus } = prismaPackage;

router.use(authMiddleware);

router.get("/", asyncHandler(async (req, res) => {
  await syncAutomaticAgingStatuses();

  const payments = await prisma.payment.findMany({
    orderBy: { dueDate: "asc" },
    include: {
      customer: true,
      device: true,
    },
  });

  return res.json({ ok: true, payments });
}));

router.post("/", asyncHandler(async (req, res) => {
  const { customerId, deviceId, amount, dueDate, notes } = req.body || {};
  const normalizedCustomerId = asTrimmedString(customerId);
  const normalizedDeviceId = asTrimmedString(deviceId);
  const parsedAmount = parsePositiveAmount(amount);
  const parsedDueDate = parseDate(dueDate);

  const required = assertRequiredFields([
    ["customerId", normalizedCustomerId],
    ["deviceId", normalizedDeviceId],
    ["amount", amount],
    ["dueDate", dueDate],
  ]);

  if (!required.ok) {
    return sendBadRequest(
      res,
      "customerId, deviceId, amount y dueDate son obligatorios",
      `Faltan: ${required.missing.join(", ")}`
    );
  }

  if (!parsedAmount) {
    return sendBadRequest(res, "amount debe ser un numero mayor que 0");
  }

  if (!parsedDueDate) {
    return sendBadRequest(res, "dueDate invalida");
  }

  try {
    const payment = await prisma.payment.create({
      data: {
        customerId: normalizedCustomerId,
        deviceId: normalizedDeviceId,
        amount: parsedAmount,
        dueDate: parsedDueDate,
        notes: asOptionalTrimmedString(notes),
      },
      include: {
        customer: true,
        device: true,
      },
    });

    await syncDeviceStatus(normalizedDeviceId, req.user.id, "Pago creado");

    return res.status(201).json({ ok: true, payment });
  } catch (error) {
    if (error?.code === "P2003") {
      return sendBadRequest(res, "customerId o deviceId invalidos");
    }

    return sendServerError(res, "No se pudo crear el pago");
  }
}));

router.patch("/:id/mark-paid", asyncHandler(async (req, res) => {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id },
    include: {
      installment: true,
    },
  });

  if (!payment) {
    return sendNotFound(res, "Pago no encontrado");
  }

  const updatedPayment = await prisma.payment.update({
    where: { id: req.params.id },
    data: {
      status: PaymentStatus.PAGADO,
      paidAt: new Date(),
    },
    include: {
      customer: true,
      device: true,
    },
  });

  if (payment.installment) {
    await prisma.installment.update({
      where: { id: payment.installment.id },
      data: {
        status: InstallmentStatus.PAGADO,
        paidAt: new Date(),
      },
    });
  }

  await syncDeviceStatus(payment.deviceId, req.user.id, "Pago marcado como pagado");

  return res.json({ ok: true, payment: updatedPayment });
}));

router.patch("/:id/mark-overdue", asyncHandler(async (req, res) => {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id },
    include: {
      installment: true,
    },
  });

  if (!payment) {
    return sendNotFound(res, "Pago no encontrado");
  }

  const updatedPayment = await prisma.payment.update({
    where: { id: req.params.id },
    data: {
      status: PaymentStatus.VENCIDO,
    },
    include: {
      customer: true,
      device: true,
    },
  });

  if (payment.installment) {
    await prisma.installment.update({
      where: { id: payment.installment.id },
      data: {
        status: InstallmentStatus.VENCIDO,
      },
    });
  }

  await syncDeviceStatus(payment.deviceId, req.user.id, "Pago marcado como vencido");

  return res.json({ ok: true, payment: updatedPayment });
}));

router.patch("/:id/mark-pending", asyncHandler(async (req, res) => {
  const payment = await prisma.payment.findUnique({
    where: { id: req.params.id },
    include: {
      installment: true,
    },
  });

  if (!payment) {
    return sendNotFound(res, "Pago no encontrado");
  }

  const updatedPayment = await prisma.payment.update({
    where: { id: req.params.id },
    data: {
      status: PaymentStatus.PENDIENTE,
      paidAt: null,
    },
    include: {
      customer: true,
      device: true,
    },
  });

  if (payment.installment) {
    await prisma.installment.update({
      where: { id: payment.installment.id },
      data: {
        status: InstallmentStatus.PENDIENTE,
        paidAt: null,
      },
    });
  }

  await syncDeviceStatus(payment.deviceId, req.user.id, "Pago marcado como pendiente");

  return res.json({ ok: true, payment: updatedPayment });
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const current = await prisma.payment.findUnique({
    where: { id: req.params.id },
    include: {
      customer: {
        select: { id: true, fullName: true, nationalId: true },
      },
      device: {
        select: { id: true, installCode: true, brand: true, model: true },
      },
    },
  });

  if (!current) {
    return sendNotFound(res, "Pago no encontrado");
  }

  await prisma.$transaction(async (tx) => {
    await registerTrashEntry({
      client: tx,
      entityType: "payment",
      entityId: current.id,
      summary: `${current.customer?.fullName || "Cliente"} - ${Number(current.amount).toFixed(2)} ${current.currency}`,
      payload: {
        id: current.id,
        amount: Number(current.amount),
        currency: current.currency,
        dueDate: current.dueDate,
        status: current.status,
        customer: current.customer,
        device: current.device,
      },
      deletedByUserId: req.user.id,
    });

    await tx.payment.delete({
      where: { id: current.id },
    });
  });

  await syncDeviceStatus(current.deviceId, req.user.id, "Pago eliminado");

  return res.json({
    ok: true,
    message: "Pago enviado a papelera (purga automatica en 30 dias)",
    paymentId: current.id,
  });
}));

export default router;
