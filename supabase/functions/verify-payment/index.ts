import { handleCors, json, requireUserToken } from "../_shared/http.ts";
import adminSupabase from "../_shared/supabase.ts";

// ── Razorpay HMAC signature verification — mirrors verifyRazorpaySignature()
async function verifyRazorpaySignature(
  order_id: string,
  payment_id: string,
  signature: string
): Promise<boolean> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(Deno.env.get("RAZORPAY_KEY_SECRET")!),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${order_id}|${payment_id}`)
  );
  const expected = Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return expected === signature;
}

Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const { phone } = await requireUserToken(req);
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      name,
      college,
      slot_id,
      event_id,
      photo_url,
    } = await req.json();

    const valid = await verifyRazorpaySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );
    if (!valid) return json(req, { success: false, error: "Payment signature mismatch." }, 400);

    const trimmedName = name?.trim();
    const trimmedCollege = college?.trim();

    if (!trimmedName || trimmedName.length > 100)
      return json(req, { success: false, error: "Invalid name." }, 400);
    if (!trimmedCollege || trimmedCollege.length > 150)
      return json(req, { success: false, error: "Invalid college name." }, 400);

    // Atomically book the slot via book_slot() RPC — same as bookSlot()
    const { data, error } = await adminSupabase.rpc("book_slot", {
      p_slot_id: slot_id,
      p_ticket_data: {
        name: trimmedName,
        college: trimmedCollege,
        phone, // always from JWT
        event_id,
        photo_url,
        payment_status: "paid",
        razorpay_order_id,
        razorpay_payment_id,
      },
    });
    if (error) throw error;
    if (!data.success) return json(req, { success: false, error: data.error || "Slot is full." }, 409);

    const { data: ticket } = await adminSupabase
      .from("tickets")
      .select("*")
      .eq("id", data.ticket_id)
      .single();

    return json(req, { success: true, ticket });
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e.status === 401 || e.status === 403) return json(req, { error: e.message }, e.status);
    console.error("verify-payment error:", err);
    return json(req, { error: "Verification failed." }, 500);
  }
});
