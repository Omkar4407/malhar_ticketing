import { useNavigate } from "react-router-dom";

export default function AdminDashboard() {
  const navigate = useNavigate();

  return (
    <div style={{ padding: "20px" }}>
      <div style={hero}>
        <h1 style={title}>ADMIN PANEL</h1>
      </div>

      <div style={card}>
        <button style={btn} onClick={() => navigate("/scanner")}>
          Open Scanner
        </button>

        <button style={btn} onClick={() => navigate("/events")}>
          Manage Events
        </button>
      </div>
    </div>
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

const card = {
  background: "#fff",
  padding: "20px",
  borderRadius: "12px",
};

const btn = {
  width: "100%",
  padding: "12px",
  marginBottom: "10px",
  background: "#FF5C1A",
  color: "white",
  border: "none",
  borderRadius: "8px",
};