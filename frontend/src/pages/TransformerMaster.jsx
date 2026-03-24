// frontend/src/pages/TransformerMaster.jsx
import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const TYPE_CONFIG = {
  L1: { color:"#7c3aed", emoji:"🏭", size:40, label:"L1 (66/33 kV)", minZoom:7,  autoZoom:8  },
  L2: { color:"#2563eb", emoji:"🔌", size:30, label:"L2 (33/11 kV)", minZoom:10, autoZoom:11 },
  SM: { color:"#059669", emoji:"🏠", size:20, label:"SM (11/.22 kV)", minZoom:13, autoZoom:13 },
};
const FEEDER_CFG = { color:"#dc2626", emoji:"⚡", size:34 };
const LINE_CFG = {
  feeder: { color:"#dc2626", label:"Feeder → L1" },
  l1l2:   { color:"#7c3aed", label:"L1 → L2" },
  l2sm:   { color:"#059669", label:"L2 → SM" },
  peer:   { color:"#f59e0b", label:"Peer Share" },
};
const LAYER_VIEW = {
  feeders:    { zoom:7,  center:[26.5,82.5] },
  L1:         { zoom:10, center:[25.32,82.97] },
  L2:         { zoom:12, center:[25.32,82.97] },
  SM:         { zoom:14, center:[25.32,82.97] },
  lineFeeder: { zoom:7,  center:[26.5,82.5] },
  lineL1L2:   { zoom:11, center:[25.32,82.97] },
  lineL2SM:   { zoom:13, center:[25.32,82.97] },
  linePeer:   { zoom:12, center:[25.32,82.97] },
};

function makeIcon(color, emoji, size, isSelected=false) {
  const s = isSelected ? size+8 : size;
  const border = isSelected ? "4px solid #fbbf24" : "2px solid white";
  return L.divIcon({
    className:"",
    html:`<div style="background:${color};width:${s}px;height:${s}px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${Math.round(s*0.42)}px;border:${border};box-shadow:0 2px 8px rgba(0,0,0,0.3);">${emoji}</div>`,
    iconSize:[s,s], iconAnchor:[s/2,s/2],
  });
}

function ZoomWatcher({ onZoom }) {
  useMapEvents({ zoomend:(e)=>onZoom(e.target.getZoom()) });
  return null;
}
function MapController({ mapRef }) {
  const map = useMapEvents({});
  useEffect(()=>{ mapRef.current = map; },[map]);
  return null;
}

const API = "/api";

