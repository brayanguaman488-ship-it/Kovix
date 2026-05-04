import { Router } from "express";
import prismaPackage from "@prisma/client";

import { asyncHandler } from "../lib/asyncHandler.js";
import { sendBadRequest } from "../lib/http.js";
import { prisma } from "../lib/prisma.js";
import { asOptionalTrimmedString } from "../lib/validation.js";
import authMiddleware from "../middleware/auth.js";

const router = Router();
const { PaymentStatus } = prismaPackage;

const DEFAULT_TIERS = [
  { tierKey: "gama_baja", label: "Gama baja", minAmount: 0, maxAmount: 400, monthlyPrice: 10 },
  { tierKey: "gama_media", label: "Gama media", minAmount: 401, maxAmount: 850, monthlyPrice: 15 },
  { tierKey: "gama_alta", label: "Gama alta", minAmount: 851, maxAmount: 1500, monthlyPrice: 25 },
  { tierKey: "gama_ultra", label: "Gama ultra", minAmount: 1501, maxAmount: null, monthlyPrice: 30 },
];

function normalizeRole(role) {
  return String(role || "").trim().toUpperCase();
}

function canManageLicenses(role) {
  return normalizeRole(role) === "ADMIN";
}

function canViewGlobalLicenses(role) {
  const normalized = normalizeRole(role);
  return normalized === "ADMIN" || normalized === "GERENCIA";
}

function parseMonth(value, fallback) {
  const parsed = Number(value || fallback);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 12 ? parsed : fallback;
}

function parseYear(value, fallback) {
  const parsed = Number(value || fallback);
  return Number.isInteger(parsed) && parsed >= 2020 && parsed <= 2100 ? parsed : fallback;
}

function toNumber(value) {
  return value === null || value === undefined ? null : Number(value);
}

function normalizeTier(entry) {
  return {
    tierKey: String(entry.tierKey),
    label: String(entry.label),
    minAmount: Number(entry.minAmount),
    maxAmount: toNumber(entry.maxAmount),
    monthlyPrice: Number(entry.monthlyPrice),
  };
}

function resolveTierRules(globalRules, scopedRules = []) {
  const byTier = new Map(globalRules.map((entry) => [entry.tierKey, normalizeTier(entry)]));
  scopedRules.forEach((entry) => {
    byTier.set(entry.tierKey, normalizeTier(entry));
  });
  return DEFAULT_TIERS.map((defaultTier) => byTier.get(defaultTier.tierKey) || defaultTier);
}

function selectTier(tiers, amount) {
  const total = Number(amount || 0);
  return tiers.find((tier) => total >= tier.minAmount && (tier.maxAmount === null || total <= tier.maxAmount)) || tiers[0];
}

function getMonthBounds(year, month) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

function isDeviceActiveForLicense(device, bounds) {
  const contract = device?.creditContract;
  if (!contract) return false;

  const purchaseDate = new Date(contract.purchaseDate || contract.createdAt || device.createdAt || 0);
  if (!Number.isNaN(purchaseDate.getTime()) && purchaseDate >= bounds.end) {
    return false;
  }

  const installments = Array.isArray(contract.installments) ? contract.installments : [];
  return installments.some((entry) => {
    const status = String(entry?.status || "").toUpperCase();
    return status !== "PAGADO" && status !== "CANCELADO";
  });
}

function summarizeDevices(devices, tiers, bounds) {
  const byTier = Object.fromEntries(
    tiers.map((tier) => [tier.tierKey, { ...tier, activeDevices: 0, monthlyTotal: 0 }])
  );
  const totals = { activeDevices: 0, monthlyTotal: 0 };

  for (const device of devices) {
    if (!isDeviceActiveForLicense(device, bounds)) continue;

    const amount = Number(device.creditContract?.principalAmount || 0);
    const tier = selectTier(tiers, amount);
    byTier[tier.tierKey].activeDevices += 1;
    byTier[tier.tierKey].monthlyTotal += Number(tier.monthlyPrice || 0);
    totals.activeDevices += 1;
    totals.monthlyTotal += Number(tier.monthlyPrice || 0);
  }

  return {
    tiers: Object.values(byTier).map((entry) => ({
      ...entry,
      monthlyTotal: Number(entry.monthlyTotal.toFixed(2)),
    })),
    totals: {
      activeDevices: totals.activeDevices,
      monthlyTotal: Number(totals.monthlyTotal.toFixed(2)),
    },
  };
}

