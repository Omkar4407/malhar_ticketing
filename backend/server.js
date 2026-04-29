import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import 'dotenv/config'

dotenv.config();

import authRoutes from "./routes/auth.routes.js";
import otpRoutes from "./routes/otp.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import scannerRoutes from "./routes/scanner.routes.js";
import eventsRoutes  from "./routes/events.routes.js";

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/", authRoutes);
app.use("/", otpRoutes);
app.use("/", bookingRoutes);
app.use("/", scannerRoutes);
app.use("/", eventsRoutes);

app.listen(5000, () => console.log("Server running on port 5000"));