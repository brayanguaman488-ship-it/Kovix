import prismaPackage from "@prisma/client";

import { prisma } from "./prisma.js";

const { PaymentStatus, InstallmentStatus } = prismaPackage;

function buildDueDateFilter(now) {
  return {
    lt: now,
  };
}

function buildNotDueDateFilter(now) {
  return {
    gte: now,
  };
}

export async function syncAutomaticAgingStatuses(deviceId = null) {
  const now = new Date();
  const paymentWhere = deviceId ? { deviceId } : {};
  const installmentWhere = deviceId ? { contract: { deviceId } } : {};

  await prisma.payment.updateMany({
    where: {
      ...paymentWhere,
      status: PaymentStatus.PENDIENTE,
      dueDate: buildDueDateFilter(now),
    },
    data: {
      status: PaymentStatus.VENCIDO,
    },
  });

  await prisma.payment.updateMany({
    where: {
      ...paymentWhere,
      status: PaymentStatus.VENCIDO,
      dueDate: buildNotDueDateFilter(now),
    },
    data: {
      status: PaymentStatus.PENDIENTE,
    },
  });

  await prisma.installment.updateMany({
    where: {
      ...installmentWhere,
      status: InstallmentStatus.PENDIENTE,
      dueDate: buildDueDateFilter(now),
    },
    data: {
      status: InstallmentStatus.VENCIDO,
    },
  });

  await prisma.installment.updateMany({
    where: {
      ...installmentWhere,
      status: InstallmentStatus.VENCIDO,
      dueDate: buildNotDueDateFilter(now),
    },
    data: {
      status: InstallmentStatus.PENDIENTE,
    },
  });
}
