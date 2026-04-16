import { useNavigate } from "react-router-dom";
import Menu from "../components/Menu";

export default function Dashboard() {
  const navigate = useNavigate();

  return (
    <>
    <Menu />
    <div style={{ padding: "20px" }}>
      <div style={hero}>
        <h1 style={title}>WELCOME</h1>
        <p>Choose your action</p>
      </div>

      <div style={card}>
        <button style={btn} onClick={() => navigate("/events")}>
          Book Tickets
        </button>

        <button style={btn} onClick={() => navigate("/ticket")}>
          My Ticket
        </button>
      </div>
    </div>
    </>
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