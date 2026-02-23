// frontend/src/pages/FeederMaster.jsx
// Screen 1: Feeder Master - Table + Map with all 10 feeders

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Custom colored icons per feeder type
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

function createFeederIcon(type) {
  const color = FEEDER_COLORS[type] || "#333";
  const emoji = FEEDER_EMOJI[type] || "⚡";
  return L.divIcon({
    className: "",
    html: `<div style="
      background:${color};
      width:36px;height:36px;border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:18px;border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.4);">
      ${emoji}
    </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    popupAnchor: [0, -20],
  });
}

const API = "http://localhost:5000/api";

export default function FeederMaster() {
  const [feeders, setFeeders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    feeder_id: "", feeder_name: "", state: "", city: "",
    lat: "", lng: "", capacity_mw: "", feeder_type: "Thermal"
  });

  useEffect(() => {
    fetch(`${API}/feeders`)
      .then(r => r.json())
      .then(data => { setFeeders(data); setLoading(false); })
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
      const updated = await fetch(`${API}/feeders`).then(r => r.json());
      setFeeders(updated);
    }
  };

  // Center map on India (slightly shifted toward UP)
  const mapCenter = [26.5, 81.0];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#1a1a2e" }}>
            ⚡ Feeder Master
          </h2>
          <p style={{ margin: "4px 0 0", color: "#666", fontSize: 14 }}>
            {feeders.length} feeders across UP & adjoining states
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            background: "#2563eb", color: "white", border: "none",
            padding: "10px 20px", borderRadius: 8, cursor: "pointer",
            fontWeight: 600, fontSize: 14
          }}
        >
          + Add Feeder
        </button>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {Object.entries(FEEDER_COLORS).map(([type, color]) => (
          <div key={type} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: color }} />
            <span style={{ fontSize: 13, color: "#555" }}>{FEEDER_EMOJI[type]} {type}</span>
          </div>
        ))}
      </div>

      {/* MAP */}
      <div style={{ height: 450, borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
        <MapContainer center={mapCenter} zoom={6} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          {feeders.map(f => (
            <Marker
              key={f.feeder_id}
              position={[f.lat, f.lng]}
              icon={createFeederIcon(f.feeder_type)}
              eventHandlers={{ click: () => setSelected(f) }}
            >
              <Tooltip direction="top" offset={[0, -20]} permanent={false}>
                <b>{f.feeder_name}</b><br/>{f.feeder_type} • {f.capacity_mw} MW
              </Tooltip>
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <b style={{ fontSize: 14 }}>{FEEDER_EMOJI[f.feeder_type]} {f.feeder_name}</b>
                  <hr style={{ margin: "6px 0" }} />
                  <div><b>ID:</b> {f.feeder_id}</div>
                  <div><b>Type:</b> {f.feeder_type}</div>
                  <div><b>State:</b> {f.state}</div>
                  <div><b>City:</b> {f.city}</div>
                  <div><b>Capacity:</b> {f.capacity_mw} MW</div>
                  <div><b>Lat/Lng:</b> {f.lat}, {f.lng}</div>
                  <div style={{
                    display: "inline-block", marginTop: 6, padding: "2px 8px",
                    borderRadius: 99, fontSize: 11, fontWeight: 600,
                    background: f.status === "Active" ? "#d1fae5" : "#fee2e2",
                    color: f.status === "Active" ? "#065f46" : "#991b1b"
                  }}>
                    {f.status}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* ADD FEEDER FORM */}
      {showForm && (
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: 20 }}>
          <h3 style={{ marginTop: 0 }}>Add New Feeder</h3>
          <form onSubmit={handleSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            {[
              { key: "feeder_id",   label: "Feeder ID",       placeholder: "F011" },
              { key: "feeder_name", label: "Feeder Name",     placeholder: "Tehri Hydro Phase 2" },
              { key: "state",       label: "State",           placeholder: "Uttarakhand" },
              { key: "city",        label: "City",            placeholder: "Tehri" },
              { key: "lat",         label: "Latitude",        placeholder: "30.3784" },
              { key: "lng",         label: "Longitude",       placeholder: "78.4800" },
              { key: "capacity_mw", label: "Capacity (MW)",   placeholder: "500" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label style={{ display: "block", fontSize: 12, color: "#374151", marginBottom: 4 }}>{label}</label>
                <input
                  required
                  value={form[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  placeholder={placeholder}
                  style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, boxSizing: "border-box" }}
                />
              </div>
            ))}
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#374151", marginBottom: 4 }}>Feeder Type</label>
              <select
                value={form.feeder_type}
                onChange={e => setForm({ ...form, feeder_type: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 }}
              >
                {["Thermal","Hydro","Gas","Nuclear"].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "1/-1", display: "flex", gap: 10 }}>
              <button type="submit" style={{ background: "#2563eb", color: "white", border: "none", padding: "10px 24px", borderRadius: 8, cursor: "pointer", fontWeight: 600 }}>
                Save Feeder
              </button>
              <button type="button" onClick={() => setShowForm(false)} style={{ background: "#6b7280", color: "white", border: "none", padding: "10px 24px", borderRadius: 8, cursor: "pointer" }}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TABLE */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#1e3a5f", color: "white" }}>
              {["Feeder ID","Name","State","City","Lat","Long","Capacity (MW)","Type","Status"].map(h => (
                <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontWeight: 600, fontSize: 13 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: "center", padding: 30, color: "#999" }}>Loading feeders...</td></tr>
            ) : feeders.map((f, i) => (
              <tr
                key={f.feeder_id}
                onClick={() => setSelected(f)}
                style={{
                  background: selected?.feeder_id === f.feeder_id ? "#eff6ff" : i % 2 === 0 ? "#fff" : "#f9fafb",
                  cursor: "pointer",
                  transition: "background 0.15s"
                }}
              >
                <td style={{ padding: "11px 14px", fontWeight: 600, color: "#2563eb" }}>{f.feeder_id}</td>
                <td style={{ padding: "11px 14px" }}>{f.feeder_name}</td>
                <td style={{ padding: "11px 14px" }}>{f.state}</td>
                <td style={{ padding: "11px 14px" }}>{f.city}</td>
                <td style={{ padding: "11px 14px", fontFamily: "monospace", fontSize: 12 }}>{f.lat}</td>
                <td style={{ padding: "11px 14px", fontFamily: "monospace", fontSize: 12 }}>{f.lng}</td>
                <td style={{ padding: "11px 14px", fontWeight: 600 }}>{f.capacity_mw}</td>
                <td style={{ padding: "11px 14px" }}>
                  <span style={{
                    padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                    background: `${FEEDER_COLORS[f.feeder_type]}22`,
                    color: FEEDER_COLORS[f.feeder_type],
                    border: `1px solid ${FEEDER_COLORS[f.feeder_type]}44`
                  }}>
                    {FEEDER_EMOJI[f.feeder_type]} {f.feeder_type}
                  </span>
                </td>
                <td style={{ padding: "11px 14px" }}>
                  <span style={{
                    padding: "3px 10px", borderRadius: 99, fontSize: 12, fontWeight: 600,
                    background: f.status === "Active" ? "#d1fae5" : "#fee2e2",
                    color: f.status === "Active" ? "#065f46" : "#991b1b"
                  }}>{f.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* SELECTED FEEDER DETAIL CARD */}
      {selected && (
        <div style={{
          background: "white", border: `2px solid ${FEEDER_COLORS[selected.feeder_type]}`,
          borderRadius: 12, padding: 20, position: "relative"
        }}>
          <button
            onClick={() => setSelected(null)}
            style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "#999" }}
          >✕</button>
          <h3 style={{ margin: "0 0 12px", color: "#1a1a2e" }}>
            {FEEDER_EMOJI[selected.feeder_type]} {selected.feeder_name}
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
            {[
              { label: "Feeder ID",    value: selected.feeder_id },
              { label: "Type",         value: selected.feeder_type },
              { label: "State",        value: selected.state },
              { label: "City",         value: selected.city },
              { label: "Latitude",     value: selected.lat },
              { label: "Longitude",    value: selected.lng },
              { label: "Capacity",     value: `${selected.capacity_mw} MW` },
              { label: "Status",       value: selected.status },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 11, color: "#6b7280", fontWeight: 600, textTransform: "uppercase" }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e", marginTop: 2 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
