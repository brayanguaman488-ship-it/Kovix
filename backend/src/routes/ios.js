import { Router } from "express";
import prismaPackage from "@prisma/client";
import { asyncHandler } from "../lib/asyncHandler.js";
import { prisma } from "../lib/prisma.js";
import { sendBadRequest, sendNotFound, sendServerError, isPrismaUniqueConstraintError } from "../lib/http.js";
import { asOptionalTrimmedString, asTrimmedString, assertRequiredFields } from "../lib/validation.js";
import { customerScopeWhere, deviceScopeWhere } from "../lib/dataScope.js";
import authMiddleware from "../middleware/auth.js";
import { blockIOSDevice, getHexnodeIOSConfiguration, isHexnodeIOSConfigured, resolveIOSHexnodeDeviceId, unblockIOSDevice } from "../lib/hexnodeIOS.js";
import { syncDeviceStatus } from "../lib/deviceStatus.js";

const router = Router();
const { DevicePlatform, DeviceStatus } = prismaPackage;

function iosScope(req, where = {}, ownerUserId = "") {
  return deviceScopeWhere(req, { ...where, platform: DevicePlatform.IOS }, ownerUserId);
}

function parseHexnodeId(value) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const parsed = Number.parseInt(String(value).trim(), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function includeDevice() {
  return { customer: { select: { id: true, fullName: true, nationalId: true, phone: true } }, statusHistory: { orderBy: { createdAt: "desc" }, take: 10 } };
}

async function attemptAutomaticIOSLink(device) {
  if (!device || device.hexnodeDeviceId || !isHexnodeIOSConfigured()) {
    return { linked: Boolean(device?.hexnodeDeviceId), skipped: device?.hexnodeDeviceId ? "already_linked" : "ios_hexnode_not_configured" };
  }
  try {
    const hexnodeDeviceId = await resolveIOSHexnodeDeviceId(device);
    const updated = await prisma.device.update({ where: { id: device.id }, data: { hexnodeDeviceId }, include: includeDevice() });
    return { linked: true, hexnodeDeviceId, device: updated, resolvedBy: "imei" };
  } catch (error) {
    return { linked: false, error: error?.message || "No se pudo vincular el iPhone por IMEI" };
  }
}

router.use(authMiddleware);

router.get("/devices", asyncHandler(async (req, res) => {
  const ownerUserId = asOptionalTrimmedString(req.query?.ownerUserId);
  const initialDevices = await prisma.device.findMany({ where: iosScope(req, {}, ownerUserId), orderBy: { createdAt: "desc" }, include: includeDevice() });
  for (const device of initialDevices) {
    if (!device.hexnodeDeviceId) {
      // El tenant iOS suele tener pocos equipos; se vinculan pendientes al abrir la seccion.
      // eslint-disable-next-line no-await-in-loop
      await attemptAutomaticIOSLink(device);
    }
    // Si esta en AUTOMATICO, aplica la regla compartida de fechas/cuotas usando el tenant iOS.
    // eslint-disable-next-line no-await-in-loop
    await syncDeviceStatus(device.id, null, "Sincronizacion automatica iPhone por fechas de pago");
  }
  const devices = await prisma.device.findMany({ where: iosScope(req, {}, ownerUserId), orderBy: { createdAt: "desc" }, include: includeDevice() });
  return res.json({ ok: true, devices, hexnode: getHexnodeIOSConfiguration() });
}));

router.post("/devices", asyncHandler(async (req, res) => {
  const { customerId, brand, model, imei, serialNumber, hexnodeDeviceId, notes } = req.body || {};
  const required = assertRequiredFields([["customerId", asTrimmedString(customerId)], ["brand", asTrimmedString(brand)], ["model", asTrimmedString(model)], ["imei", asTrimmedString(imei)]]);
  if (!required.ok) return sendBadRequest(res, "customerId, brand, model e IMEI son obligatorios");
  const remoteId = parseHexnodeId(hexnodeDeviceId);
  if (hexnodeDeviceId !== undefined && hexnodeDeviceId !== null && String(hexnodeDeviceId).trim() && !remoteId) return sendBadRequest(res, "hexnodeDeviceId invalido");
  const customer = await prisma.customer.findFirst({ where: customerScopeWhere(req, { id: asTrimmedString(customerId) }), select: { id: true } });
  if (!customer) return sendBadRequest(res, "customerId invalido o fuera de alcance");
  try {
    let device = await prisma.$transaction(async (tx) => {
      const installCode = `IOS-${remoteId || `${Date.now()}-${Math.floor(Math.random() * 100000)}`}`;
      const created = await tx.device.create({ data: { customerId: customer.id, brand: asTrimmedString(brand), model: asTrimmedString(model), imei: asTrimmedString(imei), installCode, serialNumber: asOptionalTrimmedString(serialNumber), hexnodeDeviceId: remoteId, platform: DevicePlatform.IOS, notes: asOptionalTrimmedString(notes) }, include: includeDevice() });
      await tx.deviceStatusHistory.create({ data: { deviceId: created.id, newStatus: DeviceStatus.ACTIVO, changedByUserId: req.user.id, reason: "IPHONE_REGISTERED" } });
      return created;
    });
    const hexnode = await attemptAutomaticIOSLink(device);
    if (hexnode.device) device = hexnode.device;
    return res.status(201).json({ ok: true, device, hexnode });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) return sendBadRequest(res, "El IMEI o Hexnode Device ID iOS ya existe");
    return sendServerError(res, "No se pudo registrar el iPhone");
  }
}));

