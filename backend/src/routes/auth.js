import { Router } from "express";
import bcrypt from "bcryptjs";

import { asyncHandler } from "../lib/asyncHandler.js";
import { isPrismaUniqueConstraintError, sendBadRequest, sendNotFound, sendServerError, sendUnauthorized } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { asTrimmedString } from "../lib/validation.js";
import authMiddleware from "../middleware/auth.js";
import {
  buildAuthCookieOptions,
  COOKIE_NAME,
  sanitizeUser,
  signAuthToken,
} from "../lib/auth.js";

const router = Router();
const ADMIN_ROLE = "ADMIN";
const ALLOWED_ROLES = ["ADMIN", "GERENCIA", "TIENDA"];

function ensureAdmin(req, res) {
  if (String(req.user?.role || "").toUpperCase() !== ADMIN_ROLE) {
    res.status(403).json({ ok: false, message: "Solo administradores pueden gestionar usuarios" });
    return false;
  }
  return true;
}

router.post("/login", asyncHandler(async (req, res) => {
  const username = asTrimmedString(req.body?.username);
  const password = String(req.body?.password || "");

  if (!username || !password) {
    return sendBadRequest(res, "Usuario y contrasena son obligatorios");
  }

  if (username.length < 3 || username.length > 60) {
    return sendBadRequest(res, "Usuario invalido");
  }

  if (password.length < 4 || password.length > 120) {
    return sendBadRequest(res, "Contrasena invalida");
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      return sendUnauthorized(res, "Credenciales incorrectas");
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return sendUnauthorized(res, "Credenciales incorrectas");
    }

    const token = signAuthToken(user);
    res.cookie(COOKIE_NAME, token, buildAuthCookieOptions());

    return res.json({
      ok: true,
      message: "Login correcto",
      user: sanitizeUser(user),
    });
  } catch (error) {
    return sendServerError(res, "No se pudo iniciar sesion");
  }
}));

router.get("/me", authMiddleware, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
  });

  return res.json({ ok: true, user: sanitizeUser(user) });
}));

router.post("/logout", (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: "/" });
  return res.json({ ok: true, message: "Logout correcto" });
});

router.get("/users", authMiddleware, asyncHandler(async (req, res) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
  });

  return res.json({
    ok: true,
    users: users.map((user) => sanitizeUser(user)),
  });
}));

router.post("/users", authMiddleware, asyncHandler(async (req, res) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const username = asTrimmedString(req.body?.username);
  const password = String(req.body?.password || "");
  const fullName = asTrimmedString(req.body?.fullName);
  const role = asTrimmedString(req.body?.role).toUpperCase() || "TIENDA";

  if (!username || !password) {
    return sendBadRequest(res, "username y password son obligatorios");
  }

  if (username.length < 3 || username.length > 60) {
    return sendBadRequest(res, "username invalido");
  }

  if (password.length < 4 || password.length > 120) {
    return sendBadRequest(res, "password invalido");
  }

  if (!ALLOWED_ROLES.includes(role)) {
    return sendBadRequest(res, "role invalido. Usa ADMIN, GERENCIA o TIENDA");
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        fullName: fullName || null,
        role,
      },
    });

    return res.status(201).json({
      ok: true,
      user: sanitizeUser(user),
    });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      return sendBadRequest(res, "Ya existe un usuario con ese username");
    }

    return sendServerError(res, "No se pudo crear el usuario");
  }
}));

router.patch("/users/:id/password", authMiddleware, asyncHandler(async (req, res) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const password = String(req.body?.password || "");
  if (!password || password.length < 4 || password.length > 120) {
    return sendBadRequest(res, "password invalido");
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { passwordHash },
    });

    return res.json({
      ok: true,
      user: sanitizeUser(user),
      message: "Contrasena actualizada",
    });
  } catch (error) {
    if (error?.code === "P2025") {
      return sendNotFound(res, "Usuario no encontrado");
    }

    return sendServerError(res, "No se pudo actualizar la contrasena");
  }
}));

export default router;

