import { useState, useEffect, useCallback } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, Cell
} from "recharts";

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL || "";

const C = {
  blue:"#1a5fa8", blueL:"#3a7fd4", teal:"#0d8a7c", tealL:"#1ab8a6",
  green:"#16a34a", orange:"#d97706", red:"#dc2626", purple:"#7c3aed",
  bg:"#f0f4f9", card:"#ffffff", border:"#dce5f0", text:"#1a2d4a", muted:"#6b84a3",
};
const DEPOT_COLORS = ["#1a5fa8","#0d8a7c","#7c3aed","#d97706","#dc2626","#16a34a","#e91e63"];

const DEMO = {
  today_date:"23/06/2026",
  vendors:[
    {nom:"Sena D.",  depot:"NADONIELLA A",ventes:95000,fanxtra:52,fanchoco:33,fanvanille:17,jours:27,prev_ventes:80000},
    {nom:"Kofi A.",  depot:"GERM DOSSEH", ventes:87000,fanxtra:45,fanchoco:28,fanvanille:14,jours:26,prev_ventes:72000},
    {nom:"Afi B.",   depot:"SUPER DEPOT", ventes:74000,fanxtra:38,fanchoco:22,fanvanille:10,jours:24,prev_ventes:68000},
    {nom:"Charles",  depot:"GERM DOSSEH", ventes:21825,fanxtra:23,fanchoco:5, fanvanille:17,jours:2, prev_ventes:0},
    {nom:"Simon",    depot:"GERM DOSSEH", ventes:13000,fanxtra:39,fanchoco:3, fanvanille:40,jours:1, prev_ventes:0},
    {nom:"René",     depot:"YEHONAM",     ventes:11000,fanxtra:30,fanchoco:5, fanvanille:32,jours:1, prev_ventes:0},
  ],
  weekly:[
    {sem:"W1",qpvd:45},{sem:"W2",qpvd:58},{sem:"W3",qpvd:62},
    {sem:"W4",qpvd:71},{sem:"W5",qpvd:68},{sem:"W6",qpvd:73},{sem:"W7",qpvd:82},
  ],
  today:{
    nb_declarations:13, vendors_uniques:11, vendors_qui_vendent:4,
    ventes_total:49825, fanxtra_total:114, fanchoco_total:36, fanvan_total:72,
    satisfaction_today:77,
    last_declarations:[
      {heure:"12:44",nom:"Simon",  depot:"GERM DOSSEH",statut:"J ai deja vendu",ventes:13000,xtra:39,choco:3,van:40,cat:"Aucun probleme"},
      {heure:"12:30",nom:"René",   depot:"YEHONAM",     statut:"J ai deja vendu",ventes:11000,xtra:30,choco:5,van:32,cat:"Aucun probleme"},
      {heure:"11:21",nom:"Hervé",  depot:"GERM DOSSEH",statut:"Je vais vendre", ventes:0,    xtra:0, choco:0,van:0, cat:"Aucun probleme"},
      {heure:"09:29",nom:"Charles",depot:"GERM DOSSEH",statut:"Je vais vendre", ventes:8825, xtra:23,choco:5,van:17,cat:"Aucun probleme"},
      {heure:"09:01",nom:"Kodjovi",depot:"SAINT MARTIN",statut:"Je vais vendre",ventes:0,   xtra:0, choco:0,van:0, cat:"Aucun probleme"},
    ],
  },
  depots:[
    {nom:"GERM DOSSEH", declarations:8, nb_vendors:4, ventes:95000, fanxtra:90, fanchoco:40, fanvan:55, pieces:185},
    {nom:"NBUKE RAMCO",  declarations:3, nb_vendors:3, ventes:35000, fanxtra:75, fanchoco:15, fanvan:0,  pieces:90},
    {nom:"NADONIELLA A", declarations:2, nb_vendors:1, ventes:21000, fanxtra:20, fanchoco:12, fanvan:8,  pieces:40},
    {nom:"YEHONAM",      declarations:2, nb_vendors:2, ventes:14000, fanxtra:22, fanchoco:8,  fanvan:10, pieces:40},
    {nom:"SAINT MARTIN", declarations:2, nb_vendors:2, ventes:8000,  fanxtra:10, fanchoco:5,  fanvan:3,  pieces:18},
  ],
  depot_today:[
    {nom:"GERM DOSSEH", declarations:5, nb_vendors:3, ventes:24000, fanxtra:45, fanchoco:10, fanvan:45, pieces:100},
    {nom:"YEHONAM",     declarations:2, nb_vendors:2, ventes:14000, fanxtra:22, fanchoco:8,  fanvan:10, pieces:40},
    {nom:"NBUKE RAMCO",  declarations:2, nb_vendors:2, ventes:5000,  fanxtra:25, fanchoco:8,  fanvan:0,  pieces:33},
    {nom:"NADONIELLA A", declarations:1, nb_vendors:1, ventes:5000,  fanxtra:10, fanchoco:5,  fanvan:3,  pieces:18},
    {nom:"SAINT MARTIN", declarations:2, nb_vendors:2, ventes:0,     fanxtra:0,  fanchoco:0,  fanvan:0,  pieces:0},
  ],
  satisfaction:{rate:77, aucun_probleme:10, total_decla:13},
  equipment:{issues_mois:0, jours_perdus:0, semaines:0, heures:0, statut:"OK"},
  problems:[{categorie:"Probleme Produit",count:2},{categorie:"Probleme de paiement",count:1}],
  hotspots:[
    {lieu:"Dans les quartiers",count:5},{lieu:"Ecole",count:4},
    {lieu:"Marche",count:3},{lieu:"Carrefour",count:2},
  ],
  morning_vs_evening:{
    morning:{declarations:10,ventes:28825,avg:2883},
    evening:{declarations:3, ventes:21000,avg:7000},
  },
};

