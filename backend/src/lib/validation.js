export function asTrimmedString(value) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value).trim();
}

export function asOptionalTrimmedString(value) {
  const normalized = asTrimmedString(value);
  return normalized ? normalized : null;
}

export function parsePositiveAmount(value) {
  const number = Number(value);

  if (!Number.isFinite(number) || number <= 0) {
    return null;
  }

  return number;
}

export function parseDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function assertRequiredFields(requiredEntries) {
  const missing = requiredEntries
    .filter(([, value]) => !asTrimmedString(value))
    .map(([field]) => field);

  return {
    ok: missing.length === 0,
    missing,
  };
}
