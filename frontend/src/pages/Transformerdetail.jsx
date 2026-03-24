// frontend/src/pages/TransformerDetail.jsx
import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, Circle, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl:       "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl:     "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const TYPE_CFG = {
  L1: { color:"#7c3aed", light:"#ede9fe", emoji:"🏭", label:"L1 · 66/33 kV" },
  L2: { color:"#2563eb", light:"#dbeafe", emoji:"🔌", label:"L2 · 33/11 kV" },
  SM: { color:"#059669", light:"#d1fae5", emoji:"🏠", label:"SM · 11/.22 kV" },
};

function makeIcon(color, emoji, size, glow=false) {
  return L.divIcon({
    className:"",
    html:`<div style="background:${color};width:${size}px;height:${size}px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.42)}px;border:${glow?"3px solid #fbbf24":"2px solid white"};box-shadow:0 2px 10px rgba(0,0,0,0.3);">${emoji}</div>`,
    iconSize:[size,size], iconAnchor:[size/2,size/2],
  });
}

function MapController({ mapRef }) {
  const map = useMapEvents({});
  useEffect(() => { mapRef.current = map; }, [map]);
  return null;
}

// Deterministic sample health from trf_id
function genHealth(trf_id) {
  const s = (trf_id || "T0").charCodeAt(1) || 5;
  return {
    load_pct:     55 + (s * 4) % 38,
    temperature:  40 + (s * 3) % 30,
    voltage_kv:   33 - (s % 3),
    power_factor: +(0.84 + (s % 12) * 0.012).toFixed(2),
    efficiency:   93 + (s % 6),
    oil_level:    82 + (s % 14),
  };
}

// 12-hour load sparkline values (ending at current load)
function genLoadHistory(base) {
  return Array.from({length:12}, (_,i) => {
    const drift = Math.sin(i*0.6)*10 + (i-6)*0.8;
    return Math.min(99, Math.max(20, Math.round(base + drift)));
  });
}

const ALERTS = [
  { id:1, sev:"critical", type:"Temperature", msg:"Oil temperature exceeded safe threshold", start:"11:45", end:null,    ongoing:true  },
  { id:2, sev:"warning",  type:"Load",        msg:"Load approaching 85% rated capacity",   start:"10:20", end:"10:55", ongoing:false },
  { id:3, sev:"warning",  type:"Power Factor",msg:"Power factor dropped below 0.88",        start:"09:10", end:"09:40", ongoing:false },
  { id:4, sev:"info",     type:"Maintenance", msg:"Scheduled maintenance due in 3 days",    start:"08:00", end:"08:00", ongoing:false },
  { id:5, sev:"critical", type:"Voltage",     msg:"Voltage fluctuation outside ±5% range",  start:"07:30", end:"07:52", ongoing:false },
];

const SEV = {
  critical: { bg:"#fee2e2", text:"#991b1b", dot:"#dc2626", tag:"Critical" },
  warning:  { bg:"#fef3c7", text:"#92400e", dot:"#f59e0b", tag:"Warning"  },
  info:     { bg:"#dbeafe", text:"#1e40af", dot:"#3b82f6", tag:"Info"     },
};

const API = "/api";

