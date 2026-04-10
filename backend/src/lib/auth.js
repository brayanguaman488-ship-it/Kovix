import jwt from "jsonwebtoken";

export const COOKIE_NAME = "kovix_token";

export function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  return process.env.JWT_SECRET;
}

export function signAuthToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      username: user.username,
      role: user.role,
    },
    getJwtSecret(),
    { expiresIn: "2h" }
  );
}

export function verifyAuthToken(token) {
  const currentSecret = getJwtSecret();
  const previousSecret = process.env.JWT_SECRET_PREVIOUS;

  try {
    return jwt.verify(token, currentSecret);
  } catch (error) {
    // Permite rotacion de secreto sin cortar sesiones activas inmediatamente.
    if (previousSecret) {
      return jwt.verify(token, previousSecret);
    }
    throw error;
  }
}

export function buildAuthCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    // En produccion (panel/api en distintos subdominios) el navegador requiere
    // SameSite=None + Secure para conservar cookie en requests cross-origin.
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
    path: "/",
    maxAge: 2 * 60 * 60 * 1000,
  };
}

export function sanitizeUser(user) {
  return {
    id: user.id,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
