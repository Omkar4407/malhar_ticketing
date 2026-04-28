import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import Menu from "../components/Menu";

const API = import.meta.env.VITE_API_URL;

const sanitizePhone = (val) => val.replace(/\D/g, "").slice(0, 10);
const sanitizeOtp   = (val) => val.replace(/\D/g, "").slice(0, 6);

export default function Login() {
  const [phone, setPhone]   = useState("");
  const [otp, setOtp]       = useState("");
  const [step, setStep]     = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState("");
  const navigate = useNavigate();

  const isValidPhone = (p) => /^[6-9]\d{9}$/.test(p);
  const isValidOtp   = (o) => /^\d{4,6}$/.test(o);

  // BUG FIX 6: Verify the existing token on mount. Only redirect if the token
  // is actually valid — not just present. This prevents a stale/expired token
  // from causing a redirect-loop between "/" and "/dashboard".
  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) return;
    axios.post(`${API}/verify-token`, { token })
      .then(({ data }) => {
        if (data.valid) navigate("/dashboard", { replace: true });
      })
      .catch(() => {
        // Invalid token — clear it and stay on login
        localStorage.removeItem("userToken");
        localStorage.removeItem("userPhone");
      });
  }, []);

  // ── Send OTP via backend ──────────────────────────────────────────────────
  const sendOtp = async () => {
    setError("");
    const cleanPhone = sanitizePhone(phone);
    if (!isValidPhone(cleanPhone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/send-otp`, { phone: cleanPhone });
      setPhone(cleanPhone);
      setStep(2);
    } catch (err) {
      const msg = err.response?.data?.error;
      setError(msg || "Failed to send OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Verify OTP via backend, receive JWT ───────────────────────────────────
  const verifyOtp = async () => {
    setError("");
    const cleanOtp = sanitizeOtp(otp);
    if (!isValidOtp(cleanOtp)) {
      setError("Enter the 6-digit OTP sent to your number.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/verify-otp`, {
        phone,
        otp: cleanOtp,
      });

      // ✅ Store token
      localStorage.setItem("userToken", data.token);

      // ✅ FIX: Attach token globally for all future requests
      axios.defaults.headers.common["Authorization"] = `Bearer ${data.token}`;

      // Keep phone only for UI
      localStorage.setItem("userPhone", phone);

      navigate("/dashboard");
    } catch (err) {
      const msg = err.response?.data?.error;
      setError(msg || "Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep(1);
    setOtp("");
    setError("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") step === 1 ? sendOtp() : verifyOtp();
  };

  return (
    <>
      <Menu />
      <div style={styles.page}>
        <div style={styles.hero}>
          <h1 style={styles.title}>MALHAR</h1>
          <p style={styles.subtitle}>Login to continue</p>
        </div>

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
              <label style={styles.label}>OTP sent to +91 {phone}</label>
              <input
                type="tel"
                inputMode="numeric"
                placeholder="Enter 6-digit OTP"
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
                  opacity: loading || otp.length < 6 ? 0.6 : 1,
                  cursor: loading || otp.length < 6 ? "not-allowed" : "pointer",
                }}
                disabled={loading || otp.length < 6}
              >
                {loading ? "Verifying…" : "Verify OTP →"}
              </button>
              <button onClick={handleBack} style={styles.backBtn} disabled={loading}>
                ← Change number
              </button>
            </>
          )}
        </div>
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
  subtitle: { color: "#aaa", fontSize: "14px", margin: 0 },
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
  label: { fontSize: "12px", fontWeight: 600, color: "#666", marginBottom: "2px" },
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
};