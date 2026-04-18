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
import {
  applyHexnodePolicyForStatus,
  generateInstallCode,
  getHexnodeProvisioningQr,
  isHexnodeConfigured,
  resolveHexnodeDeviceMatch,
} from "../lib/hexnode.js";
import { registerTrashEntry } from "../lib/trash.js";
import authMiddleware from "../middleware/auth.js";

const router = Router();
const { DeviceStatus, InstallmentStatus } = prismaPackage;

async function buildClientSecretFromCustomer(tx, customerId, installCode) {
  const customer = await tx.customer.findUnique({
    where: { id: String(customerId || "").trim() },
    select: { nationalId: true },
  });

  const nationalId = String(customer?.nationalId || "").trim();
  if (!nationalId) {
    return generateClientSecret();
  }

  const existing = await tx.device.findFirst({
    where: { clientSecret: nationalId },
    select: { id: true },
  });

  if (!existing) {
    return nationalId;
  }

  const suffix = String(installCode || "").trim() || generateInstallCode();
  const derived = `${nationalId}-${suffix}`;
  const existingDerived = await tx.device.findFirst({
    where: { clientSecret: derived },
    select: { id: true },
  });

  if (!existingDerived) {
    return derived;
  }

  return generateClientSecret();
}

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
  const safeStatus = device.currentStatus || DeviceStatus.ACTIVO;
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
    status: safeStatus,
    customerName: device.customer.fullName,
    message: getMobileStatusMessage(safeStatus),
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

