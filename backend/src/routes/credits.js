import { Router } from "express";
import prismaPackage from "@prisma/client";

import { asyncHandler } from "../lib/asyncHandler.js";
import { extractClientSecret, isValidClientSecret } from "../lib/deviceClientAuth.js";
import { sendBadRequest, sendNotFound, sendServerError, sendUnauthorized } from "../lib/http.js";
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
import { isHexnodeConfigured, resolveHexnodeDeviceMatch } from "../lib/hexnode.js";
import authMiddleware from "../middleware/auth.js";

const router = Router();
const { InstallmentStatus, PaymentStatus, CreditContractStatus } = prismaPackage;

function parsePositiveInteger(value) {
  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    return null;
  }

  return number;
}

function toCents(value) {
  return Math.round(Number(value) * 100);
}

function fromCents(value) {
  return Number((value / 100).toFixed(2));
}

function splitAmount(totalAmount, installmentCount) {
  const totalCents = toCents(totalAmount);
  const base = Math.floor(totalCents / installmentCount);
  const remainder = totalCents % installmentCount;
  const chunks = [];

  for (let index = 0; index < installmentCount; index += 1) {
    const cents = base + (index < remainder ? 1 : 0);
    chunks.push(fromCents(cents));
  }

  return chunks;
}

function addMonths(date, monthsToAdd) {
  const dateCopy = new Date(date);
  const dayOfMonth = dateCopy.getDate();
  dateCopy.setMonth(dateCopy.getMonth() + monthsToAdd);

  if (dateCopy.getDate() < dayOfMonth) {
    dateCopy.setDate(0);
  }

  return dateCopy;
}

function buildContractSummary(contract) {
  const principalAmount = Number(contract.principalAmount);
  const downPaymentAmount = Number(contract.downPaymentAmount || 0);
  const persistedFinanced = Number(contract.financedAmount || 0);
  const financedAmount = persistedFinanced > 0
    ? persistedFinanced
    : Number((principalAmount - downPaymentAmount).toFixed(2));

  const totals = contract.installments.reduce((accumulator, installment) => {
    const amount = Number(installment.amount);
    accumulator.total += amount;

    if (installment.status === InstallmentStatus.PAGADO) {
      accumulator.paid += amount;
    } else if (installment.status === InstallmentStatus.REPORTADO) {
      accumulator.reported += amount;
    } else if (installment.status === InstallmentStatus.VENCIDO) {
      accumulator.overdue += amount;
    } else {
      accumulator.pending += amount;
    }

    return accumulator;
  }, {
    total: 0,
    paid: 0,
    reported: 0,
    overdue: 0,
    pending: 0,
  });

  return {
    purchaseDate: contract.purchaseDate,
    cutOffDate: contract.startDate,
    registeredAt: contract.createdAt,
    principalAmount,
    downPaymentAmount,
    financedAmount,
    totalAmount: principalAmount,
    scheduledInstallmentsAmount: Number(totals.total.toFixed(2)),
    paidInstallmentsAmount: Number(totals.paid.toFixed(2)),
    paidAmount: Number((totals.paid + downPaymentAmount).toFixed(2)),
    reportedAmount: Number(totals.reported.toFixed(2)),
    overdueAmount: Number(totals.overdue.toFixed(2)),
    pendingAmount: Number((principalAmount - (totals.paid + downPaymentAmount)).toFixed(2)),
    installmentCount: contract.installmentCount,
    paidInstallments: contract.installments.filter((entry) => entry.status === InstallmentStatus.PAGADO).length,
    pendingInstallments: contract.installments.filter((entry) => entry.status === InstallmentStatus.PENDIENTE).length,
    overdueInstallments: contract.installments.filter((entry) => entry.status === InstallmentStatus.VENCIDO).length,
    reportedInstallments: contract.installments.filter((entry) => entry.status === InstallmentStatus.REPORTADO).length,
  };
}

async function attemptAutomaticHexnodeLink(deviceId) {
  if (!isHexnodeConfigured()) {
    return { linked: false, skipped: "hexnode_not_configured" };
  }

  const localDevice = await prisma.device.findUnique({
    where: { id: deviceId },
  });

  if (!localDevice) {
    return { linked: false, skipped: "device_not_found" };
  }

  if (localDevice.hexnodeDeviceId) {
    return {
      linked: true,
      hexnodeDeviceId: localDevice.hexnodeDeviceId,
      resolvedBy: "stored_device_field",
      skipped: "already_linked",
    };
  }

  const resolved = await resolveHexnodeDeviceMatch(localDevice, { useDefault: false });
  if (!resolved?.hexnodeDeviceId) {
    return { linked: false, skipped: "no_match_found" };
  }

  const updated = await prisma.device.update({
    where: { id: deviceId },
    data: { hexnodeDeviceId: resolved.hexnodeDeviceId },
  });

  return {
    linked: true,
    hexnodeDeviceId: updated.hexnodeDeviceId,
    resolvedBy: resolved.source,
  };
}

