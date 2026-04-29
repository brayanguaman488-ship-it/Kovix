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
const ALLOWED_ROLES = ["ADMIN", "GERENCIA", "ADMINISTRADOR", "TIENDA"];
const MAX_AVATAR_DATA_URL_LENGTH = 1_500_000;

function normalizeAvatarDataUrl(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const normalized = String(value || "").trim();
  if (!normalized) {
    return null;
  }

  if (normalized.length > MAX_AVATAR_DATA_URL_LENGTH) {
    throw new Error("avatarDataUrl demasiado grande");
  }

  if (!/^data:image\/(png|jpeg|jpg|webp);base64,[a-zA-Z0-9+/=]+$/i.test(normalized)) {
    throw new Error("avatarDataUrl invalido. Usa PNG/JPG/WEBP en base64");
  }

  return normalized;
}

function ensureAdmin(req, res) {
  if (String(req.user?.role || "").toUpperCase() !== ADMIN_ROLE) {
    res.status(403).json({ ok: false, message: "Solo administradores pueden gestionar usuarios" });
    return false;
  }
  return true;
}

function ensureAdminOrGerencia(req, res) {
  const normalizedRole = String(req.user?.role || "").toUpperCase();
  if (normalizedRole !== "ADMIN" && normalizedRole !== "GERENCIA") {
    res.status(403).json({ ok: false, message: "No autorizado" });
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

router.get("/users/scope-list", authMiddleware, asyncHandler(async (req, res) => {
  if (!ensureAdminOrGerencia(req, res)) {
    return;
  }

  const users = await prisma.user.findMany({
    orderBy: [
      { role: "asc" },
      { fullName: "asc" },
      { username: "asc" },
    ],
    select: {
      id: true,
      username: true,
      fullName: true,
      avatarDataUrl: true,
      role: true,
    },
  });

  return res.json({
    ok: true,
    users,
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
  let avatarDataUrl;

  try {
    avatarDataUrl = normalizeAvatarDataUrl(req.body?.avatarDataUrl);
  } catch (error) {
    return sendBadRequest(res, error?.message || "avatarDataUrl invalido");
  }

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
    return sendBadRequest(res, "role invalido. Usa ADMIN, GERENCIA, ADMINISTRADOR o TIENDA");
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        fullName: fullName || null,
        avatarDataUrl: avatarDataUrl ?? null,
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

router.patch("/users/:id", authMiddleware, asyncHandler(async (req, res) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const username = req.body?.username !== undefined ? asTrimmedString(req.body?.username) : undefined;
  const fullName = req.body?.fullName !== undefined ? asTrimmedString(req.body?.fullName) : undefined;
  let avatarDataUrl;

  try {
    avatarDataUrl = normalizeAvatarDataUrl(req.body?.avatarDataUrl);
  } catch (error) {
    return sendBadRequest(res, error?.message || "avatarDataUrl invalido");
  }

  const data = {};

  if (username !== undefined) {
    if (!username || username.length < 3 || username.length > 60) {
      return sendBadRequest(res, "username invalido");
    }
    data.username = username;
  }

  if (fullName !== undefined) {
    data.fullName = fullName || null;
  }

  if (avatarDataUrl !== undefined) {
    data.avatarDataUrl = avatarDataUrl;
  }

  if (Object.keys(data).length === 0) {
    return sendBadRequest(res, "No hay cambios para guardar");
  }

  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
    });

    return res.json({
      ok: true,
      user: sanitizeUser(user),
      message: "Usuario actualizado",
    });
  } catch (error) {
    if (error?.code === "P2025") {
      return sendNotFound(res, "Usuario no encontrado");
    }
    if (isPrismaUniqueConstraintError(error)) {
      return sendBadRequest(res, "Ya existe un usuario con ese username");
    }

    return sendServerError(res, "No se pudo actualizar el usuario");
  }
}));

router.delete("/users/:id", authMiddleware, asyncHandler(async (req, res) => {
  if (!ensureAdmin(req, res)) {
    return;
  }

  const targetId = asTrimmedString(req.params?.id);
  if (!targetId) {
    return sendBadRequest(res, "ID de usuario invalido");
  }

  if (targetId === req.user.id) {
    return sendBadRequest(res, "No puedes eliminar tu propio usuario");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetId },
  });

  if (!targetUser) {
    return sendNotFound(res, "Usuario no encontrado");
  }

  if (String(targetUser.role || "").toUpperCase() === ADMIN_ROLE) {
    const totalAdmins = await prisma.user.count({
      where: { role: ADMIN_ROLE },
    });

    if (totalAdmins <= 1) {
      return sendBadRequest(res, "No puedes eliminar el ultimo ADMIN del sistema");
    }
  }

  await prisma.user.delete({
    where: { id: targetId },
  });

  return res.json({
    ok: true,
    message: "Usuario eliminado",
    userId: targetId,
  });
}));

export default router;

