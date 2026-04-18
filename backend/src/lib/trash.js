import { prisma } from "./prisma.js";

const DEFAULT_RETENTION_DAYS = 30;
const DEFAULT_PURGE_INTERVAL_MS = 6 * 60 * 60 * 1000;

let purgeTimer = null;

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value || ""), 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function getRetentionDays() {
  return parsePositiveInt(process.env.TRASH_RETENTION_DAYS, DEFAULT_RETENTION_DAYS);
}

function getPurgeIntervalMs() {
  return parsePositiveInt(process.env.TRASH_PURGE_INTERVAL_MS, DEFAULT_PURGE_INTERVAL_MS);
}

function getDeleteAfterDate() {
  const date = new Date();
  date.setDate(date.getDate() + getRetentionDays());
  return date;
}

export async function registerTrashEntry({
  client = prisma,
  entityType,
  entityId,
  summary = "",
  payload = null,
  deletedByUserId = null,
}) {
  const normalizedEntityType = String(entityType || "").trim();
  const normalizedEntityId = String(entityId || "").trim();

  if (!normalizedEntityType || !normalizedEntityId) {
    return null;
  }

  return client.trashEntry.create({
    data: {
      entityType: normalizedEntityType,
      entityId: normalizedEntityId,
      summary: String(summary || "").trim() || null,
      payload: payload || null,
      deleteAfter: getDeleteAfterDate(),
      deletedByUserId: deletedByUserId ? String(deletedByUserId) : null,
    },
  });
}

export async function purgeExpiredTrashEntries() {
  const result = await prisma.trashEntry.deleteMany({
    where: {
      deleteAfter: {
        lte: new Date(),
      },
    },
  });

  return result.count || 0;
}

export function startTrashRetentionJob() {
  if (purgeTimer) {
    return;
  }

  const runPurge = async () => {
    try {
      const purged = await purgeExpiredTrashEntries();
      if (purged > 0) {
        console.log(`Papelera purgada: ${purged} registros eliminados`);
      }
    } catch (error) {
      console.error("No se pudo purgar la papelera:", error?.message || error);
    }
  };

  runPurge();
  purgeTimer = setInterval(runPurge, getPurgeIntervalMs());
}
