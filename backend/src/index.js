import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import { sendServerError } from "./lib/http.js";
import authRoutes from "./routes/auth.js";
import customerRoutes from "./routes/customers.js";
import deviceRoutes from "./routes/devices.js";
import paymentRoutes from "./routes/payments.js";
import creditRoutes from "./routes/credits.js";

const app = express();
const PORT = Number(process.env.PORT || 4000);
const WEB_ORIGIN = process.env.WEB_ORIGIN || "http://localhost:3000";

// CORS: permitir cookies desde el frontend
app.use(
  cors({
    origin: WEB_ORIGIN,
    credentials: true,
  })
);

app.use(express.json());
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
app.use("/devices", deviceRoutes);
app.use("/payments", paymentRoutes);
app.use("/credits", creditRoutes);

app.use((error, req, res, next) => {
  console.error("Unhandled API error:", error);
  return sendServerError(res);
});

app.listen(PORT, () => {
  console.log(`Backend en http://localhost:${PORT}`);
});
