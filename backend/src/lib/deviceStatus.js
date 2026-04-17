import prismaPackage from "@prisma/client";

import { prisma } from "./prisma.js";
import { sendDeviceStatusPush } from "./pushNotifications.js";
import { applyHexnodePolicyForStatus, isHexnodeConfigured } from "./hexnode.js";

const { DeviceStatus, PaymentStatus } = prismaPackage;

function normalizeDate(value) {
  return new Date(value);
}

export function getDerivedDeviceStatus(payments, now = new Date()) {
  const currentDate = normalizeDate(now);
  const overduePayments = payments
    .filter((payment) => payment.status !== PaymentStatus.PAGADO && payment.status !== PaymentStatus.CANCELADO)
    .filter((payment) => normalizeDate(payment.dueDate) < currentDate)
    .sort((a, b) => normalizeDate(a.dueDate) - normalizeDate(b.dueDate));

  if (overduePayments.length === 0) {
    return DeviceStatus.ACTIVO;
  }

  const oldestOverdue = overduePayments[0];
  const msLate = currentDate.getTime() - normalizeDate(oldestOverdue.dueDate).getTime();
  const lateDays = Math.floor(msLate / (1000 * 60 * 60 * 24));

  if (lateDays >= 30) {
    return DeviceStatus.BLOQUEADO;
  }

  if (lateDays >= 7) {
    return DeviceStatus.SOLO_LLAMADAS;
  }

  return DeviceStatus.PAGO_PENDIENTE;
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