const fmt   = n => n>=1000?(n/1000).toFixed(0)+"k":String(n);
const fmtF  = n => Number(n).toLocaleString("fr-FR")+" FCFA";
const pct   = (a,b) => b===0?0:Math.round((a/b)*100);
const grow  = (a,b) => b===0?0:Math.round(((a-b)/b)*100);
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
const CircleGauge = ({value,color,label,sub}) => {
  const r=36,circ=2*Math.PI*r,dash=circ*(value/100),gap=circ-dash;
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6}}>
      <div style={{position:"relative",width:100,height:100}}>
        <svg width={100} height={100} style={{transform:"rotate(-90deg)"}}>
          <circle cx={50} cy={50} r={r} fill="none" stroke="#e2eaf4" strokeWidth={10}/>
          <circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={10}
            strokeDasharray={`${dash} ${gap}`} strokeLinecap="round"/>
        </svg>
        <div style={{position:"absolute",top:"50%",left:"50%",
          transform:"translate(-50%,-50%)",textAlign:"center"}}>
          <div style={{fontSize:20,fontWeight:900,color,lineHeight:1}}>{value}%</div>
          <div style={{fontSize:8,color:C.muted,fontWeight:600,textTransform:"uppercase"}}>{label}</div>
        </div>
      </div>
      {sub&&<div style={{fontSize:11,color:C.muted,textAlign:"center"}}>{sub}</div>}
    </div>
  );
};

