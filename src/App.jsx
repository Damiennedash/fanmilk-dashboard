import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend
} from "recharts";

// ═══════════════════════════════════════════════════════════════
//  CONFIG — paste your Apps Script Web App URL here
//  Deploy guide: see README.md
// ═══════════════════════════════════════════════════════════════
const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || "";

// ─── COLORS ────────────────────────────────────────────────────
const C = {
  blue: "#1a5fa8", blueL: "#3a7fd4",
  teal: "#0d8a7c", tealL: "#1ab8a6",
  green: "#16a34a", orange: "#d97706",
  red: "#dc2626", purple: "#7c3aed",
  bg: "#f0f4f9", card: "#ffffff",
  border: "#dce5f0", text: "#1a2d4a", muted: "#6b84a3",
};

// ─── DEMO DATA (shown when URL not configured) ─────────────────
const DEMO = {
  vendors: [
    { nom:"Sena D.",   depot:"NADONIELLA A", ventes:95000, fanxtra:52, fanchoco:33, fanvanille:17, jours:27, prev_ventes:80000 },
    { nom:"Kofi A.",   depot:"GERM DOSSEH",  ventes:87000, fanxtra:45, fanchoco:28, fanvanille:14, jours:26, prev_ventes:72000 },
    { nom:"Afi B.",    depot:"SUPER DEPOT",  ventes:74000, fanxtra:38, fanchoco:22, fanvanille:10, jours:24, prev_ventes:68000 },
    { nom:"Kodjo C.",  depot:"NBUKE RAMCO",  ventes:61000, fanxtra:30, fanchoco:18, fanvanille:9,  jours:22, prev_ventes:58000 },
    { nom:"Mawuli E.", depot:"GERM DOSSEH",  ventes:53000, fanxtra:27, fanchoco:15, fanvanille:8,  jours:20, prev_ventes:50000 },
  ],
  weekly: [
    {sem:"W1",qpvd:110},{sem:"W2",qpvd:118},{sem:"W3",qpvd:125},
    {sem:"W4",qpvd:131},{sem:"W5",qpvd:138},{sem:"W6",qpvd:144},{sem:"W7",qpvd:149},
  ],
  today: { nb_declarations:8, vendors_actifs:6, ventes_total:42000, fanxtra_total:38, fanchoco_total:24, fanvan_total:12 }
};

// ─── HELPERS ───────────────────────────────────────────────────
const fmt  = n => n >= 1000 ? (n/1000).toFixed(0)+"k" : String(n);
const pct  = (a,b) => b===0 ? 0 : Math.round((a/b)*100);
const grow = (a,b) => b===0 ? 0 : Math.round(((a-b)/b)*100);
const TARGET = 132;

// ─── ATOMS ─────────────────────────────────────────────────────
const Badge = ({color, children}) => (
  <span style={{
    background:color+"22", color, fontWeight:700, fontSize:11,
    padding:"3px 9px", borderRadius:99, border:`1px solid ${color}44`,
    whiteSpace:"nowrap", display:"inline-block"
  }}>{children}</span>
);

const ProgressBar = ({value, max, color}) => (
  <div style={{background:"#e2eaf4",borderRadius:99,height:8,overflow:"hidden",marginTop:5}}>
    <div style={{width:`${Math.min(100,pct(value,max||1))}%`,background:color,
      height:"100%",borderRadius:99,transition:"width .6s"}}/>
  </div>
);

const Heading = ({children}) => (
  <div style={{fontSize:11,fontWeight:700,color:C.blue,textTransform:"uppercase",
    letterSpacing:1.4,paddingBottom:8,borderBottom:`2px solid ${C.border}`,marginBottom:14}}>
    {children}
  </div>
);

const KpiCard = ({label,value,sub,accent,icon}) => (
  <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,
    padding:"12px 14px",borderTop:`4px solid ${accent||C.blue}`,flex:"1 1 130px",minWidth:0}}>
    <div style={{fontSize:10,color:C.muted,fontWeight:700,textTransform:"uppercase",
      letterSpacing:.8,marginBottom:4}}>{icon} {label}</div>
    <div style={{fontSize:22,fontWeight:900,color:C.text,lineHeight:1.1}}>{value}</div>
    {sub && <div style={{fontSize:11,color:C.muted,marginTop:3,lineHeight:1.3}}>{sub}</div>}
  </div>
);

