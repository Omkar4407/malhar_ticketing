import { useLocation, useNavigate } from "react-router-dom";
import Menu from "../components/Menu";
import Header from "../components/Header";

export default function Slots() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const slots = state?.slots;
  const event = state?.event;

  // Guard: if someone lands here directly without state
  if (!slots || !event) {
    return (
      <>
        <Menu />
        <div style={styles.page}>
          <div style={styles.errorBox}>Invalid page state. Please go back and try again.</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Menu />
      <Header />
      <div style={styles.page}>

        {/* ── Hero ── */}
        <div style={styles.hero}>
          <p style={styles.heroLabel}>Select a slot for</p>
          <h1 style={styles.heroTitle}>{event.name}</h1>
          <span style={{
            ...styles.priceBadge,
            background: event.price > 0 ? "#FFE4D6" : "#E6FFF2",
            color: event.price > 0 ? "#B94000" : "#1a7a45",
          }}>
            {event.price > 0 ? `₹${event.price}` : "Free"}
          </span>
        </div>

        {/* ── Slot count ── */}
        <div style={styles.countRow}>
          <span style={styles.countLabel}>
            {slots.length} slot{slots.length !== 1 ? "s" : ""} available
          </span>
        </div>

        {/* ── Slots ── */}
        {slots.map((slot) => {
          const spotsLeft = slot.capacity - slot.booked_count;
          const isFull = spotsLeft <= 0;

          return (
            <div
              key={slot.id}
              onClick={() => !isFull && navigate("/booking", { state: { slot, event } })}
              style={{
                ...styles.card,
                opacity: isFull ? 0.5 : 1,
                cursor: isFull ? "not-allowed" : "pointer",
              }}
            >
              <div style={styles.cardLeft}>
                <h3 style={styles.slotName}>{slot.name}</h3>
                <div style={styles.metaRow}>
                  {slot.date && <span style={styles.meta}>📅 {slot.date}</span>}
                  {slot.time && <span style={styles.meta}>🕐 {slot.time}</span>}
                </div>
              </div>
              <div style={styles.cardRight}>
                <span style={{
                  ...styles.spotsBadge,
                  background: isFull ? "#f5f5f5" : spotsLeft <= 10 ? "#FFF3E0" : "#E6FFF2",
                  color: isFull ? "#aaa" : spotsLeft <= 10 ? "#b45309" : "#1a7a45",
                }}>
                  {isFull ? "Full" : `${spotsLeft} left`}
                </span>
                {!isFull && <span style={styles.arrow}>→</span>}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

const styles = {
  page: {
    padding: "20px",
    maxWidth: "560px",
    margin: "0 auto",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    color: "#1a1a1a",
  },
  hero: {
    background: "#1A0A00",
    color: "white",
    padding: "22px 20px",
    borderRadius: "12px",
    marginBottom: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  heroLabel: {
    color: "#aaa",
    fontSize: "12px",
    margin: 0,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },
  heroTitle: {
    color: "#FF5C1A",
    fontSize: "24px",
    fontWeight: 900,
    margin: 0,
    letterSpacing: "-0.02em",
  },
  priceBadge: {
    alignSelf: "flex-start",
    padding: "3px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 700,
  },
  countRow: {
    marginBottom: "12px",
  },
  countLabel: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#aaa",
    background: "#f5f5f5",
    padding: "3px 10px",
    borderRadius: "20px",
  },
  card: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: "12px",
    padding: "16px 18px",
    marginBottom: "10px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
    transition: "opacity 0.15s",
  },
  cardLeft: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
    flex: 1,
  },
  slotName: {
    fontSize: "16px",
    fontWeight: 700,
    margin: 0,
  },
  metaRow: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  meta: {
    fontSize: "12px",
    color: "#666",
  },
  cardRight: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
    gap: "6px",
    flexShrink: 0,
  },
  spotsBadge: {
    padding: "3px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 700,
  },
  arrow: {
    color: "#FF5C1A",
    fontWeight: 700,
    fontSize: "16px",
  },
  errorBox: {
    background: "#fff0f0",
    border: "1px solid #fdd",
    color: "#d0312d",
    fontSize: "13px",
    padding: "12px",
    borderRadius: "8px",
  },
};