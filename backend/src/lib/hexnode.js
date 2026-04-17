import prismaPackage from "@prisma/client";

const { DeviceStatus } = prismaPackage;

const HEXNODE_PORTAL = (process.env.HEXNODE_PORTAL || "").trim();
const HEXNODE_API_KEY = (process.env.HEXNODE_API_KEY || "").trim();
const HEXNODE_ENABLED = Boolean(HEXNODE_PORTAL && HEXNODE_API_KEY);

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

function parseHexnodeDeviceIdFromNotes(notes) {
  const content = String(notes || "");
  const match = content.match(/\bhexnode(?:_device)?_?id\b\s*[:=]\s*(\d+)/i);
  if (!match) {
    return null;
  }

  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
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
  const localImei = normalizeDigits(localDevice?.imei);
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
    (localImei && localImei === normalizeDigits(remoteSerial))
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
  const idFromNotes = parseHexnodeDeviceIdFromNotes(localDevice?.notes);
  if (idFromNotes) {
    return idFromNotes;
  }

  if (Number.isFinite(DEFAULT_DEVICE_ID) && DEFAULT_DEVICE_ID > 0) {
    return DEFAULT_DEVICE_ID;
  }

  const listed = await listHexnodeDevices();
  const directMatch = listed.find((item) => matchDeviceByListEntry(localDevice, item));
  if (directMatch?.id) {
    return Number(directMatch.id);
  }

  const localImei = normalizeDigits(localDevice?.imei);
  if (!localImei) {
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

      if (localImei && (localImei === remoteImei1 || localImei === remoteImei2)) {
        return remoteId;
      }
    } catch {
      // Si un detalle falla continuamos con el siguiente dispositivo.
    }
  }

  return null;
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

  const hexnodeDeviceId = await resolveHexnodeDeviceId(localDevice);
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
    targetPolicyName,
    targetPolicyId,
    removedPolicyIds: policiesToRemove,
  };
}
