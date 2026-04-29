import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Menu from "../components/Menu";
import { bustSlotsCache } from "./Events";
import { bustTicketsCache } from "./Ticket";

const API = import.meta.env.VITE_API_URL;
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

// ── Helper: get auth header from stored JWT ───────────────────────────────────
// FIX — All backend calls now include the JWT in Authorization header.
// The backend reads phone from the token, not from the request body.
function authHeader() {
  const token = localStorage.getItem("userToken");
  return { Authorization: `Bearer ${token}` };
}

export default function Booking() {
  const [name, setName]           = useState("");
  const [college, setCollege]     = useState("");
  const [photo, setPhoto]         = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoUrl, setPhotoUrl]   = useState(null);   // uploaded URL, set in step 1
  const [uploading, setUploading] = useState(false);  // photo upload state
  const [loading, setLoading]     = useState(false);  // booking/payment state
  const [error, setError]         = useState("");

  const navigate  = useNavigate();
  const location  = useLocation();
  const slot  = location.state?.slot;
  const event = location.state?.event;

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
    if (!name.trim())         return "Please enter your name.";
    if (name.trim().length > 100) return "Name must be 100 characters or fewer.";
    if (!college.trim())      return "Please enter your college name.";
    if (college.trim().length > 150) return "College name must be 150 characters or fewer.";
    if (!photoUrl)            return "Please upload a photo first.";
    return null;
  };

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
    setPhotoUrl(null); // reset so they must upload before booking
    if (error) setError("");
  };

  // ── FIX: Photo upload is now a SEPARATE explicit step ────────────────────
  // Previously: photo was uploaded inside handleBooking() and handlePayment(),
  // meaning every booking attempt triggered a file upload mid-flow. At 450
  // concurrent bookings, this created 450 simultaneous file uploads — the
  // biggest latency source and the main reason <150ms was impossible.
  //
  // Now: user uploads the photo first with a dedicated button. Once uploaded,
  // the URL is stored. The booking/payment step only does the DB write (~20ms).
  // If the slot is full, the user doesn't waste time on a photo upload.
  const handleUploadPhoto = async () => {
    if (!photo) return;
    setUploading(true);
    setError("");
    try {
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}-${photo.name}`;
      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(fileName, photo);

      if (uploadError) {
        console.error("Photo upload error:", uploadError);
        setError("Photo upload failed. Please try again.");
        return;
      }

      const { data: urlData } = supabase.storage.from("photos").getPublicUrl(fileName);
      setPhotoUrl(urlData.publicUrl);
    } catch (err) {
      console.error("Upload error:", err);
      setError("Photo upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  // ── Free booking ──────────────────────────────────────────────────────────
  // FIX — Free bookings now go through /book-free backend endpoint which calls
  // the book_slot() DB function with SELECT FOR UPDATE row locking.
  // Previously: direct Supabase INSERT from the frontend — no lock, race-prone.
  const handleBooking = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError("");
    try {
      const { data } = await axios.post(
        `${API}/book-free`,
        {
          name: name.trim(),
          college: college.trim(),
          slot_id: slot.id,
          event_id: event.id,
          photo_url: photoUrl,
          // NOTE: phone is NOT sent — backend reads it from the JWT token
        },
        { headers: authHeader() }
      );

      // Bust slot availability + user tickets cache so next views are fresh
      bustSlotsCache(event.id);
      bustTicketsCache();

      navigate("/ticket", { state: { ticket: data.ticket } });
    } catch (err) {
      const msg = err.response?.data?.error;
      if (err.response?.status === 409) {
        // Slot filled between page load and booking attempt — tell user clearly
        setError("Sorry, this slot just sold out. Please go back and pick another.");
      } else {
        setError(msg || "Booking failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Paid booking ──────────────────────────────────────────────────────────
  // FIX — /create-order now checks slot availability before opening Razorpay.
  // FIX — /verify-payment uses book_slot() RPC — atomic, no oversell.
  // FIX — phone is NOT sent in body; backend reads from JWT.
  const handlePayment = async () => {
    const validationError = validate();
    if (validationError) { setError(validationError); return; }

    setLoading(true);
    setError("");
    try {
      const { data: order } = await axios.post(
        `${API}/create-order`,
        { amount: event.price, slot_id: slot.id, event_id: event.id },
        { headers: authHeader() }
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
              `${API}/verify-payment`,
              {
                ...response,
                name: name.trim(),
                college: college.trim(),
                slot_id: slot.id,
                event_id: event.id,
                photo_url: photoUrl,
                // phone NOT sent — comes from JWT on backend
              },
              { headers: authHeader() }
            );

            if (verify.data.success) {
              bustSlotsCache(event.id);
              bustTicketsCache();
              navigate("/ticket", { state: { ticket: verify.data.ticket } });
            } else {
              setError("Payment verification failed. Please contact support.");
              setLoading(false);
            }
          } catch (err) {
            const msg = err.response?.data?.error;
            if (err.response?.status === 409) {
              setError("Slot sold out after payment. Please contact support for a refund.");
            } else {
              setError(msg || "Payment verification failed. Please contact support.");
            }
            setLoading(false);
          }
        },
        modal: { ondismiss: () => setLoading(false) },
      };

      new window.Razorpay(options).open();
    } catch (err) {
      const msg = err.response?.data?.error;
      if (err.response?.status === 409) {
        setError("This slot just sold out. Please go back and pick another.");
        setLoading(false);
      } else {
        setError(msg || "Could not initiate payment. Please try again.");
        setLoading(false);
      }
    }
  };

  const isPhotoReady = !!photoUrl;
  const isFormReady  = name.trim() && college.trim() && isPhotoReady;

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
            maxLength={100}
            autoFocus
          />

          <label style={styles.label} htmlFor="booking-college">College *</label>
          <input
            id="booking-college"
            placeholder="e.g. St. Xavier's College"
            value={college}
            onChange={(e) => { setCollege(e.target.value); if (error) setError(""); }}
            style={styles.input}
            maxLength={150}
          />

          {/* ── Photo — upload as explicit step ── */}
          <label style={styles.label}>Photo *</label>
          <label htmlFor="booking-photo" style={styles.fileLabel}>
            {photoPreview ? (
              <img src={photoPreview} alt="Preview" style={styles.photoPreview} />
            ) : (
              <div style={styles.filePlaceholder}>
                <span style={styles.fileIcon}>📷</span>
                <span style={styles.fileText}>Tap to select photo (JPEG/PNG/WebP, max 5MB)</span>
              </div>
            )}
          </label>
          <input
            id="booking-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="user"
            onChange={handlePhotoChange}
            style={{ display: "none" }}
          />

          {/* Upload button — separate from booking */}
          {photo && !isPhotoReady && (
            <button
              onClick={handleUploadPhoto}
              disabled={uploading}
              style={{ ...styles.uploadBtn, opacity: uploading ? 0.7 : 1 }}
            >
              {uploading ? "Uploading…" : "📤 Upload Photo"}
            </button>
          )}

          {isPhotoReady && (
            <div style={styles.uploadedBadge}>✅ Photo uploaded</div>
          )}

          {photoPreview && !isPhotoReady && !uploading && (
            <button
              onClick={() => { setPhoto(null); setPhotoPreview(null); setPhotoUrl(null); }}
              style={styles.removePhoto}
            >
              Remove photo
            </button>
          )}
        </div>

        {/* ── CTA ── */}
        <button
          style={{ ...styles.btn, opacity: loading || !isFormReady ? 0.6 : 1 }}
          disabled={loading || !isFormReady}
          onClick={event.price > 0 ? handlePayment : handleBooking}
        >
          {loading
            ? "Please wait…"
            : !isPhotoReady
            ? "Upload photo to continue"
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
  eventName: { color: "rgba(255,255,255,0.75)", fontSize: "15px", margin: "0 0 10px 0" },
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
  fileLabel: { display: "block", cursor: "pointer", marginBottom: "8px" },
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
  uploadBtn: {
    width: "100%",
    padding: "10px",
    background: "#1A0A00",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
    marginBottom: "6px",
  },
  uploadedBadge: {
    fontSize: "13px",
    color: "#16a34a",
    fontWeight: 600,
    padding: "6px 0",
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