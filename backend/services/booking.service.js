import Razorpay from "razorpay";
import crypto from "crypto";
import adminSupabase from "./supabase.service.js";
import { cacheGet, bust, TTL } from "./cache.service.js";

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ── Verify Razorpay webhook signature ─────────────────────────────────────────
export function verifyRazorpaySignature({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) {
  const body = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");
  return expected === razorpay_signature;
}

// ── Check slot availability (cached 5s) ───────────────────────────────────────
// The pre-check before opening Razorpay is informational — the real atomic
// guard is inside book_slot() RPC. Caching 5s here cuts DB reads during a
// booking rush where many users check the same popular slot simultaneously.
export async function checkSlotAvailable(slot_id) {
  const slot = await cacheGet(
    `slot:${slot_id}`,
    TTL.SLOT_AVAILABILITY,
    async () => {
      const { data } = await adminSupabase
        .from("slots")
        .select("capacity, booked_count")
        .eq("id", slot_id)
        .single();
      return data;
    }
  );
  return slot && slot.booked_count < slot.capacity;
}

// ── Create Razorpay order with idempotency receipt ────────────────────────────
export async function createRazorpayOrder({ userPhone, amount, slot_id, event_id }) {
  const receipt = crypto
    .createHash("sha256")
    .update(`${userPhone}:${slot_id}:${event_id}`)
    .digest("hex")
    .slice(0, 40);

  return razorpay.orders.create({ amount: amount * 100, currency: "INR", receipt });
}

// ── Atomically create ticket via book_slot() stored function ──────────────────
// After a successful booking, bust the slot cache so the next
// availability check reflects the new booked_count immediately.
export async function bookSlot(slot_id, ticketData) {
  const { data, error } = await adminSupabase.rpc("book_slot", {
    p_slot_id: slot_id,
    p_ticket_data: ticketData,
  });
  if (error) throw error;
  // Always bust slot cache after any booking attempt (success or full)
  bust(`slot:${slot_id}`);
  return data; // { success, ticket_id } or { success: false, error }
}

// ── Fetch full ticket by ID (cached 10s) ──────────────────────────────────────
// Called immediately after booking — caching means rapid re-fetches
// (e.g. user navigates back and forward) don't hit the DB again.
export async function fetchTicketById(ticketId) {
  return cacheGet(
    `ticket:${ticketId}`,
    TTL.TICKET,
    async () => {
      const { data } = await adminSupabase
        .from("tickets")
        .select("*")
        .eq("id", ticketId)
        .single();
      return data;
    }
  );
}

// ── Upsert user record after successful login ─────────────────────────────────
export async function upsertUser(phone) {
  await adminSupabase
    .from("users")
    .upsert([{ phone_number: phone }], { onConflict: "phone_number", ignoreDuplicates: true });
}