import { useState } from "react";
import axios from "axios";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import Menu from "../components/Menu";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const sendOtp = async () => {
    await axios.post("http://localhost:5000/send-otp", { phone });
    setStep(2);
  };

  const verifyOtp = async () => {
    await axios.post("http://localhost:5000/verify-otp", { phone, otp });

    await supabase
      .from("users")
      .upsert([{ phone_number: phone }], { onConflict: "phone_number" });

    localStorage.setItem("userPhone", phone);
    navigate("/events");
  };

  return (
    <menu>
    <div style={{ padding: "20px" }}>
      <div style={hero}>
        <h1 style={title}>MALHAR</h1>
        <p>Login to continue</p>
      </div>

      <div style={card}>
        {step === 1 ? (
          <>
            <input
              placeholder="Phone Number"
              onChange={(e) => setPhone(e.target.value)}
              style={input}
            />
            <button onClick={sendOtp} style={btn}>
              Send OTP
            </button>
          </>
        ) : (
          <>
            <input
              placeholder="Enter OTP"
              onChange={(e) => setOtp(e.target.value)}
              style={input}
            />
            <button onClick={verifyOtp} style={btn}>
              Verify OTP
            </button>
          </>
        )}
      </div>
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

const title = { color: "#FF5C1A", fontSize: "28px" };

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