import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Razorpay from "razorpay";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { rateLimit, ipKeyGenerator } from "express-rate-limit";

dotenv.config();

const app = express();

// ── CORS — only allow requests from the frontend origin ───
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

// ── Rate limiters ─────────────────────────────────────────

// Max 5 OTP sends per phone per 10 minutes (stops SMS spam)
const sendOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  // FIX: use ipKeyGenerator helper so IPv6 addresses are handled correctly.
  // Previously used req.body.phone || req.ip directly, which threw ERR_ERL_KEY_GEN_IPV6.
  // Phone number is used as the key when present (more precise limiting);
  // falls back to the IPv6-safe IP key when phone is not in the body.
  keyGenerator: (req) => req.body.phone || ipKeyGenerator(req),
  handler: (req, res) => res.status(429).json({
    error: "Too many OTP requests. Please wait 10 minutes before trying again.",
  }),
  standardHeaders: true,
  legacyHeaders: false,
});

// Max 10 verify attempts per IP per 15 minutes
const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  handler: (req, res) => res.status(429).json({
    error: "Too many verification attempts. Please wait 15 minutes.",
  }),
  standardHeaders: true,
  legacyHeaders: false,
});

// Max 10 login attempts per IP per 15 minutes (admin + scanner)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  handler: (req, res) => res.status(429).json({
    error: "Too many login attempts. Please wait 15 minutes.",
  }),
  standardHeaders: true,
  legacyHeaders: false,
});

// ── JWT helper ────────────────────────────────────────────
const JWT_SECRET = process.env.JWT_SECRET;

function signToken(payload, expiresIn = "12h") {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

// ================= ADMIN LOGIN =================
app.post("/admin-login", loginLimiter, (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password is required." });
  if (password !== process.env.ADMIN_PASSWORD) return res.status(401).json({ error: "Incorrect password." });

  const token = signToken({ role: "super_admin" });
  return res.json({ success: true, token });
});

// ================= SCANNER LOGIN =================
app.post("/scanner-login", loginLimiter, (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: "Password is required." });
  if (password !== process.env.SCANNER_PASSWORD) return res.status(401).json({ error: "Incorrect password." });

  const token = signToken({ role: "scanner" });
  return res.json({ success: true, token });
});

// ================= VERIFY TOKEN =================
app.post("/verify-token", (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(401).json({ valid: false });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    return res.json({ valid: true, payload });
  } catch {
    return res.status(401).json({ valid: false });
  }
});

// ================= OTP =================
// otpStore shape: { [phone]: { otp, expiresAt, attempts } }
const otpStore = {};
const OTP_TTL_MS       = 5 * 60 * 1000; // 5 minutes
const MAX_OTP_ATTEMPTS = 5;

// 🔥 Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

app.post("/send-otp", sendOtpLimiter, (req, res) => {
  const { phone } = req.body;
  const otp = Math.floor(100000 + Math.random() * 900000);

  otpStore[phone] = {
    otp,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  };

  console.log("OTP:", otp); // remove before production
  res.json({ success: true });
});

app.post("/verify-otp", verifyOtpLimiter, (req, res) => {
  const { phone, otp } = req.body;
  const record = otpStore[phone];

  if (!record) {
    return res.status(400).json({ error: "No OTP found. Please request a new one." });
  }
  if (Date.now() > record.expiresAt) {
    delete otpStore[phone];
    return res.status(400).json({ error: "OTP has expired. Please request a new one." });
  }
  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    delete otpStore[phone];
    return res.status(429).json({ error: "Too many attempts. Please request a new OTP." });
  }
  if (record.otp != otp) {
    record.attempts += 1;
    const remaining = MAX_OTP_ATTEMPTS - record.attempts;
    return res.status(400).json({
      error: remaining > 0
        ? `Invalid OTP. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
        : "Too many attempts. Please request a new OTP.",
    });
  }

  // Correct — issue a user token
  delete otpStore[phone];
  const token = signToken({ role: "user", phone });
  return res.json({ success: true, token });
});

// ================= CREATE ORDER =================
app.post("/create-order", async (req, res) => {
  try {
    const { amount } = req.body;
    const order = await razorpay.orders.create({ amount: amount * 100, currency: "INR" });
    res.json(order);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Order failed" });
  }
});

// ================= VERIFY PAYMENT + CREATE TICKET =================
app.post("/verify-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      name,
      college,
      phone,
      slot_id,
      event_id,
      photo_url,
    } = req.body;

    // 1. Verify Razorpay signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, error: "Payment signature mismatch." });
    }

    // 2. Signature valid — create ticket using service role key
    const { createClient } = await import("@supabase/supabase-js");
    const adminSupabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: ticket, error: ticketError } = await adminSupabase
      .from("tickets")
      .insert([{
        name,
        college,
        phone,
        slot_id,
        event_id,
        photo_url,
        payment_status: "paid",
        razorpay_order_id,
        razorpay_payment_id,
      }])
      .select()
      .single();

    if (ticketError) {
      console.error("Ticket creation failed:", ticketError);
      return res.status(500).json({ success: false, error: "Ticket creation failed." });
    }

    return res.json({ success: true, ticket });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Verification failed" });
  }
});

app.listen(5000, () => console.log("Server running on 5000"));