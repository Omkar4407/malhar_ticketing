import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import Header from "../components/Header";
import Menu from "../components/Menu";

export default function Events() {
  const [events, setEvents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.from("events").select("*").then(({ data }) => {
      setEvents(data || []);
    });
  }, []);

  const handleClick = async (event) => {
    const { data: slots } = await supabase
      .from("slots")
      .select("*")
      .eq("event_id", event.id);

    if (slots.length === 1) {
      navigate("/booking", { state: { slot: slots[0], event } });
    } else {
      navigate("/slots", { state: { slots, event } });
    }
  };

  return (
    <>
    <Menu />
      <Header />

      <div style={{ padding: "20px" }}>
        <h1 style={{ fontSize: "24px", marginBottom: "20px" }}>
          EVENTS
        </h1>

        {events.map((event) => (
          <div
            key={event.id}
            onClick={() => handleClick(event)}
            style={{
              background: "#fff",
              border: "1px solid #eee",
              borderRadius: "10px",
              padding: "16px",
              marginBottom: "12px",
              cursor: "pointer",
              display: "flex",
              justifyContent: "space-between"
            }}
          >
            <h2>{event.name}</h2>

            <span style={{
              background: event.price > 0 ? "#FFE4D6" : "#E6FFF2",
              padding: "6px 10px",
              borderRadius: "6px"
            }}>
              {event.price > 0 ? `₹${event.price}` : "Free"}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}