async function ensureDefaultRules() {
  for (const tier of DEFAULT_TIERS) {
    // eslint-disable-next-line no-await-in-loop
    await prisma.licensePricingRule.upsert({
      where: { scopeKey_tierKey: { scopeKey: "global", tierKey: tier.tierKey } },
      update: {},
      create: {
        scopeKey: "global",
        scopeUserId: null,
        tierKey: tier.tierKey,
        label: tier.label,
        minAmount: tier.minAmount,
        maxAmount: tier.maxAmount,
        monthlyPrice: tier.monthlyPrice,
      },
    });
  }
}

async function loadDevicesForUser(userId) {
  return prisma.device.findMany({
    where: { customer: { createdByUserId: userId } },
    include: {
      customer: true,
      creditContract: {
        include: {
          installments: {
            orderBy: { sequence: "asc" },
          },
        },
      },
    },
  });
}

router.use(authMiddleware);

router.get("/summary", asyncHandler(async (req, res) => {
  await ensureDefaultRules();

  const now = new Date();
  const year = parseYear(req.query?.year, now.getFullYear());
  const month = parseMonth(req.query?.month, now.getMonth() + 1);
  const requestedOwnerUserId = asOptionalTrimmedString(req.query?.ownerUserId);
  const canViewGlobal = canViewGlobalLicenses(req.user?.role);
  const ownerUserId = canViewGlobal ? requestedOwnerUserId || null : req.user.id;
  const bounds = getMonthBounds(year, month);

  const [globalRulesRaw, scopedRulesRaw, users, billingRecords] = await Promise.all([
    prisma.licensePricingRule.findMany({ where: { scopeKey: "global" }, orderBy: { minAmount: "asc" } }),
    prisma.licensePricingRule.findMany({
      where: ownerUserId ? { scopeKey: ownerUserId } : { scopeKey: { not: "global" } },
      orderBy: { minAmount: "asc" },
    }),
    canViewGlobal
      ? prisma.user.findMany({
          where: { role: { in: ["TIENDA", "ADMINISTRADOR", "GERENCIA"] } },
          orderBy: [{ role: "asc" }, { fullName: "asc" }, { username: "asc" }],
        })
      : Promise.resolve([]),
    prisma.licenseBillingRecord.findMany({ where: { year, month } }),
  ]);

  const globalRules = resolveTierRules(globalRulesRaw, []);
  const scopedRules = ownerUserId
    ? resolveTierRules(globalRulesRaw, scopedRulesRaw.filter((entry) => entry.scopeKey === ownerUserId))
    : globalRules;
  const devices = ownerUserId ? await loadDevicesForUser(ownerUserId) : [];
  let summary = ownerUserId
    ? summarizeDevices(devices, scopedRules, bounds)
    : summarizeDevices([], globalRules, bounds);
  const billing = ownerUserId ? billingRecords.find((entry) => entry.userId === ownerUserId) || null : null;

  const userSummaries = [];
  if (canViewGlobal) {
    for (const user of users) {
      // eslint-disable-next-line no-await-in-loop
      const userDevices = await loadDevicesForUser(user.id);
      const userRules = resolveTierRules(
        globalRulesRaw,
        scopedRulesRaw.filter((entry) => entry.scopeKey === user.id)
      );
      const userSummary = summarizeDevices(userDevices, userRules, bounds);
      const userBilling = billingRecords.find((entry) => entry.userId === user.id) || null;
      userSummaries.push({
        user: {
          id: user.id,
          username: user.username,
          fullName: user.fullName,
          role: user.role,
        },
        summary: userSummary,
        billing: userBilling
          ? {
              status: userBilling.status,
              paidAt: userBilling.paidAt,
              amount: Number(userBilling.amount),
              activeDevices: userBilling.activeDevices,
            }
          : null,
      });
    }

    if (!ownerUserId) {
      const totalsByTier = Object.fromEntries(
        globalRules.map((tier) => [tier.tierKey, { ...tier, activeDevices: 0, monthlyTotal: 0 }])
      );
      const totals = { activeDevices: 0, monthlyTotal: 0 };
      for (const entry of userSummaries) {
        totals.activeDevices += Number(entry.summary?.totals?.activeDevices || 0);
        totals.monthlyTotal += Number(entry.summary?.totals?.monthlyTotal || 0);
        for (const tier of entry.summary?.tiers || []) {
          if (!totalsByTier[tier.tierKey]) {
            totalsByTier[tier.tierKey] = { ...tier, activeDevices: 0, monthlyTotal: 0 };
          }
          totalsByTier[tier.tierKey].activeDevices += Number(tier.activeDevices || 0);
          totalsByTier[tier.tierKey].monthlyTotal += Number(tier.monthlyTotal || 0);
        }
      }
      summary = {
        tiers: Object.values(totalsByTier).map((tier) => ({
          ...tier,
          monthlyTotal: Number(Number(tier.monthlyTotal || 0).toFixed(2)),
        })),
        totals: {
          activeDevices: totals.activeDevices,
          monthlyTotal: Number(totals.monthlyTotal.toFixed(2)),
        },
      };
    }
  }

  return res.json({
    ok: true,
    canManage: canManageLicenses(req.user?.role),
    year,
    month,
    ownerUserId,
    rules: {
      global: globalRules,
      scoped: ownerUserId ? scopedRules : globalRules,
    },
    summary,
    billing: billing
      ? {
          status: billing.status,
          paidAt: billing.paidAt,
          amount: Number(billing.amount),
          activeDevices: billing.activeDevices,
        }
      : null,
    users: userSummaries,
  });
}));

