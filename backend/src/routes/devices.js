import { Router } from "express";
import prismaPackage from "@prisma/client";

import { asyncHandler } from "../lib/asyncHandler.js";
import {
  extractClientSecret,
  generateClientSecret,
  isValidClientSecret,
} from "../lib/deviceClientAuth.js";
import {
  isPrismaUniqueConstraintError,
  sendBadRequest,
  sendNotFound,
  sendServerError,
  sendUnauthorized,
} from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { sendDeviceStatusPush } from "../lib/pushNotifications.js";
import { asOptionalTrimmedString, asTrimmedString, assertRequiredFields } from "../lib/validation.js";
import { syncDeviceStatus } from "../lib/deviceStatus.js";
import authMiddleware from "../middleware/auth.js";

const router = Router();
const { DeviceStatus, InstallmentStatus } = prismaPackage;

function getMobileStatusMessage(status) {
  const messages = {
    ACTIVO: "Equipo habilitado. No hay restricciones.",
    PAGO_PENDIENTE: "Tienes un pago pendiente. Regulariza para evitar restricciones.",
    SOLO_LLAMADAS: "Modo restringido: solo llamadas de emergencia y contacto de cobranza.",
    BLOQUEADO: "Equipo bloqueado por incumplimiento. Comunicate para regularizar.",
  };

  return messages[status] || "Estado del equipo actualizado.";
}

function buildClientDeviceResponse(device) {
  const installments = device.creditContract?.installments || [];
  const creditInstallments = installments.map((entry) => ({
    id: entry.id,
    sequence: entry.sequence,
    dueDate: entry.dueDate,
    amount: Number(entry.amount),
    status: entry.status,
  }));
  const principalAmount = Number(device.creditContract?.principalAmount || 0);
  const downPaymentAmount = Number(device.creditContract?.downPaymentAmount || 0);
  const persistedFinancedAmount = Number(device.creditContract?.financedAmount || 0);
  const financedAmount = persistedFinancedAmount > 0
    ? persistedFinancedAmount
    : Number((principalAmount - downPaymentAmount).toFixed(2));
  const creditSummary = device.creditContract
    ? {
      contractId: device.creditContract.id,
      totalInstallments: device.creditContract.installmentCount,
      principalAmount,
      downPaymentAmount,
      financedAmount,
      installmentAmount: Number(device.creditContract.installmentAmount),
      currency: device.creditContract.currency,
      paidInstallments: installments.filter((entry) => entry.status === InstallmentStatus.PAGADO).length,
      pendingInstallments: installments.filter((entry) => entry.status === InstallmentStatus.PENDIENTE).length,
      overdueInstallments: installments.filter((entry) => entry.status === InstallmentStatus.VENCIDO).length,
      reportedInstallments: installments.filter((entry) => entry.status === InstallmentStatus.REPORTADO).length,
      nextDueDate: installments.find((entry) => entry.status !== InstallmentStatus.PAGADO)?.dueDate || null,
      pendingAmount: Number(
        installments
          .filter((entry) => entry.status !== InstallmentStatus.PAGADO)
          .reduce((accumulator, entry) => accumulator + Number(entry.amount), 0)
          .toFixed(2)
      ),
      installments: creditInstallments,
    }
    : null;

  return {
    id: device.id,
    installCode: device.installCode,
    status: device.currentStatus,
    customerName: device.customer.fullName,
    message: getMobileStatusMessage(device.currentStatus),
    updatedAt: device.lastStatusChangeAt,
    policy: {
      nextCheckInSeconds: 300,
      warningAfterDaysLate: 1,
      callsOnlyAfterDaysLate: 7,
      blockedAfterDaysLate: 30,
    },
    credit: creditSummary,
  };
}

