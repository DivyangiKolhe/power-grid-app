// frontend/src/pages/FeederMaster.jsx
import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet";
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
  const color = FEEDER_COLORS[type] || "#333";
  const emoji = FEEDER_EMOJI[type] || "⚡";
  const border = isSelected ? "4px solid #fbbf24" : "3px solid white";
  const size = isSelected ? 44 : 36;
  return L.divIcon({
    className: "",
    html: `<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.45)}px;border:${border};box-shadow:0 2px 8px rgba(0,0,0,0.4);">${emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [size/2, size/2],
    popupAnchor: [0, -size/2],
  });
}

const API = "http://localhost:5000/api";

export default function FeederMaster() {
  const [feeders, setFeeders]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
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

const indiaBounds = [[22.0,74.0],[32.0,89.0]];
const mapCenter = [26.8, 82.0];
  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 57px)", overflow:"hidden", background:"#f1f5f9" }}>

      {/* HEADER */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 20px", background:"white", borderBottom:"1px solid #e5e7eb", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:20 }}>
          <div>
            <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:"#1a1a2e" }}>⚡ Feeder Master</h2>
            <p style={{ margin:0, color:"#666", fontSize:11 }}>{feeders.length} feeders • Click map icon for details</p>
          </div>
          <div style={{ display:"flex", gap:12 }}>
            {Object.entries(FEEDER_COLORS).map(([type,color]) => (
              <div key={type} style={{ display:"flex", alignItems:"center", gap:5 }}>
                <div style={{ width:10, height:10, borderRadius:"50%", background:color }} />
                <span style={{ fontSize:11, color:"#555" }}>{FEEDER_EMOJI[type]} {type}</span>
              </div>
            ))}
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ background:"#2563eb", color:"white", border:"none", padding:"7px 16px", borderRadius:8, cursor:"pointer", fontWeight:600, fontSize:12 }}>
          + Add Feeder
        </button>
      </div>

      {/* ADD FORM */}
      {showForm && (
        <div style={{ background:"#eff6ff", borderBottom:"1px solid #bfdbfe", padding:"12px 20px", flexShrink:0 }}>
          <form onSubmit={handleSubmit} style={{ display:"grid", gridTemplateColumns:"repeat(8,1fr)", gap:8, alignItems:"end" }}>
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
                <label style={{ display:"block", fontSize:10, color:"#374151", marginBottom:2, fontWeight:600 }}>{label}</label>
                <input required value={form[key]} onChange={e=>setForm({...form,[key]:e.target.value})} placeholder={placeholder}
                  style={{ width:"100%", padding:"5px 7px", border:"1px solid #93c5fd", borderRadius:5, fontSize:11, boxSizing:"border-box", background:"white" }} />
              </div>
            ))}
            <div>
              <label style={{ display:"block", fontSize:10, color:"#374151", marginBottom:2, fontWeight:600 }}>Type</label>
              <select value={form.feeder_type} onChange={e=>setForm({...form,feeder_type:e.target.value})}
                style={{ width:"100%", padding:"5px 7px", border:"1px solid #93c5fd", borderRadius:5, fontSize:11 }}>
                {["Thermal","Hydro","Gas","Nuclear"].map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ display:"flex", gap:5 }}>
              <button type="submit" style={{ background:"#2563eb", color:"white", border:"none", padding:"5px 12px", borderRadius:5, cursor:"pointer", fontWeight:600, fontSize:11 }}>Save</button>
              <button type="button" onClick={()=>setShowForm(false)} style={{ background:"#6b7280", color:"white", border:"none", padding:"5px 9px", borderRadius:5, cursor:"pointer", fontSize:11 }}>✕</button>
            </div>
          </form>
        </div>
      )}

      {/* TOP HALF: MAP + DETAIL PANEL */}
      <div style={{ display:"flex", flex:"0 0 52%", borderBottom:"2px solid #e5e7eb", overflow:"hidden" }}>

        {/* MAP */}
        <div style={{ flex: selected ? "0 0 58%" : "1", transition:"flex 0.3s ease", position:"relative" }}>
          <MapContainer
            center={mapCenter} zoom={6} minZoom={6} maxZoom={14}
            maxBounds={indiaBounds} maxBoundsViscosity={1.0}
            style={{ height:"100%", width:"100%" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap contributors'
            />
            {feeders.map(f => (
              <Marker
                key={f.feeder_id}
                position={[f.lat, f.lng]}
                icon={createFeederIcon(f.feeder_type, selected?.feeder_id === f.feeder_id)}
                eventHandlers={{ click: () => setSelected(f) }}
              >
                <Tooltip direction="top" offset={[0,-20]}>
                  <b>{f.feeder_name}</b><br/>{f.feeder_type} • {f.capacity_mw} MW
                </Tooltip>
              </Marker>
            ))}
          </MapContainer>

          {!selected && (
            <div style={{ position:"absolute", bottom:12, left:"50%", transform:"translateX(-50%)", background:"rgba(0,0,0,0.6)", color:"white", padding:"5px 14px", borderRadius:20, fontSize:11, pointerEvents:"none", zIndex:1000, whiteSpace:"nowrap" }}>
              👆 Click any feeder icon to see details
            </div>
          )}
        </div>

        {/* DETAIL PANEL */}
        {selected && (
          <div style={{ flex:"0 0 42%", background:"white", overflowY:"auto", borderLeft:`4px solid ${FEEDER_COLORS[selected.feeder_type]}`, display:"flex", flexDirection:"column" }}>

            {/* Panel Header */}
            <div style={{ padding:"14px 16px", background:FEEDER_COLORS[selected.feeder_type], display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div style={{ color:"white" }}>
                <div style={{ fontSize:22 }}>{FEEDER_EMOJI[selected.feeder_type]}</div>
                <div style={{ fontWeight:700, fontSize:15, marginTop:4 }}>{selected.feeder_name}</div>
                <div style={{ fontSize:11, opacity:0.85, marginTop:2 }}>ID: {selected.feeder_id}</div>
              </div>
              <button onClick={()=>setSelected(null)} style={{ background:"rgba(255,255,255,0.25)", border:"none", color:"white", width:26, height:26, borderRadius:"50%", cursor:"pointer", fontSize:13, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
            </div>

            {/* Status */}
            <div style={{ padding:"10px 16px", borderBottom:"1px solid #f1f5f9" }}>
              <span style={{ padding:"3px 12px", borderRadius:99, fontSize:11, fontWeight:700, background: selected.status==="Active" ? "#d1fae5" : "#fee2e2", color: selected.status==="Active" ? "#065f46" : "#991b1b" }}>
                ● {selected.status}
              </span>
            </div>

            {/* Fields */}
            <div style={{ padding:"12px 16px", display:"flex", flexDirection:"column", gap:8, flex:1 }}>
              {[
                { icon:"🏷️", label:"Feeder ID",   value: selected.feeder_id },
                { icon:"⚡",  label:"Type",        value: selected.feeder_type },
                { icon:"🗺️", label:"State",        value: selected.state },
                { icon:"🏙️", label:"City",         value: selected.city },
                { icon:"📍", label:"Latitude",     value: selected.lat },
                { icon:"📍", label:"Longitude",    value: selected.lng },
                { icon:"🔋", label:"Capacity",     value: `${selected.capacity_mw} MW` },
              ].map(({icon,label,value}) => (
                <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 10px", background:"#f8fafc", borderRadius:7 }}>
                  <span style={{ fontSize:11, color:"#6b7280", fontWeight:600 }}>{icon} {label}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:"#1a1a2e" }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Footer note */}
            <div style={{ padding:"0 16px 14px" }}>
              <div style={{ background:"#eff6ff", borderRadius:7, padding:"8px 12px", fontSize:11, color:"#2563eb", fontWeight:600 }}>
                🔌 Feeds L1 Transformers in Varanasi grid
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM HALF: TABLE */}
      <div style={{ flex:1, overflow:"auto", background:"white" }}>
        {/* Sticky table label */}
        <div style={{ padding:"8px 20px", background:"#f8fafc", borderBottom:"1px solid #e5e7eb", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:10 }}>
          <span style={{ fontWeight:700, fontSize:12, color:"#1a1a2e" }}>📋 All Feeders ({feeders.length})</span>
          <span style={{ fontSize:11, color:"#9ca3af" }}>Click row to highlight on map</span>
        </div>

        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead>
            <tr style={{ background:"#1e3a5f", color:"white" }}>
              {["Feeder ID","Name","State","City","Latitude","Longitude","Capacity (MW)","Type","Status"].map(h => (
                <th key={h} style={{ padding:"9px 14px", textAlign:"left", fontWeight:600, fontSize:11, whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign:"center", padding:24, color:"#999" }}>Loading feeders...</td></tr>
            ) : feeders.map((f,i) => (
              <tr key={f.feeder_id} onClick={()=>setSelected(f)} style={{
                background: selected?.feeder_id===f.feeder_id ? `${FEEDER_COLORS[f.feeder_type]}18` : i%2===0 ? "#fff" : "#f9fafb",
                cursor:"pointer",
                borderLeft: selected?.feeder_id===f.feeder_id ? `4px solid ${FEEDER_COLORS[f.feeder_type]}` : "4px solid transparent",
                transition:"all 0.15s"
              }}>
                <td style={{ padding:"8px 14px", fontWeight:700, color:"#2563eb" }}>{f.feeder_id}</td>
                <td style={{ padding:"8px 14px", fontWeight:500 }}>{f.feeder_name}</td>
                <td style={{ padding:"8px 14px", color:"#555" }}>{f.state}</td>
                <td style={{ padding:"8px 14px", color:"#555" }}>{f.city}</td>
                <td style={{ padding:"8px 14px", fontFamily:"monospace", fontSize:11, color:"#777" }}>{f.lat}</td>
                <td style={{ padding:"8px 14px", fontFamily:"monospace", fontSize:11, color:"#777" }}>{f.lng}</td>
                <td style={{ padding:"8px 14px", fontWeight:700 }}>{f.capacity_mw}</td>
                <td style={{ padding:"8px 14px" }}>
                  <span style={{ padding:"2px 9px", borderRadius:99, fontSize:11, fontWeight:700, background:`${FEEDER_COLORS[f.feeder_type]}22`, color:FEEDER_COLORS[f.feeder_type], border:`1px solid ${FEEDER_COLORS[f.feeder_type]}55` }}>
                    {FEEDER_EMOJI[f.feeder_type]} {f.feeder_type}
                  </span>
                </td>
                <td style={{ padding:"8px 14px" }}>
                  <span style={{ padding:"2px 9px", borderRadius:99, fontSize:11, fontWeight:700, background: f.status==="Active" ? "#d1fae5" : "#fee2e2", color: f.status==="Active" ? "#065f46" : "#991b1b" }}>
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
