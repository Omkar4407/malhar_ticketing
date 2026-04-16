import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const navigate = useNavigate();

  const login = async () => {
    const { data } = await supabase
      .from("admins")
      .select("*")
      .eq("email", email)
      .single();

    if (!data) return alert("Access denied");

    localStorage.setItem("admin", JSON.stringify(data));
    navigate("/admin-dashboard");
  };

  return (
    <div style={{ padding: "20px" }}>
      <div style={hero}>
        <h1 style={title}>ADMIN LOGIN</h1>
      </div>

      <div style={card}>
        <input
          placeholder="Admin Email"
          onChange={(e) => setEmail(e.target.value)}
          style={input}
        />

        <button onClick={login} style={btn}>
          Login
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

const input = {
  width: "100%",
  padding: "12px",
  marginBottom: "10px",
  borderRadius: "8px",
  border: "1px solid #ddd",
};

const btn = {
  width: "100%",
  padding: "12px",
  background: "#FF5C1A",
  color: "white",
  border: "none",
  borderRadius: "8px",
};