import prismaPackage from "@prisma/client";

import { prisma } from "./prisma.js";
import { sendDeviceStatusPush } from "./pushNotifications.js";
import { applyHexnodePolicyForStatus, isHexnodeConfigured } from "./hexnode.js";
import {
  blockIOSDevice,
  isHexnodeIOSConfigured,
  resolveIOSHexnodeDeviceId,
  unblockIOSDevice,
} from "./hexnodeIOS.js";

const { DeviceStatus, DevicePlatform, PaymentStatus } = prismaPackage;
const DAY_MS = 1000 * 60 * 60 * 24;
const WARNING_DAYS_BEFORE_DUE = 5;
const CALLS_ONLY_DAYS_OVERDUE = 1;
const BLOCKED_DAYS_OVERDUE = 3;

function normalizeDate(value) {
  return new Date(value);
}

function startOfDay(value) {
  const date = normalizeDate(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getDerivedDeviceStatus(payments, now = new Date()) {
  const today = startOfDay(now);
  const activeDebtPayments = payments
    .filter((payment) => payment.status !== PaymentStatus.PAGADO && payment.status !== PaymentStatus.CANCELADO)
    .sort((a, b) => normalizeDate(a.dueDate) - normalizeDate(b.dueDate));

  if (activeDebtPayments.length === 0) {
    return DeviceStatus.ACTIVO;
  }

  const nextDuePayment = activeDebtPayments[0];
  const dueDate = startOfDay(nextDuePayment.dueDate);

  if (dueDate < today) {
    const overdueDays = Math.floor((today.getTime() - dueDate.getTime()) / DAY_MS);

    if (overdueDays >= BLOCKED_DAYS_OVERDUE) {
      return DeviceStatus.BLOQUEADO;
    }

    if (overdueDays >= CALLS_ONLY_DAYS_OVERDUE) {
      return DeviceStatus.SOLO_LLAMADAS;
    }

    return DeviceStatus.PAGO_PENDIENTE;
  }

  const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / DAY_MS);
  if (daysUntilDue <= WARNING_DAYS_BEFORE_DUE) {
    return DeviceStatus.PAGO_PENDIENTE;
  }

  return DeviceStatus.ACTIVO;
}

export async function syncDeviceStatus(deviceId, changedByUserId, reason, options = {}) {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    include: {
      payments: true,
    },
  });

  if (!device) {
    return null;
  }

  if (device.manualStatusOverride && !options.force) {
    return prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        customer: true,
        payments: {
          orderBy: { dueDate: "asc" },
        },
      },
    });
  }

  const derivedStatus = getDerivedDeviceStatus(device.payments);
  // iPhone solo tiene dos estados: las etapas de aviso Android se mantienen como ACTIVO.
  const nextStatus = device.platform === DevicePlatform.IOS
    ? (derivedStatus === DeviceStatus.BLOQUEADO ? DeviceStatus.BLOQUEADO : DeviceStatus.ACTIVO)
    : derivedStatus;

  if (device.currentStatus === nextStatus) {
    return prisma.device.findUnique({
      where: { id: deviceId },
      include: {
        customer: true,
        payments: {
          orderBy: { dueDate: "asc" },
        },
      },
    });
  }

  if (device.platform === DevicePlatform.IOS) {
    if (!isHexnodeIOSConfigured()) {
      console.warn(`[hexnode-ios] sincronizacion automatica omitida para ${device.id}: tenant iOS no configurado`);
      return prisma.device.findUnique({
        where: { id: deviceId },
        include: { customer: true, payments: { orderBy: { dueDate: "asc" } } },
      });
    }
    try {
      const hexnodeDeviceId = await resolveIOSHexnodeDeviceId(device);
      if (nextStatus === DeviceStatus.BLOQUEADO) {
        await blockIOSDevice(hexnodeDeviceId);
      } else {
        await unblockIOSDevice(hexnodeDeviceId);
      }
      device.hexnodeDeviceId = hexnodeDeviceId;
    } catch (error) {
      console.warn(`[hexnode-ios] sync automatico fallido para device ${device.id}: ${error?.message || error}`);
      return prisma.device.findUnique({
        where: { id: deviceId },
        include: { customer: true, payments: { orderBy: { dueDate: "asc" } } },
      });
    }
  }

  await prisma.$transaction([
    prisma.device.update({
      where: { id: deviceId },
      data: {
        currentStatus: nextStatus,
        hexnodeDeviceId: device.hexnodeDeviceId || null,
        manualStatusOverride: options.clearManualOverride ? false : device.manualStatusOverride,
        manualStatusReason: options.clearManualOverride ? null : device.manualStatusReason,
        manualStatusChangedAt: options.clearManualOverride ? null : device.manualStatusChangedAt,
        lastStatusChangeAt: new Date(),
      },
    }),
    prisma.deviceStatusHistory.create({
      data: {
        deviceId,
        previousStatus: device.currentStatus,
        newStatus: nextStatus,
        changedByUserId: changedByUserId || null,
        reason: reason || "Estado recalculado por pagos",
      },
    }),
  ]);

  const updated = await prisma.device.findUnique({
    where: { id: deviceId },
    include: {
      customer: true,
      payments: {
        orderBy: { dueDate: "asc" },
      },
    },
  });

  if (updated) {
    if (device.platform === DevicePlatform.ANDROID) {
      await sendDeviceStatusPush(updated);
    }

    if (device.platform === DevicePlatform.ANDROID && isHexnodeConfigured()) {
      try {
        await applyHexnodePolicyForStatus(updated, nextStatus);
      } catch (error) {
        console.warn(`[hexnode] sync automatico fallido para device ${updated.id}: ${error?.message || error}`);
      }
    }
  }

  return updated;
}

export async function syncAllDeviceStatuses(changedByUserId = null, reason = "Sincronizacion automatica por fechas de pago") {
  const devices = await prisma.device.findMany({
    select: { id: true },
  });

  for (const device of devices) {
    // eslint-disable-next-line no-await-in-loop
    await syncDeviceStatus(device.id, changedByUserId, reason);
  }
}
