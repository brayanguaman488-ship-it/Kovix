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

async function request(pathname, { method = "GET", body = null } = {}) {
  if (!IOS_PORTAL_HOST || !IOS_API_KEY) {
    throw new Error("Hexnode iOS no esta configurado en el backend");
  }
  const response = await fetch(`https://${IOS_PORTAL_HOST}${pathname}`, {
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