async function loadContractByDeviceId(deviceId) {
  await syncAutomaticAgingStatuses(deviceId);

  const contract = await prisma.creditContract.findUnique({
    where: { deviceId },
    include: {
      customer: true,
      device: true,
      installments: {
        orderBy: { sequence: "asc" },
        include: {
          payment: true,
        },
      },
    },
  });

  if (!contract) {
    return null;
  }

  return {
    ...contract,
    summary: buildContractSummary(contract),
  };
}

router.post("/client/:installCode/installments/:id/report-payment", asyncHandler(async (req, res) => {
  const installCode = asTrimmedString(req.params.installCode);
  const providedSecret = extractClientSecret(req);
  const note = asOptionalTrimmedString(req.body?.note);

  if (!providedSecret) {
    return sendUnauthorized(res, "x-client-secret es obligatorio");
  }

  const installment = await prisma.installment.findUnique({
    where: { id: req.params.id },
    include: {
      contract: {
        include: {
          device: true,
        },
      },
      payment: true,
    },
  });

  if (!installment) {
    return sendNotFound(res, "Cuota no encontrada");
  }

  if (installment.contract.device.installCode !== installCode) {
    return sendUnauthorized(res, "La cuota no pertenece al dispositivo");
  }

  if (!isValidClientSecret(installment.contract.device, providedSecret)) {
    return sendUnauthorized(res, "Credenciales de dispositivo invalidas");
  }

  if (installment.status === InstallmentStatus.PAGADO) {
    return sendBadRequest(res, "La cuota ya esta pagada");
  }

  const now = new Date();
  const updatedInstallment = await prisma.installment.update({
    where: { id: installment.id },
    data: {
      status: InstallmentStatus.REPORTADO,
      reportedAt: now,
      notes: note || installment.notes,
    },
    include: {
      payment: true,
    },
  });

  if (installment.paymentId) {
    await prisma.payment.update({
      where: { id: installment.paymentId },
      data: {
        notes: note || installment.payment?.notes || null,
      },
    });
  }

  return res.json({
    ok: true,
    message: "Pago reportado. Pendiente de confirmacion del administrador.",
    installment: updatedInstallment,
  });
}));

router.use(authMiddleware);

router.post("/contracts", asyncHandler(async (req, res) => {
  const {
    deviceId,
    purchaseDate,
    principalAmount,
    downPaymentAmount,
    installmentCount,
    startDate,
    notes,
  } = req.body || {};

  const normalizedDeviceId = asTrimmedString(deviceId);
  const parsedAmount = parsePositiveAmount(principalAmount);
  const parsedPurchaseDate = parseDate(purchaseDate);
  const parsedDownPayment = downPaymentAmount === undefined || downPaymentAmount === null || downPaymentAmount === ""
    ? 0
    : Number(downPaymentAmount);
  const parsedInstallmentCount = parsePositiveInteger(installmentCount);
  const parsedStartDate = parseDate(startDate);

  const required = assertRequiredFields([
    ["deviceId", normalizedDeviceId],
    ["purchaseDate", purchaseDate],
    ["principalAmount", principalAmount],
    ["installmentCount", installmentCount],
    ["startDate", startDate],
  ]);

  if (!required.ok) {
    return sendBadRequest(
      res,
      "deviceId, purchaseDate, principalAmount, installmentCount y startDate son obligatorios",
      `Faltan: ${required.missing.join(", ")}`
    );
  }

  if (!parsedAmount) {
    return sendBadRequest(res, "principalAmount debe ser mayor que 0");
  }

  if (!Number.isFinite(parsedDownPayment) || parsedDownPayment < 0) {
    return sendBadRequest(res, "downPaymentAmount debe ser mayor o igual que 0");
  }

  if (parsedDownPayment >= parsedAmount) {
    return sendBadRequest(res, "downPaymentAmount debe ser menor que principalAmount");
  }

  if (!parsedInstallmentCount) {
    return sendBadRequest(res, "installmentCount debe ser entero mayor que 0");
  }

  if (!parsedPurchaseDate) {
    return sendBadRequest(res, "purchaseDate invalida");
  }

  if (!parsedStartDate) {
    return sendBadRequest(res, "startDate invalida");
  }

  const device = await prisma.device.findUnique({
    where: { id: normalizedDeviceId },
    include: {
      customer: true,
      creditContract: true,
    },
  });

  if (!device) {
    return sendNotFound(res, "Dispositivo no encontrado");
  }

  if (device.creditContract && device.creditContract.status === CreditContractStatus.ACTIVO) {
    return sendBadRequest(res, "El dispositivo ya tiene un contrato de credito activo");
  }

  const financedAmount = Number((parsedAmount - parsedDownPayment).toFixed(2));
  const installmentAmounts = splitAmount(financedAmount, parsedInstallmentCount);

  try {
    const contract = await prisma.$transaction(async (tx) => {
      const createdContract = await tx.creditContract.create({
        data: {
          customerId: device.customerId,
          deviceId: device.id,
          principalAmount: parsedAmount,
          downPaymentAmount: parsedDownPayment,
          financedAmount,
          installmentCount: parsedInstallmentCount,
          installmentAmount: Number((financedAmount / parsedInstallmentCount).toFixed(2)),
          purchaseDate: parsedPurchaseDate,
          startDate: parsedStartDate,
          notes: asOptionalTrimmedString(notes),
        },
      });

      if (parsedDownPayment > 0) {
        await tx.payment.create({
          data: {
            customerId: device.customerId,
            deviceId: device.id,
            amount: parsedDownPayment,
            dueDate: parsedStartDate,
            status: PaymentStatus.PAGADO,
            paidAt: new Date(),
            notes: "Entrada inicial del credito",
          },
        });
      }

      for (let index = 0; index < parsedInstallmentCount; index += 1) {
        const dueDate = addMonths(parsedStartDate, index);
        const amount = installmentAmounts[index];
        const payment = await tx.payment.create({
          data: {
            customerId: device.customerId,
            deviceId: device.id,
            amount,
            dueDate,
            status: PaymentStatus.PENDIENTE,
            notes: `Cuota ${index + 1} de ${parsedInstallmentCount}`,
          },
        });

        await tx.installment.create({
          data: {
            contractId: createdContract.id,
            sequence: index + 1,
            dueDate,
            amount,
            status: InstallmentStatus.PENDIENTE,
            notes: `Cuota ${index + 1} de ${parsedInstallmentCount}`,
            paymentId: payment.id,
          },
        });
      }

      return tx.creditContract.findUnique({
        where: { id: createdContract.id },
        include: {
          customer: true,
          device: true,
          installments: {
            orderBy: { sequence: "asc" },
            include: {
              payment: true,
            },
          },
        },
      });
    });

    await syncDeviceStatus(device.id, req.user.id, "Contrato de credito creado");
    let hexnode = { linked: false, skipped: "not_attempted" };
    try {
      hexnode = await attemptAutomaticHexnodeLink(device.id);
    } catch {
      hexnode = { linked: false, skipped: "auto_link_failed" };
    }

    return res.status(201).json({
      ok: true,
      contract: {
        ...contract,
        summary: buildContractSummary(contract),
      },
      hexnode,
    });
  } catch (error) {
    return sendServerError(res, "No se pudo crear el contrato de credito", error?.message);
  }
}));

