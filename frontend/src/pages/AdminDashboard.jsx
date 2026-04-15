import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function AdminDashboard() {
  const [events, setEvents] = useState([]);
  const [slots, setSlots] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);

  const role = localStorage.getItem("adminRole");

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    const { data, error } = await supabase.from("events").select("*");

    if (error) console.error(error);
    else setEvents(data);
  };

  const fetchSlots = async (eventId) => {
    // 🔄 Toggle behavior
    if (selectedEventId === eventId) {
      setSelectedEventId(null);
      setSlots([]);
      return;
    }

    const { data, error } = await supabase
      .from("slots")
      .select("*")
      .eq("event_id", eventId);

    if (error) console.error(error);
    else {
      setSlots(data);
      setSelectedEventId(eventId);
    }
  };

  // ➕ ADD EVENT
  const addEvent = async () => {
    const name = prompt("Enter event name");
    if (!name) return;

    const { error } = await supabase.from("events").insert([{ name }]);

    if (error) alert("Error adding event");
    else fetchEvents();
  };

  // ❌ DELETE EVENT
  const deleteEvent = async (id) => {
    await supabase.from("events").delete().eq("id", id);
    fetchEvents();
    setSlots([]);
    setSelectedEventId(null);
  };

  // ➕ ADD SLOT
  const addSlot = async (eventId) => {
    const name = prompt("Slot name");
    const date = prompt("Date");
    const time = prompt("Time");
    const capacity = prompt("Capacity");

    if (!name || !capacity) return;

    const { error } = await supabase.from("slots").insert([
      {
        name,
        date,
        time,
        capacity: Number(capacity),
        booked_count: 0,
        event_id: eventId,
      },
    ]);

    if (error) alert("Error adding slot");
    else fetchSlots(eventId);
  };

  // ❌ DELETE SLOT
  const deleteSlot = async (slotId, eventId) => {
    await supabase.from("slots").delete().eq("id", slotId);
    fetchSlots(eventId);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>

      {/* 👑 SUPER ADMIN */}
      {role === "super_admin" && (
        <button
          onClick={addEvent}
          className="bg-green-500 text-white px-3 py-2 mb-4 rounded"
        >
          Add Event
        </button>
      )}

      {/* EVENTS LIST */}
      {events.map((event) => (
        <div key={event.id} className="border p-4 mb-4 rounded">
          <div className="flex justify-between items-center">
            <h2 className="font-bold text-lg">{event.name}</h2>

            {role === "super_admin" && (
              <button
                onClick={() => deleteEvent(event.id)}
                className="text-red-500"
              >
                Delete Event
              </button>
            )}
          </div>

          {/* ACTION BUTTONS */}
          <div className="mt-2">
            <button
              onClick={() => fetchSlots(event.id)}
              className="bg-blue-500 text-white px-3 py-1 mr-2 rounded"
            >
              {selectedEventId === event.id ? "Hide Slots" : "View Slots"}
            </button>

            {role === "super_admin" && (
              <button
                onClick={() => addSlot(event.id)}
                className="bg-green-500 text-white px-3 py-1 rounded"
              >
                Add Slot
              </button>
            )}
          </div>

          {/* SLOTS (ONLY FOR SELECTED EVENT) */}
          {selectedEventId === event.id &&
            slots.map((slot) => (
              <div
                key={slot.id}
                className="border p-3 mt-3 rounded bg-gray-50"
              >
                <p><b>{slot.name}</b></p>
                <p>{slot.date}</p>
                <p>{slot.time}</p>
                <p>Capacity: {slot.capacity}</p>

                {role === "super_admin" && (
                  <button
                    onClick={() => deleteSlot(slot.id, event.id)}
                    className="text-red-500 mt-1"
                  >
                    Delete Slot
                  </button>
                )}
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}