import prismaPackage from "@prisma/client";

import { prisma } from "./prisma.js";
import { sendDeviceStatusPush } from "./pushNotifications.js";
import { applyHexnodePolicyForStatus, isHexnodeConfigured } from "./hexnode.js";

const { DeviceStatus, PaymentStatus } = prismaPackage;
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

export async function syncDeviceStatus(deviceId, changedByUserId, reason) {
  const device = await prisma.device.findUnique({
    where: { id: deviceId },
    include: {
      payments: true,
    },
  });

  if (!device) {
    return null;
  }

  const nextStatus = getDerivedDeviceStatus(device.payments);

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

  await prisma.$transaction([
    prisma.device.update({
      where: { id: deviceId },
      data: {
        currentStatus: nextStatus,
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
    await sendDeviceStatusPush(updated);

    if (isHexnodeConfigured()) {
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
