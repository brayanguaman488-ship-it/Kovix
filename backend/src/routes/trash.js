import { Router } from "express";

import { asyncHandler } from "../lib/asyncHandler.js";
import { isPrismaUniqueConstraintError, sendBadRequest, sendNotFound } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { isTiendaRole } from "../lib/dataScope.js";
import authMiddleware from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.get("/", asyncHandler(async (req, res) => {
  const limitRaw = Number.parseInt(String(req.query?.limit || "80"), 10);
  const limit = Number.isInteger(limitRaw) ? Math.min(Math.max(limitRaw, 1), 300) : 80;
  const entityTypeRaw = String(req.query?.entityType || "").trim().toLowerCase();

  const where = {};
  if (entityTypeRaw) {
    where.entityType = entityTypeRaw;
  }

  if (isTiendaRole(req.user?.role)) {
    where.deletedByUserId = req.user.id;
  }

  const entries = await prisma.trashEntry.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return res.json({
    ok: true,
    entries,
  });
}));

router.post("/:id/restore", asyncHandler(async (req, res) => {
  const id = String(req.params?.id || "").trim();
  if (!id) {
    return sendBadRequest(res, "id es obligatorio");
  }

  const where = { id };
  if (isTiendaRole(req.user?.role)) {
    where.deletedByUserId = req.user.id;
  }

  const entry = await prisma.trashEntry.findFirst({ where });
  if (!entry) {
    return sendNotFound(res, "Registro no encontrado o fuera de alcance");
  }

  const payload = entry.payload || {};
  const entityType = String(entry.entityType || "").toLowerCase();

  try {
    const restored = await prisma.$transaction(async (tx) => {
      if (entityType === "customer") {
        const customer = await tx.customer.create({
          data: {
            id: String(payload.id || entry.entityId),
            fullName: String(payload.fullName || "").trim(),
            nationalId: String(payload.nationalId || "").trim(),
            phone: String(payload.phone || "").trim(),
            referencePersonalPhone1: payload.referencePersonalPhone1 || null,
            referencePersonalPhone2: payload.referencePersonalPhone2 || null,
            referenceWorkPhone: payload.referenceWorkPhone || null,
            address: payload.address || null,
            notes: payload.notes || null,
            createdByUserId: entry.deletedByUserId || req.user.id,
          },
        });
        await tx.trashEntry.delete({ where: { id: entry.id } });
        return { entityType, entity: customer };
      }

      if (entityType === "device") {
        const customerId = String(payload.customer?.id || payload.customerId || "").trim();
        if (!customerId) {
          throw new Error("No se puede restaurar el dispositivo porque falta el cliente original");
        }

        const customer = await tx.customer.findUnique({ where: { id: customerId }, select: { id: true } });
        if (!customer) {
          throw new Error("Restaura primero el cliente original para recuperar este dispositivo");
        }

        const device = await tx.device.create({
          data: {
            id: String(payload.id || entry.entityId),
            customerId,
            brand: String(payload.brand || "").trim(),
            model: String(payload.model || "").trim(),
            alias: payload.alias || null,
            imei: String(payload.imei || "").trim(),
            imei2: payload.imei2 || null,
            installCode: String(payload.installCode || "").trim(),
            hexnodeDeviceId: payload.hexnodeDeviceId || null,
            clientSecret: payload.clientSecret || String(payload.customer?.nationalId || entry.entityId),
            notes: payload.notes || null,
          },
        });
        await tx.trashEntry.delete({ where: { id: entry.id } });
        return { entityType, entity: device };
      }

      if (entityType === "payment") {
        const customerId = String(payload.customer?.id || payload.customerId || "").trim();
        const deviceId = String(payload.device?.id || payload.deviceId || "").trim();
        if (!customerId || !deviceId) {
          throw new Error("No se puede restaurar el pago porque faltan cliente o dispositivo original");
        }

        const [customer, device] = await Promise.all([
          tx.customer.findUnique({ where: { id: customerId }, select: { id: true } }),
          tx.device.findUnique({ where: { id: deviceId }, select: { id: true } }),
        ]);
        if (!customer || !device) {
          throw new Error("Restaura primero el cliente y dispositivo original para recuperar este pago");
        }

        const payment = await tx.payment.create({
          data: {
            id: String(payload.id || entry.entityId),
            customerId,
            deviceId,
            amount: Number(payload.amount || 0),
            currency: payload.currency || "USD",
            dueDate: new Date(payload.dueDate),
            status: payload.status || "PENDIENTE",
            paidAt: payload.paidAt ? new Date(payload.paidAt) : null,
            notes: payload.notes || null,
          },
        });
        await tx.trashEntry.delete({ where: { id: entry.id } });
        return { entityType, entity: payment };
      }

      throw new Error("Este tipo de registro todavia no se puede restaurar automaticamente");
    });

    return res.json({ ok: true, restored, message: "Registro restaurado correctamente" });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      return sendBadRequest(res, "No se pudo restaurar: ya existe un registro con esos datos unicos");
    }
    return sendBadRequest(res, error?.message || "No se pudo restaurar el registro");
  }
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  const id = String(req.params?.id || "").trim();
  if (!id) {
    return sendBadRequest(res, "id es obligatorio");
  }

  if (isTiendaRole(req.user?.role)) {
    const scopedEntry = await prisma.trashEntry.findFirst({
      where: { id, deletedByUserId: req.user.id },
      select: { id: true },
    });

    if (!scopedEntry) {
      return sendBadRequest(res, "Registro no encontrado o fuera de alcance");
    }
  }

  await prisma.trashEntry.delete({
    where: { id },
  });

  return res.json({ ok: true, id, message: "Registro eliminado de papelera" });
}));

export default router;
