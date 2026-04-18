import prismaPackage from "@prisma/client";

const { DeviceStatus } = prismaPackage;

const HEXNODE_PORTAL = (process.env.HEXNODE_PORTAL || "").trim();
const HEXNODE_API_KEY = (process.env.HEXNODE_API_KEY || "").trim();
const HEXNODE_ENABLED = Boolean(HEXNODE_PORTAL && HEXNODE_API_KEY);
const HEXNODE_ENROLLMENT_QR_IMAGE_URL = (process.env.HEXNODE_ENROLLMENT_QR_IMAGE_URL || "").trim();
const HEXNODE_ENROLLMENT_QR_VALUE = (process.env.HEXNODE_ENROLLMENT_QR_VALUE || "").trim();

const POLICY_NAME_BY_STATUS = {
  [DeviceStatus.ACTIVO]: (process.env.HEXNODE_POLICY_ACTIVO || "KOVIX_ACTIVO").trim(),
  [DeviceStatus.PAGO_PENDIENTE]: (
    process.env.HEXNODE_POLICY_PAGO_PENDIENTE ||
    process.env.HEXNODE_POLICY_ACTIVO ||
    "KOVIX_ACTIVO"
  ).trim(),
  [DeviceStatus.SOLO_LLAMADAS]: (process.env.HEXNODE_POLICY_SOLO_LLAMADAS || "KOVIX_BLOQUEADO").trim(),
  [DeviceStatus.BLOQUEADO]: (process.env.HEXNODE_POLICY_BLOQUEADO || "KOVIX_BLOQUEADO TOTAL").trim(),
};

const DEFAULT_DEVICE_ID = Number.parseInt(process.env.HEXNODE_DEFAULT_DEVICE_ID || "", 10);
const POLICY_CACHE_TTL_MS = 5 * 60 * 1000;

let policyCache = {
  fetchedAt: 0,
  byName: new Map(),
};

function normalize(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\s+/g, "")
    .trim();
}

function normalizeDigits(value) {
  return String(value || "").replace(/\D+/g, "");
}

function buildLocalCredentialSnapshot(localDevice) {
  return {
    deviceId: localDevice?.id || null,
    installCode: localDevice?.installCode || null,
    imei: localDevice?.imei || null,
    imei2: localDevice?.imei2 || null,
    alias: localDevice?.alias || null,
    model: localDevice?.model || null,
    hexnodeDeviceId: localDevice?.hexnodeDeviceId || null,
  };
}

