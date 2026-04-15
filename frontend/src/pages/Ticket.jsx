import { useLocation } from "react-router-dom";

export default function Ticket() {
  const location = useLocation();
  const { ticket, qr } = location.state || {};

  if (!ticket) return <h1>No ticket found</h1>;

  return (
    <div className="p-6 flex flex-col items-center gap-4">
      <h1 className="text-2xl font-bold">Your Ticket</h1>

      <img src={qr} alt="QR Code" className="w-40" />

      <p><b>Name:</b> {ticket.name}</p>
      <p><b>College:</b> {ticket.college}</p>
      <p><b>Phone:</b> {ticket.phone}</p>

      <img src={ticket.photo_url} className="w-32 rounded" />
    </div>
  );
}