// ═══════════════════════════════════════════════════════════════
//  MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [isDemo,  setIsDemo]  = useState(false);
  const [tab,     setTab]     = useState("overview");
  const [lastSync,setLastSync]= useState(null);

  const nowStr = new Date().toLocaleDateString("en-GB",{
    weekday:"long", day:"2-digit", month:"long", year:"numeric"
  });

  // ── Fetch data ───────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    if (!APPS_SCRIPT_URL) {
      await new Promise(r => setTimeout(r,500));
      setData(DEMO); setIsDemo(true); setLoading(false);
      setLastSync(new Date()); return;
    }
    try {
      const res  = await fetch(APPS_SCRIPT_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json); setIsDemo(false); setLastSync(new Date());
    } catch(e) {
      setError(e.message); setData(DEMO); setIsDemo(true);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const t = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, [loadData]);

  // ── Aggregates ───────────────────────────────────────────────
  const vendors     = data?.vendors ?? [];
  const weekly      = (data?.weekly ?? []).map(w => ({...w, target:TARGET}));
  const today       = data?.today   ?? {};
  const ranked      = [...vendors].sort((a,b) => b.ventes - a.ventes);
  const totalVentes = vendors.reduce((s,v) => s+v.ventes,   0);
  const totalXtra   = vendors.reduce((s,v) => s+v.fanxtra,  0);
  const totalChoco  = vendors.reduce((s,v) => s+v.fanchoco, 0);
  const totalVan    = vendors.reduce((s,v) => s+v.fanvanille,0);
  const totalSku    = totalXtra + totalChoco + totalVan;
  const avgJours    = vendors.length ? Math.round(vendors.reduce((s,v)=>s+v.jours,0)/vendors.length) : 0;
  const avgQPVD     = vendors.length ? Math.round(totalSku/vendors.length) : 0;

  const barData = ranked.map(v => ({
    name: v.nom.split(" ")[0],
    "Sales (k)": Math.round(v.ventes/1000),
    "Units": v.fanxtra+v.fanchoco+v.fanvanille,
  }));

  // ── Loading screen ───────────────────────────────────────────
  if (loading) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",
      flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16}}>
      <div style={{fontSize:48}}>🍦</div>
      <div style={{fontWeight:700,color:C.blue,fontSize:16}}>Loading Scorecard…</div>
      <div style={{width:180,height:4,background:"#dce5f0",borderRadius:99,overflow:"hidden"}}>
        <div style={{width:"60%",height:"100%",background:C.blue,borderRadius:99,
          animation:"pulse 1s infinite alternate"}}/>
      </div>
      <style>{`@keyframes pulse{from{opacity:.4}to{opacity:1}}`}</style>
    </div>
  );

  const TABS = [
    {id:"overview",  label:"📊 Overview"},
    {id:"vendors",   label:"🏆 Vendors"},
    {id:"today",     label:"⚡ Today"},
    {id:"performance",label:"🎯 Performance"},
  ];

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",background:C.bg,
      minHeight:"100vh",color:C.text,maxWidth:"100vw",overflowX:"hidden"}}>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div style={{background:`linear-gradient(135deg,${C.blue} 0%,#0d3d6e 100%)`,
        padding:"14px 16px",display:"flex",alignItems:"center",
        justifyContent:"space-between",position:"sticky",top:0,zIndex:100,
        boxShadow:"0 2px 12px #00000033"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{background:"#fff",borderRadius:8,padding:"4px 10px",
            fontWeight:900,fontSize:16,color:C.blue,letterSpacing:-.5}}>
            FAN<span style={{color:C.teal}}>MILK</span>
          </div>
          <div>
            <div style={{color:"#fff",fontWeight:700,fontSize:13}}>TOGO · VENDOR SCORECARD</div>
            <div style={{color:"#8eb8e8",fontSize:10}}>{nowStr}</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {isDemo && (
            <span style={{background:"#f59e0b22",color:"#fbbf24",fontSize:10,
              fontWeight:700,padding:"3px 8px",borderRadius:99,border:"1px solid #f59e0b44"}}>
              DEMO
            </span>
          )}
          {lastSync && !isDemo && (
            <span style={{color:"#8eb8e8",fontSize:10}}>
              Synced {lastSync.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}
            </span>
          )}
          <button onClick={loadData} style={{background:"#ffffff22",border:"none",
            borderRadius:8,padding:"6px 12px",color:"#fff",fontSize:13,
            fontWeight:700,cursor:"pointer"}}>↻</button>
          <span style={{fontSize:20}}>🇹🇬</span>
        </div>
      </div>

      {/* ── ERROR BANNER ───────────────────────────────────── */}
      {error && (
        <div style={{background:"#fef2f2",borderBottom:"1px solid #fecaca",
          padding:"10px 16px",fontSize:12,color:C.red}}>
          ⚠️ Could not load Sheet ({error}). Showing demo data.
        </div>
      )}

      {/* ── DEMO BANNER ────────────────────────────────────── */}
      {isDemo && !error && (
        <div style={{background:"#fffbeb",borderBottom:"1px solid #fde68a",
          padding:"10px 16px",fontSize:12,color:"#92400e"}}>
          🛠 Demo mode — Set <strong>VITE_APPS_SCRIPT_URL</strong> in Vercel environment variables to load live data.
        </div>
      )}

      {/* ── TABS ───────────────────────────────────────────── */}
      <div style={{background:"#fff",borderBottom:`1px solid ${C.border}`,
        display:"flex",overflowX:"auto",position:"sticky",top:58,zIndex:99}}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{flex:1,background:"none",border:"none",padding:"12px 8px",
              cursor:"pointer",fontSize:12,fontWeight:700,whiteSpace:"nowrap",
              color:tab===t.id ? C.blue : C.muted, minWidth:90,
              borderBottom:tab===t.id ? `3px solid ${C.blue}` : "3px solid transparent"}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── CONTENT ────────────────────────────────────────── */}
      <div style={{padding:"14px 12px",display:"flex",flexDirection:"column",gap:14}}>

        {/* ══ OVERVIEW ══════════════════════════════════════ */}
        {tab === "overview" && (<>
          {/* KPI Row 1 */}
          <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
            <KpiCard label="Total Sales MTD"    value={`${fmt(totalVentes)} FCFA`} sub="All zones"        accent={C.blue}   icon="💰"/>
            <KpiCard label="Avg QPVD"           value={avgQPVD}                    sub={`Target: ${TARGET} units/day`} accent={C.teal} icon="📦"/>
            <KpiCard label="Avg Days Worked"    value={`${avgJours}d`}             sub="Target: 27+/mo"  accent={C.orange} icon="📅"/>
            <KpiCard label="Satisfaction"       value="95%"                        sub="Monthly survey"  accent={C.green}  icon="⭐"/>
          </div>
          {/* KPI Row 2 */}
          <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
            <KpiCard label="Active Vendors"     value={vendors.length}             sub="This month"      accent={C.blueL}  icon="👤"/>
            <KpiCard label="Total Units"        value={totalSku}                   sub={`Xtra ${totalXtra} · Choco ${totalChoco} · Van. ${totalVan}`} accent={C.purple} icon="🍦"/>
            <KpiCard label="Equipment Downtime" value="0d"                         sub="0h lost"         accent={C.green}  icon="⚙️"/>
            <KpiCard label="QPVD vs Target"     value={`${pct(avgQPVD,TARGET)}%`} sub={`${avgQPVD}/${TARGET} units`} accent={avgQPVD>=TARGET?C.green:C.orange} icon="🎯"/>
          </div>

          {/* QPVD Chart */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 12px"}}>
            <Heading>📈 Weekly QPVD Trend</Heading>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={weekly} margin={{left:-10,right:10}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5edf7"/>
                <XAxis dataKey="sem" tick={{fontSize:10}}/>
                <YAxis tick={{fontSize:10}} domain={[80,"auto"]}/>
                <Tooltip/>
                <Legend wrapperStyle={{fontSize:11}}/>
                <Line type="monotone" dataKey="qpvd"   stroke={C.teal}   strokeWidth={2.5} dot={{r:3}} name="QPVD"/>
                <Line type="monotone" dataKey="target" stroke={C.orange} strokeWidth={1.5} strokeDasharray="5 4" dot={false} name="Target"/>
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* SKU Split */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 12px"}}>
            <Heading>🍦 SKU Breakdown</Heading>
            {[
              {label:"FanXtra",   val:totalXtra,  color:C.blue},
              {label:"FanChoco",  val:totalChoco, color:C.purple},
              {label:"FanVanille",val:totalVan,   color:C.orange},
            ].map(({label,val,color}) => (
              <div key={label} style={{marginBottom:12}}>
                <div style={{display:"flex",justifyContent:"space-between",
                  fontSize:12,fontWeight:700,color}}>
                  <span>{label}</span>
                  <span>{val} units · {pct(val,totalSku||1)}%</span>
                </div>
                <ProgressBar value={val} max={totalSku||1} color={color}/>
              </div>
            ))}
          </div>

          {/* Picture of Success */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 12px"}}>
            <Heading>🎯 Picture of Success</Heading>
            {[
              {goal:`QPVD ≥ ${TARGET} units/day (current: ${avgQPVD})`, ok:avgQPVD>=TARGET},
              {goal:"Zero equipment downtime",                            ok:true},
              {goal:`Vendors active ≥ 27d/mo (current: ${avgJours}d)`,  ok:avgJours>=27},
              {goal:"QPVD > 200 units/day (stretch goal)",               ok:avgQPVD>=200},
              {goal:"Vendor satisfaction ≥ 90%",                         ok:true},
            ].map(({goal,ok},i) => (
              <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,
                padding:"9px 12px",borderRadius:8,marginBottom:8,
                background:ok?"#f0fdf4":"#eff6ff",
                border:`1px solid ${ok?"#bbf7d0":"#bfdbfe"}`}}>
                <span style={{fontSize:16,flexShrink:0}}>{ok?"✅":"🔵"}</span>
                <span style={{fontSize:12,lineHeight:1.4}}>{goal}</span>
              </div>
            ))}
          </div>
        </>)}

        {/* ══ VENDORS ═══════════════════════════════════════ */}
        {tab === "vendors" && (<>
          {/* Bar chart */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 12px"}}>
            <Heading>🏆 Vendor League — Sales & Units</Heading>
            <ResponsiveContainer width="100%" height={ranked.length*52+40}>
              <BarChart data={barData} layout="vertical" margin={{left:0,right:10}}>
                <XAxis type="number" tick={{fontSize:10}}/>
                <YAxis type="category" dataKey="name" tick={{fontSize:11}} width={55}/>
                <Tooltip/>
                <Legend wrapperStyle={{fontSize:11}}/>
                <Bar dataKey="Sales (k)" fill={C.blueL} radius={[0,4,4,0]}/>
                <Bar dataKey="Units"     fill={C.teal}  radius={[0,4,4,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Vendor cards */}
          {ranked.map((v,i) => {
            const pieces = v.fanxtra+v.fanchoco+v.fanvanille;
            const g      = grow(v.ventes, v.prev_ventes||0);
            const medal  = ["🥇","🥈","🥉"][i] ?? `${i+1}`;
            return (
              <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,
                borderRadius:12,padding:"14px",
                borderLeft:`4px solid ${i===0?C.orange:i===1?"#9ca3af":i===2?"#cd7f32":C.border}`}}>
                <div style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:20}}>{medal}</span>
                    <div>
                      <div style={{fontWeight:800,fontSize:14}}>{v.nom}</div>
                      <div style={{fontSize:11,color:C.muted}}>{v.depot}</div>
                    </div>
                  </div>
                  <Badge color={g>=0?C.green:C.red}>{g>=0?"+":""}{g}%</Badge>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
                  {[
                    {l:"Sales",   v2:`${fmt(v.ventes)}F`, c:C.blue},
                    {l:"Units",   v2:pieces,               c:C.teal},
                    {l:"Days",    v2:<Badge color={v.jours>=27?C.green:C.orange}>{v.jours}d</Badge>, c:null},
                    {l:"FanXtra", v2:v.fanxtra,            c:C.purple},
                  ].map(({l,v2,c}) => (
                    <div key={l} style={{textAlign:"center",background:"#f8fafd",
                      borderRadius:8,padding:"6px 4px"}}>
                      <div style={{fontSize:9,color:C.muted,fontWeight:700,
                        textTransform:"uppercase",marginBottom:3}}>{l}</div>
                      <div style={{fontSize:13,fontWeight:800,color:c||C.text}}>{v2}</div>
                    </div>
                  ))}
                </div>
                <div style={{marginTop:10,display:"flex",gap:8,flexWrap:"wrap"}}>
                  <Badge color={C.blue}>Xtra {v.fanxtra}</Badge>
                  <Badge color={C.purple}>Choco {v.fanchoco}</Badge>
                  <Badge color={C.orange}>Vanille {v.fanvanille}</Badge>
                </div>
              </div>
            );
          })}
        </>)}

        {/* ══ TODAY ═════════════════════════════════════════ */}
        {tab === "today" && (<>
          <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
            <KpiCard label="Declarations Today" value={today.nb_declarations??0}   sub="WhatsApp responses" accent={C.blue}   icon="💬"/>
            <KpiCard label="Active Vendors"      value={today.vendors_actifs??0}    sub="Reported today"    accent={C.teal}   icon="👤"/>
            <KpiCard label="Sales Today"         value={`${fmt(today.ventes_total??0)} F`} sub="FCFA"       accent={C.green}  icon="💰"/>
            <KpiCard label="Total Units"         value={(today.fanxtra_total??0)+(today.fanchoco_total??0)+(today.fanvan_total??0)} sub="All SKUs" accent={C.purple} icon="🍦"/>
          </div>

          {/* Today SKU */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 12px"}}>
            <Heading>⚡ Today's SKU Breakdown</Heading>
            {[
              {label:"FanXtra",   val:today.fanxtra_total??0,  color:C.blue},
              {label:"FanChoco",  val:today.fanchoco_total??0, color:C.purple},
              {label:"FanVanille",val:today.fanvan_total??0,   color:C.orange},
            ].map(({label,val,color}) => {
              const tot = (today.fanxtra_total??0)+(today.fanchoco_total??0)+(today.fanvan_total??0);
              return (
                <div key={label} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",
                    fontSize:12,fontWeight:700,color}}>
                    <span>{label}</span><span>{val} units · {pct(val,tot||1)}%</span>
                  </div>
                  <ProgressBar value={val} max={tot||1} color={color}/>
                </div>
              );
            })}
          </div>

          {/* Equipment */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 12px"}}>
            <Heading>⚙️ Equipment Downtime</Heading>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8}}>
              {[["MONTHS",0],["WEEKS",0],["DAYS",0],["HOURS",0]].map(([l,v]) => (
                <div key={l} style={{textAlign:"center",background:"#f0f7ff",borderRadius:8,padding:"10px 4px"}}>
                  <div style={{fontSize:22,fontWeight:900,color:v>0?C.red:C.green}}>{v}</div>
                  <div style={{fontSize:9,color:C.muted,fontWeight:700}}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        </>)}

        {/* ══ PERFORMANCE ═══════════════════════════════════ */}
        {tab === "performance" && (<>
          {/* QPVD gauge */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,
            padding:"20px 16px",textAlign:"center"}}>
            <Heading>📊 QPVD Performance</Heading>
            <div style={{fontSize:64,fontWeight:900,lineHeight:1,
              color:avgQPVD>=TARGET?C.green:C.orange}}>{avgQPVD}</div>
            <div style={{color:C.muted,fontSize:13,margin:"6px 0 2px"}}>units / day (average)</div>
            <div style={{color:C.muted,fontSize:11}}>Target: {TARGET} units/day</div>
            <div style={{margin:"14px auto",maxWidth:260}}>
              <ProgressBar value={avgQPVD} max={TARGET*1.5} color={avgQPVD>=TARGET?C.green:C.orange}/>
            </div>
            <div style={{display:"inline-flex",alignItems:"center",gap:8,
              background:avgQPVD>=TARGET?"#f0fdf4":"#fff7ed",
              border:`1px solid ${avgQPVD>=TARGET?"#bbf7d0":"#fed7aa"}`,
              borderRadius:99,padding:"8px 18px"}}>
              <span style={{fontSize:18}}>{avgQPVD>=TARGET?"✅":"⚠️"}</span>
              <span style={{fontWeight:700,fontSize:13,color:avgQPVD>=TARGET?C.green:C.orange}}>
                {pct(avgQPVD,TARGET)}% of target reached
              </span>
            </div>
          </div>

          {/* Days worked */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,
            padding:"20px 16px",textAlign:"center"}}>
            <Heading>📅 Days Worked</Heading>
            <div style={{fontSize:64,fontWeight:900,lineHeight:1,color:C.blue}}>
              {pct(avgJours,30)}%
            </div>
            <div style={{color:C.muted,fontSize:13,margin:"6px 0 2px"}}>Attendance rate</div>
            <div style={{color:C.muted,fontSize:11}}>Target: 6/7 days per week</div>
            <div style={{margin:"14px auto",maxWidth:260}}>
              <ProgressBar value={avgJours} max={31} color={C.blue}/>
            </div>
            <div style={{fontSize:13,color:C.muted,marginTop:8}}>
              Average: <strong>{avgJours} days</strong> this month
            </div>
          </div>

          {/* Depot performance */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 12px"}}>
            <Heading>🏪 Performance by Depot</Heading>
            {Object.entries(
              vendors.reduce((acc,v) => {
                if (!acc[v.depot]) acc[v.depot]={count:0,ventes:0,fx:0,fc:0,fv:0,jours:0};
                acc[v.depot].count++;
                acc[v.depot].ventes +=v.ventes;
                acc[v.depot].fx     +=v.fanxtra;
                acc[v.depot].fc     +=v.fanchoco;
                acc[v.depot].fv     +=v.fanvanille;
                acc[v.depot].jours  +=v.jours;
                return acc;
              },{})).map(([depot,d],i) => {
              const avgJ2 = Math.round(d.jours/d.count);
              return (
                <div key={i} style={{border:`1px solid ${C.border}`,borderRadius:10,
                  padding:"12px",marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",
                    alignItems:"center",marginBottom:8}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:13}}>{depot}</div>
                      <div style={{fontSize:11,color:C.muted}}>{d.count} vendor{d.count>1?"s":""}</div>
                    </div>
                    <Badge color={d.ventes>70000?C.green:C.orange}>
                      {d.ventes>70000?"✅ On track":"⚠️ Monitor"}
                    </Badge>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
                    {[
                      {l:"Sales",   v:`${fmt(d.ventes)}F`},
                      {l:"Xtra",    v:d.fx},
                      {l:"Choco",   v:d.fc},
                      {l:"Vanille", v:d.fv},
                      {l:"Days",    v:<Badge color={avgJ2>=27?C.green:C.orange}>{avgJ2}d</Badge>},
                      {l:"Units",   v:d.fx+d.fc+d.fv},
                    ].map(({l,v}) => (
                      <div key={l} style={{background:"#f8fafd",borderRadius:8,padding:"6px",textAlign:"center"}}>
                        <div style={{fontSize:9,color:C.muted,fontWeight:700,textTransform:"uppercase"}}>{l}</div>
                        <div style={{fontSize:13,fontWeight:700,marginTop:2}}>{v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </>)}

      </div>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <div style={{textAlign:"center",padding:"14px 16px 28px",
        color:C.muted,fontSize:10,borderTop:`1px solid ${C.border}`}}>
        FANMILK TOGO · Vendor Scorecard · WhatsApp Bot → Google Sheets → Live Dashboard
      </div>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; }
        ::-webkit-scrollbar { height: 4px; width: 4px; }
        ::-webkit-scrollbar-thumb { background: #c7d8f0; border-radius: 99px; }
      `}</style>
    </div>
  );
}
