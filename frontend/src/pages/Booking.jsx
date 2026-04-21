import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Menu from "../components/Menu";

// MED #4: Allowed MIME types and max size
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export default function Booking() {
  const [name, setName] = useState("");
  const [college, setCollege] = useState("");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  const slot = location.state?.slot;
  const event = location.state?.event;
  const phone = localStorage.getItem("userPhone");

  // Guard: if navigated here without state
  if (!slot || !event) {
    return (
      <>
        <Menu />
        <div style={styles.page}>
          <div style={styles.errorBox}>
            Invalid booking session. Please go back and select an event.
          </div>
        </div>
      </>
    );
  }

  const validate = () => {
    if (!name.trim()) return "Please enter your name.";
    if (!college.trim()) return "Please enter your college name.";
    if (!photo) return "Please upload a photo.";
    return null;
  };

  // MED #4: Validate file type and size before accepting it
  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only JPEG, PNG, or WebP images are allowed.");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setError("Photo must be smaller than 5MB.");
      e.target.value = "";
      return;
    }

    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    if (error) setError("");
  };

  // ── Booking ──────────────────────────────────────────────────────────────
  const handleBooking = async (isPaid = false) => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError("");

    try {
      // MED #2: Pre-check for existing booking with same phone + slot_id
      const { data: existing } = await supabase
        .from("tickets")
        .select("id")
        .eq("phone", phone)
        .eq("slot_id", slot.id)
        .maybeSingle();

      if (existing) {
        setError("You have already booked this slot.");
        setLoading(false);
        return;
      }

      const fileName = `${Date.now()}-${Math.random()}-${photo.name}`;

      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(fileName, photo);

      if (uploadError) {
        // LOW #1: Generic message to user, real error only to console
        console.error("Photo upload error:", uploadError);
        setError("Photo upload failed. Please try again.");
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("photos")
        .getPublicUrl(fileName);

      const { data: ticket, error: ticketError } = await supabase
        .from("tickets")
        .insert([
          {
            name: name.trim(),
            college: college.trim(),
            phone,
            slot_id: slot.id,
            event_id: event.id,
            photo_url: urlData.publicUrl,
            payment_status: isPaid ? "paid" : "free",
          },
        ])
        .select()
        .single();

      if (ticketError) {
        // LOW #1: Don't expose DB schema errors
        console.error("Ticket insert error:", ticketError);
        setError("Booking failed. Please try again.");
        setLoading(false);
        return;
      }

      navigate("/ticket", { state: { ticket } });
    } catch (err) {
      // LOW #1: Never surface err.message to the user
      console.error("Booking error:", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  // ── Payment ───────────────────────────────────────────────────────────────
  const handlePayment = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError("");

    try {
      // MED #2: Pre-check for existing booking before opening Razorpay
      const { data: existing } = await supabase
        .from("tickets")
        .select("id")
        .eq("phone", phone)
        .eq("slot_id", slot.id)
        .maybeSingle();

      if (existing) {
        setError("You have already booked this slot.");
        setLoading(false);
        return;
      }

      const fileName = `${Date.now()}-${Math.random()}-${photo.name}`;
      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(fileName, photo);

      if (uploadError) {
        console.error("Photo upload error:", uploadError);
        setError("Photo upload failed. Please try again.");
        setLoading(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("photos")
        .getPublicUrl(fileName);

      const photoUrl = urlData.publicUrl;

      const { data: order } = await axios.post(
        `${import.meta.env.VITE_API_URL}/create-order`,
        { amount: event.price }
      );

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: "INR",
        name: "Malhar Fest",
        description: event.name,
        order_id: order.id,
        handler: async function (response) {
          try {
            const verify = await axios.post(
              `${import.meta.env.VITE_API_URL}/verify-payment`,
              {
                ...response,
                name: name.trim(),
                college: college.trim(),
                phone,
                slot_id: slot.id,
                event_id: event.id,
                photo_url: photoUrl,
              }
            );
            if (verify.data.success) {
              navigate("/ticket", { state: { ticket: verify.data.ticket } });
            } else {
              // LOW #1: Generic message, no internal detail exposed
              setError("Payment verification failed. Please contact support.");
              setLoading(false);
            }
          } catch (err) {
            console.error("Payment verify error:", err);
            setError("Payment verification failed. Please contact support.");
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => setLoading(false),
        },
      };

      new window.Razorpay(options).open();
    } catch (err) {
      console.error("Payment error:", err);
      setError("Could not initiate payment. Please try again.");
      setLoading(false);
    }
  };

  return (
    <>
      <Menu />
      <div style={styles.page}>
        {/* ── Hero ── */}
        <div style={styles.hero}>
          <div style={styles.badge}>Booking</div>
          <h1 style={styles.title}>Book Your Pass</h1>
          <p style={styles.eventName}>{event.name}</p>
          <div style={styles.slotPill}>
            🕐 {slot.name}{slot.time ? ` — ${slot.time}` : ""}
          </div>
        </div>

        {/* ── Form ── */}
        <div style={styles.card}>
          {error && <div style={styles.errorBox}>{error}</div>}

          <label style={styles.label} htmlFor="booking-name">Full Name *</label>
          <input
            id="booking-name"
            placeholder="e.g. Omkar Sharma"
            value={name}
            onChange={(e) => { setName(e.target.value); if (error) setError(""); }}
            style={styles.input}
            autoFocus
          />

          <label style={styles.label} htmlFor="booking-college">College *</label>
          <input
            id="booking-college"
            placeholder="e.g. St. Xavier's College"
            value={college}
            onChange={(e) => { setCollege(e.target.value); if (error) setError(""); }}
            style={styles.input}
          />

          <label style={styles.label}>Photo *</label>
          <label htmlFor="booking-photo" style={styles.fileLabel}>
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" style={styles.photoPreview} />
            ) : (
              <div style={styles.filePlaceholder}>
                <span style={styles.fileIcon}>📷</span>
                <span style={styles.fileText}>Tap to upload a photo (JPEG/PNG/WebP, max 5MB)</span>
              </div>
            )}
          </label>
          {/* MED #4: accept restricts the file picker UI; validation in handlePhotoChange is the real guard */}
          <input
            id="booking-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="user"
            onChange={handlePhotoChange}
            style={{ display: "none" }}
          />
          {photoPreview && (
            <button
              onClick={() => { setPhoto(null); setPhotoPreview(null); }}
              style={styles.removePhoto}
            >
              Remove photo
            </button>
          )}
        </div>

        {/* ── CTA ── */}
        <button
          style={{ ...styles.btn, opacity: loading ? 0.7 : 1 }}
          disabled={loading}
          onClick={event.price > 0 ? handlePayment : () => handleBooking()}
        >
          {loading
            ? "Please wait…"
            : event.price > 0
            ? `Pay ₹${event.price}`
            : "Book Free Pass"}
        </button>
      </div>
    </>
  );
}

const styles = {
  page: {
    padding: "24px 20px",
    maxWidth: "480px",
    margin: "0 auto",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    color: "#1a1a1a",
  },
  hero: {
    background: "#1A0A00",
    borderRadius: "16px",
    padding: "28px 24px",
    marginBottom: "16px",
  },
  badge: {
    display: "inline-block",
    background: "rgba(255,92,26,0.2)",
    color: "#FF5C1A",
    fontSize: "11px",
    fontWeight: 700,
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    padding: "3px 10px",
    borderRadius: "20px",
    border: "1px solid rgba(255,92,26,0.35)",
    marginBottom: "10px",
  },
  title: {
    color: "#FF5C1A",
    fontSize: "26px",
    fontWeight: 800,
    margin: "0 0 6px 0",
    letterSpacing: "-0.02em",
  },
  eventName: {
    color: "rgba(255,255,255,0.75)",
    fontSize: "15px",
    margin: "0 0 10px 0",
  },
  slotPill: {
    display: "inline-block",
    background: "rgba(255,255,255,0.08)",
    color: "rgba(255,255,255,0.6)",
    fontSize: "12px",
    padding: "4px 10px",
    borderRadius: "20px",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  card: {
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid #eee",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
    marginBottom: "0",
  },
  label: {
    display: "block",
    fontSize: "12px",
    fontWeight: 700,
    color: "#555",
    marginBottom: "6px",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  input: {
    width: "100%",
    padding: "10px 12px",
    marginBottom: "14px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  },
  fileLabel: {
    display: "block",
    cursor: "pointer",
    marginBottom: "8px",
  },
  filePlaceholder: {
    border: "2px dashed #ddd",
    borderRadius: "10px",
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    background: "#fafafa",
  },
  fileIcon: { fontSize: "28px" },
  fileText: { fontSize: "13px", color: "#aaa", textAlign: "center" },
  photoPreview: {
    width: "100%",
    maxHeight: "200px",
    objectFit: "cover",
    borderRadius: "10px",
    display: "block",
  },
  removePhoto: {
    background: "none",
    border: "none",
    color: "#d0312d",
    fontSize: "12px",
    cursor: "pointer",
    padding: "0 0 12px 0",
    textDecoration: "underline",
  },
  btn: {
    width: "100%",
    padding: "14px",
    background: "#FF5C1A",
    color: "white",
    border: "none",
    borderRadius: "10px",
    marginTop: "14px",
    fontWeight: 700,
    fontSize: "16px",
    cursor: "pointer",
  },
  errorBox: {
    background: "#fff0f0",
    border: "1px solid #fdd",
    color: "#d0312d",
    fontSize: "13px",
    padding: "8px 12px",
    borderRadius: "7px",
    marginBottom: "14px",
  },
};