// frontend/src/App.jsx
import { useState } from "react";
import FeederMaster from "./pages/FeederMaster";
import TransformerMaster from "./pages/TransformerMaster";
import TransformerDetail from "./pages/TransformerDetail";

const NAV = [
  { id:"feeders",      label:"Feeder Master",     icon:"⚡", section:"MASTER DATA" },
  { id:"transformers", label:"Transformer Master", icon:"🔌", section:"MASTER DATA" },
];

export default function App() {
  const [active,    setActive]    = useState("feeders");
  const [detailId,  setDetailId]  = useState(null);   // trf_id when drilling into detail

  // Called from TransformerMaster on double-click
  const openDetail = (trf_id) => setDetailId(trf_id);
  const closeDetail = ()       => setDetailId(null);

  return (
    <div style={{ display:"flex", minHeight:"100vh", fontFamily:"'Segoe UI', sans-serif", background:"#f1f5f9" }}>

      {/* SIDEBAR */}
      <div style={{ width:240, background:"#1e3a5f", color:"white", display:"flex", flexDirection:"column", position:"fixed", height:"100vh", zIndex:100 }}>
        <div style={{ padding:"20px 16px", borderBottom:"1px solid rgba(255,255,255,0.1)" }}>
          <div style={{ fontSize:18, fontWeight:700 }}>⚡ PowerGrid</div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)", marginTop:2 }}>Distribution Management</div>
        </div>

        <nav style={{ padding:"12px 0", flex:1, overflowY:"auto" }}>
          <div>
            <div style={{ padding:"8px 16px 4px", fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.4)", letterSpacing:1, textTransform:"uppercase" }}>MASTER DATA</div>
            {NAV.map(item => (
              <button key={item.id} onClick={() => { setActive(item.id); setDetailId(null); }} style={{
                width:"100%", textAlign:"left", padding:"10px 16px",
                background: active===item.id && !detailId ? "rgba(255,255,255,0.15)" : "none",
                border:"none", color: active===item.id && !detailId ? "white" : "rgba(255,255,255,0.65)",
                cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", gap:10,
                borderLeft: active===item.id && !detailId ? "3px solid #60a5fa" : "3px solid transparent",
                transition:"all 0.15s", fontFamily:"inherit",
              }}>
                <span>{item.icon}</span> {item.label}
              </button>
            ))}
          </div>

          <div style={{ padding:"16px 16px 4px", fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.4)", letterSpacing:1, textTransform:"uppercase" }}>ANALYTICAL</div>
          {["Geographic Overview"].map(label => (
            <div key={label} style={{ padding:"10px 16px", color:"rgba(255,255,255,0.3)", fontSize:14, display:"flex", alignItems:"center", gap:10, cursor:"not-allowed" }}>
              <span>🗺️</span> {label}
              <span style={{ marginLeft:"auto", fontSize:9, background:"rgba(255,255,255,0.1)", padding:"1px 6px", borderRadius:99 }}>SOON</span>
            </div>
          ))}

          <div style={{ padding:"16px 16px 4px", fontSize:10, fontWeight:700, color:"rgba(255,255,255,0.4)", letterSpacing:1, textTransform:"uppercase" }}>APPLICATIONS</div>
          {["Energy Transfer","Event Notifications"].map(label => (
            <div key={label} style={{ padding:"10px 16px", color:"rgba(255,255,255,0.3)", fontSize:14, display:"flex", alignItems:"center", gap:10, cursor:"not-allowed" }}>
              <span>📋</span> {label}
              <span style={{ marginLeft:"auto", fontSize:9, background:"rgba(255,255,255,0.1)", padding:"1px 6px", borderRadius:99 }}>SOON</span>
            </div>
          ))}
        </nav>

        <div style={{ padding:"12px 16px", borderTop:"1px solid rgba(255,255,255,0.1)", fontSize:11, color:"rgba(255,255,255,0.4)" }}>
          Demo v1.0 • Varanasi Grid
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ marginLeft:240, flex:1, minHeight:"100vh" }}>
        {/* Topbar */}
        <div style={{ background:"white", padding:"14px 24px", borderBottom:"1px solid #e5e7eb", display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:50, boxShadow:"0 1px 4px rgba(0,0,0,0.06)" }}>
          <div style={{ fontSize:16, fontWeight:600, color:"#1a1a2e", display:"flex", alignItems:"center", gap:8 }}>
            {detailId ? (
              <>
                <span style={{ color:"#888", fontWeight:400 }}>🔌 Transformer Master</span>
                <span style={{ color:"#ccc" }}>›</span>
                <span>Transformer Detail</span>
              </>
            ) : (
              <>{NAV.find(n => n.id === active)?.icon} {NAV.find(n => n.id === active)?.label}</>
            )}
          </div>
          <div style={{ fontSize:13, color:"#6b7280" }}>Power Grid Distribution Management System</div>
        </div>

        {/* Page Content */}
        <div>
          {detailId
            ? <TransformerDetail trf_id={detailId} onBack={closeDetail}/>
            : active==="feeders"      ? <FeederMaster/>
            : active==="transformers" ? <TransformerMaster onDoubleClick={openDetail}/>
            : null
          }
        </div>
      </div>
    </div>
  );
}