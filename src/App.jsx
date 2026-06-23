import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend
} from "recharts";

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || "";

const C = {
  blue:"#1a5fa8", blueL:"#3a7fd4",
  teal:"#0d8a7c", tealL:"#1ab8a6",
  green:"#16a34a", orange:"#d97706",
  red:"#dc2626", purple:"#7c3aed",
  bg:"#f0f4f9", card:"#ffffff",
  border:"#dce5f0", text:"#1a2d4a", muted:"#6b84a3",
};

const DEMO = {
  today_date:"23/06/2026",
  vendors:[
    {nom:"Sena D.",  depot:"NADONIELLA A",ventes:95000,fanxtra:52,fanchoco:33,fanvanille:17,jours:27,prev_ventes:80000},
    {nom:"Kofi A.",  depot:"GERM DOSSEH", ventes:87000,fanxtra:45,fanchoco:28,fanvanille:14,jours:26,prev_ventes:72000},
    {nom:"Afi B.",   depot:"SUPER DEPOT", ventes:74000,fanxtra:38,fanchoco:22,fanvanille:10,jours:24,prev_ventes:68000},
    {nom:"Kodjo C.", depot:"NBUKE RAMCO", ventes:61000,fanxtra:30,fanchoco:18,fanvanille:9, jours:22,prev_ventes:58000},
    {nom:"Charles",  depot:"GERM DOSSEH", ventes:21825,fanxtra:23,fanchoco:5, fanvanille:17,jours:2, prev_ventes:0},
    {nom:"Simon",    depot:"GERM DOSSEH", ventes:13000,fanxtra:39,fanchoco:3, fanvanille:40,jours:1, prev_ventes:0},
    {nom:"René",     depot:"YEHONAM",     ventes:11000,fanxtra:30,fanchoco:5, fanvanille:32,jours:1, prev_ventes:0},
  ],
  weekly:[
    {sem:"W1",qpvd:45},{sem:"W2",qpvd:58},{sem:"W3",qpvd:62},
    {sem:"W4",qpvd:71},{sem:"W5",qpvd:68},{sem:"W6",qpvd:73},{sem:"W7",qpvd:82},
  ],
  today:{
    nb_declarations:13, vendors_actifs:10,
    ventes_total:88825, fanxtra_total:192, fanchoco_total:116, fanvan_total:58,
    satisfaction_today:77,
    last_declarations:[
      {heure:"12:44",nom:"Simon",   depot:"GERM DOSSEH", statut:"J ai deja vendu",ventes:13000,xtra:39,choco:3,van:40,cat:"Aucun probleme"},
      {heure:"12:30",nom:"René",    depot:"YEHONAM",      statut:"J ai deja vendu",ventes:11000,xtra:30,choco:5,van:32,cat:"Aucun probleme"},
      {heure:"11:21",nom:"Hervé",   depot:"GERM DOSSEH", statut:"Je vais vendre", ventes:0,    xtra:0, choco:0,van:0, cat:"Aucun probleme"},
      {heure:"09:29",nom:"Charles", depot:"GERM DOSSEH", statut:"Je vais vendre", ventes:8825, xtra:23,choco:5,van:17,cat:"Aucun probleme"},
      {heure:"09:12",nom:"Aziz",    depot:"SAINT MARTIN",statut:"Je vais vendre", ventes:0,    xtra:0, choco:0,van:0, cat:"Aucun probleme"},
      {heure:"09:01",nom:"Kodjovi", depot:"SAINT MARTIN",statut:"Je vais vendre", ventes:0,    xtra:0, choco:0,van:0, cat:"Aucun probleme"},
      {heure:"08:44",nom:"Bourama", depot:"NBUKE RAMCO",  statut:"Je vais vendre", ventes:0,    xtra:0, choco:0,van:0, cat:"Aucun probleme"},
      {heure:"08:16",nom:"Placide", depot:"NBUKE RAMCO",  statut:"Je vais vendre", ventes:25000,xtra:75,choco:15,van:0,cat:"Aucun probleme"},
    ],
  },
  satisfaction:{rate:77, aucun_probleme:10, total_decla:13},
  equipment:{issues_mois:0, jours_perdus:0, semaines:0, heures:0, statut:"OK"},
  problems:[
    {categorie:"Probleme Produit",count:2},
    {categorie:"Probleme de paiement",count:1},
  ],
  prime:[{pilier:"Product",count:2},{pilier:"Income",count:1}],
  hotspots:[
    {lieu:"Dans les quartiers",count:5},{lieu:"Ecole",count:4},
    {lieu:"Marche",count:3},{lieu:"Carrefour",count:2},{lieu:"Maison a maison",count:1},
  ],
  morning_vs_evening:{
    morning:{declarations:10,ventes:63825,avg:6383},
    evening:{declarations:3, ventes:25000,avg:8333},
  },
  kpis_global:{total_ca:88825, total_decla:13, taux_non_vente:23},
};

