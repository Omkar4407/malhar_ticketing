import { useState } from "react";
import axios from "axios";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

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
    try {
      await axios.post("http://localhost:5000/verify-otp", {
        phone,
        otp,
      });

      await supabase
        .from("users")
        .upsert([{ phone_number: phone }], {
          onConflict: "phone_number",
        });

      localStorage.setItem("userPhone", phone);

      navigate("/events");
    } catch {
      alert("Invalid OTP");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-3xl font-bold">Login</h1>

      {step === 1 && (
        <>
          <input
            placeholder="Phone"
            onChange={(e) => setPhone(e.target.value)}
            className="border p-2"
          />
          <button onClick={sendOtp} className="bg-blue-500 text-white p-2">
            Send OTP
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <input
            placeholder="OTP"
            onChange={(e) => setOtp(e.target.value)}
            className="border p-2"
          />
          <button onClick={verifyOtp} className="bg-green-500 text-white p-2">
            Verify
          </button>
        </>
      )}
    </div>
  );
}