import { Router } from "express";

import { asyncHandler } from "../lib/asyncHandler.js";
import { isPrismaUniqueConstraintError, sendBadRequest, sendNotFound, sendServerError } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { asOptionalTrimmedString, asTrimmedString, assertRequiredFields } from "../lib/validation.js";
import authMiddleware from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.get("/", asyncHandler(async (req, res) => {
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      devices: {
        orderBy: { createdAt: "desc" },
      },
      payments: {
        orderBy: { dueDate: "desc" },
      },
    },
  });

  return res.json({ ok: true, customers });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: {
      devices: {
        orderBy: { createdAt: "desc" },
        include: {
          payments: {
            orderBy: { dueDate: "asc" },
          },
          statusHistory: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      },
      payments: {
        orderBy: { dueDate: "desc" },
      },
    },
  });

  if (!customer) {
    return sendNotFound(res, "Cliente no encontrado");
  }

  return res.json({ ok: true, customer });
}));

router.post("/", asyncHandler(async (req, res) => {
  const { fullName, nationalId, phone, address, notes } = req.body || {};
  const normalizedFullName = asTrimmedString(fullName);
  const normalizedNationalId = asTrimmedString(nationalId);
  const normalizedPhone = asTrimmedString(phone);

  const required = assertRequiredFields([
    ["fullName", normalizedFullName],
    ["nationalId", normalizedNationalId],
    ["phone", normalizedPhone],
  ]);

  if (!required.ok) {
    return sendBadRequest(
      res,
      "fullName, nationalId y phone son obligatorios",
      `Faltan: ${required.missing.join(", ")}`
    );
  }

  try {
    const customer = await prisma.customer.create({
      data: {
        fullName: normalizedFullName,
        nationalId: normalizedNationalId,
        phone: normalizedPhone,
        address: asOptionalTrimmedString(address),
        notes: asOptionalTrimmedString(notes),
      },
    });

    return res.status(201).json({ ok: true, customer });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      return sendBadRequest(res, "El cliente ya existe con ese documento");
    }

    return sendServerError(res, "No se pudo crear el cliente");
  }
}));

router.put("/:id", asyncHandler(async (req, res) => {
  const { fullName, nationalId, phone, address, notes } = req.body || {};
  const payload = {};

  if (fullName !== undefined) {
    const value = asTrimmedString(fullName);
    if (!value) {
      return sendBadRequest(res, "fullName no puede estar vacio");
    }
    payload.fullName = value;
  }

  if (nationalId !== undefined) {
    const value = asTrimmedString(nationalId);
    if (!value) {
      return sendBadRequest(res, "nationalId no puede estar vacio");
    }
    payload.nationalId = value;
  }

  if (phone !== undefined) {
    const value = asTrimmedString(phone);
    if (!value) {
      return sendBadRequest(res, "phone no puede estar vacio");
    }
    payload.phone = value;
  }

  if (address !== undefined) {
    payload.address = asOptionalTrimmedString(address);
  }

  if (notes !== undefined) {
    payload.notes = asOptionalTrimmedString(notes);
  }

  if (Object.keys(payload).length === 0) {
    return sendBadRequest(res, "No hay campos para actualizar");
  }

  try {
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: payload,
    });

    return res.json({ ok: true, customer });
  } catch (error) {
    if (error?.code === "P2025") {
      return sendNotFound(res, "Cliente no encontrado");
    }

    if (isPrismaUniqueConstraintError(error)) {
      return sendBadRequest(res, "Ya existe un cliente con ese documento");
    }

    return sendServerError(res, "No se pudo actualizar el cliente");
  }
}));

router.delete("/:id", asyncHandler(async (req, res) => {
  try {
    await prisma.customer.delete({
      where: { id: req.params.id },
    });

    return res.json({ ok: true, message: "Cliente eliminado" });
  } catch (error) {
    if (error?.code === "P2025") {
      return sendNotFound(res, "Cliente no encontrado");
    }

    return sendServerError(res, "No se pudo eliminar el cliente");
  }
}));

export default router;
