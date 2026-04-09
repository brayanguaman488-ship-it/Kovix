import crypto from "crypto";

import { asTrimmedString } from "./validation.js";

export function generateClientSecret() {
  return crypto.randomBytes(24).toString("hex");
}

function safeStringEquals(left, right) {
  const a = Buffer.from(String(left || ""));
  const b = Buffer.from(String(right || ""));

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
}

export function extractClientSecret(req) {
  return asTrimmedString(req.headers["x-client-secret"] || req.query.clientSecret);
}

export function isValidClientSecret(device, providedSecret) {
  return safeStringEquals(device?.clientSecret, providedSecret);
}