const fmt  = n => n>=1000?(n/1000).toFixed(0)+"k":String(n);
const pct  = (a,b) => b===0?0:Math.round((a/b)*100);
const grow = (a,b) => b===0?0:Math.round(((a-b)/b)*100);
const TARGET = 132;

const Badge = ({color,children}) => (
  <span style={{background:color+"22",color,fontWeight:700,fontSize:11,
    padding:"3px 9px",borderRadius:99,border:`1px solid ${color}44`,
    whiteSpace:"nowrap",display:"inline-block"}}>{children}</span>
);

const Bar2 = ({value,max,color}) => (
  <div style={{background:"#e2eaf4",borderRadius:99,height:8,overflow:"hidden",marginTop:5}}>
    <div style={{width:`${Math.min(100,pct(value,max||1))}%`,background:color,
      height:"100%",borderRadius:99,transition:"width .6s"}}/>
  </div>
);

const H = ({children}) => (
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
    {sub&&<div style={{fontSize:11,color:C.muted,marginTop:3,lineHeight:1.3}}>{sub}</div>}
  </div>
);

// Gauge circulaire pour satisfaction
const CircleGauge = ({value,color,label,sub}) => {
  const r=36, circ=2*Math.PI*r;
  const dash=circ*(value/100), gap=circ-dash;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
      <svg width={100} height={100} style={{transform:"rotate(-90deg)"}}>
        <circle cx={50} cy={50} r={r} fill="none" stroke="#e2eaf4" strokeWidth={10}/>
        <circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${gap}`} strokeLinecap="round"/>
      </svg>
      <div style={{marginTop:-82,marginBottom:36,textAlign:"center",zIndex:1,position:"relative"}}>
        <div style={{fontSize:22,fontWeight:900,color}}>{value}%</div>
        <div style={{fontSize:9,color:C.muted,fontWeight:600,textTransform:"uppercase"}}>{label}</div>
      </div>
      {sub&&<div style={{fontSize:11,color:C.muted,textAlign:"center"}}>{sub}</div>}
    </div>
  );
};

export default function App() {
  const [data,setData]       = useState(null);
  const [loading,setLoading] = useState(true);
  const [error,setError]     = useState(null);
  const [isDemo,setIsDemo]   = useState(false);
  const [tab,setTab]         = useState("overview");
  const [lastSync,setLastSync]= useState(null);

  const nowStr = new Date().toLocaleDateString("en-GB",{
    weekday:"long",day:"2-digit",month:"long",year:"numeric"
  });

  const loadData = useCallback(async () => {
    setLoading(true); setError(null);
    if (!APPS_SCRIPT_URL) {
      await new Promise(r=>setTimeout(r,500));
      setData(DEMO); setIsDemo(true); setLoading(false);
      setLastSync(new Date()); return;
    }
    try {
      const res  = await fetch(APPS_SCRIPT_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setData(json); setIsDemo(false); setLastSync(new Date());
    } catch(e) {
      setError(e.message); setData(DEMO); setIsDemo(true);
    } finally { setLoading(false); }
  },[]);

  useEffect(()=>{loadData();},[loadData]);
  useEffect(()=>{
    const t=setInterval(loadData,5*60*1000);
    return ()=>clearInterval(t);
  },[loadData]);

  const vendors     = data?.vendors??[];
  const weekly      = (data?.weekly??[]).map(w=>({...w,target:TARGET}));
  const today       = data?.today??{};
  const satisfaction= data?.satisfaction??{rate:0};
  const equipment   = data?.equipment??{issues_mois:0,jours_perdus:0,semaines:0,heures:0};
  const hotspots    = data?.hotspots??[];
  const problems    = data?.problems??[];
  const mve         = data?.morning_vs_evening??{};
  const kpis        = data?.kpis_global??{};

  const ranked      = [...vendors].sort((a,b)=>b.ventes-a.ventes);
  const totalVentes = vendors.reduce((s,v)=>s+v.ventes,0);
  const totalXtra   = vendors.reduce((s,v)=>s+v.fanxtra,0);
  const totalChoco  = vendors.reduce((s,v)=>s+v.fanchoco,0);
  const totalVan    = vendors.reduce((s,v)=>s+v.fanvanille,0);
  const totalSku    = totalXtra+totalChoco+totalVan;
  const avgJours    = vendors.length?Math.round(vendors.reduce((s,v)=>s+v.jours,0)/vendors.length):0;
  const avgQPVD     = vendors.length?Math.round(totalSku/vendors.length):0;

  const barData = ranked.map(v=>({
    nom:v.nom.split(" ")[0],
    "Sales k":Math.round(v.ventes/1000),
    "Units":v.fanxtra+v.fanchoco+v.fanvanille,
  }));

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

  const TABS=[
    {id:"overview",  label:"📊 Overview"},
    {id:"vendors",   label:"🏆 Vendors"},
    {id:"today",     label:"⚡ Today"},
    {id:"performance",label:"🎯 Performance"},
  ];

  return (
    <div style={{fontFamily:"'Segoe UI',system-ui,sans-serif",background:C.bg,
      minHeight:"100vh",color:C.text,maxWidth:"100vw",overflowX:"hidden"}}>

      {/* HEADER */}
      <div style={{background:`linear-gradient(135deg,${C.blue} 0%,#0d3d6e 100%)`,
        padding:"14px 16px",display:"flex",alignItems:"center",
        justifyContent:"space-between",position:"sticky",top:0,zIndex:100,
        boxShadow:"0 2px 12px #00000033"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{background:"#fff",borderRadius:8,padding:"4px 10px",
            fontWeight:900,fontSize:16,color:C.blue}}>
            FAN<span style={{color:C.teal}}>MILK</span>
          </div>
          <div>
            <div style={{color:"#fff",fontWeight:700,fontSize:13}}>TOGO · VENDOR SCORECARD</div>
            <div style={{color:"#8eb8e8",fontSize:10}}>{nowStr}</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {isDemo&&<span style={{background:"#f59e0b22",color:"#fbbf24",fontSize:10,
            fontWeight:700,padding:"3px 8px",borderRadius:99}}>DEMO</span>}
          {lastSync&&!isDemo&&<span style={{color:"#8eb8e8",fontSize:10}}>
            Synced {lastSync.toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}
          </span>}
          <button onClick={loadData} style={{background:"#ffffff22",border:"none",
            borderRadius:8,padding:"6px 12px",color:"#fff",fontSize:13,
            fontWeight:700,cursor:"pointer"}}>↻</button>
          <span style={{fontSize:20}}>🇹🇬</span>
        </div>
      </div>

      {error&&<div style={{background:"#fef2f2",borderBottom:"1px solid #fecaca",
        padding:"10px 16px",fontSize:12,color:C.red}}>
        ⚠️ Could not load Sheet ({error}). Showing demo data.
      </div>}
      {isDemo&&!error&&<div style={{background:"#fffbeb",borderBottom:"1px solid #fde68a",
        padding:"10px 16px",fontSize:12,color:"#92400e"}}>
        🛠 Demo mode — Set <strong>VITE_APPS_SCRIPT_URL</strong> in Vercel to load live data.
      </div>}

      {/* TABS */}
      <div style={{background:"#fff",borderBottom:`1px solid ${C.border}`,
        display:"flex",overflowX:"auto",position:"sticky",top:58,zIndex:99}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flex:1,background:"none",border:"none",padding:"12px 8px",
              cursor:"pointer",fontSize:12,fontWeight:700,whiteSpace:"nowrap",
              color:tab===t.id?C.blue:C.muted,minWidth:90,
              borderBottom:tab===t.id?`3px solid ${C.blue}`:"3px solid transparent"}}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{padding:"14px 12px",display:"flex",flexDirection:"column",gap:14}}>

        {/* ══ OVERVIEW ══ */}
        {tab==="overview"&&(<>
          {/* KPI Row 1 */}
          <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
            <KpiCard label="Total Sales MTD"    value={`${fmt(totalVentes)} FCFA`} sub="All zones"           accent={C.blue}   icon="💰"/>
            <KpiCard label="Avg QPVD"           value={avgQPVD}                    sub={`Target: ${TARGET}/day`} accent={C.teal}   icon="📦"/>
            <KpiCard label="Avg Days Worked"    value={`${avgJours}d`}             sub="Target: 27+/mo"      accent={C.orange} icon="📅"/>
            <KpiCard label="Active Vendors"     value={vendors.length}             sub="This month"          accent={C.blueL}  icon="👤"/>
          </div>

          {/* SATISFACTION + EQUIPMENT — côte à côte */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>

            {/* Satisfaction */}
            <div style={{background:C.card,border:`1px solid ${C.border}`,
              borderRadius:12,padding:"14px 12px",textAlign:"center"}}>
              <H>⭐ Satisfaction</H>
              <CircleGauge
                value={satisfaction.rate??0}
                color={satisfaction.rate>=90?C.green:satisfaction.rate>=70?C.orange:C.red}
                label="Satisfied"
                sub={`${satisfaction.aucun_probleme??0}/${satisfaction.total_decla??0} vendors`}
              />
              <div style={{fontSize:11,color:C.muted,marginTop:4}}>
                Based on "No problem" responses
              </div>
            </div>

            {/* Equipment */}
            <div style={{background:C.card,border:`1px solid ${C.border}`,
              borderRadius:12,padding:"14px 12px"}}>
              <H>⚙️ Equipment</H>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                {[
                  ["Issues/mo", equipment.issues_mois??0],
                  ["Days lost", equipment.jours_perdus??0],
                  ["Weeks",     equipment.semaines??0],
                  ["Hours",     equipment.heures??0],
                ].map(([l,v])=>(
                  <div key={l} style={{textAlign:"center",background:"#f0f7ff",borderRadius:8,padding:"8px 4px"}}>
                    <div style={{fontSize:20,fontWeight:900,
                      color:v>0?C.red:C.green}}>{v}</div>
                    <div style={{fontSize:9,color:C.muted,fontWeight:700,textTransform:"uppercase"}}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{textAlign:"center"}}>
                <Badge color={equipment.statut==="OK"?C.green:C.red}>
                  {equipment.statut==="OK"?"✅ Zero downtime":"⚠️ Issues detected"}
                </Badge>
              </div>
            </div>
          </div>

          {/* KPI Row 2 */}
          <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
            <KpiCard label="Total Units"    value={totalSku}                   sub={`Xtra ${totalXtra} · Choco ${totalChoco} · Van. ${totalVan}`} accent={C.purple} icon="🍦"/>
            <KpiCard label="QPVD vs Target" value={`${pct(avgQPVD,TARGET)}%`} sub={`${avgQPVD}/${TARGET} units`} accent={avgQPVD>=TARGET?C.green:C.orange} icon="🎯"/>
            <KpiCard label="Non-Sale Rate"  value={`${kpis.taux_non_vente??0}%`} sub="Didn't sell today" accent={C.orange} icon="📉"/>
            <KpiCard label="Today's Satisf." value={`${today.satisfaction_today??0}%`} sub="Today only" accent={(today.satisfaction_today??0)>=70?C.green:C.red} icon="💬"/>
          </div>

          {/* Weekly QPVD */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 12px"}}>
            <H>📈 Weekly QPVD Trend</H>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={weekly} margin={{left:-10,right:10}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5edf7"/>
                <XAxis dataKey="sem" tick={{fontSize:10}}/>
                <YAxis tick={{fontSize:10}} domain={[0,"auto"]}/>
                <Tooltip/>
                <Legend wrapperStyle={{fontSize:11}}/>
                <Line type="monotone" dataKey="qpvd"   stroke={C.teal}   strokeWidth={2.5} dot={{r:3}} name="QPVD"/>
                <Line type="monotone" dataKey="target" stroke={C.orange} strokeWidth={1.5} strokeDasharray="5 4" dot={false} name="Target"/>
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* SKU + Hotspots */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            {/* SKU */}
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 12px"}}>
              <H>🍦 SKU Split</H>
              {[
                {label:"FanXtra",  val:totalXtra, color:C.blue},
                {label:"FanChoco", val:totalChoco,color:C.purple},
                {label:"FanVan.",  val:totalVan,  color:C.orange},
              ].map(({label,val,color})=>(
                <div key={label} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",
                    fontSize:11,fontWeight:700,color}}>
                    <span>{label}</span>
                    <span>{val} · {pct(val,totalSku||1)}%</span>
                  </div>
                  <Bar2 value={val} max={totalSku||1} color={color}/>
                </div>
              ))}
            </div>

            {/* Hotspots */}
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 12px"}}>
              <H>📍 Top Locations</H>
              {hotspots.slice(0,5).map((h,i)=>(
                <div key={i} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",
                    fontSize:11,fontWeight:700,marginBottom:3}}>
                    <span>{["🥇","🥈","🥉","4️⃣","5️⃣"][i]} {h.lieu}</span>
                    <span style={{color:C.blue}}>{h.count}</span>
                  </div>
                  <Bar2 value={h.count} max={hotspots[0]?.count||1} color={C.blue}/>
                </div>
              ))}
            </div>
          </div>

          {/* Morning vs Evening */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 12px"}}>
            <H>🌅 Morning vs Evening</H>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {[
                {label:"🌄 Morning (0h-12h59)",data:mve.morning,color:C.orange},
                {label:"🌙 Evening (13h-23h59)",data:mve.evening,color:C.blue},
              ].map(({label,data:d,color})=>(
                <div key={label} style={{background:"#f8fafd",borderRadius:10,padding:"12px",
                  borderLeft:`4px solid ${color}`}}>
                  <div style={{fontWeight:700,fontSize:11,color,marginBottom:8}}>{label}</div>
                  {[
                    ["Declarations",d?.declarations??0],
                    ["Sales",`${fmt(d?.ventes??0)} F`],
                    ["Avg/decl.",`${fmt(d?.avg??0)} F`],
                  ].map(([l,v])=>(
                    <div key={l} style={{display:"flex",justifyContent:"space-between",
                      fontSize:11,marginBottom:4}}>
                      <span style={{color:C.muted}}>{l}</span>
                      <span style={{fontWeight:700}}>{v}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Picture of Success */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 12px"}}>
            <H>🎯 Picture of Success</H>
            {[
              {goal:`QPVD ≥ ${TARGET} units/day (current: ${avgQPVD})`,             ok:avgQPVD>=TARGET},
              {goal:`Zero equipment downtime (issues this month: ${equipment.issues_mois??0})`, ok:(equipment.issues_mois??0)===0},
              {goal:`Vendors active ≥ 27d/mo (avg: ${avgJours}d)`,                  ok:avgJours>=27},
              {goal:"QPVD > 200 units/day (stretch goal)",                           ok:avgQPVD>=200},
              {goal:`Vendor satisfaction ≥ 90% (current: ${satisfaction.rate??0}%)`, ok:(satisfaction.rate??0)>=90},
            ].map(({goal,ok},i)=>(
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

        {/* ══ VENDORS ══ */}
        {tab==="vendors"&&(<>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 12px"}}>
            <H>🏆 Vendor League</H>
            <ResponsiveContainer width="100%" height={ranked.length*52+40}>
              <BarChart data={barData} layout="vertical" margin={{left:0,right:10}}>
                <XAxis type="number" tick={{fontSize:10}}/>
                <YAxis type="category" dataKey="nom" tick={{fontSize:11}} width={55}/>
                <Tooltip/>
                <Legend wrapperStyle={{fontSize:11}}/>
                <Bar dataKey="Sales k" fill={C.blueL} radius={[0,4,4,0]}/>
                <Bar dataKey="Units"   fill={C.teal}  radius={[0,4,4,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {ranked.map((v,i)=>{
            const pieces=v.fanxtra+v.fanchoco+v.fanvanille;
            const g=grow(v.ventes,v.prev_ventes||0);
            const medal=["🥇","🥈","🥉"][i]??`${i+1}`;
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
                  <div style={{display:"flex",gap:6,alignItems:"center"}}>
                    {g!==0&&<Badge color={g>=0?C.green:C.red}>{g>=0?"+":""}{g}%</Badge>}
                    <Badge color={v.jours>=27?C.green:C.orange}>{v.jours}d</Badge>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
                  {[
                    {l:"Sales",  v2:`${fmt(v.ventes)}F`, c:C.blue},
                    {l:"Units",  v2:pieces,               c:C.teal},
                    {l:"FanXtra",v2:v.fanxtra,            c:C.purple},
                    {l:"Choco",  v2:v.fanchoco,           c:C.orange},
                  ].map(({l,v2,c})=>(
                    <div key={l} style={{textAlign:"center",background:"#f8fafd",
                      borderRadius:8,padding:"6px 4px"}}>
                      <div style={{fontSize:9,color:C.muted,fontWeight:700,
                        textTransform:"uppercase",marginBottom:3}}>{l}</div>
                      <div style={{fontSize:13,fontWeight:800,color:c}}>{v2}</div>
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

        {/* ══ TODAY ══ */}
        {tab==="today"&&(<>
          <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
            <KpiCard label="Declarations"  value={today.nb_declarations??0}    sub="WhatsApp today"   accent={C.blue}   icon="💬"/>
            <KpiCard label="Active Vendors" value={today.vendors_actifs??0}    sub="Reported today"   accent={C.teal}   icon="👤"/>
            <KpiCard label="Sales Today"   value={`${fmt(today.ventes_total??0)} F`} sub="FCFA"       accent={C.green}  icon="💰"/>
            <KpiCard label="Satisfaction"  value={`${today.satisfaction_today??0}%`} sub="Today only" accent={(today.satisfaction_today??0)>=70?C.green:C.red} icon="⭐"/>
          </div>

          {/* Today SKU */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 12px"}}>
            <H>⚡ Today's SKU</H>
            {(()=>{
              const tot=(today.fanxtra_total??0)+(today.fanchoco_total??0)+(today.fanvan_total??0);
              return [
                {label:"FanXtra",  val:today.fanxtra_total??0,  color:C.blue},
                {label:"FanChoco", val:today.fanchoco_total??0, color:C.purple},
                {label:"FanVanille",val:today.fanvan_total??0,  color:C.orange},
              ].map(({label,val,color})=>(
                <div key={label} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",
                    fontSize:12,fontWeight:700,color}}>
                    <span>{label}</span><span>{val} units · {pct(val,tot||1)}%</span>
                  </div>
                  <Bar2 value={val} max={tot||1} color={color}/>
                </div>
              ));
            })()}
          </div>

          {/* Live feed */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 12px"}}>
            <H>🔴 Live Feed — Today's Declarations</H>
            {(today.last_declarations??[]).length===0&&(
              <div style={{textAlign:"center",color:C.muted,fontSize:12,padding:"20px 0"}}>
                No declarations yet today
              </div>
            )}
            {(today.last_declarations??[]).map((d,i)=>{
              const ok=d.cat==="Aucun probleme"||d.cat==="";
              return (
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,
                  padding:"8px 0",
                  borderBottom:i<(today.last_declarations.length-1)?`1px solid ${C.border}`:"none"}}>
                  <div style={{background:C.blue,color:"#fff",borderRadius:6,
                    padding:"3px 7px",fontSize:10,fontWeight:700,flexShrink:0}}>
                    {d.heure}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:12}}>
                      {d.nom}
                      <span style={{color:C.muted,fontWeight:400}}> · {d.depot}</span>
                    </div>
                    <div style={{fontSize:11,color:C.muted}}>
                      {d.statut} · {fmt(d.ventes)} FCFA · {(d.xtra||0)+(d.choco||0)+(d.van||0)} units
                    </div>
                  </div>
                  <span style={{fontSize:14,flexShrink:0}}>{ok?"✅":"⚠️"}</span>
                </div>
              );
            })}
          </div>
        </>)}

        {/* ══ PERFORMANCE ══ */}
        {tab==="performance"&&(<>
          {/* QPVD */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,
            padding:"20px 16px",textAlign:"center"}}>
            <H>📊 QPVD Performance</H>
            <div style={{fontSize:64,fontWeight:900,lineHeight:1,
              color:avgQPVD>=TARGET?C.green:C.orange}}>{avgQPVD}</div>
            <div style={{color:C.muted,fontSize:13,margin:"6px 0 2px"}}>units / day (average)</div>
            <div style={{color:C.muted,fontSize:11}}>Target: {TARGET} units/day</div>
            <div style={{margin:"14px auto",maxWidth:260}}>
              <Bar2 value={avgQPVD} max={TARGET*1.5} color={avgQPVD>=TARGET?C.green:C.orange}/>
            </div>
            <Badge color={avgQPVD>=TARGET?C.green:C.orange}>
              {avgQPVD>=TARGET?"✅":""} {pct(avgQPVD,TARGET)}% of target
            </Badge>
          </div>

          {/* Problems */}
          {problems.length>0&&(
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 12px"}}>
              <H>🚨 Issues This Month</H>
              {problems.map((p,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",padding:"8px 0",
                  borderBottom:i<problems.length-1?`1px solid ${C.border}`:"none"}}>
                  <span style={{fontSize:12}}>{p.categorie}</span>
                  <Badge color={p.count>3?C.red:C.orange}>{p.count} reports</Badge>
                </div>
              ))}
            </div>
          )}

          {/* Depot performance */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 12px"}}>
            <H>🏪 Performance by Depot</H>
            {Object.entries(
              vendors.reduce((acc,v)=>{
                if(!acc[v.depot])acc[v.depot]={count:0,ventes:0,fx:0,fc:0,fv:0,jours:0};
                acc[v.depot].count++; acc[v.depot].ventes+=v.ventes;
                acc[v.depot].fx+=v.fanxtra; acc[v.depot].fc+=v.fanchoco;
                acc[v.depot].fv+=v.fanvanille; acc[v.depot].jours+=v.jours;
                return acc;
              },{})
            ).sort((a,b)=>b[1].ventes-a[1].ventes).map(([depot,d],i)=>{
              const avgJ2=Math.round(d.jours/d.count);
              return (
                <div key={i} style={{border:`1px solid ${C.border}`,borderRadius:10,
                  padding:"12px",marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",
                    alignItems:"center",marginBottom:8}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:13}}>{depot}</div>
                      <div style={{fontSize:11,color:C.muted}}>{d.count} vendor{d.count>1?"s":""}</div>
                    </div>
                    <Badge color={d.ventes>50000?C.green:C.orange}>
                      {d.ventes>50000?"✅ On track":"⚠️ Monitor"}
                    </Badge>
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
                    {[
                      {l:"Sales",  v:`${fmt(d.ventes)}F`},
                      {l:"Xtra",   v:d.fx},{l:"Choco",v:d.fc},
                      {l:"Vanille",v:d.fv},
                      {l:"Days",   v:<Badge color={avgJ2>=27?C.green:C.orange}>{avgJ2}d</Badge>},
                      {l:"Units",  v:d.fx+d.fc+d.fv},
                    ].map(({l,v})=>(
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

      <div style={{textAlign:"center",padding:"14px 16px 28px",
        color:C.muted,fontSize:10,borderTop:`1px solid ${C.border}`}}>
        FANMILK TOGO · Vendor Scorecard · WhatsApp Bot → Google Sheets → Live Dashboard
      </div>
      <style>{`*{box-sizing:border-box;}body{margin:0;}
        ::-webkit-scrollbar{height:4px;width:4px;}
        ::-webkit-scrollbar-thumb{background:#c7d8f0;border-radius:99px;}`}
      </style>
    </div>
  );
}
