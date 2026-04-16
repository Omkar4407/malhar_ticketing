import { useState } from "react";
import { supabase } from "../lib/supabase";
import Menu from "../components/Menu";

export default function Scanner() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");

  const handleScan = async () => {
    try {
      const parsed = JSON.parse(input);

      const { data } = await supabase
        .from("tickets")
        .select("*")
        .eq("id", parsed.ticket_id)
        .single();

      if (!data) {
        setResult("❌ Invalid Ticket");
        return;
      }

      if (data.checked_in) {
        setResult("⚠ Already Entered");
      } else {
        await supabase
          .from("tickets")
          .update({ checked_in: true })
          .eq("id", data.id);

        setResult("✅ Entry Allowed");
      }

    } catch {
      setResult("❌ Invalid QR");
    }
  };

  return (
    <>
    <Menu />
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h2>Scanner</h2>

      <div style={{
        width: "250px",
        height: "250px",
        border: "3px solid #1A0A00",
        margin: "20px auto",
        position: "relative"
      }}>
        <div style={{
          height: "2px",
          background: "#FF5C1A",
          width: "100%",
          position: "absolute",
          animation: "scan 2s infinite"
        }} />
      </div>

      <input
        placeholder="Paste QR JSON"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: "10px"
        }}
      />

      <button onClick={handleScan} style={{
        padding: "10px 20px",
        background: "#1A0A00",
        color: "white"
      }}>
        Scan
      </button>

      <h3 style={{ marginTop: "20px" }}>{result}</h3>
    </div>
    </>
  );
}