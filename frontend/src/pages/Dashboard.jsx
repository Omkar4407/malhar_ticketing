import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [slots, setSlots] = useState([]);
  const navigate = useNavigate();

  const userPhone = localStorage.getItem("userPhone");

  useEffect(() => {
    fetchSlots();
  }, []);

  const fetchSlots = async () => {
    const { data, error } = await supabase.from("slots").select("*");

    if (error) {
      console.error("Error fetching slots:", error);
    } else {
      setSlots(data);
    }
  };

  const handleBooking = async (slot) => {
    try {
      // 🔍 Check if already booked
      const { data: existing } = await supabase
        .from("tickets")
        .select("*")
        .eq("phone", userPhone)
        .eq("slot_id", slot.id);

      if (existing.length > 0) {
        return alert("You already booked this slot");
      }

      // 🔴 Check capacity
      if (slot.booked_count >= slot.capacity) {
        return alert("Slot full");
      }

      // ➡️ Go to booking page
      navigate("/booking", { state: { slot } });

    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Available Slots</h1>

      {slots.map((slot) => (
        <div key={slot.id} className="border p-4 mb-3 rounded shadow">
          <h2 className="font-semibold text-lg">{slot.name}</h2>
          <p>{slot.date}</p>
          <p>{slot.time}</p>
          <p>Capacity: {slot.capacity}</p>
          <p>Booked: {slot.booked_count}</p>

          <button
            onClick={() => handleBooking(slot)}
            className="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
          >
            Book Slot
          </button>
        </div>
      ))}
    </div>
  );
}