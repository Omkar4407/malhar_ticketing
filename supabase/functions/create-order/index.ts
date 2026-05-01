// NOTE: Razorpay npm package works in Deno via esm.sh
import Razorpay from "npm:razorpay@2";
import { handleCors, json, requireUserToken } from "../_shared/http.ts";
import adminSupabase from "../_shared/supabase.ts";

// ── Check slot availability — mirrors checkSlotAvailable() in booking.service.js
async function checkSlotAvailable(slot_id: string): Promise<boolean> {
  const { data } = await adminSupabase
    .from("slots")
    .select("capacity, booked_count, is_released")
    .eq("id", slot_id)
    .single();
  if (!data) return false;
  if (!data.is_released) return false;
  return data.booked_count < data.capacity;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { phone } = await requireUserToken(req);
    const { amount, slot_id, event_id } = await req.json();

    if (!amount || !slot_id || !event_id) {
      return json(req, { error: "amount, slot_id, and event_id are required." }, 400);
    }

    const isAvailable = await checkSlotAvailable(slot_id);
    if (!isAvailable) {
      return json(req, { error: "This slot is sold out." }, 409);
    }

    // Build idempotency receipt — same logic as createRazorpayOrder()
    const encoder = new TextEncoder();
    const data = encoder.encode(`${phone}:${slot_id}:${event_id}`);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const receipt = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 40);

    const razorpay = new Razorpay({
      key_id: Deno.env.get("RAZORPAY_KEY_ID")!,
      key_secret: Deno.env.get("RAZORPAY_KEY_SECRET")!,
    });

    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency: "INR",
      receipt,
    });

    return json(req, order);
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e.status === 401 || e.status === 403) return json(req, { error: e.message }, e.status);
    console.error("create-order error:", err);
    return json(req, { error: "Could not create order. Please try again." }, 500);
  }
});
