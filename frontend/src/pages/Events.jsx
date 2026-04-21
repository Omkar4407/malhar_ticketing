import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Menu from "../components/Menu";

export default function Events() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [navigating, setNavigating] = useState(null);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from("events")
      .select("id, name, type, price, created_at")
      .order("created_at", { ascending: true })
      .then(({ data, error: err }) => {
        if (err) setError("Failed to load events. Please refresh.");
        setEvents(data || []);
        setLoading(false);
      });
  }, []);

  const handleClick = async (event) => {
    if (navigating) return;
    setNavigating(event.id);
    setError("");

    const { data: slots, error: err } = await supabase
      .from("slots")
      .select("id, name, date, time, capacity, booked_count, event_id")
      .eq("event_id", event.id)
      .order("date", { ascending: true });

    if (err || !slots) {
      setError("Could not load slots. Please try again.");
      setNavigating(null);
      return;
    }

    if (slots.length === 0) {
      setError(`No slots available for "${event.name}" yet.`);
      setNavigating(null);
      return;
    }

    // Filter out fully booked slots
    const availableSlots = slots.filter(
      (s) => s.booked_count < s.capacity
    );

    if (availableSlots.length === 0) {
      setError(`"${event.name}" is fully booked.`);
      setNavigating(null);
      return;
    }

    if (availableSlots.length === 1) {
      navigate("/booking", { state: { slot: availableSlots[0], event } });
    } else {
      navigate("/slots", { state: { slots: availableSlots, event } });
    }
  };

  return (
    <>
      <Menu />
      <Header />

      <div style={styles.page}>
        <div style={styles.titleRow}>
          <h1 style={styles.pageTitle}>Events</h1>
          {!loading && (
            <span style={styles.count}>
              {events.length} event{events.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {error && <div style={styles.errorBox}>{error}</div>}

        {loading && (
          <div style={styles.emptyState}>
            <p style={styles.emptyText}>Loading events…</p>
          </div>
        )}

        {!loading && events.length === 0 && !error && (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>🎪</span>
            <p style={styles.emptyText}>No events available yet. Check back soon!</p>
          </div>
        )}

        {events.map((event) => {
          const isLoading = navigating === event.id;
          return (
            <div
              key={event.id}
              onClick={() => handleClick(event)}
              style={{
                ...styles.card,
                opacity: navigating && !isLoading ? 0.5 : 1,
                cursor: navigating ? "default" : "pointer",
              }}
            >
              <div style={styles.cardLeft}>
                <div style={styles.nameRow}>
                  <h2 style={styles.eventName}>{event.name}</h2>
                  {event.type && (
                    <span style={styles.typeBadge}>{event.type}</span>
                  )}
                </div>
                <span style={styles.tapHint}>
                  {isLoading ? "Loading…" : "Tap to book →"}
                </span>
              </div>

              <span
                style={{
                  ...styles.priceBadge,
                  background: event.price > 0 ? "#FFE4D6" : "#E6FFF2",
                  color: event.price > 0 ? "#B94000" : "#1a7a45",
                }}
              >
                {event.price > 0 ? `₹${event.price}` : "Free"}
              </span>
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
  titleRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "16px",
  },
  pageTitle: {
    fontSize: "22px",
    fontWeight: 800,
    margin: 0,
    letterSpacing: "-0.02em",
  },
  count: {
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
    gap: "4px",
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  eventName: {
    fontSize: "16px",
    fontWeight: 700,
    margin: 0,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  typeBadge: {
    fontSize: "10px",
    fontWeight: 600,
    color: "#7C3AED",
    background: "#F3EEFF",
    padding: "2px 8px",
    borderRadius: "20px",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    flexShrink: 0,
  },
  tapHint: {
    fontSize: "12px",
    color: "#FF5C1A",
    fontWeight: 500,
  },
  priceBadge: {
    padding: "5px 12px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: 700,
    flexShrink: 0,
  },
  emptyState: {
    textAlign: "center",
    padding: "48px 20px",
    background: "#fafafa",
    borderRadius: "12px",
    border: "2px dashed #eee",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
  },
  emptyIcon: {
    fontSize: "36px",
  },
  emptyText: {
    color: "#aaa",
    fontSize: "14px",
    margin: 0,
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