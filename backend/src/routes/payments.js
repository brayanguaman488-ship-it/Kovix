import { Router } from "express";
import prismaPackage from "@prisma/client";

import { asyncHandler } from "../lib/asyncHandler.js";
import { sendBadRequest, sendNotFound, sendServerError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import {
  asOptionalTrimmedString,
  asTrimmedString,
  assertRequiredFields,
  parseDate,
  parsePositiveAmount,
} from "../lib/validation.js";
import { syncDeviceStatus } from "../lib/deviceStatus.js";
import { syncAutomaticAgingStatuses } from "../lib/creditAging.js";
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

    const device = await syncDeviceStatus(normalizedDeviceId, req.user.id, "Pago programado");

    return res.status(201).json({ ok: true, payment, device });
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

  const device = await syncDeviceStatus(payment.deviceId, req.user.id, "Pago marcado como pagado");

  return res.json({ ok: true, payment: updatedPayment, device });
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

  const device = await syncDeviceStatus(payment.deviceId, req.user.id, "Pago marcado como vencido");

  return res.json({ ok: true, payment: updatedPayment, device });
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

  const device = await syncDeviceStatus(payment.deviceId, req.user.id, "Pago marcado como pendiente");

  return res.json({ ok: true, payment: updatedPayment, device });
}));

export default router;
