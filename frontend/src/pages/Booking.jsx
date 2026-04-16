import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import Menu from "../components/Menu";

export default function Booking() {
  const [name, setName] = useState("");
  const [college, setCollege] = useState("");
  const [photo, setPhoto] = useState(null);

  const navigate = useNavigate();
  const location = useLocation();

  const slot = location.state?.slot;
  const event = location.state?.event;
  const phone = localStorage.getItem("userPhone");

  // ================= BOOKING =================
  const handleBooking = async (isPaid = false) => {
    try {
      const fileName = `${Date.now()}-${Math.random()}-${photo.name}`;

      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(fileName, photo);

      if (uploadError) {
        alert("Photo upload failed");
        return;
      }

      const { data } = supabase.storage
        .from("photos")
        .getPublicUrl(fileName);

      const { data: ticket } = await supabase
        .from("tickets")
        .insert([
          {
            name,
            college,
            phone,
            slot_id: slot.id,
            event_id: event.id,
            photo_url: data.publicUrl,
            payment_status: isPaid ? "paid" : "free",
          },
        ])
        .select()
        .single();

      navigate("/ticket", { state: { ticket } });

    } catch (err) {
      console.error(err);
      alert("Booking failed");
    }
  };

  // ================= PAYMENT =================
  const handlePayment = async () => {
    const { data: order } = await axios.post(
      "http://localhost:5000/create-order",
      { amount: event.price }
    );

    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: "INR",
      name: "Malhar Fest",
      description: event.name,
      order_id: order.id,

      handler: async function (response) {
        const verify = await axios.post(
          "http://localhost:5000/verify-payment",
          response
        );

        if (verify.data.success) {
          handleBooking(true);
        } else {
          alert("Payment failed");
        }
      },
    };

    new window.Razorpay(options).open();
  };

  return (
    <menu>
    <div style={{ padding: "20px" }}>
      {/* HERO */}
      <div style={{
        background: "#1A0A00",
        color: "white",
        padding: "20px",
        borderRadius: "12px",
        marginBottom: "20px"
      }}>
        <h1 style={{ color: "#FF5C1A", fontSize: "30px" }}>
          BOOK YOUR PASS
        </h1>
        <p>{event.name}</p>
      </div>

      {/* FORM */}
      <div style={{
        background: "#fff",
        padding: "20px",
        borderRadius: "12px"
      }}>
        <input
          placeholder="Name"
          onChange={(e) => setName(e.target.value)}
          style={inputStyle}
        />

        <input
          placeholder="College"
          onChange={(e) => setCollege(e.target.value)}
          style={inputStyle}
        />

        <input
          type="file"
          onChange={(e) => setPhoto(e.target.files[0])}
        />
      </div>

      {/* BUTTON */}
      {event.price > 0 ? (
        <button style={btnStyle} onClick={handlePayment}>
          Pay ₹{event.price}
        </button>
      ) : (
        <button style={btnStyle} onClick={() => handleBooking()}>
          Book Free
        </button>
      )}
    </div>
    </menu>
  );
}

const inputStyle = {
  width: "100%",
  padding: "12px",
  marginBottom: "10px",
  borderRadius: "8px",
  border: "1px solid #ddd",
};

const btnStyle = {
  width: "100%",
  padding: "14px",
  background: "#FF5C1A",
  color: "white",
  border: "none",
  borderRadius: "8px",
  marginTop: "15px",
};