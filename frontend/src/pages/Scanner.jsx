import { useState } from "react";
import { supabase } from "../lib/supabase";
import { memGet, memSet, memBust } from "../lib/cache";
import Menu from "../components/Menu";
// HIGH #5: useEffect auth guard removed — ScannerRoute in App.jsx handles it centrally.
// Having a second guard here caused a blank flash before the redirect fired.

const SCANNER_TTL = 5_000; // 5s — scanner needs near-real-time checked_in status

// possible states: null | "invalid" | "already_entered" | "pending" | "allowed" | "rejected"

export default function Scanner() {
  const [input, setInput] = useState("");
  const [scanState, setScanState] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleScan = async () => {
    setScanState(null);
    setTicket(null);
    setLoading(true);

    try {
      const parsed = JSON.parse(input);
      const ticketId = parsed.ticket_id;

      // Check cache first — avoids a DB round-trip for tickets scanned recently
      const cacheKey = `scanner:${ticketId}`;
      const cached = memGet(cacheKey);
      let data;

      if (cached && Date.now() - cached.ts < SCANNER_TTL) {
        data = cached.data;
      } else {
        const { data: row, error } = await supabase
          .from("tickets")
          .select("*")
          .eq("id", ticketId)
          .single();

        if (error || !row) {
          setScanState("invalid");
          setLoading(false);
          return;
        }
        data = row;
        memSet(cacheKey, data);
      }

      setTicket(data);
      setScanState(data.checked_in ? "already_entered" : "pending");
    } catch {
      setScanState("invalid");
    }

    setLoading(false);
  };

  const handleAllow = async () => {
    setLoading(true);
    await supabase
      .from("tickets")
      .update({ checked_in: true, checked_in_at: new Date().toISOString() })
      .eq("id", ticket.id);

    // Bust the scanner cache for this ticket so a re-scan shows "already entered"
    memBust(`scanner:${ticket.id}`);
    setScanState("allowed");
    setLoading(false);
  };

  const handleReject = () => {
    setScanState("rejected");
  };

  const handleReset = () => {
    setInput("");
    setScanState(null);
    setTicket(null);
  };

  return (
    <>
      <Menu />
      <div style={styles.page}>
        <h2 style={styles.heading}>Scanner</h2>

        {/* ── QR Box ── */}
        <div style={styles.qrBox}>
          <div style={styles.scanLine} />
          <style>{`
            @keyframes scan {
              0%   { top: 0; }
              100% { top: 100%; }
            }
          `}</style>
        </div>

        {/* ── Input + Scan button (only when idle) ── */}
        {!scanState && (
          <>
            <input
              placeholder="Paste QR JSON"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleScan()}
              style={styles.input}
            />
            <button
              onClick={handleScan}
              disabled={!input.trim() || loading}
              style={{
                ...styles.btn,
                background: "#1A0A00",
                opacity: !input.trim() || loading ? 0.5 : 1,
              }}
            >
              {loading ? "Scanning…" : "Scan"}
            </button>
          </>
        )}

        {/* ── INVALID ── */}
        {scanState === "invalid" && (
          <div style={styles.resultBox("#fff0f0", "#d0312d")}>
            <span style={styles.icon}>🚫</span>
            <p style={styles.resultTitle}>Traitor</p>
            <p style={styles.resultSub}>This QR code is not valid.</p>
            <button onClick={handleReset} style={{ ...styles.btn, background: "#d0312d" }}>
              Scan Again
            </button>
          </div>
        )}

        {/* ── ALREADY ENTERED ── */}
        {scanState === "already_entered" && (
          <div style={styles.resultBox("#fffbe6", "#b45309")}>
            <span style={styles.icon}>⚠️</span>
            <p style={styles.resultTitle}>Already Entered</p>
            <p style={styles.resultSub}>
              <strong>{ticket?.name}</strong> has already checked in.
            </p>
            <button onClick={handleReset} style={{ ...styles.btn, background: "#b45309" }}>
              Scan Again
            </button>
          </div>
        )}

        {/* ── PENDING — show Allow / Reject ── */}
        {scanState === "pending" && ticket && (
          <div style={styles.resultBox("#f0f8ff", "#1a4a7a")}>
            <span style={styles.icon}>🎟️</span>
            <p style={styles.resultTitle}>Valid Ticket</p>
            <div style={styles.ticketInfo}>
              <Row label="Name"    value={ticket.name} />
              <Row label="College" value={ticket.college} />
              <Row label="Phone"   value={ticket.phone} />
            </div>
            <div style={styles.actionRow}>
              <button
                onClick={handleAllow}
                disabled={loading}
                style={{ ...styles.btn, background: "#16a34a", flex: 1 }}
              >
                ✅ Allow
              </button>
              <button
                onClick={handleReject}
                disabled={loading}
                style={{ ...styles.btn, background: "#d0312d", flex: 1 }}
              >
                ❌ Reject
              </button>
            </div>
          </div>
        )}

        {/* ── ALLOWED ── */}
        {scanState === "allowed" && (
          <div style={styles.resultBox("#f0fff4", "#16a34a")}>
            <span style={styles.icon}>✅</span>
            <p style={styles.resultTitle}>Entry Allowed</p>
            <p style={styles.resultSub}>
              <strong>{ticket?.name}</strong> has been checked in.
            </p>
            <button onClick={handleReset} style={{ ...styles.btn, background: "#16a34a" }}>
              Scan Next
            </button>
          </div>
        )}

        {/* ── REJECTED ── */}
        {scanState === "rejected" && (
          <div style={styles.resultBox("#fff0f0", "#d0312d")}>
            <span style={styles.icon}>🚫</span>
            <p style={styles.resultTitle}>Entry Rejected</p>
            <p style={styles.resultSub}>
              <strong>{ticket?.name}</strong> was turned away.
            </p>
            <button onClick={handleReset} style={{ ...styles.btn, background: "#d0312d" }}>
              Scan Again
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ── Small helper components ──────────────────────────────
function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
      <span style={{ color: "#888", fontSize: "13px" }}>{label}</span>
      <span style={{ fontWeight: 600, fontSize: "13px" }}>{value || "—"}</span>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────
const styles = {
  page: {
    padding: "20px",
    maxWidth: "400px",
    margin: "0 auto",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    textAlign: "center",
  },
  heading: {
    fontSize: "22px",
    fontWeight: 800,
    marginBottom: "16px",
    letterSpacing: "-0.02em",
  },
  qrBox: {
    width: "220px",
    height: "220px",
    border: "3px solid #1A0A00",
    margin: "0 auto 24px",
    position: "relative",
    overflow: "hidden",
    borderRadius: "8px",
  },
  scanLine: {
    height: "2px",
    background: "#FF5C1A",
    width: "100%",
    position: "absolute",
    animation: "scan 2s linear infinite",
  },
  input: {
    width: "100%",
    padding: "12px",
    marginBottom: "10px",
    borderRadius: "8px",
    border: "1px solid #ddd",
    fontSize: "14px",
    boxSizing: "border-box",
    outline: "none",
  },
  btn: {
    width: "100%",
    padding: "12px",
    color: "white",
    border: "none",
    borderRadius: "8px",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
  },
  resultBox: (bg, border) => ({
    background: bg,
    border: `1.5px solid ${border}`,
    borderRadius: "12px",
    padding: "24px 20px",
    marginTop: "16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
  }),
  icon: {
    fontSize: "40px",
  },
  resultTitle: {
    fontSize: "20px",
    fontWeight: 800,
    margin: 0,
  },
  resultSub: {
    fontSize: "14px",
    color: "#555",
    margin: 0,
  },
  ticketInfo: {
    width: "100%",
    background: "white",
    borderRadius: "8px",
    padding: "12px 14px",
    marginBottom: "4px",
    textAlign: "left",
  },
  actionRow: {
    display: "flex",
    gap: "10px",
    width: "100%",
  },
};