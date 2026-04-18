import { Router } from "express";

import { asyncHandler } from "../lib/asyncHandler.js";
import { sendBadRequest, sendNotFound, sendServerError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { asTrimmedString } from "../lib/validation.js";
import authMiddleware from "../middleware/auth.js";

const router = Router();

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const CONTRACT_MIME_TYPES = new Set(["application/pdf", "image/jpeg", "image/png"]);
const PHOTO_MIME_TYPES = new Set(["image/jpeg", "image/png"]);

function normalizeCategory(value) {
  return asTrimmedString(value).toUpperCase();
}

function isAllowedMimeType(category, mimeType) {
  if (category === "CONTRACT") {
    return CONTRACT_MIME_TYPES.has(mimeType);
  }
  if (category === "PHOTO") {
    return PHOTO_MIME_TYPES.has(mimeType);
  }
  return false;
}

router.use(authMiddleware);

router.get("/", asyncHandler(async (req, res) => {
  const customerId = asTrimmedString(req.query?.customerId);

  if (!customerId) {
    return sendBadRequest(res, "customerId es obligatorio");
  }

  const assets = await prisma.customerAsset.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      customerId: true,
      category: true,
      fileName: true,
      mimeType: true,
      fileSize: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return res.json({ ok: true, assets });
}));

router.post("/", asyncHandler(async (req, res) => {
  const customerId = asTrimmedString(req.body?.customerId);
  const category = normalizeCategory(req.body?.category);
  const fileName = asTrimmedString(req.body?.fileName);
  const mimeType = asTrimmedString(req.body?.mimeType).toLowerCase();
  const base64Data = asTrimmedString(req.body?.base64Data);

  if (!customerId || !category || !fileName || !mimeType || !base64Data) {
    return sendBadRequest(res, "customerId, category, fileName, mimeType y base64Data son obligatorios");
  }

  if (!["CONTRACT", "PHOTO"].includes(category)) {
    return sendBadRequest(res, "category invalida. Usa CONTRACT o PHOTO");
  }

  if (!isAllowedMimeType(category, mimeType)) {
    return sendBadRequest(res, "Tipo de archivo no permitido para la categoria seleccionada");
  }

  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true },
  });

  if (!customer) {
    return sendNotFound(res, "Cliente no encontrado");
  }

  let dataBuffer;
  try {
    dataBuffer = Buffer.from(base64Data, "base64");
  } catch {
    return sendBadRequest(res, "base64Data invalido");
  }

  if (!dataBuffer || dataBuffer.length === 0) {
    return sendBadRequest(res, "No se pudo decodificar el archivo");
  }

  if (dataBuffer.length > MAX_FILE_SIZE_BYTES) {
    return sendBadRequest(res, "Archivo demasiado grande. Maximo permitido: 10 MB");
  }

  try {
    const asset = await prisma.customerAsset.create({
      data: {
        customerId,
        category,
        fileName,
        mimeType,
        fileSize: dataBuffer.length,
        data: dataBuffer,
      },
      select: {
        id: true,
        customerId: true,
        category: true,
        fileName: true,
        mimeType: true,
        fileSize: true,
        createdAt: true,
      },
    });

    return res.status(201).json({ ok: true, asset });
  } catch (error) {
    return sendServerError(res, "No se pudo guardar el archivo", error?.message);
  }
}));

router.get("/:id/content", asyncHandler(async (req, res) => {
  const id = asTrimmedString(req.params?.id);
  const disposition = asTrimmedString(req.query?.disposition).toLowerCase() === "attachment"
    ? "attachment"
    : "inline";

  const asset = await prisma.customerAsset.findUnique({
    where: { id },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      data: true,
    },
  });

  if (!asset) {
    return sendNotFound(res, "Archivo no encontrado");
  }

  res.setHeader("Content-Type", asset.mimeType || "application/octet-stream");
  res.setHeader("Content-Disposition", `${disposition}; filename="${asset.fileName}"`);
  return res.send(Buffer.from(asset.data));
}));

export default router;
