// frontend/src/pages/TransformerMaster.jsx
import { useEffect, useState, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ── CONFIG ──────────────────────────────────────────────────
const TYPE_CONFIG = {
  L1: { color:"#7c3aed", emoji:"🏭", size:42, label:"L1 (66/33 kV)", minZoom:7  },
  L2: { color:"#2563eb", emoji:"🔌", size:32, label:"L2 (33/11 kV)", minZoom:10 },
  SM: { color:"#059669", emoji:"🏠", size:22, label:"SM (11/.22 kV)", minZoom:13 },
};
const FEEDER_CFG = { color:"#dc2626", emoji:"⚡", size:36, label:"Feeder" };

const LINE_CFG = {
  feeder: { color:"#dc2626", label:"Feeder → L1", weight:2   },
  l1l2:   { color:"#7c3aed", label:"L1 → L2",    weight:1.5 },
  l2sm:   { color:"#059669", label:"L2 → SM",     weight:1   },
  peer:   { color:"#f59e0b", label:"Peer Share",  weight:2   },
};

function makeIcon(color, emoji, size, isSelected=false) {
  const s = isSelected ? size+10 : size;
  const border = isSelected ? "4px solid #fbbf24" : "3px solid white";
  return L.divIcon({
    className:"",
    html:`<div style="background:${color};width:${s}px;height:${s}px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${Math.round(s*0.42)}px;border:${border};box-shadow:0 2px 10px rgba(0,0,0,0.35);">${emoji}</div>`,
    iconSize:[s,s], iconAnchor:[s/2,s/2], popupAnchor:[0,-s/2],
  });
}

// Hook to track zoom level inside map
function ZoomWatcher({ onZoom }) {
  useMapEvents({ zoomend:(e) => onZoom(e.target.getZoom()) });
  return null;
}

const API = "http://localhost:5000/api";

// ── MAIN COMPONENT ───────────────────────────────────────────
export default function TransformerMaster() {
  const [transformers, setTransformers] = useState([]);
  const [feeders,      setFeeders]      = useState([]);
  const [allLinks,     setAllLinks]     = useState({ feederLinks:[], trfLinks:[] });
  const [selected,     setSelected]     = useState(null);
  const [connections,  setConnections]  = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [zoom,         setZoom]         = useState(7);

  // Layer toggles
  const [layers, setLayers] = useState({
    feeders:    true,
    L1:         true,
    L2:         true,
    SM:         false,
    lineFeeder: true,
    lineL1L2:   true,
    lineL2SM:   false,
    linePeer:   true,
});

  const toggleLayer = (key) => setLayers(p => ({ ...p, [key]: !p[key] }));

  // Table filter
  const [tableFilter, setTableFilter] = useState("ALL");

  useEffect(() => {
    Promise.all([
      fetch(`${API}/transformers`).then(r=>r.json()),
      fetch(`${API}/feeders`).then(r=>r.json()),
      fetch(`${API}/transformers/links/all`).then(r=>r.json()),
    ]).then(([trfs,fds,links]) => {
      setTransformers(Array.isArray(trfs)?trfs:[]);
      setFeeders(Array.isArray(fds)?fds:[]);
      setAllLinks(links||{feederLinks:[],trfLinks:[]});
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);

  const handleClick = async (item, isFeeder=false) => {
    if(isFeeder) { setSelected({...item, _isFeeder:true}); setConnections(null); return; }
    setSelected(item);
    const res  = await fetch(`${API}/transformers/${item.trf_id}/connections`);
    const data = await res.json();
    setConnections(data);
  };

  // Zoom-aware visibility
  const visible = {
    feeders:    layers.feeders,
    L1:         layers.L1  && zoom >= 7,
    L2:         layers.L2  && zoom >= 10,
    SM:         layers.SM  && zoom >= 13,
    lineFeeder: layers.lineFeeder,
    lineL1L2:   layers.lineL1L2  && zoom >= 8,
    lineL2SM:   layers.lineL2SM  && zoom >= 12,
    linePeer:   layers.linePeer,
};

  const counts = {
    L1: transformers.filter(t=>t.trf_type==="L1").length,
    L2: transformers.filter(t=>t.trf_type==="L2").length,
    SM: transformers.filter(t=>t.trf_type==="SM").length,
  };

  // Full UP + Varanasi bounds to show everything
const mapBounds  = [[23.0,74.5],[31.5,87.5]];  const mapCenter  = [26.5, 82.5];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 57px)", overflow:"hidden", background:"#f1f5f9" }}>

      {/* ── HEADER ── */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 20px", background:"white", borderBottom:"1px solid #e5e7eb", flexShrink:0 }}>
        <div>
          <h2 style={{ margin:0, fontSize:18, fontWeight:700, color:"#1a1a2e" }}>🔌 Transformer Master</h2>
          <p style={{ margin:0, color:"#666", fontSize:11 }}>
            {feeders.length} feeders • {transformers.length} transformers • Zoom in to reveal layers
          </p>
        </div>

        {/* TABLE FILTER */}
        <div style={{ display:"flex", gap:6 }}>
          {["ALL","L1","L2","SM"].map(f=>(
            <button key={f} onClick={()=>setTableFilter(f)} style={{
              padding:"5px 13px", borderRadius:20, border:"2px solid #1e3a5f",
              cursor:"pointer", fontWeight:600, fontSize:11,
              background: tableFilter===f?"#1e3a5f":"white",
              color: tableFilter===f?"white":"#1e3a5f",
            }}>
              {f} ({f==="ALL"?transformers.length:counts[f]})
            </button>
          ))}
        </div>
      </div>

      {/* ── TOP: MAP + DETAIL PANEL ── */}
      <div style={{ display:"flex", flex:"0 0 58%", borderBottom:"2px solid #e5e7eb", overflow:"hidden", position:"relative" }}>

        {/* MAP */}
        <div style={{ flex: selected?"0 0 60%":"1", transition:"flex 0.3s ease", position:"relative" }}>
          <MapContainer
            center={mapCenter} zoom={7} minZoom={6} maxZoom={16}
            maxBounds={mapBounds} maxBoundsViscosity={0.8}
            style={{ height:"100%", width:"100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap'/>
            <ZoomWatcher onZoom={setZoom}/>

            {/* ── FEEDER → L1 LINES ── */}
            {visible.lineFeeder && allLinks.feederLinks?.map((l,i)=>(
              <Polyline key={`fl-${i}`}
                positions={[[l.source_lat,l.source_lng],[l.target_lat,l.target_lng]]}
                color={LINE_CFG.feeder.color} weight={l.is_primary?2.5:1.5}
                dashArray={l.is_primary?null:"7,5"} opacity={0.65}/>
            ))}

            {/* ── L1→L2 and PEER LINES ── */}
            {allLinks.trfLinks?.map((l,i)=>{
              if(l.link_type==="peer" && !visible.linePeer) return null;
              if(l.link_type==="upstream"){
                if(l.source_type==="L1" && l.target_type==="L2" && !visible.lineL1L2) return null;
                if(l.source_type==="L2" && l.target_type==="SM" && !visible.lineL2SM) return null;
              }
              const color = l.link_type==="peer"
                ? LINE_CFG.peer.color
                : l.source_type==="L2"
                  ? LINE_CFG.l2sm.color
                  : LINE_CFG.l1l2.color;
              return (
                <Polyline key={`tl-${i}`}
                  positions={[[l.source_lat,l.source_lng],[l.target_lat,l.target_lng]]}
                  color={color} weight={l.is_primary?2:1.2}
                  dashArray={l.is_primary?null:"5,4"} opacity={0.5}/>
              );
            })}

            {/* ── FEEDER MARKERS ── */}
            {visible.feeders && feeders.map(f=>(
              <Marker key={f.feeder_id} position={[f.lat,f.lng]}
                icon={makeIcon(FEEDER_CFG.color, FEEDER_CFG.emoji, FEEDER_CFG.size, selected?.feeder_id===f.feeder_id)}
                eventHandlers={{ click:()=>handleClick(f,true) }}>
                <Tooltip direction="top" offset={[0,-20]}>
                  <b>⚡ {f.feeder_name}</b><br/>{f.feeder_type} • {f.capacity_mw} MW<br/>{f.state}
                </Tooltip>
              </Marker>
            ))}

            {/* ── TRANSFORMER MARKERS ── */}
            {transformers.map(t=>{
              const cfg = TYPE_CONFIG[t.trf_type];
              if(!visible[t.trf_type]) return null;
              return (
                <Marker key={t.trf_id} position={[t.lat,t.lng]}
                  icon={makeIcon(cfg.color, cfg.emoji, cfg.size, selected?.trf_id===t.trf_id)}
                  eventHandlers={{ click:()=>handleClick(t) }}>
                  <Tooltip direction="top" offset={[0,-cfg.size/2]}>
                    <b>{cfg.emoji} {t.trf_name}</b><br/>
                    {t.trf_type} • {t.voltage} • {t.capacity_kva} KVA
                  </Tooltip>
                </Marker>
              );
            })}
          </MapContainer>

          {/* ── LAYER CONTROL BOX ── */}
          <div style={{
            position:"absolute", top:12, right:12, zIndex:1000,
            background:"white", borderRadius:12, padding:"12px 14px",
            boxShadow:"0 4px 16px rgba(0,0,0,0.15)", minWidth:190,
            border:"1px solid #e5e7eb"
          }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#1a1a2e", marginBottom:10, textTransform:"uppercase", letterSpacing:0.8 }}>
              🗂️ Map Layers
            </div>

            {/* MARKERS section */}
            <div style={{ fontSize:10, fontWeight:700, color:"#9ca3af", marginBottom:5, textTransform:"uppercase" }}>Markers</div>
            {[
              { key:"feeders", color:FEEDER_CFG.color,         emoji:"⚡", label:"Feeders",          hint:null },
              { key:"L1",      color:TYPE_CONFIG.L1.color,     emoji:"🏭", label:"L1 Transformers",  hint:"zoom 7+" },
              { key:"L2",      color:TYPE_CONFIG.L2.color,     emoji:"🔌", label:"L2 Transformers",  hint:"zoom 11+" },
              { key:"SM",      color:TYPE_CONFIG.SM.color,     emoji:"🏠", label:"Smart Meters",     hint:"zoom 13+" },
            ].map(({key,color,emoji,label,hint})=>(
              <LayerToggle key={key} checked={layers[key]} onChange={()=>toggleLayer(key)}
                color={color} emoji={emoji} label={label} hint={hint}
                active={visible[key]} />
            ))}

            {/* LINES section */}
            <div style={{ fontSize:10, fontWeight:700, color:"#9ca3af", marginBottom:5, marginTop:10, textTransform:"uppercase" }}>Connection Lines</div>
            {[
              { key:"lineFeeder", color:LINE_CFG.feeder.color, label:"Feeder → L1",  hint:null      },
              { key:"lineL1L2",   color:LINE_CFG.l1l2.color,   label:"L1 → L2",      hint:"zoom 9+" },
              { key:"lineL2SM",   color:LINE_CFG.l2sm.color,   label:"L2 → SM",      hint:"zoom 12+"},
              { key:"linePeer",   color:LINE_CFG.peer.color,   label:"Peer Share",   hint:null      },
            ].map(({key,color,label,hint})=>(
              <LayerToggle key={key} checked={layers[key]} onChange={()=>toggleLayer(key)}
                color={color} emoji="—" label={label} hint={hint}
                active={visible[key]} isLine />
            ))}

            {/* Zoom indicator */}
            <div style={{ marginTop:10, padding:"5px 8px", background:"#f8fafc", borderRadius:7, fontSize:10, color:"#6b7280", textAlign:"center" }}>
              Current zoom: <b style={{ color:"#1a1a2e" }}>{zoom}</b>
            </div>
          </div>

          {/* Hint */}
          {!selected && (
            <div style={{ position:"absolute", bottom:12, left:"50%", transform:"translateX(-50%)", background:"rgba(0,0,0,0.65)", color:"white", padding:"5px 16px", borderRadius:20, fontSize:11, pointerEvents:"none", zIndex:999, whiteSpace:"nowrap" }}>
              👆 Click any feeder or transformer to see details
            </div>
          )}
        </div>

        {/* ── DETAIL PANEL ── */}
        {selected && (
          <div style={{ flex:"0 0 40%", background:"white", overflowY:"auto", borderLeft:`4px solid ${selected._isFeeder ? FEEDER_CFG.color : TYPE_CONFIG[selected.trf_type]?.color}`, display:"flex", flexDirection:"column" }}>

            {/* Header */}
            <div style={{ padding:"14px 16px", background: selected._isFeeder ? FEEDER_CFG.color : TYPE_CONFIG[selected.trf_type]?.color, display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
              <div style={{ color:"white" }}>
                <div style={{ fontSize:22 }}>{selected._isFeeder ? "⚡" : TYPE_CONFIG[selected.trf_type]?.emoji}</div>
                <div style={{ fontWeight:700, fontSize:15, marginTop:4 }}>
                  {selected._isFeeder ? selected.feeder_name : selected.trf_name}
                </div>
                <div style={{ fontSize:11, opacity:0.85, marginTop:2 }}>
                  ID: {selected._isFeeder ? selected.feeder_id : selected.trf_id}
                </div>
              </div>
              <button onClick={()=>{setSelected(null);setConnections(null);}}
                style={{ background:"rgba(255,255,255,0.25)", border:"none", color:"white", width:28, height:28, borderRadius:"50%", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
            </div>

            {/* Status */}
            <div style={{ padding:"8px 16px", borderBottom:"1px solid #f1f5f9" }}>
              <span style={{ padding:"3px 12px", borderRadius:99, fontSize:11, fontWeight:700, background: selected.status==="Active"?"#d1fae5":"#fee2e2", color: selected.status==="Active"?"#065f46":"#991b1b" }}>
                ● {selected.status}
              </span>
            </div>

            {/* Fields */}
            <div style={{ padding:"12px 16px", display:"flex", flexDirection:"column", gap:6 }}>
              {(selected._isFeeder ? [
                { icon:"🏷️", label:"Feeder ID",  value: selected.feeder_id },
                { icon:"⚡",  label:"Type",       value: selected.feeder_type },
                { icon:"🗺️", label:"State",       value: selected.state },
                { icon:"🏙️", label:"City",        value: selected.city },
                { icon:"🔋", label:"Capacity",    value: `${selected.capacity_mw} MW` },
                { icon:"📍", label:"Coordinates", value: `${selected.lat}, ${selected.lng}` },
              ] : [
                { icon:"🏷️", label:"Trf ID",     value: selected.trf_id },
                { icon:"🔌", label:"Type",        value: selected.trf_type },
                { icon:"⚡",  label:"Voltage",    value: selected.voltage },
                { icon:"🔋", label:"Capacity",    value: `${selected.capacity_kva} KVA` },
                { icon:"🏙️", label:"City",        value: selected.city },
                { icon:"📍", label:"Coordinates", value: `${selected.lat}, ${selected.lng}` },
              ]).map(({icon,label,value})=>(
                <div key={label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 10px", background:"#f8fafc", borderRadius:7 }}>
                  <span style={{ fontSize:11, color:"#6b7280", fontWeight:600 }}>{icon} {label}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:"#1a1a2e" }}>{value}</span>
                </div>
              ))}
            </div>

            {/* Connections (transformer only) */}
            {!selected._isFeeder && connections && (<>
              {connections.feeders?.length > 0 && (
                <PanelSection title="⚡ Upstream Feeders" color="#dc2626">
                  {connections.feeders.map(f=>(
                    <ConnCard key={f.feeder_id} title={f.feeder_name}
                      sub={`${f.feeder_type} • ${f.capacity_mw} MW • ${f.state}`}
                      badge={f.is_primary?"Primary":"Backup"}
                      badgeBg={f.is_primary?"#d1fae5":"#fef3c7"}
                      badgeColor={f.is_primary?"#065f46":"#92400e"} />
                  ))}
                </PanelSection>
              )}
              {connections.upstream?.length > 0 && (
                <PanelSection title="🔼 Upstream Transformers" color="#7c3aed">
                  {connections.upstream.map(t=>(
                    <ConnCard key={t.trf_id} title={t.trf_name}
                      sub={`${t.trf_type} • ${t.voltage} • ${t.capacity_kva} KVA`}
                      badge={t.is_primary?"Primary":"Backup"}
                      badgeBg={t.is_primary?"#d1fae5":"#fef3c7"}
                      badgeColor={t.is_primary?"#065f46":"#92400e"} />
                  ))}
                </PanelSection>
              )}
              {connections.peers?.length > 0 && (
                <PanelSection title="↔️ Peer (Power Sharing)" color="#d97706">
                  {connections.peers.map(t=>(
                    <ConnCard key={t.trf_id} title={t.trf_name}
                      sub={`${t.trf_type} • ${t.voltage}`}
                      badge="Peer Share" badgeBg="#fef3c7" badgeColor="#92400e" />
                  ))}
                </PanelSection>
              )}
              {connections.downstream?.length > 0 && (
                <PanelSection title="🔽 Downstream Transformers" color="#2563eb">
                  {connections.downstream.map(t=>(
                    <ConnCard key={t.trf_id} title={t.trf_name}
                      sub={`${t.trf_type} • ${t.voltage} • ${t.capacity_kva} KVA`}
                      badge={t.trf_type==="SM"?"Consumer":"Sub"}
                      badgeBg="#dbeafe" badgeColor="#1e40af" />
                  ))}
                </PanelSection>
              )}
            </>)}

            {/* Feeder — show which L1s it connects to */}
            {selected._isFeeder && (
              <PanelSection title="🔌 Connected L1 Transformers" color="#7c3aed">
                {transformers.filter(t=>t.trf_type==="L1").map(t=>{
                  const link = allLinks.feederLinks?.find(l=>l.source===selected.feeder_id && l.target===t.trf_id);
                  if(!link) return null;
                  return (
                    <ConnCard key={t.trf_id} title={t.trf_name}
                      sub={`L1 • ${t.voltage} • ${t.capacity_kva} KVA`}
                      badge={link.is_primary?"Primary":"Backup"}
                      badgeBg={link.is_primary?"#d1fae5":"#fef3c7"}
                      badgeColor={link.is_primary?"#065f46":"#92400e"} />
                  );
                })}
              </PanelSection>
            )}

            <div style={{ height:16 }}/>
          </div>
        )}
      </div>

      {/* ── BOTTOM: TABLE ── */}
      <div style={{ flex:1, overflow:"auto", background:"white" }}>
        <div style={{ padding:"8px 20px", background:"#f8fafc", borderBottom:"1px solid #e5e7eb", display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, zIndex:10 }}>
          <span style={{ fontWeight:700, fontSize:12, color:"#1a1a2e" }}>
            📋 Transformer List ({transformers.filter(t=>tableFilter==="ALL"||t.trf_type===tableFilter).length})
          </span>
          <span style={{ fontSize:11, color:"#9ca3af" }}>Click row to see connections</span>
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
          <thead>
            <tr style={{ background:"#1e3a5f", color:"white", position:"sticky", top:37 }}>
              {["Trf ID","Name","City","Latitude","Longitude","Capacity (KVA)","Voltage","Type","Status"].map(h=>(
                <th key={h} style={{ padding:"9px 13px", textAlign:"left", fontWeight:600, fontSize:11, whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign:"center", padding:24, color:"#999" }}>Loading...</td></tr>
            ) : transformers.filter(t=>tableFilter==="ALL"||t.trf_type===tableFilter).map((t,i)=>{
              const cfg = TYPE_CONFIG[t.trf_type];
              return (
                <tr key={t.trf_id} onClick={()=>handleClick(t)} style={{
                  background: selected?.trf_id===t.trf_id ? `${cfg.color}15` : i%2===0?"#fff":"#f9fafb",
                  cursor:"pointer",
                  borderLeft: selected?.trf_id===t.trf_id ? `4px solid ${cfg.color}` : "4px solid transparent",
                  transition:"all 0.15s"
                }}>
                  <td style={{ padding:"8px 13px", fontWeight:700, color:"#2563eb" }}>{t.trf_id}</td>
                  <td style={{ padding:"8px 13px", fontWeight:500 }}>{t.trf_name}</td>
                  <td style={{ padding:"8px 13px", color:"#555" }}>{t.city}</td>
                  <td style={{ padding:"8px 13px", fontFamily:"monospace", fontSize:11, color:"#777" }}>{t.lat}</td>
                  <td style={{ padding:"8px 13px", fontFamily:"monospace", fontSize:11, color:"#777" }}>{t.lng}</td>
                  <td style={{ padding:"8px 13px", fontWeight:700 }}>{t.capacity_kva}</td>
                  <td style={{ padding:"8px 13px" }}>{t.voltage}</td>
                  <td style={{ padding:"8px 13px" }}>
                    <span style={{ padding:"2px 9px", borderRadius:99, fontSize:11, fontWeight:700, background:`${cfg.color}22`, color:cfg.color, border:`1px solid ${cfg.color}55` }}>
                      {cfg.emoji} {t.trf_type}
                    </span>
                  </td>
                  <td style={{ padding:"8px 13px" }}>
                    <span style={{ padding:"2px 9px", borderRadius:99, fontSize:11, fontWeight:700, background: t.status==="Active"?"#d1fae5":"#fee2e2", color: t.status==="Active"?"#065f46":"#991b1b" }}>
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

// ── HELPER COMPONENTS ────────────────────────────────────────

function LayerToggle({ checked, onChange, color, emoji, label, hint, active, isLine }) {
  return (
    <label style={{ display:"flex", alignItems:"center", gap:8, padding:"4px 0", cursor:"pointer", opacity: checked ? 1 : 0.45 }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ cursor:"pointer", width:13, height:13 }}/>
      {isLine ? (
        <span style={{ display:"inline-block", width:18, height:3, background:color, borderRadius:2 }}/>
      ) : (
        <span style={{ display:"inline-block", width:14, height:14, borderRadius:"50%", background:color, fontSize:9, textAlign:"center", lineHeight:"14px" }}>{emoji}</span>
      )}
      <span style={{ fontSize:11, color:"#374151", fontWeight:500, flex:1 }}>{label}</span>
      {hint && (
        <span style={{ fontSize:9, color: active ? "#059669" : "#9ca3af", fontWeight:600, background: active?"#d1fae5":"#f3f4f6", padding:"1px 5px", borderRadius:99 }}>
          {active ? "ON" : hint}
        </span>
      )}
    </label>
  );
}

function PanelSection({ title, color, children }) {
  return (
    <div style={{ padding:"0 16px 10px" }}>
      <div style={{ fontSize:11, fontWeight:700, color, marginBottom:6, textTransform:"uppercase", letterSpacing:0.5 }}>{title}</div>
      <div style={{ display:"flex", flexDirection:"column", gap:5 }}>{children}</div>
    </div>
  );
}

function ConnCard({ title, sub, badge, badgeBg, badgeColor }) {
  return (
    <div style={{ background:"#f8fafc", borderRadius:7, padding:"7px 10px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <div>
        <div style={{ fontSize:12, fontWeight:600, color:"#1a1a2e" }}>{title}</div>
        <div style={{ fontSize:10, color:"#6b7280", marginTop:1 }}>{sub}</div>
      </div>
      <span style={{ padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700, background:badgeBg, color:badgeColor, whiteSpace:"nowrap", marginLeft:8 }}>
        {badge}
      </span>
    </div>
  );
}