router.get("/contracts/:deviceId", asyncHandler(async (req, res) => {
  const contract = await loadContractByDeviceId(req.params.deviceId);

  if (!contract) {
    return sendNotFound(res, "No existe contrato para este dispositivo");
  }

  return res.json({ ok: true, contract });
}));

router.patch("/installments/:id/approve-payment", asyncHandler(async (req, res) => {
  const installment = await prisma.installment.findUnique({
    where: { id: req.params.id },
    include: {
      contract: true,
      payment: true,
    },
  });

  if (!installment) {
    return sendNotFound(res, "Cuota no encontrada");
  }

  if (installment.status === InstallmentStatus.PAGADO) {
    return res.json({ ok: true, installment });
  }

  const now = new Date();
  const updatedInstallment = await prisma.installment.update({
    where: { id: installment.id },
    data: {
      status: InstallmentStatus.PAGADO,
      paidAt: now,
    },
    include: {
      payment: true,
    },
  });

  if (installment.paymentId) {
    await prisma.payment.update({
      where: { id: installment.paymentId },
      data: {
        status: PaymentStatus.PAGADO,
        paidAt: now,
      },
    });
  }

  await syncDeviceStatus(installment.contract.deviceId, req.user.id, "Cuota aprobada como pagada");

  return res.json({ ok: true, installment: updatedInstallment });
}));

router.patch("/installments/:id/mark-overdue", asyncHandler(async (req, res) => {
  const installment = await prisma.installment.findUnique({
    where: { id: req.params.id },
    include: {
      contract: true,
      payment: true,
    },
  });

  if (!installment) {
    return sendNotFound(res, "Cuota no encontrada");
  }

  if (installment.status === InstallmentStatus.PAGADO) {
    return sendBadRequest(res, "No se puede marcar vencida una cuota pagada");
  }

  const updatedInstallment = await prisma.installment.update({
    where: { id: installment.id },
    data: {
      status: InstallmentStatus.VENCIDO,
    },
    include: {
      payment: true,
    },
  });

  if (installment.paymentId) {
    await prisma.payment.update({
      where: { id: installment.paymentId },
      data: {
        status: PaymentStatus.VENCIDO,
      },
    });
  }

  await syncDeviceStatus(installment.contract.deviceId, req.user.id, "Cuota marcada como vencida");

  return res.json({ ok: true, installment: updatedInstallment });
}));

export default router;
