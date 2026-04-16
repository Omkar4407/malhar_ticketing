import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function Menu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <>
      {/* 🍔 BUTTON */}
      <div
        onClick={() => setOpen(!open)}
        style={{
          position: "fixed",
          top: "15px",
          left: "15px",
          fontSize: "24px",
          cursor: "pointer",
          zIndex: 1000,
        }}
      >
        ☰
      </div>

      {/* 📂 MENU PANEL */}
      {open && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "250px",
            height: "100%",
            background: "#1A0A00",
            color: "white",
            padding: "20px",
            zIndex: 999,
          }}
        >
          <h2 style={{ color: "#FF5C1A" }}>MALHAR</h2>

          <div style={{ marginTop: "20px" }}>
            <p onClick={() => navigate("/dashboard")} style={item}>
              Dashboard
            </p>
            <p onClick={() => navigate("/events")} style={item}>
              Events
            </p>
            <p onClick={() => navigate("/ticket")} style={item}>
              My Tickets
            </p>
            <p onClick={() => navigate("/scanner")} style={item}>
              Scanner
            </p>
            <p onClick={() => navigate("/admin-login")} style={item}>
              Admin
            </p>

            <p
              onClick={() => {
                localStorage.clear();
                navigate("/");
              }}
              style={{ ...item, color: "red" }}
            >
              Logout
            </p>
          </div>
        </div>
      )}
    </>
  );
}

const item = {
  padding: "12px 0",
  borderBottom: "1px solid rgba(255,255,255,0.1)",
  cursor: "pointer",
};