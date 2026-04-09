export function sendBadRequest(res, message, details) {
  const payload = { ok: false, message };

  if (details) {
    payload.details = details;
  }

  return res.status(400).json(payload);
}

export function sendNotFound(res, message) {
  return res.status(404).json({ ok: false, message });
}

export function sendUnauthorized(res, message = "No autenticado") {
  return res.status(401).json({ ok: false, message });
}

export function sendServerError(res, message = "Error interno del servidor") {
  return res.status(500).json({ ok: false, message });
}

export function isPrismaUniqueConstraintError(error) {
  return error?.code === "P2002";
}
