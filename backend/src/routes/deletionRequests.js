import { Router } from "express";
import prismaPackage from "@prisma/client";

import { asyncHandler } from "../lib/asyncHandler.js";
import { sendBadRequest, sendNotFound, sendServerError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { asOptionalTrimmedString, asTrimmedString } from "../lib/validation.js";
import authMiddleware from "../middleware/auth.js";
import { isTiendaRole } from "../lib/dataScope.js";

const router = Router();
const { DeletionRequestStatus } = prismaPackage;

function canReview(role) {
  const normalized = String(role || "").toUpperCase();
  return normalized === "ADMIN" || normalized === "GERENCIA";
}

router.use(authMiddleware);

router.get("/", asyncHandler(async (req, res) => {
  const statusParam = asTrimmedString(req.query?.status).toUpperCase();
  const search = asTrimmedString(req.query?.search);

  const where = {};

  if (!canReview(req.user?.role)) {
    where.requestedByUserId = req.user.id;
  }

  if (statusParam && statusParam !== "ALL") {
    if (!Object.values(DeletionRequestStatus).includes(statusParam)) {
      return sendBadRequest(res, "status invalido. Usa: PENDIENTE, APROBADA, RECHAZADA o ALL");
    }
    where.status = statusParam;
  }

  if (search) {
    where.OR = [
      { summary: { contains: search, mode: "insensitive" } },
      { observation: { contains: search, mode: "insensitive" } },
      { entityId: { contains: search, mode: "insensitive" } },
    ];
  }

  const requests = await prisma.deletionRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      requestedByUser: {
        select: { id: true, username: true, fullName: true, role: true },
      },
      resolvedByUser: {
        select: { id: true, username: true, fullName: true, role: true },
      },
    },
  });

  return res.json({ ok: true, requests });
}));

router.post("/", asyncHandler(async (req, res) => {
  const entityType = asTrimmedString(req.body?.entityType).toLowerCase();
  const entityId = asTrimmedString(req.body?.entityId);
  const observation = asTrimmedString(req.body?.observation);
  const summary = asOptionalTrimmedString(req.body?.summary);

  if (!entityType || !entityId || !observation) {
    return sendBadRequest(res, "entityType, entityId y observation son obligatorios");
  }

  if (observation.length < 5) {
    return sendBadRequest(res, "observation debe tener al menos 5 caracteres");
  }

  const allowedEntityTypes = ["customer", "device", "payment", "customer_asset"];
  if (!allowedEntityTypes.includes(entityType)) {
    return sendBadRequest(res, "entityType invalido");
  }

  const existingPending = await prisma.deletionRequest.findFirst({
    where: {
      entityType,
      entityId,
      status: DeletionRequestStatus.PENDIENTE,
    },
    select: { id: true },
  });

  if (existingPending) {
    return sendBadRequest(res, "Ya existe una solicitud pendiente para este registro");
  }

  const created = await prisma.deletionRequest.create({
    data: {
      entityType,
      entityId,
      summary,
      observation,
      requestedByUserId: req.user?.id || null,
    },
    include: {
      requestedByUser: {
        select: { id: true, username: true, fullName: true, role: true },
      },
    },
  });

  return res.status(201).json({ ok: true, request: created });
}));

router.patch("/:id/resolve", asyncHandler(async (req, res) => {
  if (!canReview(req.user?.role)) {
    return res.status(403).json({ ok: false, message: "Solo ADMIN o GERENCIA pueden resolver solicitudes" });
  }

  const status = asTrimmedString(req.body?.status).toUpperCase();
  const resolutionNotes = asOptionalTrimmedString(req.body?.resolutionNotes);

  if (status !== "APROBADA" && status !== "RECHAZADA") {
    return sendBadRequest(res, "status invalido. Usa APROBADA o RECHAZADA");
  }

  try {
    const updated = await prisma.deletionRequest.update({
      where: { id: req.params.id },
      data: {
        status,
        resolutionNotes,
        resolvedAt: new Date(),
        resolvedByUserId: req.user.id,
      },
      include: {
        requestedByUser: {
          select: { id: true, username: true, fullName: true, role: true },
        },
        resolvedByUser: {
          select: { id: true, username: true, fullName: true, role: true },
        },
      },
    });

    return res.json({ ok: true, request: updated });
  } catch (error) {
    if (error?.code === "P2025") {
      return sendNotFound(res, "Solicitud no encontrada");
    }

    return sendServerError(res, "No se pudo resolver la solicitud");
  }
}));

function blockTiendaDelete(req, res) {
  if (!isTiendaRole(req.user?.role)) {
    return false;
  }

  res.status(403).json({
    ok: false,
    requiresDeletionRequest: true,
    message: "TIENDA no puede eliminar directamente. Debe crear solicitud de eliminacion.",
  });

  return true;
}

export { blockTiendaDelete };
export default router;