export default function App() {
  const [data,setData]        = useState(null);
  const [loading,setLoading]  = useState(true);
  const [error,setError]      = useState(null);
  const [isDemo,setIsDemo]    = useState(false);
  const [tab,setTab]          = useState("overview");
  const [lastSync,setLastSync]= useState(null);

  const nowStr = new Date().toLocaleDateString("en-GB",{
    weekday:"long",day:"2-digit",month:"long",year:"numeric"
  });

  const loadData = useCallback(async()=>{
    setLoading(true); setError(null);
    if (!APPS_SCRIPT_URL) {
      await new Promise(r=>setTimeout(r,500));
      setData(DEMO); setIsDemo(true); setLoading(false);
      setLastSync(new Date()); return;
    }
    try {
      const res=await fetch(APPS_SCRIPT_URL);
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const json=await res.json();
      if(json.error) throw new Error(json.error);
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

  const ov          = data?.overview??{};
  const vendors     = data?.vendors??[];
  const weekly      = (data?.weekly??[]).map(w=>({...w,target:TARGET}));
  const today       = data?.today??{};
  const depots      = data?.depots??[];
  const depotToday  = data?.depot_today??[];
  const satisfaction= data?.satisfaction??{rate:0};
  const equipment   = data?.equipment??{issues_mois:0,issues_today:0,jours_perdus:0,semaines:0,heures:0};
  const hotspots    = data?.hotspots??[];
  const problems    = data?.problems??[];
  const yest        = data?.yesterday_sales ?? data?.yesterday ?? {ventes:0,xtra:0,choco:0,van:0,nb:0,date:""};
  const mve         = data?.morning_vs_evening??{};

  const ranked      = [...vendors].sort((a,b)=>b.ventes-a.ventes);
  // Valeurs calculées côté Apps Script (robustes)
  const totalVentes = ov.total_ventes_mtd  ?? vendors.reduce((s,v)=>s+v.ventes,0);
  const totalXtra   = ov.total_xtra_mtd    ?? vendors.reduce((s,v)=>s+v.fanxtra,0);
  const totalChoco  = ov.total_choco_mtd   ?? vendors.reduce((s,v)=>s+v.fanchoco,0);
  const totalVan    = ov.total_van_mtd     ?? vendors.reduce((s,v)=>s+v.fanvanille,0);
  const totalSku    = ov.total_pieces_mtd  ?? (totalXtra+totalChoco+totalVan);
  const avgJours    = ov.avg_jours         ?? 0;
  const avgQPVD     = ov.qpvd             ?? 0;
  const avgVentes   = ov.avg_ventes_vendor ?? 0;

  // Bar chart dépôts (sales)
  const depotBarData = depots.slice(0,6).map(d=>({
    name: d.nom.replace(" ","  "),
    "Sales FCFA": Math.round(d.ventes/1000),
    "Units": d.pieces,
    "Vendors": d.nb_vendors,
  }));

  // Bar chart dépôts aujourd'hui
  const depotTodayData = depotToday.slice(0,6).map(d=>({
    name: d.nom.split(" ")[0],
    "Sales k": Math.round(d.ventes/1000),
    "Units": d.pieces,
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
    {id:"overview",    label:"📊 Overview"},
    {id:"depots",      label:"🏪 Depots"},
    {id:"vendors",     label:"🏆 Vendors"},
    {id:"today",       label:"⚡ Today"},
    {id:"yesterday",   label:"📅 Yesterday"},
    {id:"performance", label:"🎯 Perf."},
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
        🛠 Demo — Set <strong>VITE_APPS_SCRIPT_URL</strong> in Vercel env vars to see live data.
      </div>}

      {/* TABS */}
      <div style={{background:"#fff",borderBottom:`1px solid ${C.border}`,
        display:"flex",overflowX:"auto",position:"sticky",top:58,zIndex:99}}>
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{flex:1,background:"none",border:"none",padding:"12px 6px",
              cursor:"pointer",fontSize:11,fontWeight:700,whiteSpace:"nowrap",
              color:tab===t.id?C.blue:C.muted,minWidth:70,
              borderBottom:tab===t.id?`3px solid ${C.blue}`:"3px solid transparent"}}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{padding:"14px 12px",display:"flex",flexDirection:"column",gap:14}}>

        {/* ══ OVERVIEW ══ */}
        {tab==="overview"&&(<>
          <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
            <KpiCard label="Total Sales MTD"     value={`${fmt(totalVentes)} FCFA`}   sub="All depots — this month"      accent={C.blue}   icon="💰"/>
            <KpiCard label="Avg Sales / Vendor"  value={`${fmt(avgVentes)} FCFA`}     sub={`${ov.nb_vendors_actifs??0} active vendors`} accent={C.teal}   icon="📊"/>
            <KpiCard label="Avg QPVD"            value={avgQPVD}                       sub={`Target: ${TARGET} units/day`} accent={C.purple} icon="📦"/>
            <KpiCard label="Avg Days Worked"     value={`${avgJours}d`}               sub="Target: 27+/mo"               accent={C.orange} icon="📅"/>
          </div>

          {/* Ventes du jour */}
          <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
            <KpiCard label="Sales TODAY"         value={`${fmt(ov.ventes_today??0)} FCFA`}    sub={`${ov.vendors_qui_vendent??0} vendors sold today`} accent={C.green}  icon="💰"/>
            <KpiCard label="Units TODAY"         value={ov.pieces_today??0}                    sub={`Xtra ${ov.xtra_today??0} · Choco ${ov.choco_today??0} · Van. ${ov.van_today??0}`} accent={C.teal} icon="🍦"/>
            <KpiCard label="Vendors Today"       value={ov.vendors_today??0}                   sub={`${ov.interactions_today??0} total interactions`} accent={C.blueL}  icon="👤"/>
            <KpiCard label="Equipment TODAY"     value={(ov.pb_equip_today??0)===0?"✅ 0":"⚠️ "+(ov.pb_equip_today??0)} sub={(ov.pb_equip_today??0)>0?"Issues reported today":"Zero issues today"} accent={(ov.pb_equip_today??0)>0?C.red:C.green} icon="⚙️"/>
          </div>

          {/* Satisfaction + Equipment */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={{background:C.card,border:`1px solid ${C.border}`,
              borderRadius:12,padding:"14px 12px",textAlign:"center"}}>
              <H>⭐ Satisfaction</H>
              <CircleGauge
                value={satisfaction.rate??0}
                color={(satisfaction.rate??0)>=90?C.green:(satisfaction.rate??0)>=70?C.orange:C.red}
                label="Satisfied"
                sub={`${satisfaction.aucun_probleme??0}/${satisfaction.total_decla??0} vendor-days`}
              />
              <div style={{fontSize:10,color:C.muted,marginTop:4}}>Based on "No problem" responses</div>
            </div>
            <div style={{background:C.card,border:`1px solid ${C.border}`,
              borderRadius:12,padding:"14px 12px"}}>
              <H>⚙️ Equipment</H>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
                {[["Issues today",(equipment.issues_today??0)],["Issues/mo",(equipment.issues_mois??0)],
                  ["Days lost",equipment.jours_perdus??0],["Hours",equipment.heures??0]].map(([l,v])=>(
                  <div key={l} style={{textAlign:"center",background:"#f0f7ff",borderRadius:8,padding:"8px 4px"}}>
                    <div style={{fontSize:20,fontWeight:900,color:v>0?C.red:C.green}}>{v}</div>
                    <div style={{fontSize:9,color:C.muted,fontWeight:700,textTransform:"uppercase"}}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{textAlign:"center"}}>
                <Badge color={equipment.statut==="OK"?C.green:C.red}>
                  {(equipment.issues_today??0)>0?"🔴 Issue TODAY!":equipment.statut==="OK"?"✅ Zero downtime":"⚠️ "+equipment.issues_mois+" issue(s) this month"}
                </Badge>
              </div>
            </div>
          </div>

          <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
            <KpiCard label="Total Units MTD"   value={totalSku}                     sub={`Xtra ${totalXtra} · Choco ${totalChoco} · Van. ${totalVan}`} accent={C.purple} icon="🍦"/>
            <KpiCard label="QPVD vs Target"   value={`${pct(avgQPVD,TARGET)}%`}    sub={`${avgQPVD}/${TARGET} units`} accent={avgQPVD>=TARGET?C.green:C.orange} icon="🎯"/>
            <KpiCard label="Today Vendors"    value={today.vendors_uniques??0}      sub={`${today.nb_declarations??0} total interactions`} accent={C.teal} icon="💬"/>
            <KpiCard label="Today's Satisf." value={`${today.satisfaction_today??0}%`} sub="Today only" accent={(today.satisfaction_today??0)>=70?C.green:C.red} icon="⭐"/>
          </div>

          {/* Weekly */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 12px"}}>
            <H>📈 Weekly QPVD Trend</H>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={weekly} margin={{left:-10,right:10}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5edf7"/>
                <XAxis dataKey="sem" tick={{fontSize:10}}/>
                <YAxis tick={{fontSize:10}} domain={[0,"auto"]}/>
                <Tooltip formatter={(v,n)=>[v,n]}/>
                <Legend wrapperStyle={{fontSize:11}}/>
                <Line type="monotone" dataKey="qpvd"   stroke={C.teal}   strokeWidth={2.5} dot={{r:3}} name="QPVD (units sold/vendor-day)"/>
                <Line type="monotone" dataKey="target" stroke={C.orange} strokeWidth={1.5} strokeDasharray="5 4" dot={false} name="Target 132"/>
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* SKU + Hotspots */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 12px"}}>
              <H>🍦 SKU Split MTD</H>
              {[
                {label:"FanXtra",  val:totalXtra, color:C.blue},
                {label:"FanChoco", val:totalChoco,color:C.purple},
                {label:"FanVan.",  val:totalVan,  color:C.orange},
              ].map(({label,val,color})=>(
                <div key={label} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,fontWeight:700,color}}>
                    <span>{label}</span><span>{val} · {pct(val,totalSku||1)}%</span>
                  </div>
                  <Bar2 value={val} max={totalSku||1} color={color}/>
                </div>
              ))}
            </div>
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 12px"}}>
              <H>📍 Top Locations</H>
              {hotspots.slice(0,5).map((h,i)=>(
                <div key={i} style={{marginBottom:10}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:11,fontWeight:700,marginBottom:3}}>
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
                  {[["Declarations",d?.declarations??0],["Sales",`${fmt(d?.ventes??0)} FCFA`],["Avg/decl.",`${fmt(d?.avg??0)} FCFA`]].map(([l,v])=>(
                    <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}>
                      <span style={{color:C.muted}}>{l}</span>
                      <span style={{fontWeight:700}}>{v}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </>)}

        {/* ══ DEPOTS ══ */}
        {tab==="depots"&&(<>
          {/* Sales par dépôt - graphique MTD */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 12px"}}>
            <H>🏪 Sales by Depot — MTD (FCFA)</H>
            <ResponsiveContainer width="100%" height={depots.length*52+40}>
              <BarChart data={depotBarData} layout="vertical" margin={{left:0,right:10}}>
                <XAxis type="number" tick={{fontSize:10}} tickFormatter={v=>`${v}k`}/>
                <YAxis type="category" dataKey="name" tick={{fontSize:10}} width={70}/>
                <Tooltip formatter={(v,n)=>n==="Sales FCFA"?[`${v}k FCFA`,n]:[v,n]}/>
                <Legend wrapperStyle={{fontSize:11}}/>
                <Bar dataKey="Sales FCFA" radius={[0,4,4,0]}>
                  {depotBarData.map((_,i)=><Cell key={i} fill={DEPOT_COLORS[i%DEPOT_COLORS.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Cards dépôts MTD */}
          <H>📊 Depot Performance — Month to Date</H>
          {depots.map((d,i)=>(
            <div key={i} style={{background:C.card,border:`1px solid ${C.border}`,
              borderRadius:12,padding:"14px",borderLeft:`4px solid ${DEPOT_COLORS[i%DEPOT_COLORS.length]}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div>
                  <div style={{fontWeight:800,fontSize:14}}>{d.nom}</div>
                  <div style={{fontSize:11,color:C.muted}}>{d.nb_vendors} vendor{d.nb_vendors>1?"s":""} · {d.declarations} declarations</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontWeight:900,fontSize:16,color:DEPOT_COLORS[i%DEPOT_COLORS.length]}}>
                    {fmt(d.ventes)} FCFA
                  </div>
                  <Badge color={d.ventes>50000?C.green:C.orange}>
                    {d.ventes>50000?"✅ On track":"⚠️ Monitor"}
                  </Badge>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>
                {[
                  {l:"FanXtra",  v:d.fanxtra},
                  {l:"FanChoco", v:d.fanchoco},
                  {l:"FanVanille",v:d.fanvan},
                  {l:"Total Units",v:d.pieces},
                  {l:"Vendors",  v:d.nb_vendors},
                  {l:"Declarations",v:d.declarations},
                ].map(({l,v})=>(
                  <div key={l} style={{background:"#f8fafd",borderRadius:8,padding:"6px",textAlign:"center"}}>
                    <div style={{fontSize:9,color:C.muted,fontWeight:700,textTransform:"uppercase"}}>{l}</div>
                    <div style={{fontSize:13,fontWeight:700,marginTop:2}}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Today par dépôt */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 12px"}}>
            <H>⚡ Today's Sales by Depot</H>
            {depotToday.length===0&&(
              <div style={{textAlign:"center",color:C.muted,padding:"20px 0",fontSize:12}}>
                No sales declared today yet
              </div>
            )}
            {depotToday.map((d,i)=>(
              <div key={i} style={{display:"flex",justifyContent:"space-between",
                alignItems:"center",padding:"10px 0",
                borderBottom:i<depotToday.length-1?`1px solid ${C.border}`:"none"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:10,height:10,borderRadius:"50%",
                    background:DEPOT_COLORS[i%DEPOT_COLORS.length],flexShrink:0}}/>
                  <div>
                    <div style={{fontWeight:700,fontSize:13}}>{d.nom}</div>
                    <div style={{fontSize:11,color:C.muted}}>{d.nb_vendors} vendor{d.nb_vendors>1?"s":""} · {d.pieces} units</div>
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontWeight:800,fontSize:14,color:d.ventes>0?C.green:C.muted}}>
                    {d.ventes>0?`${fmt(d.ventes)} FCFA`:"—"}
                  </div>
                  <div style={{fontSize:10,color:C.muted}}>{d.declarations} declarations</div>
                </div>
              </div>
            ))}
          </div>
        </>)}

        {/* ══ VENDORS ══ */}
        {tab==="vendors"&&(<>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 12px"}}>
            <H>🏆 Vendor League — MTD Sales</H>
            <ResponsiveContainer width="100%" height={ranked.length*52+40}>
              <BarChart data={ranked.map(v=>({nom:v.nom.split(" ")[0],"Sales k":Math.round(v.ventes/1000),"Units":v.fanxtra+v.fanchoco+v.fanvanille}))} layout="vertical" margin={{left:0,right:40}}>
                <XAxis type="number" tick={{fontSize:10}}/>
                <YAxis type="category" dataKey="nom" tick={{fontSize:11}} width={55}/>
                <Tooltip/>
                <Legend wrapperStyle={{fontSize:11}}/>
                <Bar dataKey="Sales k" fill={C.blueL} radius={[0,4,4,0]} label={{position:"right",fontSize:9,fill:C.blue,formatter:function(v){return v+"k"}}}/>
                <Bar dataKey="Units"   fill={C.teal}  radius={[0,4,4,0]} label={{position:"right",fontSize:9,fill:C.teal}}/>
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
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
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
                  {[{l:"Sales",v2:`${fmt(v.ventes)} F`,c:C.blue},{l:"Units",v2:pieces,c:C.teal},
                    {l:"FanXtra",v2:v.fanxtra,c:C.purple},{l:"Days",v2:`${v.jours}d`,c:v.jours>=27?C.green:C.orange}
                  ].map(({l,v2,c})=>(
                    <div key={l} style={{textAlign:"center",background:"#f8fafd",borderRadius:8,padding:"6px 4px"}}>
                      <div style={{fontSize:9,color:C.muted,fontWeight:700,textTransform:"uppercase",marginBottom:3}}>{l}</div>
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
          {/* Règle ventes */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"10px 12px"}}>
              <div style={{fontWeight:700,fontSize:12,color:C.green,marginBottom:4}}>✅ Today's Sales</div>
              <div style={{fontSize:11,color:"#166534"}}>"J'ai déjà vendu" → figures = <strong>TODAY</strong></div>
            </div>
            <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,padding:"10px 12px"}}>
              <div style={{fontWeight:700,fontSize:12,color:C.blue,marginBottom:4}}>📅 Yesterday's Sales</div>
              <div style={{fontSize:11,color:"#1e40af"}}>"Je vais vendre" / "Non" → figures = <strong>YESTERDAY</strong></div>
            </div>
          </div>

          {/* KPIs today */}
          <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
            <KpiCard label="Unique Vendors"      value={today.vendors_uniques??0}      sub={`${today.nb_declarations??0} total interactions`} accent={C.teal}   icon="👤"/>
            <KpiCard label="Already Sold Today"  value={today.vendors_qui_vendent??0}  sub="Confirmed sales today"   accent={C.green}  icon="✅"/>
            <KpiCard label="Sales TODAY"         value={`${fmt(today.ventes_total??0)} FCFA`} sub="'J ai deja vendu' only" accent={C.green} icon="💰"/>
            <KpiCard label="Today's Satisf."    value={`${today.satisfaction_today??0}%`} sub="Today only" accent={(today.satisfaction_today??0)>=70?C.green:C.red} icon="⭐"/>
          </div>

          {/* Ventes d'hier reportées */}
          {data?.yesterday&&(
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 12px"}}>
              <H>📅 Yesterday's Sales (reported this morning)</H>
              <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
                <KpiCard label="Sales Yesterday" value={`${fmt(data.yesterday.ventes_total??0)} FCFA`} sub={data.yesterday.date} accent={C.blue} icon="💰"/>
                <KpiCard label="FanXtra"  value={data.yesterday.fanxtra_total??0}  sub="units" accent={C.blue}   icon="🍦"/>
                <KpiCard label="FanChoco" value={data.yesterday.fanchoco_total??0} sub="units" accent={C.purple} icon="🍦"/>
                <KpiCard label="FanVan."  value={data.yesterday.fanvan_total??0}   sub="units" accent={C.orange} icon="🍦"/>
              </div>
            </div>
          )}

          {/* SKU today */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 12px"}}>
            <H>⚡ Today's SKU (confirmed sales only)</H>
            {(()=>{
              const tot=(today.fanxtra_total??0)+(today.fanchoco_total??0)+(today.fanvan_total??0);
              return [
                {label:"FanXtra",  val:today.fanxtra_total??0,  color:C.blue},
                {label:"FanChoco", val:today.fanchoco_total??0, color:C.purple},
                {label:"FanVanille",val:today.fanvan_total??0,  color:C.orange},
              ].map(({label,val,color})=>(
                <div key={label} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:12,fontWeight:700,color}}>
                    <span>{label}</span><span>{val} units · {pct(val,tot||1)}%</span>
                  </div>
                  <Bar2 value={val} max={tot||1} color={color}/>
                </div>
              ));
            })()}
          </div>

          {/* Live feed */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 12px"}}>
            <H>🔴 Live Feed — All Today's Declarations</H>
            {(today.last_declarations??[]).length===0&&(
              <div style={{textAlign:"center",color:C.muted,fontSize:12,padding:"20px 0"}}>No declarations today</div>
            )}
            {(today.last_declarations??[]).map((d,i)=>{
              const ok=d.cat==="Aucun probleme"||d.cat==="";
              const isVente=d.statut==="J ai deja vendu";
              return (
                <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",
                  borderBottom:i<(today.last_declarations.length-1)?`1px solid ${C.border}`:"none"}}>
                  <div style={{background:isVente?C.green:C.blue,color:"#fff",borderRadius:6,
                    padding:"3px 7px",fontSize:10,fontWeight:700,flexShrink:0}}>{d.heure}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontWeight:700,fontSize:12}}>
                      {d.nom}<span style={{color:C.muted,fontWeight:400}}> · {d.depot}</span>
                    </div>
                    <div style={{fontSize:11,color:C.muted}}>
                      {isVente?"💰 Sold today":"🌅 Will sell"} · {d.ventes>0?`${fmt(d.ventes)} FCFA · ${(d.xtra||0)+(d.choco||0)+(d.van||0)} units`:"no figures yet"}
                    </div>
                  </div>
                  <span style={{fontSize:14,flexShrink:0}}>{ok?"✅":"⚠️"}</span>
                </div>
              );
            })}
          </div>
        </>)}

        {/* ══ YESTERDAY ══ */}
        {tab==="yesterday"&&(<>
          {/* Note */}
          <div style={{background:"#eff6ff",border:"1px solid #bfdbfe",borderRadius:10,
            padding:"10px 14px",fontSize:12,color:C.blue}}>
            📅 <strong>Yesterday's sales</strong> = all vendors who declared
            <em> "Je vais vendre"</em> or <em>"Je ne vends pas"</em> today
            (their figures = yesterday's sales) + all declarations from yesterday.
          </div>

          {/* KPIs hier */}
          <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
            <KpiCard label="Sales Yesterday"  value={`${fmt(yest.ventes??0)} FCFA`}
              sub={yest.date||"—"} accent={C.blue} icon="💰"/>
            <KpiCard label="Vendors"          value={yest.nb_vendors??0}
              sub={`${yest.nb??0} declarations`} accent={C.teal} icon="👤"/>
            <KpiCard label="FanXtra"          value={yest.xtra??0}
              sub="units" accent={C.blue} icon="🍦"/>
            <KpiCard label="FanChoco"         value={yest.choco??0}
              sub="units" accent={C.purple} icon="🍦"/>
          </div>

          <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
            <KpiCard label="FanVanille"       value={yest.van??0}
              sub="units" accent={C.orange} icon="🍦"/>
            <KpiCard label="Total Units"      value={(yest.xtra??0)+(yest.choco??0)+(yest.van??0)}
              sub="All SKUs yesterday" accent={C.purple} icon="📦"/>
          </div>

          {/* SKU split hier */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 12px"}}>
            <H>🍦 Yesterday's SKU Breakdown</H>
            {(()=>{
              const tot=(yest.xtra??0)+(yest.choco??0)+(yest.van??0);
              return [
                {label:"FanXtra",   val:yest.xtra??0,  color:C.blue},
                {label:"FanChoco",  val:yest.choco??0, color:C.purple},
                {label:"FanVanille",val:yest.van??0,   color:C.orange},
              ].map(({label,val,color})=>(
                <div key={label} style={{marginBottom:12}}>
                  <div style={{display:"flex",justifyContent:"space-between",
                    fontSize:12,fontWeight:700,color}}>
                    <span>{label}</span>
                    <span>{val} units · {pct(val,tot||1)}%</span>
                  </div>
                  <Bar2 value={val} max={tot||1} color={color}/>
                </div>
              ));
            })()}
          </div>

          {/* Dépôts hier */}
          {(data?.depot_yesterday??[]).length>0&&(
            <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 12px"}}>
              <H>🏪 Yesterday by Depot</H>
              {(data?.depot_yesterday??[]).map((d,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",padding:"10px 0",
                  borderBottom:i<(data.depot_yesterday.length-1)?`1px solid ${C.border}`:"none"}}>
                  <div style={{display:"flex",alignItems:"center",gap:10}}>
                    <div style={{width:10,height:10,borderRadius:"50%",
                      background:["#1a5fa8","#0d8a7c","#7c3aed","#d97706","#dc2626","#16a34a"][i%6],
                      flexShrink:0}}/>
                    <div>
                      <div style={{fontWeight:700,fontSize:13}}>{d.nom}</div>
                      <div style={{fontSize:11,color:C.muted}}>{d.nb_vendors} vendor{d.nb_vendors>1?"s":""} · {d.pieces} units</div>
                    </div>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontWeight:800,fontSize:14,color:d.ventes>0?C.green:C.muted}}>
                      {d.ventes>0?`${fmt(d.ventes)} FCFA`:"—"}
                    </div>
                    <div style={{fontSize:10,color:C.muted}}>{d.declarations} declarations</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>)}

        {/* ══ PERFORMANCE ══ */}
        {tab==="performance"&&(<>
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,
            padding:"20px 16px",textAlign:"center"}}>
            <H>📊 QPVD Performance</H>
            <div style={{fontSize:64,fontWeight:900,lineHeight:1,
              color:avgQPVD>=TARGET?C.green:C.orange}}>{avgQPVD}</div>
            <div style={{color:C.muted,fontSize:13,margin:"6px 0 2px"}}>units / vendor-day</div>
            <div style={{color:C.muted,fontSize:11}}>Target: {TARGET} units/day</div>
            <div style={{margin:"14px auto",maxWidth:260}}>
              <Bar2 value={avgQPVD} max={TARGET*1.5} color={avgQPVD>=TARGET?C.green:C.orange}/>
            </div>
            <Badge color={avgQPVD>=TARGET?C.green:C.orange}>
              {avgQPVD>=TARGET?"✅ ":""}{pct(avgQPVD,TARGET)}% of target
            </Badge>
          </div>

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

          {/* Picture of Success */}
          <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px 12px"}}>
            <H>🎯 Picture of Success</H>
            {[
              {goal:`QPVD ≥ ${TARGET} units/day (current: ${avgQPVD})`,            ok:avgQPVD>=TARGET},
              {goal:`Zero equipment downtime (issues: ${equipment.issues_mois??0})`, ok:(equipment.issues_mois??0)===0},
              {goal:`Vendors active ≥ 27d/mo (avg: ${avgJours}d)`,                  ok:avgJours>=27},
              {goal:"QPVD > 200 units/day (stretch)",                               ok:avgQPVD>=200},
              {goal:`Satisfaction ≥ 90% (current: ${satisfaction.rate??0}%)`,        ok:(satisfaction.rate??0)>=90},
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
      </div>

      <div style={{textAlign:"center",padding:"14px 16px 28px",
        color:C.muted,fontSize:10,borderTop:`1px solid ${C.border}`}}>
        FANMILK TOGO · Vendor Scorecard · WhatsApp → Google Sheets → Live Dashboard
      </div>
      <style>{`*{box-sizing:border-box;}body{margin:0;}
        ::-webkit-scrollbar{height:4px;width:4px;}
        ::-webkit-scrollbar-thumb{background:#c7d8f0;border-radius:99px;}`}</style>
    </div>
  );
}
