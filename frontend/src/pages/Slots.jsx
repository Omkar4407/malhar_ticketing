import { useLocation, useNavigate } from "react-router-dom";

export default function Slots() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const { slots, event } = state;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">{event.name}</h1>

      {slots.map((slot) => (
        <div key={slot.id} className="border p-4 mb-3">
          <p>{slot.name}</p>
          <p>{slot.time}</p>

          <button
            onClick={() => navigate("/booking", { state: { slot, event } })}
            className="bg-blue-500 text-white p-2 mt-2"
          >
            Book
          </button>
        </div>
      ))}
    </div>
  );
}