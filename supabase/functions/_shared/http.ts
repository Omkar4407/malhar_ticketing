// ── CORS ──────────────────────────────────────────────────────────────────────
// Mirrors your server.js ALLOWED_ORIGINS logic.
// Edge Functions need to handle the OPTIONS preflight too.

export function corsHeaders(req: Request): Record<string, string> {
  const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  const origin = req.headers.get("origin") || "";
  const allowedOrigin =
    allowedOrigins.length === 0 || allowedOrigins.includes(origin)
      ? origin || "*"
      : "";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
  };
}

// Return a preflight response — call this at the top of every function
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  return null;
}

// Helper: wrap any JSON response with CORS headers
export function json(
  req: Request,
  body: unknown,
  status = 200
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json" },
  });
}

// ── Auth extraction helpers ───────────────────────────────────────────────────
// Mirrors auth.middleware.js — reads Bearer token and returns payload or throws.
import { verifyTokenPayload } from "./jwt.ts";

export async function requireUserToken(
  req: Request
): Promise<{ phone: string }> {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer "))
    throw Object.assign(new Error("Missing token."), { status: 401 });
  const payload = await verifyTokenPayload(auth.slice(7));
  if (payload.role !== "user" || !payload.phone)
    throw Object.assign(new Error("Invalid token role."), { status: 403 });
  return { phone: payload.phone as string };
}

export async function requireAdminToken(req: Request): Promise<void> {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer "))
    throw Object.assign(new Error("Missing token."), { status: 401 });
  const payload = await verifyTokenPayload(auth.slice(7));
  if (payload.role !== "super_admin")
    throw Object.assign(new Error("Super admin access required."), { status: 403 });
}

export async function requireScannerToken(req: Request): Promise<void> {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer "))
    throw Object.assign(new Error("Missing token."), { status: 401 });
  const payload = await verifyTokenPayload(auth.slice(7));
  if (payload.role !== "scanner" && payload.role !== "super_admin")
    throw Object.assign(new Error("Scanner access required."), { status: 403 });
}
