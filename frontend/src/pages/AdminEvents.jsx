import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { memBustPrefix, cached } from "../lib/cache";
import Menu from "../components/Menu";

// ─── Per-event slot add form ─────────────────────────────────────────────────
function SlotAddForm({ eventId, onAdded }) {
  const [slotForm, setSlotForm] = useState({ name: "", time: "", capacity: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleAdd = async () => {
    if (!slotForm.name.trim()) {
      setError("Slot name is required.");
      return;
    }
    if (!slotForm.capacity || Number(slotForm.capacity) < 1) {
      setError("Capacity must be at least 1.");
      return;
    }
    setSaving(true);
    setError("");
    const { error: err } = await supabase
      .from("slots")
      .insert([{
        name: slotForm.name.trim(),
        time: slotForm.time.trim(),
        event_id: eventId,
        capacity: Number(slotForm.capacity),
        booked_count: 0,
      }]);
    setSaving(false);
    if (err) {
      console.error("Slot insert error:", err);
      setError("Failed to add slot. Try again.");
      return;
    }
    setSlotForm({ name: "", time: "", capacity: "" });
    onAdded();
  };

  return (
    <div style={styles.slotAddForm}>
      {error && <p style={styles.errorText}>{error}</p>}
      <div style={styles.inlineRow}>
        <input
          placeholder="Slot name"
          value={slotForm.name}
          onChange={(e) => setSlotForm({ ...slotForm, name: e.target.value })}
          style={{ ...styles.input, flex: 2 }}
          aria-label="Slot name"
        />
        <input
          placeholder="Time (e.g. 10:00 AM)"
          value={slotForm.time}
          onChange={(e) => setSlotForm({ ...slotForm, time: e.target.value })}
          style={{ ...styles.input, flex: 2 }}
          aria-label="Slot time"
        />
        <input
          placeholder="Capacity"
          type="number"
          min="1"
          value={slotForm.capacity}
          onChange={(e) => setSlotForm({ ...slotForm, capacity: e.target.value })}
          style={{ ...styles.input, flex: 1 }}
          aria-label="Slot capacity"
        />
        <button
          onClick={handleAdd}
          disabled={saving}
          style={{ ...styles.btnPrimary, whiteSpace: "nowrap" }}
        >
          {saving ? "Adding…" : "+ Add Slot"}
        </button>
      </div>
    </div>
  );
}

// ─── Slot row ────────────────────────────────────────────────────────────────
function SlotRow({ slot, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: slot.name,
    time: slot.time || "",
    capacity: String(slot.capacity || ""),
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    await supabase
      .from("slots")
      .update({
        name: form.name.trim(),
        time: form.time.trim(),
        capacity: Number(form.capacity) || slot.capacity,
      })
      .eq("id", slot.id);
    setSaving(false);
    setEditing(false);
    onUpdated();
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete slot "${slot.name}"?`)) return;
    await supabase.from("slots").delete().eq("id", slot.id);
    onDeleted();
  };

  if (editing) {
    return (
      <div style={styles.slotRow}>
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          style={{ ...styles.input, flex: 2, marginBottom: 0 }}
          aria-label="Edit slot name"
        />
        <input
          value={form.time}
          onChange={(e) => setForm({ ...form, time: e.target.value })}
          style={{ ...styles.input, flex: 2, marginBottom: 0 }}
          aria-label="Edit slot time"
        />
        <input
          type="number"
          min="1"
          value={form.capacity}
          onChange={(e) => setForm({ ...form, capacity: e.target.value })}
          style={{ ...styles.input, flex: 1, marginBottom: 0 }}
          aria-label="Edit slot capacity"
        />
        <div style={styles.actionRow}>
          <button onClick={handleSave} disabled={saving} style={styles.btnSave}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button onClick={() => setEditing(false)} style={styles.btnCancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.slotRow}>
      <span style={styles.slotLabel}>
        <strong>{slot.name}</strong>
        {slot.time ? <span style={styles.slotTime}> — {slot.time}</span> : null}
        <span style={styles.slotCapacity}> · {slot.booked_count ?? 0}/{slot.capacity} booked</span>
      </span>
      <div style={styles.actionRow}>
        <button onClick={() => setEditing(true)} style={styles.btnEdit}>Edit</button>
        <button onClick={handleDelete} style={styles.btnDelete}>Delete</button>
      </div>
    </div>
  );
}

// ─── Event card ──────────────────────────────────────────────────────────────
function EventCard({ event, slots, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: event.name, price: String(event.price) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const eventSlots = slots.filter((s) => s.event_id === event.id);

  const handleSave = async () => {
    if (!form.name.trim()) {
      setError("Event name is required.");
      return;
    }
    setSaving(true);
    setError("");
    await supabase
      .from("events")
      .update({ name: form.name.trim(), price: Number(form.price) || 0 })
      .eq("id", event.id);
    setSaving(false);
    setEditing(false);
    onUpdated();
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete event "${event.name}" and all its slots?`)) return;
    await supabase.from("slots").delete().eq("event_id", event.id);
    await supabase.from("events").delete().eq("id", event.id);
    onDeleted();
  };

  return (
    <div style={styles.card}>
      {editing ? (
        <div style={styles.editBlock}>
          {error && <p style={styles.errorText}>{error}</p>}
          <label style={styles.label}>Event Name</label>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            style={styles.input}
            aria-label="Event name"
          />
          <label style={styles.label}>Price (₹)</label>
          <input
            type="number"
            min="0"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            style={styles.input}
            aria-label="Event price"
          />
          <div style={styles.actionRow}>
            <button onClick={handleSave} disabled={saving} style={styles.btnSave}>
              {saving ? "Saving…" : "Save"}
            </button>
            <button onClick={() => { setEditing(false); setError(""); }} style={styles.btnCancel}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div style={styles.eventHeader}>
          <div>
            <h2 style={styles.eventName}>{event.name}</h2>
            <span style={styles.eventPrice}>
              {event.price > 0 ? `₹${event.price}` : "Free"}
            </span>
          </div>
          <div style={styles.actionRow}>
            <button onClick={() => setEditing(true)} style={styles.btnEdit}>Edit</button>
            <button onClick={handleDelete} style={styles.btnDelete}>Delete</button>
          </div>
        </div>
      )}

      {/* Slots section */}
      <div style={styles.slotsSection}>
        <h4 style={styles.slotsHeading}>
          Slots <span style={styles.slotCount}>{eventSlots.length}</span>
        </h4>

        {eventSlots.length === 0 && (
          <p style={styles.emptyNote}>No slots yet. Add one below.</p>
        )}

        {eventSlots.map((slot) => (
          <SlotRow
            key={slot.id}
            slot={slot}
            onUpdated={onUpdated}
            onDeleted={onUpdated}
          />
        ))}

        <SlotAddForm eventId={event.id} onAdded={onUpdated} />
      </div>
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────
// Admin data is cached for 15s. Any mutation (add/edit/delete event or slot)
// calls bustAdminCache() which forces the next fetchAll() to hit the DB.
// This prevents the "save then immediately see stale data" problem while
// still collapsing the many redundant fetches that occur during normal browsing.

const ADMIN_TTL = 15_000; // 15 seconds

function bustAdminCache() {
  memBustPrefix("admin:");
}

export default function AdminEvents() {
  const [events, setEvents] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newEvent, setNewEvent] = useState({ name: "", price: "" });
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState("");

  const fetchAll = async (forceBust = false) => {
    if (forceBust) bustAdminCache();
    try {
      const [eventsData, slotsData] = await Promise.all([
        cached("admin:events", ADMIN_TTL, async () => {
          const { data, error } = await supabase
            .from("events").select("*").order("created_at", { ascending: false });
          if (error) throw error;
          return data || [];
        }),
        cached("admin:slots", ADMIN_TTL, async () => {
          const { data, error } = await supabase
            .from("slots").select("*").order("created_at", { ascending: true });
          if (error) throw error;
          return data || [];
        }),
      ]);
      setEvents(eventsData);
      setSlots(slotsData);
    } catch (err) {
      console.error("Admin fetch error:", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const addEvent = async () => {
    if (!newEvent.name.trim()) {
      setAddError("Event name is required.");
      return;
    }
    setSaving(true);
    setAddError("");
    const { error } = await supabase.from("events").insert([
      { name: newEvent.name.trim(), price: Number(newEvent.price) || 0 },
    ]);
    setSaving(false);
    if (error) {
      console.error("Event insert error:", error);
      setAddError("Failed to add event. Try again.");
      return;
    }
    setNewEvent({ name: "", price: "" });
    fetchAll(true); // force-bust so new event appears immediately
  };

  return (
    <>
      <Menu />
      <div style={styles.page}>
        <h1 style={styles.pageTitle}>Admin Panel</h1>

        {/* ── Add event form ── */}
        <div style={{ ...styles.card, ...styles.addCard }}>
          <h2 style={styles.sectionTitle}>Add New Event</h2>
          {addError && <p style={styles.errorText}>{addError}</p>}
          <div style={styles.inlineRow}>
            <div style={{ flex: 2 }}>
              <label style={styles.label}>Event Name *</label>
              <input
                placeholder="e.g. Morning Yoga"
                value={newEvent.name}
                onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                style={styles.input}
                aria-label="New event name"
                onKeyDown={(e) => e.key === "Enter" && addEvent()}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={styles.label}>Price (₹)</label>
              <input
                type="number"
                min="0"
                placeholder="0 = Free"
                value={newEvent.price}
                onChange={(e) => setNewEvent({ ...newEvent, price: e.target.value })}
                style={styles.input}
                aria-label="New event price"
                onKeyDown={(e) => e.key === "Enter" && addEvent()}
              />
            </div>
            <div style={{ alignSelf: "flex-end", paddingBottom: "11px" }}>
              <button onClick={addEvent} disabled={saving} style={styles.btnPrimary}>
                {saving ? "Adding…" : "+ Add Event"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Events list ── */}
        {loading ? (
          <p style={styles.emptyNote}>Loading…</p>
        ) : events.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No events yet. Create your first event above.</p>
          </div>
        ) : (
          events.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              slots={slots}
              onUpdated={() => fetchAll(true)}
              onDeleted={() => fetchAll(true)}
            />
          ))
        )}
      </div>
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = {
  page: {
    padding: "24px 20px",
    maxWidth: "780px",
    margin: "0 auto",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    color: "#1a1a1a",
  },
  pageTitle: {
    fontSize: "26px",
    fontWeight: 700,
    marginBottom: "20px",
  },
  card: {
    background: "#fff",
    padding: "20px",
    borderRadius: "12px",
    marginBottom: "16px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    border: "1px solid #eee",
  },
  addCard: {
    borderLeft: "4px solid #FF5C1A",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: 600,
    marginBottom: "14px",
    marginTop: 0,
  },
  eventHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: "8px",
  },
  eventName: {
    fontSize: "18px",
    fontWeight: 700,
    margin: "0 0 4px 0",
  },
  eventPrice: {
    fontSize: "14px",
    color: "#666",
    background: "#f5f5f5",
    padding: "2px 8px",
    borderRadius: "4px",
  },
  editBlock: {
    display: "flex",
    flexDirection: "column",
  },
  label: {
    display: "block",
    fontSize: "12px",
    fontWeight: 600,
    color: "#555",
    marginBottom: "4px",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  input: {
    width: "100%",
    padding: "9px 12px",
    marginBottom: "10px",
    borderRadius: "7px",
    border: "1px solid #ddd",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  },
  inlineRow: {
    display: "flex",
    gap: "10px",
    alignItems: "flex-start",
    flexWrap: "wrap",
  },
  actionRow: {
    display: "flex",
    gap: "6px",
    alignItems: "center",
    flexWrap: "wrap",
  },
  slotsSection: {
    marginTop: "16px",
    borderTop: "1px solid #f0f0f0",
    paddingTop: "14px",
  },
  slotsHeading: {
    fontSize: "13px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "#888",
    margin: "0 0 10px 0",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  slotCount: {
    background: "#FF5C1A",
    color: "#fff",
    borderRadius: "10px",
    fontSize: "11px",
    padding: "1px 6px",
  },
  slotRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 10px",
    background: "#fafafa",
    borderRadius: "7px",
    marginBottom: "6px",
    gap: "8px",
    flexWrap: "wrap",
  },
  slotLabel: {
    fontSize: "14px",
    flex: 1,
  },
  slotTime: {
    color: "#888",
    fontWeight: 400,
  },
  slotCapacity: {
    color: "#aaa",
    fontSize: "12px",
    fontWeight: 400,
  },
  slotAddForm: {
    marginTop: "10px",
    background: "#f7f7f7",
    padding: "10px",
    borderRadius: "8px",
  },
  emptyNote: {
    fontSize: "13px",
    color: "#aaa",
    fontStyle: "italic",
    margin: "4px 0 10px",
  },
  emptyState: {
    textAlign: "center",
    padding: "40px 20px",
    color: "#aaa",
    background: "#fafafa",
    borderRadius: "12px",
    border: "2px dashed #eee",
  },
  errorText: {
    color: "#d0312d",
    fontSize: "13px",
    margin: "0 0 8px 0",
    background: "#fff0f0",
    padding: "6px 10px",
    borderRadius: "6px",
    border: "1px solid #fdd",
  },
  btnPrimary: {
    padding: "9px 16px",
    background: "#FF5C1A",
    color: "#fff",
    border: "none",
    borderRadius: "7px",
    fontWeight: 600,
    fontSize: "14px",
    cursor: "pointer",
  },
  btnSave: {
    padding: "6px 14px",
    background: "#1a8f4e",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontWeight: 600,
    fontSize: "13px",
    cursor: "pointer",
  },
  btnCancel: {
    padding: "6px 12px",
    background: "transparent",
    color: "#666",
    border: "1px solid #ddd",
    borderRadius: "6px",
    fontSize: "13px",
    cursor: "pointer",
  },
  btnEdit: {
    padding: "5px 12px",
    background: "transparent",
    color: "#FF5C1A",
    border: "1px solid #FF5C1A",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
  btnDelete: {
    padding: "5px 12px",
    background: "transparent",
    color: "#d0312d",
    border: "1px solid #d0312d",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
  },
};