export default function TransformerMaster({ onDoubleClick }) {
  const [transformers, setTransformers] = useState([]);
  const [feeders,      setFeeders]      = useState([]);
  const [allLinks,     setAllLinks]     = useState({ feederLinks:[], trfLinks:[] });
  const [selected,     setSelected]     = useState(null);
  const [connections,  setConnections]  = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [zoom,         setZoom]         = useState(7);
  const [tableFilter,  setTableFilter]  = useState("ALL");
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const mapRef    = useRef(null);
  const clickTimer = useRef(null); // ← key: timer to distinguish single vs double click

  const [layers, setLayers] = useState({
    feeders:true, L1:true, L2:true, SM:false,
    lineFeeder:true, lineL1L2:true, lineL2SM:false, linePeer:true,
  });

  const toggleLayer = (key) => {
    const next = { ...layers, [key]: !layers[key] };
    setLayers(next);
    if(!layers[key] && LAYER_VIEW[key] && mapRef.current) {
      const { zoom:z, center:c } = LAYER_VIEW[key];
      mapRef.current.flyTo(c, z, { animate:true, duration:1.2 });
    }
  };

  const visible = {
    feeders:    layers.feeders,
    L1:         layers.L1     && zoom >= 7,
    L2:         layers.L2     && zoom >= 10,
    SM:         layers.SM     && zoom >= 13,
    lineFeeder: layers.lineFeeder,
    lineL1L2:   layers.lineL1L2 && zoom >= 8,
    lineL2SM:   layers.lineL2SM && zoom >= 12,
    linePeer:   layers.linePeer && zoom >= 10,
  };

  useEffect(()=>{
    Promise.all([
      fetch(`${API}/transformers`).then(r=>r.json()),
      fetch(`${API}/feeders`).then(r=>r.json()),
      fetch(`${API}/transformers/links/all`).then(r=>r.json()),
    ]).then(([trfs,fds,links])=>{
      setTransformers(Array.isArray(trfs)?trfs:[]);
      setFeeders(Array.isArray(fds)?fds:[]);
      setAllLinks(links||{feederLinks:[],trfLinks:[]});
      setLoading(false);
    }).catch(()=>setLoading(false));
  },[]);

  // ── SINGLE CLICK → open drawer ──────────────────────────────────────────
  const handleSingleClick = async (item, isFeeder=false) => {
    if(isFeeder){
      setSelected({...item, _isFeeder:true});
      setConnections(null);
      setDrawerOpen(true);
      if(mapRef.current) mapRef.current.flyTo([item.lat, item.lng], 9, { animate:true, duration:1 });
      return;
    }
    setSelected(item);
    setDrawerOpen(true);
    if(mapRef.current) {
      const z = item.trf_type==="L1"?11 : item.trf_type==="L2"?13 : 15;
      mapRef.current.flyTo([item.lat, item.lng], z, { animate:true, duration:1 });
    }
    const res  = await fetch(`${API}/transformers/${item.trf_id}/connections`);
    const data = await res.json();
    setConnections(data);
  };

  // ── SMART CLICK HANDLER (waits 250ms to see if double click follows) ────
  const handleMarkerClick = (item, isFeeder=false) => {
    if(isFeeder) { handleSingleClick(item, true); return; } // feeders: single click only
    if(clickTimer.current) {
      // Second click came within 250ms → it's a DOUBLE CLICK
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      if(onDoubleClick) onDoubleClick(item.trf_id);
    } else {
      // First click — wait 250ms to see if another click follows
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        handleSingleClick(item); // no second click came → single click
      }, 250);
    }
  };

  // ── TABLE ROW CLICK (same logic) ────────────────────────────────────────
  const handleTableClick = (t) => {
    if(clickTimer.current) {
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      if(onDoubleClick) onDoubleClick(t.trf_id);
    } else {
      clickTimer.current = setTimeout(() => {
        clickTimer.current = null;
        handleSingleClick(t);
      }, 250);
    }
  };

  const counts = {
    L1: transformers.filter(t=>t.trf_type==="L1").length,
    L2: transformers.filter(t=>t.trf_type==="L2").length,
    SM: transformers.filter(t=>t.trf_type==="SM").length,
  };

  const panelColor = selected
    ? (selected._isFeeder ? FEEDER_CFG.color : TYPE_CONFIG[selected.trf_type]?.color)
    : "#1e3a5f";

  const mapBounds = [[23.0,74.5],[31.5,87.5]];
  const mapCenter = [26.5,82.5];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 57px)", overflow:"hidden", background:"#f1f5f9" }}>

      {/* HEADER */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 16px", background:"white", borderBottom:"1px solid #e5e7eb", flexShrink:0 }}>
        <div>
          <h2 style={{ margin:0, fontSize:16, fontWeight:700, color:"#1a1a2e" }}>🔌 Transformer Master</h2>
          <p style={{ margin:0, color:"#888", fontSize:10 }}>{feeders.length} feeders • {transformers.length} transformers • Click for details • Double-click for full view</p>
        </div>
        <div style={{ display:"flex", gap:5 }}>
          {["ALL","L1","L2","SM"].map(f=>(
            <button key={f} onClick={()=>setTableFilter(f)} style={{
              padding:"4px 11px", borderRadius:20, border:"2px solid #1e3a5f",
              cursor:"pointer", fontWeight:600, fontSize:11,
              background:tableFilter===f?"#1e3a5f":"white",
              color:tableFilter===f?"white":"#1e3a5f",
            }}>
              {f} ({f==="ALL"?transformers.length:counts[f]})
            </button>
          ))}
        </div>
      </div>

      {/* MAP + DRAWER ROW */}
      <div style={{ flex:1, display:"flex", overflow:"hidden", position:"relative" }}>

        {/* MAP */}
        <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
          <MapContainer
            center={mapCenter} zoom={7} minZoom={6} maxZoom={16}
            maxBounds={mapBounds} maxBoundsViscosity={0.8}
            style={{ height:"100%", width:"100%" }}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap'/>
            <ZoomWatcher onZoom={setZoom}/>
            <MapController mapRef={mapRef}/>

            {visible.lineFeeder && allLinks.feederLinks?.map((l,i)=>(
              <Polyline key={`fl-${i}`}
                positions={[[l.source_lat,l.source_lng],[l.target_lat,l.target_lng]]}
                color={LINE_CFG.feeder.color} weight={l.is_primary?2.5:1.5}
                dashArray={l.is_primary?null:"7,5"} opacity={0.65}/>
            ))}

            {allLinks.trfLinks?.map((l,i)=>{
              if(l.link_type==="peer" && !visible.linePeer) return null;
              if(l.link_type==="upstream"){
                if(l.source_type==="L1"&&l.target_type==="L2"&&!visible.lineL1L2) return null;
                if(l.source_type==="L2"&&l.target_type==="SM"&&!visible.lineL2SM) return null;
              }
              const color = l.link_type==="peer" ? LINE_CFG.peer.color
                : l.source_type==="L2" ? LINE_CFG.l2sm.color : LINE_CFG.l1l2.color;
              return (
                <Polyline key={`tl-${i}`}
                  positions={[[l.source_lat,l.source_lng],[l.target_lat,l.target_lng]]}
                  color={color} weight={l.is_primary?2:1.2}
                  dashArray={l.is_primary?null:"5,4"} opacity={0.55}/>
              );
            })}

            {visible.feeders && feeders.map(f=>(
              <Marker key={f.feeder_id} position={[f.lat,f.lng]}
                icon={makeIcon(FEEDER_CFG.color,FEEDER_CFG.emoji,FEEDER_CFG.size,selected?.feeder_id===f.feeder_id)}
                eventHandlers={{ click:()=>handleMarkerClick(f,true) }}>
                <Tooltip direction="top" offset={[0,-18]}>
                  <b>⚡ {f.feeder_name}</b><br/>{f.feeder_type} • {f.capacity_mw} MW
                </Tooltip>
              </Marker>
            ))}

            {transformers.map(t=>{
              const cfg = TYPE_CONFIG[t.trf_type];
              if(!visible[t.trf_type]) return null;
              return (
                <Marker key={t.trf_id} position={[t.lat,t.lng]}
                  icon={makeIcon(cfg.color,cfg.emoji,cfg.size,selected?.trf_id===t.trf_id)}
                  eventHandlers={{ click:()=>handleMarkerClick(t) }}>
                  <Tooltip direction="top" offset={[0,-cfg.size/2]}>
                    <b>{cfg.emoji} {t.trf_name}</b><br/>
                    {t.trf_type} • {t.voltage}<br/>
                    <span style={{fontSize:10,color:"#888"}}>Double-click → full detail</span>
                  </Tooltip>
                </Marker>
              );
            })}
          </MapContainer>

          {/* LAYER CONTROL */}
          <div style={{
            position:"absolute", top:10, left:10, zIndex:1000,
            background:"rgba(255,255,255,0.97)", borderRadius:10, padding:"10px 12px",
            boxShadow:"0 4px 16px rgba(0,0,0,0.15)", border:"1px solid #e5e7eb", minWidth:175,
          }}>
            <div style={{ fontSize:10, fontWeight:700, color:"#1a1a2e", marginBottom:7, textTransform:"uppercase", letterSpacing:0.8 }}>🗂️ Map Layers</div>
            <div style={{ fontSize:9, fontWeight:700, color:"#9ca3af", marginBottom:4, textTransform:"uppercase" }}>Markers</div>
            {[
              { key:"feeders", color:FEEDER_CFG.color,     emoji:"⚡", label:"Feeders",         hint:null },
              { key:"L1",      color:TYPE_CONFIG.L1.color, emoji:"🏭", label:"L1 Transformers", hint:"zoom 7+"  },
              { key:"L2",      color:TYPE_CONFIG.L2.color, emoji:"🔌", label:"L2 Transformers", hint:"zoom 10+" },
              { key:"SM",      color:TYPE_CONFIG.SM.color, emoji:"🏠", label:"Smart Meters",    hint:"zoom 13+" },
            ].map(({key,color,emoji,label,hint})=>(
              <LayerRow key={key} checked={layers[key]} onChange={()=>toggleLayer(key)}
                color={color} emoji={emoji} label={label} hint={hint} active={visible[key]}/>
            ))}
            <div style={{ fontSize:9, fontWeight:700, color:"#9ca3af", marginTop:8, marginBottom:4, textTransform:"uppercase" }}>Lines</div>
            {[
              { key:"lineFeeder", color:LINE_CFG.feeder.color, label:"Feeder → L1", hint:null       },
              { key:"lineL1L2",   color:LINE_CFG.l1l2.color,   label:"L1 → L2",    hint:"zoom 8+"  },
              { key:"lineL2SM",   color:LINE_CFG.l2sm.color,   label:"L2 → SM",    hint:"zoom 12+" },
              { key:"linePeer",   color:LINE_CFG.peer.color,   label:"Peer Share",  hint:"zoom 10+" },
            ].map(({key,color,label,hint})=>(
              <LayerRow key={key} checked={layers[key]} onChange={()=>toggleLayer(key)}
                color={color} label={label} hint={hint} active={visible[key]} isLine/>
            ))}
            <div style={{ marginTop:7, padding:"3px 7px", background:"#f1f5f9", borderRadius:6, fontSize:9, color:"#6b7280", textAlign:"center" }}>
              Zoom: <b style={{color:"#1a1a2e"}}>{zoom}</b>
            </div>
          </div>

          {/* Hint */}
          {!selected && (
            <div style={{ position:"absolute", bottom:10, left:"50%", transform:"translateX(-50%)", background:"rgba(0,0,0,0.6)", color:"white", padding:"4px 14px", borderRadius:20, fontSize:10, pointerEvents:"none", zIndex:999, whiteSpace:"nowrap" }}>
              👆 Click for details • Double-click for full detail page
            </div>
          )}
        </div>

        {/* ── SIDE DRAWER ── */}
        {selected && (
          <>
            <button
              onClick={()=>setDrawerOpen(o=>!o)}
              style={{
                position:"absolute", right: drawerOpen ? 299 : -1, top:"50%",
                transform:"translateY(-50%)", zIndex:1100, width:20, height:56,
                background:panelColor, border:"none", borderRadius:"8px 0 0 8px",
                cursor:"pointer", color:"white", fontSize:14, fontWeight:900,
                display:"flex", alignItems:"center", justifyContent:"center",
                boxShadow:"-3px 0 10px rgba(0,0,0,0.2)", transition:"right 0.3s ease",
              }}
            >
              {drawerOpen ? "›" : "‹"}
            </button>

            <div style={{
              width: drawerOpen ? 300 : 0, minWidth: drawerOpen ? 300 : 0,
              transition:"width 0.3s ease, min-width 0.3s ease",
              overflow:"hidden", background:"white",
              borderLeft:`4px solid ${panelColor}`,
              display:"flex", flexDirection:"column",
              boxShadow:"-4px 0 16px rgba(0,0,0,0.1)", flexShrink:0,
            }}>
              <div style={{ width:300, display:"flex", flexDirection:"column", height:"100%", overflowY:"auto" }}>

                <div style={{ background:panelColor, padding:"12px 14px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexShrink:0 }}>
                  <div style={{ color:"white" }}>
                    <div style={{ fontSize:20 }}>{selected._isFeeder ? "⚡" : TYPE_CONFIG[selected.trf_type]?.emoji}</div>
                    <div style={{ fontWeight:700, fontSize:14, marginTop:3, lineHeight:1.2 }}>
                      {selected._isFeeder ? selected.feeder_name : selected.trf_name}
                    </div>
                    <div style={{ fontSize:10, opacity:0.8, marginTop:2 }}>
                      {selected._isFeeder ? selected.feeder_id : selected.trf_id} • {selected._isFeeder ? "Feeder" : selected.trf_type}
                    </div>
                  </div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6, alignItems:"flex-end" }}>
                    <button
                      onClick={()=>{ setSelected(null); setConnections(null); setDrawerOpen(false); }}
                      style={{ background:"rgba(255,255,255,0.25)", border:"none", color:"white", width:26, height:26, borderRadius:"50%", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}
                    >✕</button>
                    {/* Full detail button — only for transformers */}
                    {!selected._isFeeder && onDoubleClick && (
                      <button
                        onClick={()=>onDoubleClick(selected.trf_id)}
                        style={{ background:"rgba(255,255,255,0.2)", border:"1px solid rgba(255,255,255,0.5)", color:"white", padding:"3px 9px", borderRadius:6, cursor:"pointer", fontSize:10, fontWeight:700, whiteSpace:"nowrap" }}
                      >
                        Full Detail →
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ padding:"7px 14px", borderBottom:"1px solid #f1f5f9", background:"#fafafa" }}>
                  <span style={{ padding:"3px 12px", borderRadius:99, fontSize:11, fontWeight:700,
                    background: selected.status==="Active"?"#d1fae5":"#fee2e2",
                    color: selected.status==="Active"?"#065f46":"#991b1b" }}>
                    ● {selected.status}
                  </span>
                </div>

                <div style={{ padding:"10px 14px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                  {(selected._isFeeder ? [
                    ["⚡ Type",     selected.feeder_type],
                    ["🗺️ State",    selected.state],
                    ["🏙️ City",     selected.city],
                    ["🔋 Capacity", `${selected.capacity_mw} MW`],
                    ["📍 Lat",      selected.lat],
                    ["📍 Lng",      selected.lng],
                  ] : [
                    ["🔌 Type",     selected.trf_type],
                    ["⚡ Voltage",  selected.voltage],
                    ["🔋 Capacity", `${selected.capacity_kva} KVA`],
                    ["🏙️ City",     selected.city],
                    ["📍 Lat",      selected.lat],
                    ["📍 Lng",      selected.lng],
                  ]).map(([label,value])=>(
                    <div key={label} style={{ background:"#f8fafc", borderRadius:7, padding:"7px 9px" }}>
                      <div style={{ fontSize:9, color:"#9ca3af", fontWeight:700, textTransform:"uppercase", marginBottom:2 }}>{label}</div>
                      <div style={{ fontSize:12, fontWeight:700, color:"#1a1a2e" }}>{value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ padding:"0 14px 14px", flex:1 }}>
                  {!selected._isFeeder && connections && (<>
                    {connections.feeders?.length>0 && <ConnSection title="⚡ Upstream Feeders" color="#dc2626" items={connections.feeders.map(f=>({ name:f.feeder_name, sub:`${f.feeder_type} • ${f.capacity_mw} MW`, badge:f.is_primary?"Primary":"Backup", primary:f.is_primary }))}/>}
                    {connections.upstream?.length>0 && <ConnSection title="🔼 Upstream Trf" color="#7c3aed" items={connections.upstream.map(t=>({ name:t.trf_name, sub:`${t.trf_type} • ${t.voltage}`, badge:t.is_primary?"Primary":"Backup", primary:t.is_primary }))}/>}
                    {connections.peers?.length>0 && <ConnSection title="↔️ Peer Share" color="#d97706" items={connections.peers.map(t=>({ name:t.trf_name, sub:t.trf_type, badge:"Peer", primary:false, peer:true }))}/>}
                    {connections.downstream?.length>0 && <ConnSection title="🔽 Downstream" color="#2563eb" items={connections.downstream.map(t=>({ name:t.trf_name, sub:`${t.trf_type} • ${t.voltage}`, badge:t.trf_type==="SM"?"Consumer":"Sub", primary:false, downstream:true }))}/>}
                  </>)}
                  {selected._isFeeder && (
                    <ConnSection title="🔌 Connected L1 Transformers" color="#7c3aed"
                      items={transformers.filter(t=>{
                        if(t.trf_type!=="L1") return false;
                        return allLinks.feederLinks?.find(l=>l.source===selected.feeder_id&&l.target===t.trf_id);
                      }).map(t=>{
                        const lnk = allLinks.feederLinks?.find(l=>l.source===selected.feeder_id&&l.target===t.trf_id);
                        return { name:t.trf_name, sub:`L1 • ${t.voltage}`, badge:lnk?.is_primary?"Primary":"Backup", primary:lnk?.is_primary };
                      })}
                    />
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* COMPACT TABLE */}
      <div style={{ height:175, overflow:"auto", background:"white", borderTop:"2px solid #e5e7eb", flexShrink:0 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"5px 14px", background:"#f8fafc", borderBottom:"1px solid #e5e7eb", position:"sticky", top:0, zIndex:5 }}>
          <span style={{ fontWeight:700, fontSize:11, color:"#1a1a2e" }}>
            📋 {transformers.filter(t=>tableFilter==="ALL"||t.trf_type===tableFilter).length} Transformers
          </span>
          <span style={{ fontSize:10, color:"#9ca3af" }}>Click → zoom  ·  Double-click → full detail</span>
        </div>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
          <thead>
            <tr style={{ background:"#1e3a5f", color:"white", position:"sticky", top:29 }}>
              {["ID","Name","City","Lat","Lng","KVA","Voltage","Type","Status"].map(h=>(
                <th key={h} style={{ padding:"6px 10px", textAlign:"left", fontWeight:600, fontSize:10, whiteSpace:"nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign:"center", padding:16, color:"#999" }}>Loading...</td></tr>
            ) : transformers.filter(t=>tableFilter==="ALL"||t.trf_type===tableFilter).map((t,i)=>{
              const cfg = TYPE_CONFIG[t.trf_type];
              const isSel = selected?.trf_id===t.trf_id;
              return (
                <tr key={t.trf_id}
                  onClick={()=>handleTableClick(t)}
                  title="Click to zoom · Double-click for full detail"
                  style={{
                    background: isSel?`${cfg.color}18`:i%2===0?"#fff":"#f9fafb",
                    cursor:"pointer",
                    borderLeft: isSel?`3px solid ${cfg.color}`:"3px solid transparent",
                    transition:"all 0.15s",
                  }}>
                  <td style={{ padding:"5px 10px", fontWeight:700, color:"#2563eb" }}>{t.trf_id}</td>
                  <td style={{ padding:"5px 10px" }}>{t.trf_name}</td>
                  <td style={{ padding:"5px 10px", color:"#555" }}>{t.city}</td>
                  <td style={{ padding:"5px 10px", fontFamily:"monospace", fontSize:10, color:"#888" }}>{t.lat}</td>
                  <td style={{ padding:"5px 10px", fontFamily:"monospace", fontSize:10, color:"#888" }}>{t.lng}</td>
                  <td style={{ padding:"5px 10px", fontWeight:600 }}>{t.capacity_kva}</td>
                  <td style={{ padding:"5px 10px" }}>{t.voltage}</td>
                  <td style={{ padding:"5px 10px" }}>
                    <span style={{ padding:"1px 7px", borderRadius:99, fontSize:10, fontWeight:700, background:`${cfg.color}22`, color:cfg.color }}>
                      {cfg.emoji} {t.trf_type}
                    </span>
                  </td>
                  <td style={{ padding:"5px 10px" }}>
                    <span style={{ padding:"1px 7px", borderRadius:99, fontSize:10, fontWeight:700, background:t.status==="Active"?"#d1fae5":"#fee2e2", color:t.status==="Active"?"#065f46":"#991b1b" }}>
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

function LayerRow({ checked, onChange, color, emoji, label, hint, active, isLine }) {
  return (
    <label style={{ display:"flex", alignItems:"center", gap:6, padding:"3px 0", cursor:"pointer", opacity:checked?1:0.4 }}>
      <input type="checkbox" checked={checked} onChange={onChange} style={{ width:12, height:12, cursor:"pointer" }}/>
      {isLine
        ? <span style={{ display:"inline-block", width:16, height:2.5, background:color, borderRadius:2 }}/>
        : <span style={{ width:12, height:12, borderRadius:"50%", background:color, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:8 }}>{emoji}</span>
      }
      <span style={{ fontSize:10, color:"#374151", fontWeight:500, flex:1 }}>{label}</span>
      {hint && (
        <span style={{ fontSize:8, fontWeight:700, padding:"1px 4px", borderRadius:99,
          background:active?"#d1fae5":"#f3f4f6", color:active?"#059669":"#9ca3af" }}>
          {active?"ON":hint}
        </span>
      )}
    </label>
  );
}

function ConnSection({ title, color, items }) {
  if(!items?.length) return null;
  return (
    <div style={{ marginTop:10 }}>
      <div style={{ fontSize:10, fontWeight:700, color, textTransform:"uppercase", letterSpacing:0.5, marginBottom:5, paddingBottom:4, borderBottom:`1px solid ${color}22` }}>{title}</div>
      <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
        {items.map((item,i)=>(
          <div key={i} style={{ background:"#f8fafc", borderRadius:7, padding:"7px 10px", display:"flex", justifyContent:"space-between", alignItems:"center", border:"1px solid #f1f5f9" }}>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:"#1a1a2e", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{item.name}</div>
              <div style={{ fontSize:10, color:"#6b7280", marginTop:1 }}>{item.sub}</div>
            </div>
            <span style={{ padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700, whiteSpace:"nowrap", marginLeft:8, flexShrink:0,
              background: item.primary?"#d1fae5" : item.peer?"#fef3c7" : item.downstream?"#dbeafe" : "#fee2e2",
              color: item.primary?"#065f46" : item.peer?"#92400e" : item.downstream?"#1e40af" : "#991b1b"
            }}>
              {item.badge}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}