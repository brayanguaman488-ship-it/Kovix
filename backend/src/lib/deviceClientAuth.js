import crypto from "crypto";

import { asTrimmedString } from "./validation.js";

const CLIENT_SECRET_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DEFAULT_CLIENT_SECRET_LENGTH = 10;

export function generateClientSecret() {
  const requestedLength = Number.parseInt(process.env.CLIENT_SECRET_LENGTH || "", 10);
  const length = Number.isFinite(requestedLength) && requestedLength >= 6
    ? requestedLength
    : DEFAULT_CLIENT_SECRET_LENGTH;

  const bytes = crypto.randomBytes(length);
  let secret = "";

  for (let i = 0; i < length; i += 1) {
    secret += CLIENT_SECRET_ALPHABET[bytes[i] % CLIENT_SECRET_ALPHABET.length];
  }

  return secret;
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
