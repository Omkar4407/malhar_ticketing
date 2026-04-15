import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useNavigate, useLocation } from "react-router-dom";
import QRCode from "qrcode";
import axios from "axios";

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
      if (!photo) {
        alert("Please upload photo");
        return;
      }

      // 🔥 FIXED PHOTO UPLOAD
      const fileName = `${Date.now()}-${Math.random()}-${photo.name}`;

      const { error: uploadError } = await supabase.storage
        .from("photos")
        .upload(fileName, photo, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error(uploadError);
        alert("Photo upload failed");
        return;
      }

      const { data: publicUrlData } = supabase.storage
        .from("photos")
        .getPublicUrl(fileName);

      const photoUrl = publicUrlData.publicUrl;

      // 🔥 INSERT TICKET
      const { data: ticketData, error } = await supabase
        .from("tickets")
        .insert([
          {
            name,
            college,
            phone,
            slot_id: slot.id,
            event_id: event.id,
            photo_url: photoUrl,
            payment_status: isPaid ? "paid" : "free",
          },
        ])
        .select()
        .single();

      if (error || !ticketData) {
        console.error(error);
        alert("Booking failed");
        return;
      }

      // 🔥 QR GENERATION
      const qr = await QRCode.toDataURL(
        JSON.stringify({
          ticket_id: ticketData.id,
        })
      );

      navigate("/ticket", { state: { ticket: ticketData, qr } });

    } catch (err) {
      console.error(err);
      alert("Error in booking");
    }
  };

  // ================= PAYMENT =================
  const handlePayment = async () => {
    try {
      const { data: order } = await axios.post(
        "http://localhost:5000/create-order",
        {
          amount: event.price,
        }
      );

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: "INR",
        name: "Malhar Fest",
        description: event.name,
        order_id: order.id,

        // 🔐 SECURE HANDLER
        handler: async function (response) {
          try {
            const verifyRes = await axios.post(
              "http://localhost:5000/verify-payment",
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }
            );

            if (verifyRes.data.success) {
              handleBooking(true); // ✅ ONLY AFTER VERIFY
            } else {
              alert("Payment verification failed");
            }
          } catch (err) {
            console.error(err);
            alert("Verification error");
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();

    } catch (err) {
      console.error(err);
      alert("Payment failed");
    }
  };

  return (
    <div className="p-6 flex flex-col gap-3">
      <h1 className="text-xl font-bold">{event.name}</h1>

      <input
        placeholder="Name"
        onChange={(e) => setName(e.target.value)}
        className="border p-2"
      />

      <input
        placeholder="College"
        onChange={(e) => setCollege(e.target.value)}
        className="border p-2"
      />

      <input type="file" onChange={(e) => setPhoto(e.target.files[0])} />

      {event.price > 0 ? (
        <button
          onClick={handlePayment}
          className="bg-purple-500 text-white p-2"
        >
          Pay ₹{event.price}
        </button>
      ) : (
        <button
          onClick={() => handleBooking()}
          className="bg-green-500 text-white p-2"
        >
          Book Free
        </button>
      )}
    </div>
  );
}