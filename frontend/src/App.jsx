import { Routes, Route, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Booking from "./pages/Booking";
import Ticket from "./pages/Ticket";
import Scanner from "./pages/Scanner";
import Events from "./pages/Events";
import Slots from "./pages/Slots";
import AdminDashboard from "./pages/AdminDashboard";
import AdminLogin from "./pages/AdminLogin";
import AdminEvents from "./pages/AdminEvents";
import Account from "./pages/Account";
import ScannerLogin from "./pages/ScannerLogin";

// ── Token verifier — DEV: just checks token exists locally ─
// swap with real backend call when ready:
// const { data } = await axios.post(`${API}/verify-token`, { token });
// return data.valid === true;
async function verifyToken(token) {
  if (!token) return false;
  return true;
}

// ── Generic guard — verifies a token key from localStorage ─
function TokenGuard({ tokenKey, redirectTo, children }) {
  const [status, setStatus] = useState("checking"); // checking | ok | fail

  useEffect(() => {
    const token = localStorage.getItem(tokenKey);
    verifyToken(token).then((valid) => {
      if (valid) {
        setStatus("ok");
      } else {
        localStorage.removeItem(tokenKey);
        setStatus("fail");
      }
    });
  }, [tokenKey]);

  if (status === "checking") {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <style>{`@keyframes _spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{
          width: "36px",
          height: "36px",
          border: "4px solid #eee",
          borderTop: "4px solid #FF5C1A",
          borderRadius: "50%",
          animation: "_spin 0.8s linear infinite",
        }} />
      </div>
    );
  }

  if (status === "fail") return <Navigate to={redirectTo} replace />;
  return children;
}

// ── Specific guards ───────────────────────────────────────
function ProtectedRoute({ children }) {
  return (
    <TokenGuard tokenKey="userToken" redirectTo="/">
      {children}
    </TokenGuard>
  );
}

function AdminRoute({ children }) {
  return (
    <TokenGuard tokenKey="adminToken" redirectTo="/admin-login">
      {children}
    </TokenGuard>
  );
}

function ScannerRoute({ children }) {
  return (
    <TokenGuard tokenKey="scannerToken" redirectTo="/scanner-login">
      {children}
    </TokenGuard>
  );
}

function App() {
  const userToken = localStorage.getItem("userToken");

  return (
    <Routes>
      {/* Root: redirect to dashboard if token exists, otherwise show login */}
      <Route
        path="/"
        element={userToken ? <Navigate to="/dashboard" replace /> : <Login />}
      />

      {/* Public auth pages */}
      <Route path="/admin-login"   element={<AdminLogin />} />
      <Route path="/scanner-login" element={<ScannerLogin />} />

      {/* User-protected routes */}
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/events"    element={<ProtectedRoute><Events /></ProtectedRoute>} />
      <Route path="/slots"     element={<ProtectedRoute><Slots /></ProtectedRoute>} />
      <Route path="/booking"   element={<ProtectedRoute><Booking /></ProtectedRoute>} />
      <Route path="/ticket"    element={<ProtectedRoute><Ticket /></ProtectedRoute>} />
      <Route path="/account"   element={<ProtectedRoute><Account /></ProtectedRoute>} />

      {/* Admin-protected routes */}
      <Route path="/admin"        element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin-events" element={<AdminRoute><AdminEvents /></AdminRoute>} />

      {/* Scanner-protected route */}
      <Route path="/scanner" element={<ScannerRoute><Scanner /></ScannerRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;