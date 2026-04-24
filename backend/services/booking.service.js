import Razorpay from "razorpay";
import crypto from "crypto";
import adminSupabase from "./supabase.service.js";

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

// ── Check slot availability ───────────────────────────────────────────────────
export async function checkSlotAvailable(slot_id) {
  const { data: slot } = await adminSupabase
    .from("slots")
    .select("capacity, booked_count")
    .eq("id", slot_id)
    .single();
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
export async function bookSlot(slot_id, ticketData) {
  const { data, error } = await adminSupabase.rpc("book_slot", {
    p_slot_id: slot_id,
    p_ticket_data: ticketData,
  });
  if (error) throw error;
  return data; // { success, ticket_id } or { success: false, error }
}

// ── Fetch full ticket by ID ───────────────────────────────────────────────────
export async function fetchTicketById(ticketId) {
  const { data } = await adminSupabase
    .from("tickets")
    .select("*")
    .eq("id", ticketId)
    .single();
  return data;
}

// ── Upsert user record after successful login ─────────────────────────────────
export async function upsertUser(phone) {
  await adminSupabase
    .from("users")
    .upsert([{ phone_number: phone }], { onConflict: "phone_number", ignoreDuplicates: true });
}