router.get("/client/:installCode/status", asyncHandler(async (req, res) => {
  const providedSecret = extractClientSecret(req);

  if (!providedSecret) {
    return sendUnauthorized(res, "x-client-secret es obligatorio");
  }

  const device = await prisma.device.findUnique({
    where: { installCode: req.params.installCode },
    include: {
      customer: true,
      creditContract: {
        include: {
          installments: {
            orderBy: { sequence: "asc" },
          },
        },
      },
    },
  });

  if (!device) {
    return sendNotFound(res, "Dispositivo no encontrado");
  }

  if (!isValidClientSecret(device, providedSecret)) {
    return sendUnauthorized(res, "Credenciales de dispositivo invalidas");
  }

  await prisma.device.update({
    where: { id: device.id },
    data: {
      isRegistered: true,
      lastSeenAt: new Date(),
    },
  });

  return res.json({
    ok: true,
    device: buildClientDeviceResponse(device),
  });
}));

router.post("/client/:installCode/heartbeat", asyncHandler(async (req, res) => {
  const providedSecret = extractClientSecret(req);

  if (!providedSecret) {
    return sendUnauthorized(res, "x-client-secret es obligatorio");
  }

  const device = await prisma.device.findUnique({
    where: { installCode: req.params.installCode },
    include: {
      customer: true,
      creditContract: {
        include: {
          installments: {
            orderBy: { sequence: "asc" },
          },
        },
      },
    },
  });

  if (!device) {
    return sendNotFound(res, "Dispositivo no encontrado");
  }

  if (!isValidClientSecret(device, providedSecret)) {
    return sendUnauthorized(res, "Credenciales de dispositivo invalidas");
  }

  const updated = await prisma.device.update({
    where: { id: device.id },
    data: {
      isRegistered: true,
      lastSeenAt: new Date(),
    },
    include: {
      customer: true,
      creditContract: {
        include: {
          installments: {
            orderBy: { sequence: "asc" },
          },
        },
      },
    },
  });

  return res.json({
    ok: true,
    message: "Heartbeat recibido",
    device: buildClientDeviceResponse(updated),
  });
}));

router.post("/client/:installCode/push-token", asyncHandler(async (req, res) => {
  const providedSecret = extractClientSecret(req);
  const token = asTrimmedString(req.body?.token);

  if (!providedSecret) {
    return sendUnauthorized(res, "x-client-secret es obligatorio");
  }

  if (!token) {
    return sendBadRequest(res, "token es obligatorio");
  }

  const device = await prisma.device.findUnique({
    where: { installCode: req.params.installCode },
  });

  if (!device) {
    return sendNotFound(res, "Dispositivo no encontrado");
  }

  if (!isValidClientSecret(device, providedSecret)) {
    return sendUnauthorized(res, "Credenciales de dispositivo invalidas");
  }

  const updated = await prisma.device.update({
    where: { id: device.id },
    data: {
      pushToken: token,
      pushTokenUpdatedAt: new Date(),
      lastSeenAt: new Date(),
      isRegistered: true,
    },
  });

  return res.json({
    ok: true,
    message: "Push token registrado",
    deviceId: updated.id,
  });
}));

router.use(authMiddleware);

router.get("/", asyncHandler(async (req, res) => {
  const devices = await prisma.device.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      customer: true,
      creditContract: {
        include: {
          installments: {
            orderBy: { sequence: "asc" },
          },
        },
      },
      payments: {
        orderBy: { dueDate: "asc" },
      },
      statusHistory: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  return res.json({ ok: true, devices });
}));

