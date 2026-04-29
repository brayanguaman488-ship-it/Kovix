import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { sendServerError } from "./lib/http.js";
import { ensureAdminUser } from "./lib/ensureAdminUser.js";
import { startTrashRetentionJob } from "./lib/trash.js";
import authRoutes from "./routes/auth.js";
import customerRoutes from "./routes/customers.js";
import customerAssetsRoutes from "./routes/customerAssets.js";
import deviceRoutes from "./routes/devices.js";
import paymentRoutes from "./routes/payments.js";
import creditRoutes from "./routes/credits.js";
import trashRoutes from "./routes/trash.js";
import equifaxConsultationRoutes from "./routes/equifaxConsultations.js";
import deletionRequestRoutes from "./routes/deletionRequests.js";

const app = express();
const PORT = Number(process.env.PORT || 4000);
const DEFAULT_WEB_ORIGIN = "http://localhost:3000";

function normalizeOrigin(value) {
  return String(value || "")
    .trim()
    .replace(/\/+$/, "");
}

const ALLOWED_WEB_ORIGINS = (process.env.WEB_ORIGIN || DEFAULT_WEB_ORIGIN)
  .split(",")
  .map(normalizeOrigin)
  .filter(Boolean);

// CORS: permitir cookies desde el frontend
app.use(
  cors({
    origin(origin, callback) {
      // Permitir solicitudes sin Origin (healthchecks, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = normalizeOrigin(origin);
      const isAllowed = ALLOWED_WEB_ORIGINS.includes(normalizedOrigin);

      if (isAllowed) {
        return callback(null, true);
      }

      return callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "12mb" }));
app.use(cookieParser());

// Health
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "KOVIX API",
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/auth", authRoutes);
app.use("/customers", customerRoutes);
app.use("/customer-assets", customerAssetsRoutes);
app.use("/devices", deviceRoutes);
app.use("/payments", paymentRoutes);
app.use("/credits", creditRoutes);
app.use("/trash", trashRoutes);
app.use("/equifax-consultations", equifaxConsultationRoutes);
app.use("/deletion-requests", deletionRequestRoutes);

app.use((error, req, res, next) => {
  console.error("Unhandled API error:", error);
  return sendServerError(res);
});

async function startServer() {
  const adminUsername = await ensureAdminUser();
  startTrashRetentionJob();

  app.listen(PORT, () => {
    console.log(`Backend en http://localhost:${PORT}`);
    console.log(`Admin listo: ${adminUsername}`);
  });
}

startServer().catch((error) => {
  console.error("No se pudo iniciar el backend:", error);
  process.exit(1);
});