function buildBaseUrl(pathname, query = null) {
  const base = `https://${HEXNODE_PORTAL}.hexnodemdm.com`;
  const url = new URL(pathname, base);

  if (query && typeof query === "object") {
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === null || value === "") {
        return;
      }

      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

async function hexnodeRequest(pathname, { method = "GET", body = null, query = null } = {}) {
  if (!HEXNODE_ENABLED) {
    throw new Error("Hexnode no esta configurado en variables de entorno");
  }

  const response = await fetch(buildBaseUrl(pathname, query), {
    method,
    headers: {
      Authorization: HEXNODE_API_KEY,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const raw = await response.text();
  let payload = null;

  if (raw) {
    try {
      payload = JSON.parse(raw);
    } catch {
      payload = raw;
    }
  }

  if (!response.ok) {
    const detail = typeof payload === "string" ? payload : JSON.stringify(payload || {});
    throw new Error(`Hexnode ${method} ${pathname} fallo (${response.status}): ${detail}`);
  }

  return payload;
}

async function loadPolicyNameMap() {
  const now = Date.now();
  if (now - policyCache.fetchedAt < POLICY_CACHE_TTL_MS && policyCache.byName.size > 0) {
    return policyCache.byName;
  }

  const byName = new Map();
  let page = 1;
  let next = true;

  while (next && page <= 20) {
    const payload = await hexnodeRequest("/api/v1/policy/", {
      method: "GET",
      query: { page, per_page: 250 },
    });

    const items = Array.isArray(payload?.results) ? payload.results : [];
    items.forEach((item) => {
      if (item?.name && Number.isFinite(Number(item?.id))) {
        byName.set(normalize(item.name), Number(item.id));
      }
    });

    next = Boolean(payload?.next);
    page += 1;
  }

  policyCache = {
    fetchedAt: now,
    byName,
  };

  return byName;
}

function matchDeviceByListEntry(localDevice, listEntry) {
  const localImei1 = normalizeDigits(localDevice?.imei);
  const localImei2 = normalizeDigits(localDevice?.imei2);
  const localInstallCode = normalize(localDevice?.installCode);
  const localAlias = normalize(localDevice?.alias);
  const localModel = normalize(localDevice?.model);

  const remoteName = normalize(listEntry?.device_name);
  const remoteSerial = normalize(listEntry?.serial_number);
  const remoteModel = normalize(listEntry?.model_name);

  return (
    (localInstallCode && (localInstallCode === remoteName || localInstallCode === remoteSerial)) ||
    (localAlias && (localAlias === remoteName || localAlias === remoteSerial)) ||
    (localModel && localModel === remoteModel) ||
    (localImei1 && localImei1 === normalizeDigits(remoteSerial)) ||
    (localImei2 && localImei2 === normalizeDigits(remoteSerial))
  );
}

async function listHexnodeDevices() {
  const found = [];
  let page = 1;
  let next = true;

  while (next && page <= 20) {
    const payload = await hexnodeRequest("/api/v1/devices/", {
      method: "GET",
      query: { page, per_page: 250, order_by: "desc" },
    });

    const items = Array.isArray(payload?.results) ? payload.results : [];
    found.push(...items);
    next = Boolean(payload?.next);
    page += 1;
  }

  return found;
}

async function resolveHexnodeDeviceId(localDevice) {
  const idFromRecord = Number(localDevice?.hexnodeDeviceId);
  if (Number.isFinite(idFromRecord) && idFromRecord > 0) {
    return idFromRecord;
  }

  if (Number.isFinite(DEFAULT_DEVICE_ID) && DEFAULT_DEVICE_ID > 0) {
    return DEFAULT_DEVICE_ID;
  }

  const listed = await listHexnodeDevices();
  const directMatch = listed.find((item) => matchDeviceByListEntry(localDevice, item));
  if (directMatch?.id) {
    return Number(directMatch.id);
  }

  const localImei1 = normalizeDigits(localDevice?.imei);
  const localImei2 = normalizeDigits(localDevice?.imei2);
  if (!localImei1 && !localImei2) {
    return null;
  }

  for (const item of listed) {
    const remoteId = Number(item?.id);
    if (!Number.isFinite(remoteId)) {
      continue;
    }

    try {
      const details = await hexnodeRequest(`/api/v1/devices/${remoteId}/`, { method: "GET" });
      const remoteImei1 = normalizeDigits(details?.device?.imei_1);
      const remoteImei2 = normalizeDigits(details?.device?.imei_2);

      if (
        (localImei1 && (localImei1 === remoteImei1 || localImei1 === remoteImei2)) ||
        (localImei2 && (localImei2 === remoteImei1 || localImei2 === remoteImei2))
      ) {
        return remoteId;
      }
    } catch {
      // Si un detalle falla continuamos con el siguiente dispositivo.
    }
  }

  return null;
}

function toResolvedResult(localDevice, hexnodeDeviceId, source) {
  return {
    localDeviceId: localDevice?.id || null,
    hexnodeDeviceId,
    source,
    matchedBy: {
      imei: localDevice?.imei || null,
      imei2: localDevice?.imei2 || null,
      installCode: localDevice?.installCode || null,
      alias: localDevice?.alias || null,
      model: localDevice?.model || null,
    },
  };
}

export async function resolveHexnodeDeviceMatch(localDevice, options = {}) {
  const useDefault = options?.useDefault !== false;

  const explicit = Number(localDevice?.hexnodeDeviceId);
  if (Number.isFinite(explicit) && explicit > 0) {
    return toResolvedResult(localDevice, explicit, "stored_device_field");
  }

  if (useDefault && Number.isFinite(DEFAULT_DEVICE_ID) && DEFAULT_DEVICE_ID > 0) {
    return toResolvedResult(localDevice, DEFAULT_DEVICE_ID, "default_device_env");
  }

  const listed = await listHexnodeDevices();
  const directMatch = listed.find((item) => matchDeviceByListEntry(localDevice, item));
  if (directMatch?.id) {
    return toResolvedResult(localDevice, Number(directMatch.id), "devices_list_match");
  }

  const localImei1 = normalizeDigits(localDevice?.imei);
  const localImei2 = normalizeDigits(localDevice?.imei2);
  if (!localImei1 && !localImei2) {
    return null;
  }

  for (const item of listed) {
    const remoteId = Number(item?.id);
    if (!Number.isFinite(remoteId)) {
      continue;
    }

    try {
      const details = await hexnodeRequest(`/api/v1/devices/${remoteId}/`, { method: "GET" });
      const remoteImei1 = normalizeDigits(details?.device?.imei_1);
      const remoteImei2 = normalizeDigits(details?.device?.imei_2);

      if (
        (localImei1 && (localImei1 === remoteImei1 || localImei1 === remoteImei2)) ||
        (localImei2 && (localImei2 === remoteImei1 || localImei2 === remoteImei2))
      ) {
        return toResolvedResult(localDevice, remoteId, "device_details_imei_match");
      }
    } catch {
      // Si un detalle falla continuamos con el siguiente dispositivo.
    }
  }

  return null;
}

export async function getHexnodeLinkDiagnostics(localDevice, options = {}) {
  const maxCandidates = Number(options?.maxCandidates || 5);
  const local = buildLocalCredentialSnapshot(localDevice);

  if (!HEXNODE_ENABLED) {
    return {
      configured: false,
      portal: HEXNODE_PORTAL || null,
      local,
      suggestedCandidates: [],
      reason: "hexnode_not_configured",
    };
  }

  const localInstallCode = normalize(local.installCode);
  const localAlias = normalize(local.alias);
  const localModel = normalize(local.model);
  const localImei1 = normalizeDigits(local.imei);
  const localImei2 = normalizeDigits(local.imei2);

  try {
    const listed = await listHexnodeDevices();
    const scored = listed
      .map((item) => {
        const remoteName = normalize(item?.device_name);
        const remoteSerial = normalize(item?.serial_number);
        const remoteModel = normalize(item?.model_name);
        const remoteSerialDigits = normalizeDigits(item?.serial_number);
        let score = 0;

        if (localInstallCode && (localInstallCode === remoteName || localInstallCode === remoteSerial)) {
          score += 100;
        } else if (
          localInstallCode &&
          (remoteName.includes(localInstallCode) || remoteSerial.includes(localInstallCode))
        ) {
          score += 50;
        }

        if (localAlias && (localAlias === remoteName || localAlias === remoteSerial)) {
          score += 40;
        }

        if (localModel && localModel === remoteModel) {
          score += 20;
        }

        if (localImei1 && localImei1 === remoteSerialDigits) {
          score += 90;
        }
        if (localImei2 && localImei2 === remoteSerialDigits) {
          score += 90;
        }

        return {
          id: Number(item?.id),
          deviceName: item?.device_name || null,
          serialNumber: item?.serial_number || null,
          modelName: item?.model_name || null,
          score,
        };
      })
      .filter((entry) => Number.isFinite(entry.id) && entry.id > 0 && entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.max(1, maxCandidates));

    return {
      configured: true,
      portal: HEXNODE_PORTAL,
      local,
      suggestedCandidates: scored,
      reason: scored.length > 0 ? "candidates_available" : "no_match_candidates",
    };
  } catch (error) {
    return {
      configured: true,
      portal: HEXNODE_PORTAL,
      local,
      suggestedCandidates: [],
      reason: "diagnostics_query_failed",
      error: error?.message || "No se pudieron cargar candidatos desde Hexnode",
    };
  }
}

function getTargetPolicyName(status) {
  return POLICY_NAME_BY_STATUS[status] || "";
}

async function resolvePolicyIds(targetPolicyName) {
  const byName = await loadPolicyNameMap();
  const targetPolicyId = byName.get(normalize(targetPolicyName));

  if (!targetPolicyId) {
    throw new Error(`No se encontro la politica "${targetPolicyName}" en Hexnode`);
  }

  const allManagedNames = Object.values(POLICY_NAME_BY_STATUS)
    .map((value) => normalize(value))
    .filter(Boolean);

  const managedIds = [];
  allManagedNames.forEach((name) => {
    const id = byName.get(name);
    if (id && !managedIds.includes(id)) {
      managedIds.push(id);
    }
  });

  return {
    targetPolicyId,
    managedIds,
  };
}

async function removePoliciesFromDevice(deviceId, policyIds) {
  if (!policyIds.length) {
    return;
  }

  await hexnodeRequest("/api/v1/actions/remove_policy/", {
    method: "POST",
    body: {
      policies: policyIds,
      users: [],
      usergroups: [],
      devices: [deviceId],
      devicegroups: [],
    },
  });
}

async function associatePolicyToDevice(deviceId, policyId) {
  await hexnodeRequest("/api/v1/actions/associate_policy/", {
    method: "POST",
    body: {
      policies: [policyId],
      users: [],
      usergroups: [],
      devices: [deviceId],
      devicegroups: [],
    },
  });
}

async function requestScanDevice(deviceId) {
  await hexnodeRequest("/api/v1/actions/scan_device/", {
    method: "POST",
    body: {
      users: [],
      usergroups: [],
      devices: [deviceId],
      devicegroups: [],
    },
  });
}

export function isHexnodeConfigured() {
  return HEXNODE_ENABLED;
}

export function getHexnodeProvisioningQr() {
  const portalUrl = HEXNODE_PORTAL ? `https://${HEXNODE_PORTAL}.hexnodemdm.com` : "";

  if (HEXNODE_ENROLLMENT_QR_IMAGE_URL) {
    return {
      configured: true,
      mode: "image_url",
      portalUrl,
      qrUrl: HEXNODE_ENROLLMENT_QR_IMAGE_URL,
      qrValue: HEXNODE_ENROLLMENT_QR_VALUE || null,
    };
  }

  if (HEXNODE_ENROLLMENT_QR_VALUE) {
    return {
      configured: true,
      mode: "value_encoded",
      portalUrl,
      qrUrl: `https://quickchart.io/qr?size=320&text=${encodeURIComponent(HEXNODE_ENROLLMENT_QR_VALUE)}`,
      qrValue: HEXNODE_ENROLLMENT_QR_VALUE,
    };
  }

  return {
    configured: false,
    mode: "not_configured",
    portalUrl,
    qrUrl: "",
    qrValue: "",
  };
}

export async function applyHexnodePolicyForStatus(localDevice, nextStatus) {
  if (!HEXNODE_ENABLED) {
    return {
      ok: false,
      skipped: "hexnode_not_configured",
    };
  }

  const targetPolicyName = getTargetPolicyName(nextStatus);
  if (!targetPolicyName) {
    return {
      ok: false,
      skipped: "status_without_policy_mapping",
      status: nextStatus,
    };
  }

  const resolved = await resolveHexnodeDeviceMatch(localDevice);
  const hexnodeDeviceId = resolved?.hexnodeDeviceId || null;
  if (!hexnodeDeviceId) {
    throw new Error(`No se pudo resolver el deviceId de Hexnode para ${localDevice?.id || "dispositivo"}`);
  }

  const { targetPolicyId, managedIds } = await resolvePolicyIds(targetPolicyName);
  const policiesToRemove = managedIds.filter((id) => id !== targetPolicyId);

  if (policiesToRemove.length > 0) {
    await removePoliciesFromDevice(hexnodeDeviceId, policiesToRemove);
  }

  await associatePolicyToDevice(hexnodeDeviceId, targetPolicyId);
  await requestScanDevice(hexnodeDeviceId);

  return {
    ok: true,
    hexnodeDeviceId,
    resolvedBy: resolved?.source || "unknown",
    targetPolicyName,
    targetPolicyId,
    removedPolicyIds: policiesToRemove,
  };
}

export function generateInstallCode() {
  const year = new Date().getFullYear().toString().slice(-2);
  const random = Math.floor(100000 + Math.random() * 900000);
  return `KX${year}${random}`;
}
