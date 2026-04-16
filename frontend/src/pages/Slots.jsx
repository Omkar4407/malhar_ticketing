import { useLocation, useNavigate } from "react-router-dom";
import Menu from "../components/Menu";

export default function Slots() {
  const { state } = useLocation();
  const navigate = useNavigate();

  const slots = state?.slots;
  const event = state?.event;

  return (
    <menu>
    <div style={{ padding: "20px" }}>
      <div style={hero}>
        <h1 style={title}>{event.name}</h1>
        <p>Select a slot</p>
      </div>

      {slots.map((slot) => (
        <div
          key={slot.id}
          onClick={() =>
            navigate("/booking", { state: { slot, event } })
          }
          style={slotCard}
        >
          <h3>{slot.name}</h3>
          <p>{slot.time}</p>
        </div>
      ))}
    </div>
    </menu>
  );
}

const hero = {
  background: "#1A0A00",
  color: "white",
  padding: "20px",
  borderRadius: "12px",
  marginBottom: "20px",
};

const title = { color: "#FF5C1A" };

const slotCard = {
  background: "#fff",
  padding: "15px",
  borderRadius: "10px",
  marginBottom: "10px",
  cursor: "pointer",
};