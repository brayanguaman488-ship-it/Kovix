import prismaPackage from "@prisma/client";

import { prisma } from "./prisma.js";

const { PaymentStatus, InstallmentStatus } = prismaPackage;

function startOfDay(value) {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function buildDueDateFilter(todayStart) {
  return {
    lt: todayStart,
  };
}

function buildNotDueDateFilter(todayStart) {
  return {
    gte: todayStart,
  };
}

export async function syncAutomaticAgingStatuses(deviceId = null) {
  const todayStart = startOfDay(new Date());
  const paymentWhere = deviceId ? { deviceId } : {};
  const installmentWhere = deviceId ? { contract: { deviceId } } : {};

  await prisma.payment.updateMany({
    where: {
      ...paymentWhere,
      status: PaymentStatus.PENDIENTE,
      dueDate: buildDueDateFilter(todayStart),
    },
    data: {
      status: PaymentStatus.VENCIDO,
    },
  });

  await prisma.payment.updateMany({
    where: {
      ...paymentWhere,
      status: PaymentStatus.VENCIDO,
      dueDate: buildNotDueDateFilter(todayStart),
    },
    data: {
      status: PaymentStatus.PENDIENTE,
    },
  });

  await prisma.installment.updateMany({
    where: {
      ...installmentWhere,
      status: InstallmentStatus.PENDIENTE,
      dueDate: buildDueDateFilter(todayStart),
    },
    data: {
      status: InstallmentStatus.VENCIDO,
    },
  });

  await prisma.installment.updateMany({
    where: {
      ...installmentWhere,
      status: InstallmentStatus.VENCIDO,
      dueDate: buildNotDueDateFilter(todayStart),
    },
    data: {
      status: InstallmentStatus.PENDIENTE,
    },
  });
}
