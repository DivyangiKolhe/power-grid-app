// frontend/src/pages/FeederMaster.jsx
import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const FEEDER_COLORS = {
  Thermal: "#e74c3c",
  Hydro:   "#3498db",
  Gas:     "#f39c12",
  Nuclear: "#9b59b6",
};
const FEEDER_EMOJI = {
  Thermal: "🔥",
  Hydro:   "💧",
  Gas:     "⚡",
  Nuclear: "☢️",
};

function createFeederIcon(type, isSelected) {
  const color  = FEEDER_COLORS[type] || "#333";
  const emoji  = FEEDER_EMOJI[type]  || "⚡";
  const border = isSelected ? "4px solid #fbbf24" : "3px solid white";
  const size   = isSelected ? 44 : 36;
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.45)}px;border:${border};box-shadow:0 2px 8px rgba(0,0,0,0.4);">${emoji}</div>`,
    iconSize: [size, size], iconAnchor: [size/2, size/2], popupAnchor: [0, -size/2],
  });
}

function MapController({ mapRef }) {
  const map = useMapEvents({});
  useEffect(() => { mapRef.current = map; }, [map]);
  return null;
}

const API = "/api";

export default function FeederMaster() {
  const [feeders,    setFeeders]    = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const mapRef = useRef(null);

  const [form, setForm] = useState({
    feeder_id:"", feeder_name:"", state:"", city:"",
    lat:"", lng:"", capacity_mw:"", feeder_type:"Thermal"
  });

  useEffect(() => {
    fetch(`${API}/feeders`)
      .then(r => r.json())
      .then(data => { setFeeders(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await fetch(`${API}/feeders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowForm(false);
      setForm({ feeder_id:"",feeder_name:"",state:"",city:"",lat:"",lng:"",capacity_mw:"",feeder_type:"Thermal" });
      fetch(`${API}/feeders`).then(r=>r.json()).then(data=>setFeeders(Array.isArray(data)?data:[]));
    }
  };

  const handleFeederClick = (f) => {
    setSelected(f);
    setDrawerOpen(true);
    if (mapRef.current) mapRef.current.flyTo([f.lat, f.lng], 9, { animate:true, duration:1 });
  };

  const panelColor = selected ? (FEEDER_COLORS[selected.feeder_type] || "#1e3a5f") : "#1e3a5f";

  const indiaBounds = [[22.0,74.0],[32.0,89.0]];
  const mapCenter   = [26.8, 82.0];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 57px)", overflow:"hidden", background:"#f1f5f9" }}>

      {/* HEADER */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 16px", background:"white", borderBottom:"1px solid #e5e7eb", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          <div>
            <h2 style={{ margin:0, fontSize:16, fontWeight:700, color:"#1a1a2e" }}>⚡ Feeder Master</h2>
            <p style={{ margin:0, color:"#888", fontSize:10 }}>{feeders.length} feeders • Click map icon for details</p>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            {Object.entries(FEEDER_COLORS).map(([type,color]) => (
              <div key={type} style={{ display:"flex", alignItems:"center", gap:4 }}>
                <div style={{ width:9, height:9, borderRadius:"50%", background:color }} />
                <span style={{ fontSize:10, color:"#555" }}>{FEEDER_EMOJI[type]} {type}</span>
              </div>
            ))}
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ background:"#2563eb", color:"white", border:"none", padding:"6px 14px", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:11 }}>
          + Add Feeder
        </button>
      </div>

      {/* ADD FORM */}
      {showForm && (
        <div style={{ background:"#eff6ff", borderBottom:"1px solid #bfdbfe", padding:"10px 16px", flexShrink:0 }}>
          <form onSubmit={handleSubmit} style={{ display:"grid", gridTemplateColumns:"repeat(8,1fr)", gap:7, alignItems:"end" }}>
            {[
              { key:"feeder_id",   label:"Feeder ID",    placeholder:"F011" },
              { key:"feeder_name", label:"Name",         placeholder:"Tehri Phase 2" },
              { key:"state",       label:"State",        placeholder:"Uttarakhand" },
              { key:"city",        label:"City",         placeholder:"Tehri" },
              { key:"lat",         label:"Latitude",     placeholder:"30.37" },
              { key:"lng",         label:"Longitude",    placeholder:"78.48" },
              { key:"capacity_mw", label:"Capacity(MW)", placeholder:"500" },
            ].map(({key,label,placeholder}) => (
              <div key={key}>
                <label style={{ display:"block", fontSize:9, color:"#374151", marginBottom:2, fontWeight:600 }}>{label}</label>
                <input required value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} placeholder={placeholder}
                  style={{ width:"100%", padding:"4px 6px", border:"1px solid #93c5fd", borderRadius:5, fontSize:10, boxSizing:"border-box", background:"white" }} />
              </div>
            ))}
            <div>
              <label style={{ display:"block", fontSize:9, color:"#374151", marginBottom:2, fontWeight:600 }}>Type</label>
              <select value={form.feeder_type} onChange={e=>setForm({...form,feeder_type:e.target.value})}
                style={{ width:"100%", padding:"4px 6px", border:"1px solid #93c5fd", borderRadius:5, fontSize:10 }}>
                {["Thermal","Hydro","Gas","Nuclear"].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display:"flex", gap:4 }}>
              <button type="submit" style={{ background:"#2563eb", color:"white", border:"none", padding:"4px 10px", borderRadius:5, cursor:"pointer", fontWeight:600, fontSize:10 }}>Save</button>
              <button type="button" onClick={()=>setShowForm(false)} style={{ background:"#6b7280", color:"white", border:"none", padding:"4px 8px", borderRadius:5, cursor:"pointer", fontSize:10 }}>✕</button>
            </div>
          </form>
        </div>
      )}

      {/* MAP + DRAWER ROW */}
      <div style={{ flex:1, display:"flex", overflow:"hidden", position:"relative" }}>

        {/* MAP */}
        <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
          <MapContainer
            center={mapCenter} zoom={6} minZoom={6} maxZoom={14}
            maxBounds={indiaBounds} maxBoundsViscosity={1.0}
            style={{ height:"100%", width:"100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors'/>
            <MapController mapRef={mapRef}/>

            {feeders.map(f => (
              <Marker
                key={f.feeder_id}
                position={[f.lat, f.lng]}
                icon={createFeederIcon(f.feeder_type, selected?.feeder_id === f.feeder_id)}
                eventHandlers={{ click: () => handleFeederClick(f) }}
              >
                <Tooltip direction="top" offset={[0,-20]}>
                  <b>{f.feeder_name}</b><br/>{f.feeder_type} • {f.capacity_mw} MW
                </Tooltip>
              </Marker>
            ))}
          </MapContainer>

          {!selected && (
            <div style={{ position:"absolute", bottom:10, left:"50%", transform:"translateX(-50%)", background:"rgba(0,0,0,0.6)", color:"white", padding:"4px 14px", borderRadius:20, fontSize:10, pointerEvents:"none", zIndex:1000, whiteSpace:"nowrap" }}>
              👆 Click any feeder icon to see details
            </div>
          )}
        </div>

        {/* SIDE DRAWER */}
        {selected && (
          <>
            {/* Collapse / Expand TAB */}
            <button
              onClick={() => setDrawerOpen(o => !o)}
              style={{
                position:"absolute", right: drawerOpen ? 299 : -1, top:"50%",
                transform:"translateY(-50%)", zIndex:1100,
                width:20, height:56, background:panelColor,
                border:"none", borderRadius:"8px 0 0 8px",
                cursor:"pointer", color:"white",
                fontSize:14, fontWeight:900,
                display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow:"-3px 0 10px rgba(0,0,0,0.2)",
                transition:"right 0.3s ease",
              }}
            >
              {drawerOpen ? "›" : "‹"}
            </button>

            {/* DRAWER PANEL */}
            <div style={{
              width: drawerOpen ? 300 : 0,
              minWidth: drawerOpen ? 300 : 0,
              transition:"width 0.3s ease, min-width 0.3s ease",
              overflow:"hidden",
              background:"white",
              borderLeft:`4px solid ${panelColor}`,
              display:"flex", flexDirection:"column",
              boxShadow:"-4px 0 16px rgba(0,0,0,0.1)",
              flexShrink:0,
            }}>
              <div style={{ width:300, display:"flex", flexDirection:"column", height:"100%", overflowY:"auto" }}>

                {/* Drawer Header */}
                <div style={{ background:panelColor, padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexShrink:0 }}>
                  <div style={{ color:"white" }}>
                    <div style={{ fontSize:22 }}>{FEEDER_EMOJI[selected.feeder_type]}</div>
                    <div style={{ fontWeight:700, fontSize:14, marginTop:3, lineHeight:1.2 }}>{selected.feeder_name}</div>
                    <div style={{ fontSize:10, opacity:0.8, marginTop:2 }}>ID: {selected.feeder_id} • {selected.feeder_type}</div>
                  </div>
                  <button
                    onClick={() => { setSelected(null); setDrawerOpen(false); }}
                    style={{ background:"rgba(255,255,255,0.25)", border:"none", color:"white", width:26, height:26, borderRadius:"50%", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}
                  >✕</button>
                </div>

                {/* Status */}
                <div style={{ padding:"7px 14px", borderBottom:"1px solid #f1f5f9", background:"#fafafa" }}>
                  <span style={{ padding:"3px 12px", borderRadius:99, fontSize:11, fontWeight:700,
                    background: selected.status==="Active"?"#d1fae5":"#fee2e2",
                    color: selected.status==="Active"?"#065f46":"#991b1b" }}>
                    ● {selected.status}
                  </span>
                </div>

                {/* Fields Grid */}
                <div style={{ padding:"10px 14px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                  {[
                    ["⚡ Type",      selected.feeder_type],
                    ["🗺️ State",     selected.state],
                    ["🏙️ City",      selected.city],
                    ["🔋 Capacity",  `${selected.capacity_mw} MW`],
                    ["📍 Latitude",  selected.lat],
                    ["📍 Longitude", selected.lng],
                  ].map(([label,value])=>(
                    <div key={label} style={{ background:"#f8fafc", borderRadius:7, padding:"7px 9px" }}>
                      <div style={{ fontSize:9, color:"#9ca3af", fontWeight:700, textTransform:"uppercase", marginBottom:2 }}>{label}</div>
                      <div style={{ fontSize:12, fontWeight:700, color:"#1a1a2e" }}>{value}</div>
                    </div>
                  ))}
                </div>

                {/* Footer info */}
                <div style={{ padding:"0 14px 14px" }}>
                  <div style={{ background:"#eff6ff", borderRadius:7, padding:"8px 12px", fontSize:11, color:"#2563eb", fontWeight:600 }}>
                    🔌 Feeds L1 Transformers in Varanasi grid
                  </div>
                </div>

              </div>
            </div>
          </>
        )}
      </div>

      {/* COMPACT TABLE */}
      <div style={{ height:175, overflow:"auto", background:"white", borderTop:"2px solid #e5e7eb", flexShrink:0 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 14px", background:"#f8fafc", borderBottom:"1px solid #e5e7eb", position:"sticky", top:0, zIndex:5 }}>
          <span style={{ fontWeight:700, fontSize:11, color:"#1a1a2e" }}>📋 All Feeders ({feeders.length})</span>
          <span style={{ fontSize:10, color:"#9ca3af" }}>Click row → zoom to location</span>
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
          <thead>
            <tr style={{ background:"#1e3a5f", color:"white", position:"sticky", top:29 }}>
              {["Feeder ID","Name","State","City","Latitude","Longitude","Capacity (MW)","Type","Status"].map(h => (
                <th key={h} style={{ padding:"6px 10px", textAlign:"left", fontWeight:600, fontSize:10, whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign:"center", padding:16, color:"#999" }}>Loading feeders...</td></tr>
            ) : feeders.map((f,i) => (
              <tr key={f.feeder_id} onClick={()=>handleFeederClick(f)} style={{
                background: selected?.feeder_id===f.feeder_id ? `${FEEDER_COLORS[f.feeder_type]}18` : i%2===0 ? "#fff" : "#f9fafb",
                cursor:"pointer",
                borderLeft: selected?.feeder_id===f.feeder_id ? `3px solid ${FEEDER_COLORS[f.feeder_type]}` : "3px solid transparent",
                transition:"all 0.15s"
              }}>
                <td style={{ padding:"5px 10px", fontWeight:700, color:"#2563eb" }}>{f.feeder_id}</td>
                <td style={{ padding:"5px 10px", fontWeight:500 }}>{f.feeder_name}</td>
                <td style={{ padding:"5px 10px", color:"#555" }}>{f.state}</td>
                <td style={{ padding:"5px 10px", color:"#555" }}>{f.city}</td>
                <td style={{ padding:"5px 10px", fontFamily:"monospace", fontSize:10, color:"#888" }}>{f.lat}</td>
                <td style={{ padding:"5px 10px", fontFamily:"monospace", fontSize:10, color:"#888" }}>{f.lng}</td>
                <td style={{ padding:"5px 10px", fontWeight:700 }}>{f.capacity_mw}</td>
                <td style={{ padding:"5px 10px" }}>
                  <span style={{ padding:"1px 7px", borderRadius:99, fontSize:10, fontWeight:700, background:`${FEEDER_COLORS[f.feeder_type]}22`, color:FEEDER_COLORS[f.feeder_type], border:`1px solid ${FEEDER_COLORS[f.feeder_type]}55` }}>
                    {FEEDER_EMOJI[f.feeder_type]} {f.feeder_type}
                  </span>
                </td>
                <td style={{ padding:"5px 10px" }}>
                  <span style={{ padding:"1px 7px", borderRadius:99, fontSize:10, fontWeight:700, background: f.status==="Active"?"#d1fae5":"#fee2e2", color: f.status==="Active"?"#065f46":"#991b1b" }}>
                    {f.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}