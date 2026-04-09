import { Router } from "express";
import bcrypt from "bcryptjs";

import { asyncHandler } from "../lib/asyncHandler.js";
import { sendBadRequest, sendServerError, sendUnauthorized } from "../lib/http.js";
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

export default router;