router.post("/", asyncHandler(async (req, res) => {
  const { customerId, brand, model, alias, imei, installCode, notes } = req.body || {};
  const normalizedCustomerId = asTrimmedString(customerId);
  const normalizedBrand = asTrimmedString(brand);
  const normalizedModel = asTrimmedString(model);
  const normalizedImei = asTrimmedString(imei);
  const normalizedInstallCode = asTrimmedString(installCode);

  const required = assertRequiredFields([
    ["customerId", normalizedCustomerId],
    ["brand", normalizedBrand],
    ["model", normalizedModel],
    ["imei", normalizedImei],
    ["installCode", normalizedInstallCode],
  ]);

  if (!required.ok) {
    return sendBadRequest(
      res,
      "customerId, brand, model, imei e installCode son obligatorios",
      `Faltan: ${required.missing.join(", ")}`
    );
  }

  try {
    const device = await prisma.device.create({
      data: {
        customerId: normalizedCustomerId,
        brand: normalizedBrand,
        model: normalizedModel,
        alias: asOptionalTrimmedString(alias),
        imei: normalizedImei,
        installCode: normalizedInstallCode,
        clientSecret: generateClientSecret(),
        notes: asOptionalTrimmedString(notes),
      },
      include: {
        customer: true,
        creditContract: {
          include: {
            installments: {
              orderBy: { sequence: "asc" },
            },
          },
        },
      },
    });

    await prisma.deviceStatusHistory.create({
      data: {
        deviceId: device.id,
        newStatus: DeviceStatus.ACTIVO,
        changedByUserId: req.user.id,
        reason: "Dispositivo registrado",
      },
    });

    return res.status(201).json({ ok: true, device });
  } catch (error) {
    if (error?.code === "P2003") {
      return sendBadRequest(res, "customerId invalido");
    }

    if (isPrismaUniqueConstraintError(error)) {
      return sendBadRequest(res, "IMEI o installCode ya existen");
    }

    return sendServerError(res, "No se pudo crear el dispositivo");
  }
}));

router.patch("/:id/status", asyncHandler(async (req, res) => {
  const requestedStatus = asTrimmedString(req.body?.status);
  const reason = asTrimmedString(req.body?.reason) || "Cambio manual desde panel";

  if (!Object.values(DeviceStatus).includes(requestedStatus)) {
    return sendBadRequest(res, "Estado invalido");
  }

  const current = await prisma.device.findUnique({
    where: { id: req.params.id },
  });

  if (!current) {
    return sendNotFound(res, "Dispositivo no encontrado");
  }

  const device = await prisma.$transaction(async (tx) => {
    await tx.device.update({
      where: { id: req.params.id },
      data: {
        currentStatus: requestedStatus,
        lastStatusChangeAt: new Date(),
      },
    });

    await tx.deviceStatusHistory.create({
      data: {
        deviceId: req.params.id,
        previousStatus: current.currentStatus,
        newStatus: requestedStatus,
        changedByUserId: req.user.id,
        reason,
      },
    });

    return tx.device.findUnique({
      where: { id: req.params.id },
      include: {
        customer: true,
        creditContract: {
          include: {
            installments: {
              orderBy: { sequence: "asc" },
            },
          },
        },
        payments: {
          orderBy: { dueDate: "asc" },
        },
        statusHistory: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    });
  });

  if (device) {
    await sendDeviceStatusPush(device);
  }

  return res.json({ ok: true, device });
}));

router.post("/:id/recalculate-status", asyncHandler(async (req, res) => {
  const device = await syncDeviceStatus(req.params.id, req.user.id, "Recalculado manualmente");

  if (!device) {
    return sendNotFound(res, "Dispositivo no encontrado");
  }

  return res.json({ ok: true, device });
}));

router.post("/:id/rotate-client-secret", asyncHandler(async (req, res) => {
  const device = await prisma.device.findUnique({
    where: { id: req.params.id },
  });

  if (!device) {
    return sendNotFound(res, "Dispositivo no encontrado");
  }

  const updated = await prisma.device.update({
    where: { id: req.params.id },
    data: {
      clientSecret: generateClientSecret(),
    },
    include: {
      customer: true,
      creditContract: {
        include: {
          installments: {
            orderBy: { sequence: "asc" },
          },
        },
      },
      payments: {
        orderBy: { dueDate: "asc" },
      },
      statusHistory: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });

  return res.json({
    ok: true,
    message: "Secreto del dispositivo rotado",
    device: updated,
  });
}));

export default router;
