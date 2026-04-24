import { useEffect, useState, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Menu from "../components/Menu";

// ── FIX: Simple in-memory cache for events and slots ─────────────────────────
// Problem: With 20k users on the events page simultaneously, every user fires
// SELECT * FROM events on page load. That's 20k identical queries hitting
// Supabase at once. Events don't change during a festival — they're effectively
// static. A 10-second TTL cache means Supabase only sees ~1 query per 10s
// regardless of concurrent visitors, collapsing 20k queries to almost nothing.
//
// Same applies to slots: when 20k users click the same event, 20k
// SELECT * FROM slots WHERE event_id = X queries fire simultaneously.
// The slots cache with a 5-second TTL handles this the same way.
// 5s TTL means availability counts lag by at most 5 seconds — acceptable.
const EVENTS_CACHE_TTL = 10_000;   // 10 seconds
const SLOTS_CACHE_TTL  =  5_000;   //  5 seconds

const eventsCache = { data: null, ts: 0 };
const slotsCache  = {};   // keyed by event_id

async function getEvents() {
  const now = Date.now();
  if (eventsCache.data && now - eventsCache.ts < EVENTS_CACHE_TTL) {
    return eventsCache.data;
  }
  const { data, error } = await supabase
    .from("events")
    .select("id, name, type, price, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  eventsCache.data = data || [];
  eventsCache.ts   = now;
  return eventsCache.data;
}

async function getSlots(eventId) {
  const now = Date.now();
  const cached = slotsCache[eventId];
  if (cached && now - cached.ts < SLOTS_CACHE_TTL) {
    return cached.data;
  }
  const { data, error } = await supabase
    .from("slots")
    .select("id, name, date, time, capacity, booked_count, event_id")
    .eq("event_id", eventId)
    .order("date", { ascending: true });
  if (error) throw error;
  slotsCache[eventId] = { data: data || [], ts: now };
  return slotsCache[eventId].data;
}

export default function Events() {
  const [events, setEvents]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [navigating, setNavigating] = useState(null);
  const [error, setError]         = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    getEvents()
      .then(setEvents)
      .catch(() => setError("Failed to load events. Please refresh."))
      .finally(() => setLoading(false));
  }, []);

  const handleClick = async (event) => {
    if (navigating) return;
    setNavigating(event.id);
    setError("");

    try {
      const slots = await getSlots(event.id);

      if (slots.length === 0) {
        setError(`No slots available for "${event.name}" yet.`);
        setNavigating(null);
        return;
      }

      const availableSlots = slots.filter((s) => s.booked_count < s.capacity);

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
    } catch {
      setError("Could not load slots. Please try again.");
      setNavigating(null);
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
                  {event.type && <span style={styles.typeBadge}>{event.type}</span>}
                </div>
                <span style={styles.tapHint}>{isLoading ? "Loading…" : "Tap to book →"}</span>
              </div>
              <span style={{
                ...styles.priceBadge,
                background: event.price > 0 ? "#FFE4D6" : "#E6FFF2",
                color: event.price > 0 ? "#B94000" : "#1a7a45",
              }}>
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
  page: { padding: "20px", maxWidth: "560px", margin: "0 auto", fontFamily: "'Segoe UI', system-ui, sans-serif", color: "#1a1a1a" },
  titleRow: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" },
  pageTitle: { fontSize: "22px", fontWeight: 800, margin: 0, letterSpacing: "-0.02em" },
  count: { fontSize: "12px", fontWeight: 600, color: "#aaa", background: "#f5f5f5", padding: "3px 10px", borderRadius: "20px" },
  card: { background: "#fff", border: "1px solid #eee", borderRadius: "12px", padding: "16px 18px", marginBottom: "10px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)", transition: "opacity 0.15s" },
  cardLeft: { display: "flex", flexDirection: "column", gap: "4px", flex: 1, minWidth: 0 },
  nameRow: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" },
  eventName: { fontSize: "16px", fontWeight: 700, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  typeBadge: { fontSize: "10px", fontWeight: 600, color: "#7C3AED", background: "#F3EEFF", padding: "2px 8px", borderRadius: "20px", textTransform: "uppercase", letterSpacing: "0.04em", flexShrink: 0 },
  tapHint: { fontSize: "12px", color: "#FF5C1A", fontWeight: 500 },
  priceBadge: { padding: "5px 12px", borderRadius: "20px", fontSize: "13px", fontWeight: 700, flexShrink: 0 },
  emptyState: { textAlign: "center", padding: "48px 20px", background: "#fafafa", borderRadius: "12px", border: "2px dashed #eee", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" },
  emptyIcon: { fontSize: "36px" },
  emptyText: { color: "#aaa", fontSize: "14px", margin: 0 },
  errorBox: { background: "#fff0f0", border: "1px solid #fdd", color: "#d0312d", fontSize: "13px", padding: "8px 12px", borderRadius: "7px", marginBottom: "14px" },
};