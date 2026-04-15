import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function Events() {
  const [events, setEvents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchEvents();
  }, []);

  // ================= FETCH EVENTS =================
  const fetchEvents = async () => {
    const { data, error } = await supabase.from("events").select("*");

    if (error) {
      console.error("Error fetching events:", error);
    } else {
      setEvents(data);
    }
  };

  // ================= HANDLE CLICK =================
  const handleEventClick = async (event) => {
    const { data: slots, error } = await supabase
      .from("slots")
      .select("*")
      .eq("event_id", event.id);

    if (error) {
      console.error("Error fetching slots:", error);
      return;
    }

    if (!slots || slots.length === 0) {
      alert("No slots available");
      return;
    }

    // 🔥 If only 1 slot → direct booking
    if (slots.length === 1) {
      navigate("/booking", {
        state: { slot: slots[0], event },
      });
    } else {
      // 🔥 Multiple slots → go to slots page
      navigate("/slots", {
        state: { slots, event },
      });
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Events</h1>

      {events.length === 0 && <p>No events available</p>}

      {events.map((event) => (
        <div
          key={event.id}
          onClick={() => handleEventClick(event)}
          className="border p-4 mb-4 rounded cursor-pointer hover:bg-gray-100 transition"
        >
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">{event.name}</h2>

            {/* 💰 PRICE DISPLAY */}
            <span
              className={`px-2 py-1 text-sm rounded ${
                event.price > 0
                  ? "bg-purple-100 text-purple-700"
                  : "bg-green-100 text-green-700"
              }`}
            >
              {event.price > 0 ? `₹${event.price}` : "Free"}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}