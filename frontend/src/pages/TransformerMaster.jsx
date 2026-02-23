// frontend/src/pages/TransformerMaster.jsx
// Screen 2: Transformer Master - Map with connections on click

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const TYPE_CONFIG = {
  L1: { color: "#7c3aed", emoji: "🏭", size: 44, label: "L1 (66/33 kV)" },
  L2: { color: "#2563eb", emoji: "🔌", size: 36, label: "L2 (33/11 kV)" },
  SM: { color: "#059669", emoji: "🏠", size: 28, label: "SM (11/.22 kV)" },
};

const FEEDER_ICON_CONFIG = { color: "#dc2626", emoji: "⚡", size: 40, label: "Feeder" };

const LINE_COLORS = {
  "feeder-l1":  "#dc2626",  // red  - feeder to L1
  "upstream":   "#7c3aed",  // purple - L1 to L2
  "peer":       "#f59e0b",  // amber  - peer
  "l2-sm":      "#059669",  // green  - L2 to SM
};

function createIcon(config, highlight = false) {
  const { color, emoji, size } = config;
  const border = highlight ? "4px solid #fbbf24" : "3px solid white";
  return L.divIcon({
    className: "",
    html: `<div style="
      background:${color};width:${size}px;height:${size}px;
      border-radius:50%;display:flex;align-items:center;
      justify-content:center;font-size:${size * 0.45}px;
      border:${border};box-shadow:0 2px 8px rgba(0,0,0,0.4);">
      ${emoji}
    </div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

const API = "http://localhost:5000/api";

export default function TransformerMaster() {
  const [transformers, setTransformers] = useState([]);
  const [feeders, setFeeders] = useState([]);
  const [allLinks, setAllLinks] = useState({ feederLinks: [], trfLinks: [] });
  const [selected, setSelected] = useState(null);
  const [connections, setConnections] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [showLines, setShowLines] = useState(true);
  const [showSM, setShowSM] = useState(false); // SM hidden by default (50 points = clutter)

  useEffect(() => {
    Promise.all([
      fetch(`${API}/transformers`).then(r => r.json()),
      fetch(`${API}/feeders`).then(r => r.json()),
      fetch(`${API}/transformers/links/all`).then(r => r.json()),
    ]).then(([trfs, fds, links]) => {
      setTransformers(trfs);
      setFeeders(fds);
      setAllLinks(links);
      setLoading(false);
    });
  }, []);

  const handleTransformerClick = async (trf) => {
    setSelected(trf);
    const res = await fetch(`${API}/transformers/${trf.trf_id}/connections`);
    const data = await res.json();
    setConnections(data);
  };

  const displayedTransformers = transformers.filter(t => {
    if (!showSM && t.trf_type === "SM") return false;
    if (filter === "ALL") return true;
    return t.trf_type === filter;
  });

  const counts = {
    L1: transformers.filter(t => t.trf_type === "L1").length,
    L2: transformers.filter(t => t.trf_type === "L2").length,
    SM: transformers.filter(t => t.trf_type === "SM").length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: 20 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#1a1a2e" }}>
            🔌 Transformer Master
          </h2>
          <p style={{ margin: "4px 0 0", color: "#666", fontSize: 14 }}>
            {transformers.length} transformers — Click any transformer to see connections
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {["ALL", "L1", "L2", "SM"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "7px 16px", borderRadius: 20, border: "2px solid",
                cursor: "pointer", fontWeight: 600, fontSize: 13,
                background: filter === f ? "#1e3a5f" : "white",
                color: filter === f ? "white" : "#1e3a5f",
                borderColor: "#1e3a5f"
              }}
            >
              {f} {f !== "ALL" ? `(${counts[f]})` : `(${transformers.length})`}
            </button>
          ))}
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={showLines} onChange={e => setShowLines(e.target.checked)} />
            Show Lines
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
            <input type="checkbox" checked={showSM} onChange={e => setShowSM(e.target.checked)} />
            Show Smart Meters
          </label>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
          <div key={type} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: cfg.color }} />
            <span style={{ fontSize: 13, color: "#555" }}>{cfg.emoji} {cfg.label}</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 14, height: 14, borderRadius: "50%", background: "#dc2626" }} />
          <span style={{ fontSize: 13, color: "#555" }}>⚡ Feeder</span>
        </div>
      </div>

      {/* MAP + DETAIL side by side */}
      <div style={{ display: "flex", gap: 16 }}>
        {/* MAP */}
        <div style={{
          flex: selected ? "0 0 65%" : "1",
          height: 520, borderRadius: 12, overflow: "hidden",
          border: "1px solid #e5e7eb", boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          transition: "flex 0.3s"
        }}>
          <MapContainer center={[25.35, 82.97]} zoom={11} style={{ height: "100%", width: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />

            {/* Draw connection lines */}
            {showLines && allLinks.feederLinks.map((l, i) => (
              <Polyline
                key={`fl-${i}`}
                positions={[[l.source_lat, l.source_lng],[l.target_lat, l.target_lng]]}
                color={LINE_COLORS["feeder-l1"]}
                weight={l.is_primary ? 2.5 : 1.5}
                dashArray={l.is_primary ? null : "6,4"}
                opacity={0.6}
              />
            ))}
            {showLines && allLinks.trfLinks.map((l, i) => {
              if (!showSM && (l.source_type === "SM" || l.target_type === "SM")) return null;
              return (
                <Polyline
                  key={`tl-${i}`}
                  positions={[[l.source_lat, l.source_lng],[l.target_lat, l.target_lng]]}
                  color={LINE_COLORS[l.type] || "#999"}
                  weight={l.link_type === "peer" ? 2 : l.is_primary ? 2 : 1}
                  dashArray={l.is_primary ? null : "5,4"}
                  opacity={0.55}
                />
              );
            })}

            {/* Feeders on map */}
            {feeders.map(f => (
              <Marker key={f.feeder_id} position={[f.lat, f.lng]} icon={createIcon(FEEDER_ICON_CONFIG)}>
                <Tooltip direction="top" offset={[0,-20]}>⚡ {f.feeder_name}</Tooltip>
                <Popup><b>{f.feeder_name}</b><br/>{f.feeder_type} • {f.capacity_mw} MW</Popup>
              </Marker>
            ))}

            {/* Transformers on map */}
            {displayedTransformers.map(t => {
              const cfg = TYPE_CONFIG[t.trf_type];
              const isSelected = selected?.trf_id === t.trf_id;
              return (
                <Marker
                  key={t.trf_id}
                  position={[t.lat, t.lng]}
                  icon={createIcon(cfg, isSelected)}
                  eventHandlers={{ click: () => handleTransformerClick(t) }}
                >
                  <Tooltip direction="top" offset={[0, -cfg.size / 2]}>
                    <b>{t.trf_name}</b><br/>{t.trf_type} • {t.voltage} • {t.capacity_kva} KVA
                  </Tooltip>
                  <Popup>
                    <b>{cfg.emoji} {t.trf_name}</b><br/>
                    <b>ID:</b> {t.trf_id}<br/>
                    <b>Type:</b> {t.trf_type} | <b>Voltage:</b> {t.voltage}<br/>
                    <b>Capacity:</b> {t.capacity_kva} KVA<br/>
                    <button
                      onClick={() => handleTransformerClick(t)}
                      style={{ marginTop: 6, padding: "4px 12px", background: "#2563eb", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}
                    >
                      See Connections
                    </button>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* CONNECTIONS PANEL */}
        {selected && connections && (
          <div style={{
            flex: "0 0 33%", background: "white", borderRadius: 12,
            border: "1px solid #e5e7eb", padding: 16, overflowY: "auto",
            maxHeight: 520, boxShadow: "0 4px 12px rgba(0,0,0,0.08)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <h3 style={{ margin: 0, fontSize: 16, color: "#1a1a2e" }}>
                {TYPE_CONFIG[selected.trf_type]?.emoji} {selected.trf_name}
              </h3>
              <button onClick={() => { setSelected(null); setConnections(null); }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#999" }}>✕</button>
            </div>

            {/* Transformer info */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
              {[
                { label: "ID",       value: selected.trf_id },
                { label: "Type",     value: selected.trf_type },
                { label: "Voltage",  value: selected.voltage },
                { label: "Capacity", value: `${selected.capacity_kva} KVA` },
                { label: "Status",   value: selected.status },
                { label: "City",     value: selected.city },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: "#f8fafc", borderRadius: 6, padding: "8px 10px" }}>
                  <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 700, textTransform: "uppercase" }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{value}</div>
                </div>
              ))}
            </div>

            {/* FEEDERS (for L1) */}
            {connections.feeders?.length > 0 && (
              <Section title="⚡ Connected Feeders (Upstream)" color="#dc2626">
                {connections.feeders.map(f => (
                  <ConnCard key={f.feeder_id} title={f.feeder_name} sub={`${f.feeder_type} • ${f.capacity_mw} MW`}
                    badge={f.is_primary ? "Primary" : "Backup"} badgeColor={f.is_primary ? "#065f46" : "#92400e"}
                    badgeBg={f.is_primary ? "#d1fae5" : "#fef3c7"} />
                ))}
              </Section>
            )}

            {/* UPSTREAM TRANSFORMERS */}
            {connections.upstream?.length > 0 && (
              <Section title="🔼 Upstream Transformers" color="#7c3aed">
                {connections.upstream.map(t => (
                  <ConnCard key={t.trf_id} title={t.trf_name} sub={`${t.trf_type} • ${t.voltage} • ${t.capacity_kva} KVA`}
                    badge={t.is_primary ? "Primary" : "Backup"} badgeColor={t.is_primary ? "#065f46" : "#92400e"}
                    badgeBg={t.is_primary ? "#d1fae5" : "#fef3c7"} />
                ))}
              </Section>
            )}

            {/* PEERS */}
            {connections.peers?.length > 0 && (
              <Section title="↔️ Peer Transformers (Can Share)" color="#d97706">
                {connections.peers.map(t => (
                  <ConnCard key={t.trf_id} title={t.trf_name} sub={`${t.trf_type} • ${t.voltage}`}
                    badge="Peer" badgeColor="#92400e" badgeBg="#fef3c7" />
                ))}
              </Section>
            )}

            {/* DOWNSTREAM */}
            {connections.downstream?.length > 0 && (
              <Section title="🔽 Downstream Transformers" color="#2563eb">
                {connections.downstream.map(t => (
                  <ConnCard key={t.trf_id} title={t.trf_name} sub={`${t.trf_type} • ${t.voltage} • ${t.capacity_kva} KVA`}
                    badge={t.trf_type === "SM" ? "Consumer" : "Sub"} badgeColor="#1e40af" badgeBg="#dbeafe" />
                ))}
              </Section>
            )}
          </div>
        )}
      </div>

      {/* TABLE */}
      <div style={{ background: "white", borderRadius: 12, border: "1px solid #e5e7eb", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#1e3a5f", color: "white" }}>
              {["Trf ID","Name","City","Lat","Long","Capacity (KVA)","Voltage","Type","Status"].map(h => (
                <th key={h} style={{ padding: "11px 13px", textAlign: "left", fontWeight: 600, fontSize: 12 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: "center", padding: 30, color: "#999" }}>Loading...</td></tr>
            ) : transformers.filter(t => filter === "ALL" || t.trf_type === filter).map((t, i) => {
              const cfg = TYPE_CONFIG[t.trf_type];
              return (
                <tr key={t.trf_id}
                  onClick={() => handleTransformerClick(t)}
                  style={{
                    background: selected?.trf_id === t.trf_id ? "#eff6ff" : i % 2 === 0 ? "#fff" : "#f9fafb",
                    cursor: "pointer"
                  }}
                >
                  <td style={{ padding: "9px 13px", fontWeight: 600, color: "#2563eb" }}>{t.trf_id}</td>
                  <td style={{ padding: "9px 13px" }}>{t.trf_name}</td>
                  <td style={{ padding: "9px 13px" }}>{t.city}</td>
                  <td style={{ padding: "9px 13px", fontFamily: "monospace", fontSize: 11 }}>{t.lat}</td>
                  <td style={{ padding: "9px 13px", fontFamily: "monospace", fontSize: 11 }}>{t.lng}</td>
                  <td style={{ padding: "9px 13px", fontWeight: 600 }}>{t.capacity_kva}</td>
                  <td style={{ padding: "9px 13px" }}>{t.voltage}</td>
                  <td style={{ padding: "9px 13px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                      background: `${cfg.color}22`, color: cfg.color, border: `1px solid ${cfg.color}44` }}>
                      {cfg.emoji} {t.trf_type}
                    </span>
                  </td>
                  <td style={{ padding: "9px 13px" }}>
                    <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 11, fontWeight: 600,
                      background: t.status === "Active" ? "#d1fae5" : "#fee2e2",
                      color: t.status === "Active" ? "#065f46" : "#991b1b" }}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Helper components
function Section({ title, color, children }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{children}</div>
    </div>
  );
}

function ConnCard({ title, sub, badge, badgeColor, badgeBg }) {
  return (
    <div style={{ background: "#f8fafc", borderRadius: 8, padding: "8px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{title}</div>
        <div style={{ fontSize: 11, color: "#6b7280" }}>{sub}</div>
      </div>
      <span style={{ padding: "2px 8px", borderRadius: 99, fontSize: 10, fontWeight: 700, background: badgeBg, color: badgeColor, whiteSpace: "nowrap" }}>
        {badge}
      </span>
    </div>
  );
}
