// Esta integracion es deliberadamente independiente de hexnode.js (Android).
const IOS_PORTAL_RAW = String(process.env.HEXNODE_IOS_PORTAL || "").trim();
const IOS_API_KEY = String(process.env.HEXNODE_IOS_API_KEY || "").trim();
const IOS_GENERAL_POLICY = String(process.env.HEXNODE_IOS_POLICY_GENERAL || "").trim();
const IOS_BLOCKED_POLICY = String(process.env.HEXNODE_IOS_POLICY_BLOQUEADO || "").trim();

function portalHost(value) {
  const raw = String(value || "").trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  if (!raw) return "";
  return raw.includes(".") ? raw : `${raw}.hexnodemdm.com`;
}

const IOS_PORTAL_HOST = portalHost(IOS_PORTAL_RAW);

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

async function request(pathname, { method = "GET", body = null, query = null } = {}) {
  if (!IOS_PORTAL_HOST || !IOS_API_KEY) {
    throw new Error("Hexnode iOS no esta configurado en el backend");
  }
  const url = new URL(`https://${IOS_PORTAL_HOST}${pathname}`);
  Object.entries(query || {}).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  const response = await fetch(url, {
    method,
    headers: { Authorization: IOS_API_KEY, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Hexnode iOS ${method} ${pathname} fallo (${response.status}): ${detail.slice(0, 300)}`);
  }
  return response.status === 204 ? {} : response.json();
}

async function policyIdByName(name) {
  if (!name) throw new Error("La politica iOS requerida no esta configurada");
  const payload = await request("/api/v1/policy/");
  const policies = payload?.results || payload?.policies || payload?.data || [];
  const policy = policies.find((entry) => normalize(entry?.policy_name || entry?.name) === normalize(name));
  const id = Number(policy?.id || policy?.policy_id);
  if (!Number.isInteger(id) || id <= 0) throw new Error(`No se encontro la politica iOS \"${name}\" en Hexnode`);
  return id;
}

function actionBody(deviceId, policyId) {
  return { policies: [policyId], users: [], usergroups: [], devices: [deviceId], devicegroups: [] };
}

export function isHexnodeIOSConfigured() {
  return Boolean(IOS_PORTAL_HOST && IOS_API_KEY && IOS_BLOCKED_POLICY);
}

export function getHexnodeIOSConfiguration() {
  return { configured: isHexnodeIOSConfigured(), generalPolicyConfigured: Boolean(IOS_GENERAL_POLICY) };
}

export async function resolveIOSHexnodeDeviceId(localDevice) {
  const storedId = Number(localDevice?.hexnodeDeviceId);
  if (Number.isInteger(storedId) && storedId > 0) return storedId;
  const imei = String(localDevice?.imei || "").replace(/\D+/g, "");
  if (!imei) throw new Error("El iPhone no tiene IMEI para localizarlo en Hexnode");
  for (let page = 1; page <= 20; page += 1) {
    // La consulta se hace solo al portal iOS, nunca al tenant Android.
    // eslint-disable-next-line no-await-in-loop
    const payload = await request("/api/v1/devices/", { query: { page, per_page: 250 } });
    const devices = Array.isArray(payload?.results) ? payload.results : [];
    const matched = devices.find((device) => [device?.imei_1, device?.imei_2, device?.imei].some((value) => String(value || "").replace(/\D+/g, "") === imei));
    const matchedId = Number(matched?.id);
    if (Number.isInteger(matchedId) && matchedId > 0) return matchedId;
    if (!payload?.next) break;
  }
  throw new Error("No se encontro el iPhone por IMEI en Hexnode iOS");
}

export async function blockIOSDevice(hexnodeDeviceId) {
  const policyId = await policyIdByName(IOS_BLOCKED_POLICY);
  await request("/api/v1/actions/associate_policy/", { method: "POST", body: actionBody(hexnodeDeviceId, policyId) });
  await request("/api/v1/actions/scan_device/", { method: "POST", body: { users: [], usergroups: [], devices: [hexnodeDeviceId], devicegroups: [] } });
  return { hexnodeDeviceId, blockedPolicy: IOS_BLOCKED_POLICY, blockedPolicyId: policyId };
}

export async function unblockIOSDevice(hexnodeDeviceId) {
  const policyId = await policyIdByName(IOS_BLOCKED_POLICY);
  // Solo se retira la politica de bloqueo: la politica general de ADE permanece intacta.
  await request("/api/v1/actions/remove_policy/", { method: "POST", body: actionBody(hexnodeDeviceId, policyId) });
  await request("/api/v1/actions/scan_device/", { method: "POST", body: { users: [], usergroups: [], devices: [hexnodeDeviceId], devicegroups: [] } });
  return { hexnodeDeviceId, removedBlockedPolicy: IOS_BLOCKED_POLICY, removedBlockedPolicyId: policyId };
}
