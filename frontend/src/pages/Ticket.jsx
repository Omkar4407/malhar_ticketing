import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import QRCode from "qrcode";
import Menu from "../components/Menu";

export default function Ticket() {
  const [tickets, setTickets] = useState([]);

  const phone = localStorage.getItem("userPhone");

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    const { data } = await supabase
      .from("tickets")
      .select("*")
      .eq("phone", phone);

    setTickets(data || []);
  };

  return (
    <>
      <Menu />

      <div style={{ padding: "20px" }}>
        <h1>My Tickets</h1>

        {tickets.length === 0 && <p>No tickets found</p>}

        {tickets.map((ticket) => (
          <TicketCard key={ticket.id} ticket={ticket} />
        ))}
      </div>
    </>
  );
}

function TicketCard({ ticket }) {
  const [qr, setQr] = useState("");

  useEffect(() => {
    QRCode.toDataURL(
      JSON.stringify({ ticket_id: ticket.id })
    ).then(setQr);
  }, [ticket]);

  return (
    <div
      style={{
        background: "#1A0A00",
        color: "white",
        padding: "20px",
        borderRadius: "12px",
        marginBottom: "15px",
      }}
    >
      <h2 style={{ color: "#FF5C1A" }}>MALHAR</h2>

      <p><b>{ticket.name}</b></p>
      <p>{ticket.phone}</p>

      <img src={ticket.photo_url} width="60" />

      <div style={{ marginTop: "10px" }}>
        <img src={qr} width="100" />
      </div>

      <p style={{ fontSize: "10px" }}>
        ID: {ticket.id}
      </p>
    </div>
  );
}