async function changeIOSStatus(req, res, nextStatus, action) {
  const device = await prisma.device.findFirst({ where: iosScope(req, { id: req.params.id }), include: includeDevice() });
  if (!device) return sendNotFound(res, "iPhone no encontrado o fuera de alcance");
  if (device.platform !== DevicePlatform.IOS) return sendBadRequest(res, "Este endpoint solo permite dispositivos iOS");
  if (!device.manualStatusOverride) return sendBadRequest(res, "Cambia el iPhone a modo MANUAL antes de bloquear o desbloquear");
  if (!isHexnodeIOSConfigured()) return sendBadRequest(res, "Hexnode iOS no esta configurado en el backend");
  let hexnodeDeviceId;
  let result;
  try {
    hexnodeDeviceId = await resolveIOSHexnodeDeviceId(device);
    result = action === "IPHONE_BLOCK" ? await blockIOSDevice(hexnodeDeviceId) : await unblockIOSDevice(hexnodeDeviceId);
  } catch (error) {
    const verb = action === "IPHONE_BLOCK" ? "bloquear" : "desbloquear";
    return res.status(502).json({
      ok: false,
      message: `No se pudo ${verb} el iPhone en Hexnode iOS`,
      details: error?.message || "Hexnode iOS no respondio correctamente",
    });
  }
  const updated = await prisma.$transaction(async (tx) => {
    const saved = await tx.device.update({ where: { id: device.id }, data: { hexnodeDeviceId, currentStatus: nextStatus, manualStatusOverride: true, manualStatusReason: action, manualStatusChangedAt: new Date(), lastStatusChangeAt: new Date() }, include: includeDevice() });
    await tx.deviceStatusHistory.create({ data: { deviceId: device.id, previousStatus: device.currentStatus, newStatus: nextStatus, changedByUserId: req.user.id, reason: `${action} Hexnode OK` } });
    return saved;
  });
  return res.json({ ok: true, message: nextStatus === DeviceStatus.BLOQUEADO ? "iPhone bloqueado correctamente" : "iPhone desbloqueado correctamente", device: updated, hexnode: result });
}

router.patch("/devices/:id/mode", asyncHandler(async (req, res) => {
  const requestedMode = asTrimmedString(req.body?.mode).toUpperCase();
  if (!["MANUAL", "AUTOMATICO"].includes(requestedMode)) {
    return sendBadRequest(res, "mode debe ser MANUAL o AUTOMATICO");
  }
  const device = await prisma.device.findFirst({ where: iosScope(req, { id: req.params.id }), include: includeDevice() });
  if (!device) return sendNotFound(res, "iPhone no encontrado o fuera de alcance");

  const manual = requestedMode === "MANUAL";
  let updated = await prisma.device.update({
    where: { id: device.id },
    data: {
      manualStatusOverride: manual,
      manualStatusReason: manual ? "IPHONE_MANUAL_CONTROL" : null,
      manualStatusChangedAt: manual ? new Date() : null,
    },
    include: includeDevice(),
  });

  if (!manual) {
    updated = await syncDeviceStatus(device.id, req.user.id, "iPhone cambiado a modo automatico", { force: true, clearManualOverride: true });
  }

  return res.json({ ok: true, message: `iPhone en modo ${requestedMode}`, device: updated });
}));

router.post("/devices/:id/block", asyncHandler((req, res) => changeIOSStatus(req, res, DeviceStatus.BLOQUEADO, "IPHONE_BLOCK")));
router.post("/devices/:id/unblock", asyncHandler((req, res) => changeIOSStatus(req, res, DeviceStatus.ACTIVO, "IPHONE_UNBLOCK")));

export default router;