export default function TransformerDetail({ trf_id, onBack }) {
  const [trf,     setTrf]     = useState(null);
  const [conns,   setConns]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState("overview");
  const mapRef = useRef(null);

  useEffect(() => {
    if (!trf_id) return;
    setLoading(true);
    setTab("overview");
    Promise.all([
      fetch(`${API}/transformers`).then(r => r.json()),
      fetch(`${API}/transformers/${trf_id}/connections`).then(r => r.json()),
    ]).then(([all, c]) => {
      const found = Array.isArray(all) ? all.find(t => t.trf_id === trf_id) : null;
      setTrf(found);
      setConns(c);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [trf_id]);

  if (loading) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"calc(100vh - 57px)", flexDirection:"column", gap:14 }}>
      <div style={{ width:44, height:44, border:"4px solid #e5e7eb", borderTopColor:"#7c3aed", borderRadius:"50%", animation:"spin 0.9s linear infinite" }}/>
      <p style={{ color:"#888", fontSize:13, margin:0 }}>Loading transformer data…</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.45}}`}</style>
    </div>
  );

  if (!trf) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"calc(100vh - 57px)", flexDirection:"column", gap:14 }}>
      <div style={{ fontSize:42 }}>⚠️</div>
      <p style={{ color:"#666", fontSize:14, margin:0 }}>Transformer not found</p>
      <button onClick={onBack} style={{ background:"#2563eb", color:"white", border:"none", padding:"8px 20px", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:600 }}>← Go Back</button>
    </div>
  );

  const cfg      = TYPE_CFG[trf.trf_type] || TYPE_CFG.L2;
  const health   = genHealth(trf.trf_id);
  const history  = genLoadHistory(health.load_pct);
  const ongoing  = ALERTS.find(a => a.ongoing);
  const critical = ALERTS.filter(a => a.sev === "critical").length;

  const TABS = [
    { key:"overview", label:"Overview"                    },
    { key:"health",   label:"Health Params"               },
    { key:"alerts",   label:`Alerts${critical?" ("+critical+")":""}` },
    { key:"map",      label:"Geographic View"             },
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 57px)", overflow:"hidden", background:"#f1f5f9", fontFamily:"'Segoe UI', sans-serif" }}>
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
        @keyframes fadein{ from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .tab-active { background:white !important; color:#1a1a2e !important; box-shadow:0 1px 4px rgba(0,0,0,0.1); }
        .card { background:white; border-radius:12px; border:1px solid #e5e7eb; }
        .field-row { display:flex; justify-content:space-between; align-items:center; padding:7px 10px; background:#f8fafc; border-radius:7px; }
        .metric-bar { height:7px; background:#f1f5f9; border-radius:99px; overflow:hidden; margin:8px 0 4px; }
        .conn-item { background:#f8fafc; border-radius:7px; padding:7px 10px; display:flex; justify-content:space-between; align-items:center; margin-bottom:4px; }
      `}</style>

      {/* ─── HEADER ─── */}
      <div style={{ background:"white", borderBottom:"1px solid #e5e7eb", padding:"9px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 }}>

        {/* Left — back + identity */}
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <button onClick={onBack} style={{ background:"#f1f5f9", border:"none", borderRadius:8, padding:"6px 13px", cursor:"pointer", fontSize:12, fontWeight:700, color:"#374151" }}>
            ← Back
          </button>
          <div style={{ width:1, height:28, background:"#e5e7eb" }}/>
          <div style={{ width:38, height:38, borderRadius:"50%", background:cfg.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>{cfg.emoji}</div>
          <div>
            <div style={{ fontWeight:700, fontSize:15, color:"#1a1a2e", lineHeight:1.2 }}>{trf.trf_name}</div>
            <div style={{ fontSize:11, color:"#888" }}>{trf.trf_id} · {cfg.label} · {trf.city}</div>
          </div>
          {ongoing && (
            <div style={{ background:"#fee2e2", color:"#991b1b", padding:"3px 10px", borderRadius:99, fontSize:10, fontWeight:700, display:"flex", alignItems:"center", gap:5, animation:"pulse 2s infinite" }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:"#dc2626", display:"inline-block" }}/>
              LIVE ALERT
            </div>
          )}
        </div>

        {/* Center — tabs */}
        <div style={{ display:"flex", background:"#f1f5f9", borderRadius:10, padding:4, gap:3 }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} className={tab===t.key?"tab-active":""} style={{
              padding:"5px 14px", border:"none", borderRadius:7, cursor:"pointer", fontSize:12, fontWeight:600,
              background:"transparent", color:"#6b7280", transition:"all 0.15s",
            }}>{t.label}</button>
          ))}
        </div>

        {/* Right — status */}
        <span style={{ padding:"4px 14px", borderRadius:99, fontSize:11, fontWeight:700,
          background: trf.status==="Active"?"#d1fae5":"#fee2e2",
          color:      trf.status==="Active"?"#065f46":"#991b1b" }}>
          ● {trf.status}
        </span>
      </div>

      {/* ─── CONTENT ─── */}
      <div style={{ flex:1, overflow:"auto", padding:16 }}>

        {/* ════════ OVERVIEW ════════ */}
        {tab==="overview" && (
          <div style={{ display:"flex", flexDirection:"column", gap:14, animation:"fadein 0.25s ease" }}>

            {/* KPI row */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
              {[
                { label:"Load",         value:`${health.load_pct}%`,            bar: health.load_pct,   warn:80, danger:90, color:"#2563eb"  },
                { label:"Temperature",  value:`${health.temperature}°C`,         bar: health.temperature, warn:55, danger:68, color:"#dc2626"  },
                { label:"Power Factor", value:health.power_factor.toFixed(2),    bar: health.power_factor*100, warn:88, danger:82, color:"#7c3aed", invert:true },
                { label:"Efficiency",   value:`${health.efficiency}%`,           bar: health.efficiency, warn:95, danger:90, color:"#059669", invert:true },
              ].map(k => {
                const st = k.invert
                  ? (k.bar < k.danger ? "danger" : k.bar < k.warn ? "warn" : "ok")
                  : (k.bar > k.danger ? "danger" : k.bar > k.warn ? "warn" : "ok");
                const barC = st==="danger"?"#dc2626":st==="warn"?"#f59e0b":k.color;
                return (
                  <div key={k.label} className="card" style={{ padding:"14px 16px" }}>
                    <div style={{ fontSize:10, color:"#9ca3af", fontWeight:700, textTransform:"uppercase", letterSpacing:0.5 }}>{k.label}</div>
                    <div style={{ fontSize:26, fontWeight:700, color:barC, margin:"6px 0 2px" }}>{k.value}</div>
                    <div className="metric-bar"><div style={{ width:`${Math.min(k.bar,100)}%`, height:"100%", background:barC, borderRadius:99, transition:"width 0.5s" }}/></div>
                    <div style={{ fontSize:10, color: st==="ok"?"#059669":st==="warn"?"#d97706":"#dc2626", fontWeight:700 }}>
                      {st==="ok"?"Normal":st==="warn"?"Caution":"Critical"}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Details + Connections */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>

              {/* Details card */}
              <div className="card" style={{ padding:"14px 16px" }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#1a1a2e", marginBottom:10, paddingBottom:8, borderBottom:"1px solid #f1f5f9" }}>Transformer Details</div>
                <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                  {[
                    ["ID",           trf.trf_id],
                    ["Type",         `${trf.trf_type} — ${cfg.label}`],
                    ["Voltage",      trf.voltage || "33/11 kV"],
                    ["Capacity",     `${trf.capacity_kva} KVA`],
                    ["City",         trf.city],
                    ["Coordinates",  `${trf.lat}, ${trf.lng}`],
                    ["Oil Level",    `${health.oil_level}%`],
                    ["Voltage Live", `${health.voltage_kv} kV`],
                  ].map(([l,v]) => (
                    <div key={l} className="field-row">
                      <span style={{ fontSize:11, color:"#6b7280", fontWeight:600 }}>{l}</span>
                      <span style={{ fontSize:12, fontWeight:700, color:"#1a1a2e" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Connections card */}
              <div className="card" style={{ padding:"14px 16px", overflowY:"auto", maxHeight:400 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#1a1a2e", marginBottom:10, paddingBottom:8, borderBottom:"1px solid #f1f5f9" }}>Grid Connections</div>
                <ConnGroup title="Upstream Feeders"       color="#dc2626" items={conns?.feeders?.map(f  => ({ name:f.feeder_name, sub:`${f.feeder_type} · ${f.capacity_mw} MW`, badge:f.is_primary?"Primary":"Backup", primary:f.is_primary }))}/>
                <ConnGroup title="Upstream Transformers"  color="#7c3aed" items={conns?.upstream?.map(t => ({ name:t.trf_name,    sub:`${t.trf_type} · ${t.voltage||""}`,        badge:t.is_primary?"Primary":"Backup", primary:t.is_primary }))}/>
                <ConnGroup title="Peer (Power Share)"     color="#d97706" items={conns?.peers?.map(t    => ({ name:t.trf_name,    sub:t.trf_type, badge:"Peer",    peer:true }))}/>
                <ConnGroup title="Downstream"             color="#2563eb" items={conns?.downstream?.map(t => ({ name:t.trf_name, sub:`${t.trf_type} · ${t.voltage||""}`, badge:t.trf_type==="SM"?"Consumer":"Sub", downstream:true }))}/>
              </div>
            </div>

            {/* Live alert banner */}
            {ongoing && (
              <div style={{ background:"#fee2e2", border:"1px solid #fca5a5", borderRadius:12, padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:"#dc2626", animation:"pulse 1.5s infinite", flexShrink:0 }}/>
                  <div>
                    <div style={{ fontWeight:700, color:"#991b1b", fontSize:13 }}>{ongoing.msg}</div>
                    <div style={{ fontSize:11, color:"#b91c1c", marginTop:2 }}>Started {ongoing.start} · Ongoing · Duration: {ongoingDuration(ongoing.start)}</div>
                  </div>
                </div>
                <button onClick={() => setTab("alerts")} style={{ background:"#dc2626", color:"white", border:"none", padding:"6px 16px", borderRadius:8, cursor:"pointer", fontSize:11, fontWeight:700, flexShrink:0 }}>
                  View Alerts →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ════════ HEALTH PARAMS ════════ */}
        {tab==="health" && (
          <div style={{ display:"flex", flexDirection:"column", gap:14, animation:"fadein 0.25s ease" }}>

            {/* 6 metric cards */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
              {[
                { label:"Load %",       val:health.load_pct,    max:100, unit:"%",  warn:80, danger:90,  color:"#2563eb",  icon:"⚡" },
                { label:"Temperature",  val:health.temperature, max:100, unit:"°C", warn:55, danger:68,  color:"#dc2626",  icon:"🌡️" },
                { label:"Oil Level",    val:health.oil_level,   max:100, unit:"%",  warn:70, danger:50,  color:"#059669",  icon:"🛢️", invert:true },
                { label:"Efficiency",   val:health.efficiency,  max:100, unit:"%",  warn:95, danger:90,  color:"#7c3aed",  icon:"📊", invert:true },
                { label:"Power Factor", val:Math.round(health.power_factor*100), max:100, unit:"", warn:88, danger:82, color:"#d97706", icon:"⚙️", invert:true, display:health.power_factor.toFixed(2) },
                { label:"Voltage kV",   val:health.voltage_kv,  max:40,  unit:"kV", warn:35, danger:37,  color:"#0891b2",  icon:"🔋" },
              ].map(m => {
                const pct = Math.min((m.val / m.max) * 100, 100);
                const st  = m.invert
                  ? (m.val < m.danger ? "danger" : m.val < m.warn ? "warn" : "ok")
                  : (m.val > m.danger ? "danger" : m.val > m.warn ? "warn" : "ok");
                const barC = st==="danger"?"#dc2626":st==="warn"?"#f59e0b":m.color;
                return (
                  <div key={m.label} className="card" style={{ padding:16 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <span style={{ fontSize:16 }}>{m.icon}</span>
                        <span style={{ fontSize:12, fontWeight:600, color:"#555" }}>{m.label}</span>
                      </div>
                      <span style={{ fontSize:20, fontWeight:700, color:barC }}>{m.display || m.val}{m.unit}</span>
                    </div>
                    <div className="metric-bar"><div style={{ width:`${pct}%`, height:"100%", background:barC, borderRadius:99, transition:"width 0.6s" }}/></div>
                    <div style={{ display:"flex", justifyContent:"space-between" }}>
                      <span style={{ fontSize:9, color:"#aaa" }}>0{m.unit}</span>
                      <span style={{ fontSize:10, fontWeight:700, color: st==="ok"?"#059669":st==="warn"?"#d97706":"#dc2626" }}>
                        {st==="ok"?"Normal":st==="warn"?"Caution":"Critical"}
                      </span>
                      <span style={{ fontSize:9, color:"#aaa" }}>{m.max}{m.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Load history chart (CSS bars) */}
            <div className="card" style={{ padding:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#1a1a2e", marginBottom:4 }}>Load % — Last 12 hours</div>
              <div style={{ fontSize:11, color:"#9ca3af", marginBottom:14 }}>Based on real-time telemetry simulation</div>
              <div style={{ display:"flex", alignItems:"flex-end", gap:5, height:88 }}>
                {history.map((v,i) => {
                  const isNow = i === history.length-1;
                  const c = v>85?"#fca5a5":v>70?"#fde68a":"#93c5fd";
                  return (
                    <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:3 }}>
                      {isNow && <div style={{ fontSize:8, color:"#dc2626", fontWeight:700 }}>NOW</div>}
                      <div title={`${v}%`} style={{ width:"100%", height:`${v}%`, background:isNow?"#2563eb":c, borderRadius:"3px 3px 0 0", transition:"height 0.4s", opacity:isNow?1:0.7 }}/>
                      <span style={{ fontSize:9, color:"#9ca3af" }}>{String(i+8).padStart(2,"0")}h</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Temperature timeline */}
            <div className="card" style={{ padding:16 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#1a1a2e", marginBottom:14 }}>Temperature Alert Timeline</div>
              <div style={{ position:"relative", height:50 }}>
                {/* Track */}
                <div style={{ position:"absolute", top:20, left:0, right:0, height:4, background:"#f1f5f9", borderRadius:99 }}/>
                {/* Safe zone */}
                <div style={{ position:"absolute", top:20, left:"0%", width:"47%", height:4, background:"#bbf7d0", borderRadius:99 }}/>
                {/* Alert zone */}
                <div style={{ position:"absolute", top:20, left:"47%", width:"27%", height:4, background:"#fca5a5", borderRadius:99 }}/>
                {/* Start marker 11:45 */}
                <div style={{ position:"absolute", top:8, left:"47%", transform:"translateX(-50%)", textAlign:"center" }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:"#dc2626", margin:"0 auto 3px" }}/>
                  <span style={{ fontSize:9, color:"#dc2626", fontWeight:700, whiteSpace:"nowrap" }}>11:45 Start</span>
                </div>
                {/* Ongoing pulse */}
                <div style={{ position:"absolute", top:8, left:"74%", transform:"translateX(-50%)", textAlign:"center", animation:"pulse 2s infinite" }}>
                  <div style={{ width:10, height:10, borderRadius:"50%", background:"#f59e0b", margin:"0 auto 3px" }}/>
                  <span style={{ fontSize:9, color:"#d97706", fontWeight:700, whiteSpace:"nowrap" }}>12:15 Ongoing</span>
                </div>
                {/* Labels */}
                <div style={{ position:"absolute", bottom:0, left:0, fontSize:9, color:"#aaa" }}>08:00</div>
                <div style={{ position:"absolute", bottom:0, right:0, fontSize:9, color:"#aaa" }}>20:00</div>
              </div>
              <div style={{ display:"flex", gap:10, marginTop:6 }}>
                <div style={{ display:"flex", alignItems:"center", gap:4 }}><div style={{ width:10, height:10, borderRadius:2, background:"#bbf7d0" }}/><span style={{ fontSize:10, color:"#555" }}>Normal range</span></div>
                <div style={{ display:"flex", alignItems:"center", gap:4 }}><div style={{ width:10, height:10, borderRadius:2, background:"#fca5a5" }}/><span style={{ fontSize:10, color:"#555" }}>Alert range</span></div>
              </div>
            </div>
          </div>
        )}

        {/* ════════ ALERTS ════════ */}
        {tab==="alerts" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12, animation:"fadein 0.25s ease" }}>

            {/* summary row */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
              {[
                { label:"Total",    val:ALERTS.length,                                   bg:"#f8fafc", c:"#1a1a2e" },
                { label:"Critical", val:ALERTS.filter(a=>a.sev==="critical").length,     bg:"#fee2e2", c:"#991b1b" },
                { label:"Ongoing",  val:ALERTS.filter(a=>a.ongoing).length,              bg:"#d1fae5", c:"#065f46" },
              ].map(s => (
                <div key={s.label} className="card" style={{ padding:"14px 16px", background:s.bg }}>
                  <div style={{ fontSize:10, color:s.c, fontWeight:700, textTransform:"uppercase", opacity:0.7 }}>{s.label}</div>
                  <div style={{ fontSize:30, fontWeight:700, color:s.c, marginTop:4 }}>{s.val}</div>
                </div>
              ))}
            </div>

            {ALERTS.map(a => {
              const s = SEV[a.sev];
              const dur = a.ongoing ? ongoingDuration(a.start) : null;
              return (
                <div key={a.id} className="card" style={{ padding:"14px 16px", borderLeft:`4px solid ${s.dot}` }}>
                  <div style={{ display:"flex", gap:12, alignItems:"flex-start" }}>
                    <div style={{ width:10, height:10, borderRadius:"50%", background:s.dot, marginTop:4, flexShrink:0, animation:a.ongoing?"pulse 1.5s infinite":"none" }}/>
                    <div style={{ flex:1 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
                        <span style={{ fontWeight:700, color:"#1a1a2e", fontSize:13 }}>{a.msg}</span>
                        <span style={{ padding:"2px 9px", borderRadius:99, fontSize:10, fontWeight:700, background:s.bg, color:s.text, whiteSpace:"nowrap", flexShrink:0 }}>
                          {a.ongoing ? "🔴 Ongoing" : s.tag}
                        </span>
                      </div>
                      <div style={{ display:"flex", gap:14, marginTop:7, flexWrap:"wrap" }}>
                        <InfoPill label="Type"  val={a.type}       />
                        <InfoPill label="Start" val={a.start}      />
                        {!a.ongoing && <InfoPill label="End"      val={a.end}       />}
                        {!a.ongoing && <InfoPill label="Duration" val={calcDur(a.start, a.end)} />}
                        {a.ongoing  && <InfoPill label="Duration" val={dur} red />}
                      </div>
                      {a.ongoing && (
                        <div style={{ marginTop:8, background:"#fff7ed", borderRadius:7, padding:"6px 10px", fontSize:11, color:"#92400e", display:"flex", alignItems:"center", gap:6 }}>
                          <span style={{ animation:"pulse 1.5s infinite" }}>⚠️</span>
                          Alert active since {a.start} — End time pending resolution
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ════════ GEOGRAPHIC VIEW ════════ */}
        {tab==="map" && (
          <div style={{ display:"flex", flexDirection:"column", gap:12, height:"calc(100vh - 180px)", animation:"fadein 0.25s ease" }}>

            {/* legend bar */}
            <div className="card" style={{ padding:"9px 14px", display:"flex", gap:16, alignItems:"center", flexShrink:0 }}>
              <span style={{ fontSize:11, fontWeight:600, color:"#555" }}>Showing {trf.trf_name} and its connected grid nodes</span>
              <div style={{ display:"flex", gap:12, marginLeft:"auto" }}>
                {[["#dc2626","Feeder"],["#7c3aed","L1"],["#2563eb","L2"],["#059669","SM"],["#f59e0b","Peer"]].map(([c,l])=>(
                  <div key={l} style={{ display:"flex", alignItems:"center", gap:4 }}>
                    <div style={{ width:8, height:8, borderRadius:"50%", background:c }}/>
                    <span style={{ fontSize:10, color:"#666" }}>{l}</span>
                  </div>
                ))}
                <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <div style={{ width:16, height:2, background:"#7c3aed", borderTop:"2px dashed #7c3aed" }}/>
                  <span style={{ fontSize:10, color:"#666" }}>Upstream line</span>
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:4 }}>
                  <div style={{ width:16, height:2, background:"#2563eb" }}/>
                  <span style={{ fontSize:10, color:"#666" }}>Downstream line</span>
                </div>
              </div>
            </div>

            <div style={{ flex:1, borderRadius:12, overflow:"hidden", border:"1px solid #e5e7eb" }}>
              <MapContainer center={[trf.lat, trf.lng]} zoom={13} style={{ height:"100%", width:"100%" }}
                maxBounds={[[23.0,74.5],[31.5,87.5]]} maxBoundsViscosity={0.8}>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap'/>
                <MapController mapRef={mapRef}/>

                {/* Pulse ring */}
                <Circle center={[trf.lat, trf.lng]} radius={600} color={cfg.color} fillColor={cfg.color} fillOpacity={0.07} weight={1.5} dashArray="4,4"/>

                {/* This transformer */}
                <Marker position={[trf.lat, trf.lng]} icon={makeIcon(cfg.color, cfg.emoji, 46, true)}>
                  <Tooltip permanent direction="top" offset={[0,-24]}>
                    <b>{trf.trf_name}</b> · This transformer
                  </Tooltip>
                </Marker>

                {/* Upstream */}
                {conns?.upstream?.filter(t=>t.lat&&t.lng).map((t,i) => (<>
                  <Polyline key={`ul${i}`} positions={[[trf.lat,trf.lng],[t.lat,t.lng]]} color="#7c3aed" weight={2} dashArray="6,4" opacity={0.75}/>
                  <Marker key={`um${i}`} position={[t.lat,t.lng]} icon={makeIcon(TYPE_CFG[t.trf_type]?.color||"#7c3aed",TYPE_CFG[t.trf_type]?.emoji||"🏭",32)}>
                    <Tooltip direction="top"><b>{t.trf_name}</b><br/>↑ Upstream {t.trf_type}</Tooltip>
                  </Marker>
                </>))}

                {/* Downstream */}
                {conns?.downstream?.filter(t=>t.lat&&t.lng).map((t,i) => (<>
                  <Polyline key={`dl${i}`} positions={[[trf.lat,trf.lng],[t.lat,t.lng]]} color="#2563eb" weight={1.5} opacity={0.6}/>
                  <Marker key={`dm${i}`} position={[t.lat,t.lng]} icon={makeIcon(TYPE_CFG[t.trf_type]?.color||"#2563eb",TYPE_CFG[t.trf_type]?.emoji||"🔌",26)}>
                    <Tooltip direction="top"><b>{t.trf_name}</b><br/>↓ Downstream {t.trf_type}</Tooltip>
                  </Marker>
                </>))}

                {/* Peers */}
                {conns?.peers?.filter(t=>t.lat&&t.lng).map((t,i) => (<>
                  <Polyline key={`pl${i}`} positions={[[trf.lat,trf.lng],[t.lat,t.lng]]} color="#f59e0b" weight={2} dashArray="3,3" opacity={0.8}/>
                  <Marker key={`pm${i}`} position={[t.lat,t.lng]} icon={makeIcon("#f59e0b","🏭",30)}>
                    <Tooltip direction="top"><b>{t.trf_name}</b><br/>↔ Peer share</Tooltip>
                  </Marker>
                </>))}
              </MapContainer>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* ── Sub-components ── */
function ConnGroup({ title, color, items }) {
  if (!items?.length) return null;
  return (
    <div style={{ marginBottom:12 }}>
      <div style={{ fontSize:10, fontWeight:700, color, textTransform:"uppercase", letterSpacing:0.5, marginBottom:5 }}>{title}</div>
      {items.map((item,i) => (
        <div key={i} className="conn-item">
          <div>
            <div style={{ fontSize:12, fontWeight:600, color:"#1a1a2e" }}>{item.name}</div>
            <div style={{ fontSize:10, color:"#6b7280" }}>{item.sub}</div>
          </div>
          <span style={{ padding:"2px 8px", borderRadius:99, fontSize:10, fontWeight:700, whiteSpace:"nowrap", marginLeft:8,
            background: item.primary?"#d1fae5":item.peer?"#fef3c7":item.downstream?"#dbeafe":"#fee2e2",
            color:      item.primary?"#065f46":item.peer?"#92400e":item.downstream?"#1e40af":"#991b1b" }}>
            {item.badge}
          </span>
        </div>
      ))}
    </div>
  );
}

function InfoPill({ label, val, red }) {
  return (
    <span style={{ fontSize:11, color: red?"#dc2626":"#6b7280", fontWeight: red?700:400 }}>
      {label}: <b style={{ color: red?"#dc2626":"#1a1a2e" }}>{val}</b>
    </span>
  );
}

function ongoingDuration(startTime) {
  try {
    const [h,m] = startTime.split(":").map(Number);
    const now = new Date();
    const mins = (now.getHours()-h)*60 + (now.getMinutes()-m);
    if (mins <= 0) return "Just started";
    const hh = Math.floor(mins/60), mm = mins%60;
    return hh > 0 ? `${hh}h ${mm}m` : `${mm}m`;
  } catch { return "—"; }
}

function calcDur(start, end) {
  try {
    const [sh,sm] = start.split(":").map(Number);
    const [eh,em] = end.split(":").map(Number);
    const mins = (eh-sh)*60+(em-sm);
    return mins <= 0 ? "—" : `${mins}m`;
  } catch { return "—"; }
}