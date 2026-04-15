import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Booking from "./pages/Booking";
import Ticket from "./pages/Ticket";
import Scanner from "./pages/Scanner";
import Events from "./pages/Events";
import Slots from "./pages/Slots";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/booking" element={<Booking />} />
      <Route path="/ticket" element={<Ticket />} />
      <Route path="/scanner" element={<Scanner />} />
      <Route path="/events" element={<Events />} />
      <Route path="/slots" element={<Slots />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin-login" element={<AdminLogin />} />
    </Routes>
  );
}

export default App;