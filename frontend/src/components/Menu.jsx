import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";

// INFO #1: Only show Scanner and Admin links to users who hold the relevant token.
// Regular users should never see these options in the nav.
const buildNavItems = () => {
  const isAdmin   = !!localStorage.getItem("adminToken");
  const isScanner = !!localStorage.getItem("scannerToken");

  const items = [
    { label: "Dashboard",  path: "/dashboard",    icon: "⚡" },
    { label: "Events",     path: "/events",        icon: "🎪" },
    { label: "My Tickets", path: "/ticket",        icon: "🎟️" },
    { label: "My Account", path: "/account",       icon: "👤" },
  ];

  // INFO #1: Scanner link — only for scanner-role users
  if (isScanner) {
    items.push({ label: "Scanner", path: "/scanner-login", icon: "📷" });
  }

  // INFO #1: Admin link — only for admin-role users
  if (isAdmin) {
    items.push({ label: "Admin", path: "/admin-login", icon: "🔧" });
  }

  return items;
};

export default function Menu() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Rebuild nav items on every render so token changes are reflected immediately
  const navItems = buildNavItems();

  const handleNav = (path) => {
    setOpen(false);
    navigate(path);
  };

  const handleLogout = () => {
    setOpen(false);
    ["userToken", "userPhone", "adminToken", "admin", "scannerToken", "scannerAuth", "scannerEmail"].forEach(
      (key) => localStorage.removeItem(key)
    );
    navigate("/");
  };

  return (
    <>
      {/* ── Hamburger button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          ...styles.hamburger,
          background: open ? "#FF5C1A" : "rgba(26,10,0,0.85)",
        }}
        aria-label="Toggle menu"
      >
        <div style={styles.hamburgerLine(open, 0)} />
        <div style={styles.hamburgerLine(open, 1)} />
        <div style={styles.hamburgerLine(open, 2)} />
      </button>

      {/* ── Backdrop ── */}
      {open && (
        <div onClick={() => setOpen(false)} style={styles.backdrop} />
      )}

      {/* ── Drawer ── */}
      <div style={{
        ...styles.drawer,
        transform: open ? "translateX(0)" : "translateX(-100%)",
      }}>

        {/* Header */}
        <div style={styles.drawerHeader}>
          <div>
            <h2 style={styles.logo}>MALHAR</h2>
            <p style={styles.subLogo}>St. Xavier's College</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={styles.closeBtn}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <div style={styles.divider} />

        {/* Nav items */}
        <nav style={styles.nav}>
          {navItems.map(({ label, path, icon }) => {
            const isActive = location.pathname === path;
            return (
              <button
                key={path}
                onClick={() => handleNav(path)}
                style={{
                  ...styles.navItem,
                  background: isActive ? "rgba(255,92,26,0.15)" : "transparent",
                  color: isActive ? "#FF5C1A" : "rgba(255,248,240,0.8)",
                  borderLeft: isActive ? "3px solid #FF5C1A" : "3px solid transparent",
                }}
              >
                <span style={styles.navIcon}>{icon}</span>
                <span style={styles.navLabel}>{label}</span>
                {isActive && <span style={styles.activeDot} />}
              </button>
            );
          })}
        </nav>

        <div style={styles.divider} />

        {/* Logout */}
        <button onClick={handleLogout} style={styles.logoutBtn}>
          <span>🚪</span>
          <span>Logout</span>
        </button>

        {/* Footer */}
        <p style={styles.footer}>Malhar © 2026</p>
      </div>
    </>
  );
}

// ── Styles ────────────────────────────────────────────────
const styles = {
  hamburger: {
    position: "fixed",
    top: "14px",
    left: "14px",
    zIndex: 1100,
    width: "40px",
    height: "40px",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    gap: "5px",
    padding: "8px",
    transition: "background 0.2s",
    backdropFilter: "blur(8px)",
  },
  hamburgerLine: (open, index) => ({
    width: "20px",
    height: "2px",
    background: "#fff",
    borderRadius: "2px",
    transition: "all 0.25s ease",
    transformOrigin: "center",
    transform:
      open && index === 0 ? "translateY(7px) rotate(45deg)" :
      open && index === 1 ? "scaleX(0)" :
      open && index === 2 ? "translateY(-7px) rotate(-45deg)" :
      "none",
    opacity: open && index === 1 ? 0 : 1,
  }),
  backdrop: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    zIndex: 1000,
    backdropFilter: "blur(2px)",
  },
  drawer: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "270px",
    height: "100%",
    background: "#1A0A00",
    zIndex: 1050,
    display: "flex",
    flexDirection: "column",
    transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    boxShadow: "4px 0 24px rgba(0,0,0,0.4)",
    overflowY: "auto",
  },
  drawerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: "24px 20px 16px",
  },
  logo: {
    fontFamily: "'Bebas Neue', sans-serif",
    color: "#FF5C1A",
    fontSize: "28px",
    letterSpacing: "3px",
    margin: 0,
    lineHeight: 1,
  },
  subLogo: {
    color: "rgba(255,248,240,0.4)",
    fontSize: "10px",
    margin: "4px 0 0",
    letterSpacing: "0.05em",
  },
  closeBtn: {
    background: "rgba(255,255,255,0.08)",
    border: "none",
    color: "rgba(255,248,240,0.6)",
    width: "30px",
    height: "30px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: "1px",
    background: "rgba(255,255,255,0.08)",
    margin: "0 20px",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    padding: "12px 12px",
    gap: "4px",
    flex: 1,
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "none",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
    textAlign: "left",
    transition: "all 0.15s ease",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    position: "relative",
  },
  navIcon: {
    fontSize: "16px",
    width: "20px",
    textAlign: "center",
    flexShrink: 0,
  },
  navLabel: { flex: 1 },
  activeDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#FF5C1A",
  },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    margin: "12px",
    padding: "12px 14px",
    borderRadius: "10px",
    border: "1px solid rgba(208,49,45,0.3)",
    background: "rgba(208,49,45,0.1)",
    color: "#ff6b6b",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    transition: "all 0.15s ease",
  },
  footer: {
    textAlign: "center",
    color: "rgba(255,255,255,0.15)",
    fontSize: "11px",
    padding: "16px",
    margin: 0,
  },
};