router.get("/provisioning/hexnode-qr", asyncHandler(async (_req, res) => {
  const provisioning = getHexnodeProvisioningQr();
  return res.json({ ok: true, provisioning });
}));

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
  const { customerId, brand, model, alias, imei, installCode, notes, hexnodeDeviceId } = req.body || {};
  const normalizedCustomerId = asTrimmedString(customerId);
  const normalizedBrand = asTrimmedString(brand);
  const normalizedModel = asTrimmedString(model);
  const normalizedImei = asTrimmedString(imei);
  const normalizedInstallCode = asOptionalTrimmedString(installCode);
  const parsedHexnodeDeviceId = hexnodeDeviceId !== undefined && hexnodeDeviceId !== null && String(hexnodeDeviceId).trim()
    ? Number.parseInt(String(hexnodeDeviceId).trim(), 10)
    : null;

  const required = assertRequiredFields([
    ["customerId", normalizedCustomerId],
    ["brand", normalizedBrand],
    ["model", normalizedModel],
    ["imei", normalizedImei],
  ]);

  if (!required.ok) {
    return sendBadRequest(
      res,
      "customerId, brand, model e imei son obligatorios",
      `Faltan: ${required.missing.join(", ")}`
    );
  }

  if (parsedHexnodeDeviceId !== null && (!Number.isInteger(parsedHexnodeDeviceId) || parsedHexnodeDeviceId <= 0)) {
    return sendBadRequest(res, "hexnodeDeviceId invalido");
  }

  try {
    let finalInstallCode = normalizedInstallCode;

    if (!finalInstallCode) {
      for (let index = 0; index < 7; index += 1) {
        const candidate = generateInstallCode();
        // eslint-disable-next-line no-await-in-loop
        const exists = await prisma.device.findUnique({ where: { installCode: candidate } });
        if (!exists) {
          finalInstallCode = candidate;
          break;
        }
      }
    }

    if (!finalInstallCode) {
      return sendServerError(res, "No se pudo generar installCode unico");
    }
    const device = await prisma.$transaction(async (tx) => {
      const clientSecret = await buildClientSecretFromCustomer(tx, normalizedCustomerId, finalInstallCode);
      const created = await tx.device.create({
        data: {
          customerId: normalizedCustomerId,
          brand: normalizedBrand,
          model: normalizedModel,
          alias: asOptionalTrimmedString(alias),
          imei: normalizedImei,
          installCode: finalInstallCode,
          hexnodeDeviceId: parsedHexnodeDeviceId,
          clientSecret,
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

      await tx.deviceStatusHistory.create({
        data: {
          deviceId: created.id,
          newStatus: DeviceStatus.ACTIVO,
          changedByUserId: req.user.id,
          reason: "Dispositivo registrado",
        },
      });

      return created;
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

router.delete("/:id", asyncHandler(async (req, res) => {
  const current = await prisma.device.findUnique({
    where: { id: req.params.id },
    include: {
      customer: {
        select: {
          id: true,
          fullName: true,
          nationalId: true,
        },
      },
    },
  });

  if (!current) {
    return sendNotFound(res, "Dispositivo no encontrado");
  }

  await prisma.$transaction(async (tx) => {
    await registerTrashEntry({
      client: tx,
      entityType: "device",
      entityId: current.id,
      summary: `${current.brand} ${current.model} (${current.installCode})`,
      payload: {
        id: current.id,
        brand: current.brand,
        model: current.model,
        imei: current.imei,
        installCode: current.installCode,
        customer: current.customer,
      },
      deletedByUserId: req.user.id,
    });

    await tx.device.delete({
      where: { id: current.id },
    });
  });

  return res.json({
    ok: true,
    message: "Dispositivo enviado a papelera (purga automatica en 30 dias)",
    deviceId: current.id,
  });
}));

router.post("/:id/link-hexnode", asyncHandler(async (req, res) => {
  const device = await prisma.device.findUnique({
    where: { id: req.params.id },
  });

  if (!device) {
    return sendNotFound(res, "Dispositivo no encontrado");
  }

  if (!isHexnodeConfigured()) {
    return sendBadRequest(res, "Hexnode no esta configurado en el backend");
  }

  const resolved = await resolveHexnodeDeviceMatch(device, { useDefault: false });
  if (!resolved?.hexnodeDeviceId) {
    return sendNotFound(res, "No se pudo vincular con un equipo de Hexnode");
  }

  const updated = await prisma.device.update({
    where: { id: device.id },
    data: {
      hexnodeDeviceId: resolved.hexnodeDeviceId,
      notes: device.notes || null,
    },
  });

  return res.json({
    ok: true,
    device: updated,
    hexnode: {
      linked: true,
      resolvedBy: resolved.source,
      hexnodeDeviceId: resolved.hexnodeDeviceId,
    },
  });
}));

router.post("/link-hexnode-all", asyncHandler(async (_req, res) => {
  if (!isHexnodeConfigured()) {
    return sendBadRequest(res, "Hexnode no esta configurado en el backend");
  }

  const devices = await prisma.device.findMany({
    where: {
      hexnodeDeviceId: null,
    },
    orderBy: { createdAt: "asc" },
  });

  const results = [];
  for (const device of devices) {
    // eslint-disable-next-line no-await-in-loop
    const resolved = await resolveHexnodeDeviceMatch(device, { useDefault: false });
    if (!resolved?.hexnodeDeviceId) {
      results.push({
        deviceId: device.id,
        installCode: device.installCode,
        linked: false,
      });
      continue;
    }

    try {
      // eslint-disable-next-line no-await-in-loop
      await prisma.device.update({
        where: { id: device.id },
        data: { hexnodeDeviceId: resolved.hexnodeDeviceId },
      });
      results.push({
        deviceId: device.id,
        installCode: device.installCode,
        linked: true,
        hexnodeDeviceId: resolved.hexnodeDeviceId,
        resolvedBy: resolved.source,
      });
    } catch (error) {
      results.push({
        deviceId: device.id,
        installCode: device.installCode,
        linked: false,
        error: error?.message || "no_se_pudo_guardar",
      });
    }
  }

  const linkedCount = results.filter((entry) => entry.linked).length;
  return res.json({
    ok: true,
    totalPending: devices.length,
    linkedCount,
    results,
  });
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

  let hexnode = {
    ok: false,
    skipped: "device_not_found",
  };

  if (device) {
    await sendDeviceStatusPush(device);

    if (isHexnodeConfigured()) {
      try {
        hexnode = await applyHexnodePolicyForStatus(device, requestedStatus);
      } catch (error) {
        hexnode = {
          ok: false,
          error: error?.message || "No se pudo sincronizar Hexnode",
        };
      }
    } else {
      hexnode = {
        ok: false,
        skipped: "hexnode_not_configured",
      };
    }
  }

  return res.json({ ok: true, device, hexnode });
}));

router.post("/:id/recalculate-status", asyncHandler(async (req, res) => {
  const device = await syncDeviceStatus(req.params.id, req.user.id, "Recalculado manualmente");

  if (!device) {
    return sendNotFound(res, "Dispositivo no encontrado");
  }

  return res.json({ ok: true, device });
}));

router.post("/:id/sync-hexnode", asyncHandler(async (req, res) => {
  const device = await prisma.device.findUnique({
    where: { id: req.params.id },
  });

  if (!device) {
    return sendNotFound(res, "Dispositivo no encontrado");
  }

  if (!isHexnodeConfigured()) {
    return sendBadRequest(res, "Hexnode no esta configurado en el backend");
  }

  try {
    const hexnode = await applyHexnodePolicyForStatus(device, device.currentStatus);
    return res.json({ ok: true, deviceId: device.id, status: device.currentStatus, hexnode });
  } catch (error) {
    return sendServerError(res, error?.message || "No se pudo sincronizar con Hexnode");
  }
}));

router.post("/:id/rotate-client-secret", asyncHandler(async (req, res) => {
  const device = await prisma.device.findUnique({
    where: { id: req.params.id },
    include: {
      customer: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!device) {
    return sendNotFound(res, "Dispositivo no encontrado");
  }
  const updated = await prisma.$transaction(async (tx) => {
    const rotatedSecret = await buildClientSecretFromCustomer(tx, device.customerId, device.installCode);
    return tx.device.update({
      where: { id: req.params.id },
      data: {
        clientSecret: rotatedSecret,
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
  });

  return res.json({
    ok: true,
    message: "Secreto del dispositivo rotado",
    device: updated,
  });
}));

export default router;
