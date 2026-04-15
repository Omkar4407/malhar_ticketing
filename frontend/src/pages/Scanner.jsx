import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { supabase } from "../lib/supabase";

export default function Scanner() {
  const [result, setResult] = useState(null);
  const scannerRef = useRef(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      {
        fps: 10,
        qrbox: 250,
      },
      false
    );

    scanner.render(async (decodedText) => {
      try {
        scanner.clear(); // stop scanner after scan

        const data = JSON.parse(decodedText);
        const ticketId = data.ticket_id;

        // 🔍 Fetch ticket
        const { data: ticket, error } = await supabase
          .from("tickets")
          .select("*")
          .eq("id", ticketId)
          .single();

        if (!ticket || error) {
          setResult({ status: "invalid" });
          return;
        }

        // ⚠ Already entered
        if (ticket.checked_in) {
          setResult({ status: "duplicate", ticket });
          return;
        }

        // ✅ Mark entry
        await supabase
          .from("tickets")
          .update({
            checked_in: true,
            checked_in_at: new Date(),
          })
          .eq("id", ticketId);

        setResult({ status: "valid", ticket });

      } catch (err) {
        console.error(err);
        setResult({ status: "invalid" });
      }

      // 🔄 Restart scanner after 3 sec
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    });

    scannerRef.current = scanner;

    return () => {
      scanner.clear().catch(() => {});
    };
  }, []);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">QR Scanner</h1>

      <div id="reader"></div>

      {result && (
        <div className="mt-6 p-4 border rounded text-center">
          {result.status === "valid" && (
            <div className="text-green-600">
              <h2 className="text-2xl font-bold">Entry Allowed ✅</h2>
              <p>{result.ticket.name}</p>
              <img
                src={result.ticket.photo_url}
                className="w-24 mx-auto mt-2"
              />
            </div>
          )}

          {result.status === "invalid" && (
            <h2 className="text-red-600 text-2xl font-bold">
              Traitor ❌
            </h2>
          )}

          {result.status === "duplicate" && (
            <div className="text-yellow-600">
              <h2 className="text-2xl font-bold">
                Already Entered ⚠
              </h2>
              <p>{result.ticket.name}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}