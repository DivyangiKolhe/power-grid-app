// frontend/src/App.jsx
import { useState } from "react";
import FeederMaster from "./pages/FeederMaster";
import TransformerMaster from "./pages/TransformerMaster";

const NAV = [
  { id: "feeders",      label: "Feeder Master",      icon: "⚡", section: "MASTER DATA" },
  { id: "transformers", label: "Transformer Master",  icon: "🔌", section: "MASTER DATA" },
];

export default function App() {
  const [active, setActive] = useState("feeders");

  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: "'Segoe UI', sans-serif", background: "#f1f5f9" }}>
      {/* SIDEBAR */}
      <div style={{ width: 240, background: "#1e3a5f", color: "white", display: "flex", flexDirection: "column", position: "fixed", height: "100vh", zIndex: 100 }}>
        {/* Logo */}
        <div style={{ padding: "20px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>⚡ PowerGrid</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>Distribution Management</div>
        </div>

        {/* Nav */}
        <nav style={{ padding: "12px 0", flex: 1, overflowY: "auto" }}>
          {/* Group by section */}
          {["MASTER DATA"].map(section => (
            <div key={section}>
              <div style={{ padding: "8px 16px 4px", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 1, textTransform: "uppercase" }}>
                {section}
              </div>
              {NAV.filter(n => n.section === section).map(item => (
                <button
                  key={item.id}
                  onClick={() => setActive(item.id)}
                  style={{
                    width: "100%", textAlign: "left", padding: "10px 16px",
                    background: active === item.id ? "rgba(255,255,255,0.15)" : "none",
                    border: "none", color: active === item.id ? "white" : "rgba(255,255,255,0.65)",
                    cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", gap: 10,
                    borderLeft: active === item.id ? "3px solid #60a5fa" : "3px solid transparent",
                    transition: "all 0.15s", fontFamily: "inherit"
                  }}
                >
                  <span>{item.icon}</span> {item.label}
                </button>
              ))}
            </div>
          ))}

          {/* Coming soon */}
          <div style={{ padding: "16px 16px 4px", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 1, textTransform: "uppercase" }}>
            ANALYTICAL
          </div>
          {["Geographic Overview", "Transformer Detail View"].map(label => (
            <div key={label} style={{ padding: "10px 16px", color: "rgba(255,255,255,0.3)", fontSize: 14, display: "flex", alignItems: "center", gap: 10, cursor: "not-allowed" }}>
              <span>🗺️</span> {label}
              <span style={{ marginLeft: "auto", fontSize: 9, background: "rgba(255,255,255,0.1)", padding: "1px 6px", borderRadius: 99 }}>SOON</span>
            </div>
          ))}

          <div style={{ padding: "16px 16px 4px", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.4)", letterSpacing: 1, textTransform: "uppercase" }}>
            APPLICATIONS
          </div>
          {["Energy Transfer", "Event Notifications"].map(label => (
            <div key={label} style={{ padding: "10px 16px", color: "rgba(255,255,255,0.3)", fontSize: 14, display: "flex", alignItems: "center", gap: 10, cursor: "not-allowed" }}>
              <span>📋</span> {label}
              <span style={{ marginLeft: "auto", fontSize: 9, background: "rgba(255,255,255,0.1)", padding: "1px 6px", borderRadius: 99 }}>SOON</span>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div style={{ padding: "12px 16px", borderTop: "1px solid rgba(255,255,255,0.1)", fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
          Demo v1.0 • Varanasi Grid
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ marginLeft: 240, flex: 1, minHeight: "100vh" }}>
        {/* Topbar */}
        <div style={{
          background: "white", padding: "14px 24px", borderBottom: "1px solid #e5e7eb",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, zIndex: 50, boxShadow: "0 1px 4px rgba(0,0,0,0.06)"
        }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#1a1a2e" }}>
            {NAV.find(n => n.id === active)?.icon} {NAV.find(n => n.id === active)?.label}
          </div>
          <div style={{ fontSize: 13, color: "#6b7280" }}>
            Power Grid Distribution Management System
          </div>
        </div>

        {/* Page Content */}
        <div>
          {active === "feeders"      && <FeederMaster />}
          {active === "transformers" && <TransformerMaster />}
        </div>
      </div>
    </div>
  );
}
