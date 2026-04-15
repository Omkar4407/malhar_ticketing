import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [passcode, setPasscode] = useState("");
  const navigate = useNavigate();

  const handleLogin = async () => {
    if (passcode !== "malhar2026") {
      return alert("Wrong passcode");
    }
  
    const { data, error } = await supabase
      .from("admins")
      .select("*")
      .eq("email", email)
      .maybeSingle();
  
    console.log("ADMIN LOGIN:", data, error);
  
    if (!data) {
      return alert("Access Denied");
    }
  
    localStorage.setItem("adminEmail", email);
    localStorage.setItem("adminRole", data.role);
  
    navigate("/admin");
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <h1 className="text-3xl font-bold">Admin Login</h1>

      <input
        placeholder="Enter Email"
        onChange={(e) => setEmail(e.target.value)}
        className="border p-2 w-64"
      />

      <input
        placeholder="Enter Passcode"
        type="password"
        onChange={(e) => setPasscode(e.target.value)}
        className="border p-2 w-64"
      />

      <button
        onClick={handleLogin}
        className="bg-black text-white px-4 py-2 rounded"
      >
        Login
      </button>
    </div>
  );
}