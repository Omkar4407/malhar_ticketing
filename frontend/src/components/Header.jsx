import { useNavigate } from "react-router-dom";

export default function Header() {
  const navigate = useNavigate();

  return (
    <div style={{
      background: "#1A0A00",
      color: "#FFF8F0",
      padding: "16px 24px",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    }}>
      <div>
        <h1 style={{
          fontFamily: "Bebas Neue",
          color: "#FF5C1A",
          letterSpacing: "2px"
        }}>
          MALHAR
        </h1>
        <p style={{ fontSize: "10px", opacity: 0.6 }}>
          St. Xavier's College
        </p>
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button onClick={() => navigate("/events")}>Events</button>
        <button onClick={() => navigate("/ticket")}>My Ticket</button>
        <button onClick={() => navigate("/scanner")}>Scanner</button>
      </div>
    </div>
  );
}