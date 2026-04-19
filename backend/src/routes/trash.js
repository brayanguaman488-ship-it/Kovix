import { Router } from "express";

import { asyncHandler } from "../lib/asyncHandler.js";
import { sendBadRequest } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
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

router.delete("/:id", asyncHandler(async (req, res) => {
  const id = String(req.params?.id || "").trim();
  if (!id) {
    return sendBadRequest(res, "id es obligatorio");
  }

  await prisma.trashEntry.delete({
    where: { id },
  });

  return res.json({ ok: true, id, message: "Registro eliminado de papelera" });
}));

export default router;