router.put("/pricing", asyncHandler(async (req, res) => {
  if (!canManageLicenses(req.user?.role)) {
    return res.status(403).json({ ok: false, message: "Solo ADMIN puede modificar precios de licencias" });
  }

  await ensureDefaultRules();

  const scopeUserIds = Array.isArray(req.body?.scopeUserIds)
    ? req.body.scopeUserIds.map((entry) => String(entry || "").trim()).filter(Boolean)
    : [];
  const tiers = Array.isArray(req.body?.tiers) ? req.body.tiers : [];
  const scopeKeys = scopeUserIds.length > 0 ? scopeUserIds : ["global"];

  if (tiers.length === 0) {
    return sendBadRequest(res, "tiers es obligatorio");
  }

  for (const tier of tiers) {
    const tierKey = String(tier?.tierKey || "").trim();
    const label = String(tier?.label || tierKey).trim();
    const minAmount = Number(tier?.minAmount);
    const maxAmount = tier?.maxAmount === null || tier?.maxAmount === "" ? null : Number(tier?.maxAmount);
    const monthlyPrice = Number(tier?.monthlyPrice);

    if (!tierKey || !label || !Number.isFinite(minAmount) || minAmount < 0 || !Number.isFinite(monthlyPrice) || monthlyPrice < 0) {
      return sendBadRequest(res, "Cada rango debe tener tierKey, label, minAmount y monthlyPrice validos");
    }

    if (maxAmount !== null && (!Number.isFinite(maxAmount) || maxAmount < minAmount)) {
      return sendBadRequest(res, "maxAmount debe ser mayor o igual que minAmount");
    }

    for (const scopeKey of scopeKeys) {
      const isGlobal = scopeKey === "global";
      // eslint-disable-next-line no-await-in-loop
      await prisma.licensePricingRule.upsert({
        where: { scopeKey_tierKey: { scopeKey, tierKey } },
        update: {
          label,
          minAmount,
          maxAmount,
          monthlyPrice,
          scopeUserId: isGlobal ? null : scopeKey,
        },
        create: {
          scopeKey,
          scopeUserId: isGlobal ? null : scopeKey,
          tierKey,
          label,
          minAmount,
          maxAmount,
          monthlyPrice,
        },
      });
    }
  }

  return res.json({ ok: true, message: "Precios de licencias actualizados" });
}));

router.post("/billing/mark-paid", asyncHandler(async (req, res) => {
  if (!canManageLicenses(req.user?.role)) {
    return res.status(403).json({ ok: false, message: "Solo ADMIN puede marcar licencias como pagadas" });
  }

  await ensureDefaultRules();

  const now = new Date();
  const year = parseYear(req.body?.year, now.getFullYear());
  const month = parseMonth(req.body?.month, now.getMonth() + 1);
  const userId = String(req.body?.userId || "").trim();
  const amount = Number(req.body?.amount || 0);
  const activeDevices = Number(req.body?.activeDevices || 0);
  const notes = asOptionalTrimmedString(req.body?.notes);

  if (!userId) {
    return sendBadRequest(res, "userId es obligatorio");
  }

  const record = await prisma.licenseBillingRecord.upsert({
    where: { userId_year_month: { userId, year, month } },
    update: {
      amount,
      activeDevices,
      status: PaymentStatus.PAGADO,
      paidAt: new Date(),
      markedByUserId: req.user.id,
      notes,
    },
    create: {
      userId,
      year,
      month,
      amount,
      activeDevices,
      status: PaymentStatus.PAGADO,
      paidAt: new Date(),
      markedByUserId: req.user.id,
      notes,
    },
  });

  return res.json({ ok: true, record });
}));

export default router;
