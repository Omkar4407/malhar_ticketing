import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import Menu from "../components/Menu";

// Only allow digits, strip everything else
const sanitizePhone = (val) => val.replace(/\D/g, "").slice(0, 10);
// Only allow digits for OTP, max 6
const sanitizeOtp = (val) => val.replace(/\D/g, "").slice(0, 6);

export default function Login() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // ── Validation ──────────────────────────────────────────
  const isValidPhone = (p) => /^[6-9]\d{9}$/.test(p);
  const isValidOtp   = (o) => /^\d{4,6}$/.test(o);

  // ── Send OTP (DEV: logs to console) ─────────────────────
  const sendOtp = async () => {
    setError("");
    const cleanPhone = sanitizePhone(phone);

    if (!isValidPhone(cleanPhone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    setLoading(true);
    try {
      const fakeOtp = Math.floor(100000 + Math.random() * 900000).toString();
      console.log(
        `%c[DEV] OTP for +91 ${cleanPhone}: ${fakeOtp}`,
        "color: orange; font-size: 16px; font-weight: bold;"
      );
      sessionStorage.setItem("dev_otp", fakeOtp);
      setPhone(cleanPhone);
      setStep(2);
    } finally {
      setLoading(false);
    }
  };

  // ── Verify OTP (DEV: checks against sessionStorage) ─────
  const verifyOtp = async () => {
    setError("");
    const cleanOtp = sanitizeOtp(otp);

    if (!isValidOtp(cleanOtp)) {
      setError("Enter the OTP sent to your number.");
      return;
    }

    setLoading(true);
    try {
      const expectedOtp = sessionStorage.getItem("dev_otp");
      if (cleanOtp !== expectedOtp) {
        setError("Incorrect OTP. Check your browser console.");
        return;
      }

      const { error: dbErr } = await supabase
        .from("users")
        .upsert(
          [{ phone_number: phone }],
          { onConflict: "phone_number", ignoreDuplicates: false }
        );

      if (dbErr) throw dbErr;

      sessionStorage.removeItem("dev_otp");
      localStorage.setItem("userPhone", phone);
      localStorage.setItem("userToken", "dev-token"); // swap with real token later
      navigate("/dashboard");
    } catch (err) {
      setError("Verification failed. Please try again.");
      console.error("verifyOtp error:", err);
    } finally {
      setLoading(false);
    }
  };

  // ── Go back to step 1 ────────────────────────────────────
  const handleBack = () => {
    setStep(1);
    setOtp("");
    setError("");
    sessionStorage.removeItem("dev_otp");
  };

  // ── Enter key support ────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === "Enter") step === 1 ? sendOtp() : verifyOtp();
  };

  return (
    <>
      <Menu />
      <div style={styles.page}>
        {/* ── Hero ── */}
        <div style={styles.hero}>
          <h1 style={styles.title}>MALHAR</h1>
          <p style={styles.subtitle}>Login to continue</p>
        </div>

        {/* ── Card ── */}
        <div style={styles.card}>
          {error && <div style={styles.errorBox}>{error}</div>}

          {step === 1 ? (
            <>
              <label style={styles.label}>Mobile Number</label>
              <div style={styles.phoneRow}>
                <span style={styles.countryCode}>+91</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  placeholder="98765 43210"
                  value={phone}
                  maxLength={10}
                  onChange={(e) => setPhone(sanitizePhone(e.target.value))}
                  onKeyDown={handleKeyDown}
                  style={{ ...styles.input, borderRadius: "0 8px 8px 0", borderLeft: "none" }}
                  disabled={loading}
                  autoFocus
                />
              </div>
              <button
                onClick={sendOtp}
                style={{
                  ...styles.btn,
                  opacity: loading || phone.length < 10 ? 0.6 : 1,
                  cursor: loading || phone.length < 10 ? "not-allowed" : "pointer",
                }}
                disabled={loading || phone.length < 10}
              >
                {loading ? "Sending…" : "Send OTP →"}
              </button>
            </>
          ) : (
            <>
              <label style={styles.label}>
                OTP sent to +91 {phone}
              </label>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="Enter OTP"
                value={otp}
                maxLength={6}
                onChange={(e) => setOtp(sanitizeOtp(e.target.value))}
                onKeyDown={handleKeyDown}
                style={styles.input}
                disabled={loading}
                autoFocus
              />
              <button
                onClick={verifyOtp}
                style={{
                  ...styles.btn,
                  opacity: loading || otp.length < 4 ? 0.6 : 1,
                  cursor: loading || otp.length < 4 ? "not-allowed" : "pointer",
                }}
                disabled={loading || otp.length < 4}
              >
                {loading ? "Verifying…" : "Verify OTP →"}
              </button>
              <button onClick={handleBack} style={styles.backBtn} disabled={loading}>
                ← Change number
              </button>
            </>
          )}
        </div>

        {/* ── Dev hint ── */}
        <p style={styles.devHint}>🛠 DEV MODE — Check browser console for OTP</p>
      </div>
    </>
  );
}

const styles = {
  page: {
    padding: "20px",
    maxWidth: "400px",
    margin: "0 auto",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
  },
  hero: {
    background: "#1A0A00",
    color: "white",
    padding: "28px 20px",
    borderRadius: "12px",
    marginBottom: "20px",
    textAlign: "center",
  },
  title: {
    color: "#FF5C1A",
    fontSize: "32px",
    fontWeight: 900,
    margin: "0 0 6px",
    letterSpacing: "0.06em",
  },
  subtitle: {
    color: "#aaa",
    fontSize: "14px",
    margin: 0,
  },
  card: {
    background: "#fff",
    padding: "24px 20px",
    borderRadius: "12px",
    border: "1px solid #eee",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  label: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#666",
    marginBottom: "2px",
  },
  phoneRow: {
    display: "flex",
    alignItems: "stretch",
    border: "1px solid #ddd",
    borderRadius: "8px",
    overflow: "hidden",
  },
  countryCode: {
    padding: "12px 10px",
    background: "#f5f5f5",
    fontSize: "14px",
    fontWeight: 600,
    color: "#555",
    borderRight: "1px solid #ddd",
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
  },
  input: {
    width: "100%",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "16px",
    outline: "none",
    boxSizing: "border-box",
  },
  btn: {
    width: "100%",
    padding: "13px",
    background: "#FF5C1A",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    transition: "opacity 0.15s",
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "#FF5C1A",
    fontSize: "13px",
    fontWeight: 600,
    cursor: "pointer",
    padding: "4px 0",
    textAlign: "left",
  },
  errorBox: {
    background: "#fff0f0",
    border: "1px solid #fdd",
    color: "#d0312d",
    fontSize: "13px",
    padding: "8px 12px",
    borderRadius: "7px",
  },
  devHint: {
    textAlign: "center",
    fontSize: "11px",
    color: "#aaa",
    marginTop: "14px",
  },
};