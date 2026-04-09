import { prisma } from "../lib/prisma.js";
import { COOKIE_NAME, verifyAuthToken } from "../lib/auth.js";

export default async function authMiddleware(req, res, next) {
  const token = req.cookies?.[COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ ok: false, message: "No autenticado" });
  }

  try {
    const payload = verifyAuthToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      return res.status(401).json({ ok: false, message: "Sesion invalida" });
    }

    req.user = {
      id: user.id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
    };

    next();
  } catch (error) {
    return res.status(401).json({ ok: false, message: "Token invalido" });
  }
}
