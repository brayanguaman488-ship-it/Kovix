import { Router } from "express";
import prismaPackage from "@prisma/client";

import { asyncHandler } from "../lib/asyncHandler.js";
import { sendBadRequest, sendNotFound, sendServerError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { asOptionalTrimmedString, asTrimmedString, assertRequiredFields } from "../lib/validation.js";
import authMiddleware from "../middleware/auth.js";

const router = Router();
const { EquifaxConsultationStatus } = prismaPackage;

router.use(authMiddleware);

router.get("/", asyncHandler(async (req, res) => {
  const statusParam = asTrimmedString(req.query?.status).toUpperCase();
  const searchParam = asTrimmedString(req.query?.search);
  const limitParam = Number(req.query?.limit || 0);
  const retentionRaw = Number(process.env.EQUIFAX_RESPONDED_RETENTION_DAYS || 15);
  const retentionDays = Number.isFinite(retentionRaw) && retentionRaw > 0 ? retentionRaw : 15;
  const respondedCutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const where = {
    AND: [
      {
        OR: [
          { status: EquifaxConsultationStatus.PENDIENTE },
          {
            status: EquifaxConsultationStatus.RESPONDIDA,
            respondedAt: { gte: respondedCutoff },
          },
        ],
      },
    ],
  };

  if (statusParam && statusParam !== "ALL") {
    if (!Object.values(EquifaxConsultationStatus).includes(statusParam)) {
      return sendBadRequest(res, "status invalido. Usa: PENDIENTE, RESPONDIDA o ALL");
    }
    where.AND.push({ status: statusParam });
  }

  if (searchParam) {
    where.AND.push({
      OR: [
        { queryNationalId: { contains: searchParam, mode: "insensitive" } },
        { queryFullName: { contains: searchParam, mode: "insensitive" } },
        { responseNationalId: { contains: searchParam, mode: "insensitive" } },
        { responseFullName: { contains: searchParam, mode: "insensitive" } },
      ],
    });
  }

  const consultations = await prisma.equifaxConsultation.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Number.isInteger(limitParam) && limitParam > 0 ? Math.min(limitParam, 200) : undefined,
    include: {
      requestedByUser: {
        select: { id: true, username: true, fullName: true },
      },
      respondedByUser: {
        select: { id: true, username: true, fullName: true },
      },
    },
  });

  return res.json({
    ok: true,
    consultations,
    retentionDays,
    cutoffDate: respondedCutoff.toISOString(),
  });
}));

router.post("/", asyncHandler(async (req, res) => {
  const { queryNationalId, queryFullName, queryNotes } = req.body || {};

  const normalizedNationalId = asTrimmedString(queryNationalId);
  const normalizedFullName = asTrimmedString(queryFullName);

  const required = assertRequiredFields([
    ["queryNationalId", normalizedNationalId],
    ["queryFullName", normalizedFullName],
  ]);

  if (!required.ok) {
    return sendBadRequest(
      res,
      "queryNationalId y queryFullName son obligatorios",
      `Faltan: ${required.missing.join(", ")}`
    );
  }

  try {
    const consultation = await prisma.equifaxConsultation.create({
      data: {
        queryNationalId: normalizedNationalId,
        queryFullName: normalizedFullName,
        queryNotes: asOptionalTrimmedString(queryNotes),
        requestedByUserId: req.user.id,
      },
      include: {
        requestedByUser: {
          select: { id: true, username: true, fullName: true },
        },
      },
    });

    return res.status(201).json({ ok: true, consultation });
  } catch (error) {
    return sendServerError(res, "No se pudo crear la consulta Equifax");
  }
}));

router.patch("/:id/respond", asyncHandler(async (req, res) => {
  const {
    responseNationalId,
    responseFullName,
    hasGoodCredit,
    highEndPhoneEligible,
    maxDebtAmount,
    responseNotes,
  } = req.body || {};

  const normalizedNationalId = asTrimmedString(responseNationalId);
  const normalizedFullName = asTrimmedString(responseFullName);

  const required = assertRequiredFields([
    ["responseNationalId", normalizedNationalId],
    ["responseFullName", normalizedFullName],
  ]);

  if (!required.ok) {
    return sendBadRequest(
      res,
      "responseNationalId y responseFullName son obligatorios",
      `Faltan: ${required.missing.join(", ")}`
    );
  }

  if (hasGoodCredit !== undefined && typeof hasGoodCredit !== "boolean") {
    return sendBadRequest(res, "hasGoodCredit debe ser true o false");
  }

  if (highEndPhoneEligible !== undefined && typeof highEndPhoneEligible !== "boolean") {
    return sendBadRequest(res, "highEndPhoneEligible debe ser true o false");
  }

  let parsedMaxDebtAmount = null;
  if (maxDebtAmount !== undefined && maxDebtAmount !== null && String(maxDebtAmount).trim() !== "") {
    const amount = Number(maxDebtAmount);
    if (!Number.isFinite(amount) || amount < 0) {
      return sendBadRequest(res, "maxDebtAmount debe ser un numero mayor o igual a 0");
    }
    parsedMaxDebtAmount = amount;
  }

  try {
    const consultation = await prisma.equifaxConsultation.update({
      where: { id: req.params.id },
      data: {
        responseNationalId: normalizedNationalId,
        responseFullName: normalizedFullName,
        hasGoodCredit: hasGoodCredit === undefined ? null : hasGoodCredit,
        highEndPhoneEligible: highEndPhoneEligible === undefined ? null : highEndPhoneEligible,
        maxDebtAmount: parsedMaxDebtAmount,
        responseNotes: asOptionalTrimmedString(responseNotes),
        status: EquifaxConsultationStatus.RESPONDIDA,
        respondedAt: new Date(),
        respondedByUserId: req.user.id,
      },
      include: {
        requestedByUser: {
          select: { id: true, username: true, fullName: true },
        },
        respondedByUser: {
          select: { id: true, username: true, fullName: true },
        },
      },
    });

    return res.json({ ok: true, consultation });
  } catch (error) {
    if (error?.code === "P2025") {
      return sendNotFound(res, "Consulta Equifax no encontrada");
    }
    return sendServerError(res, "No se pudo responder la consulta Equifax");
  }
}));

export default router;
