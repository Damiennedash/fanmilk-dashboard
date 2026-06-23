// ============================================================
//  FANMILK TOGO — Apps Script Web App v3
//  Corrections :
//  ✅ Déclarations = vendors uniques du jour (pas lignes)
//  ✅ Ventes aujourd'hui = seulement "J ai deja vendu" du jour
//  ✅ Sales par dépôt depuis Réponses (plus fiable que Vendors)
//  ✅ Doublons ignorés (même vendor 2x dans la journée)
//  ✅ FCFA partout
// ============================================================

var SHEET_ID       = "COLLEZ_VOTRE_SHEET_ID_ICI";
var SHEET_VENDORS  = "Vendors";
var SHEET_REPONSES = "Reponses Vendors";
var TIMEZONE       = "Africa/Lome";

// Colonnes Vendors (A=0)
var V_PHONE=0,V_NOM=1,V_DEPOT=2,V_LAST_DEC=3;
var V_VENTES=4,V_FANXTRA=5,V_FANCHOCO=6,V_FANVAN=7,V_PIECES=8,V_DATE_V=9;

// Colonnes Reponses Vendors (A=0)
var R_DATE=0,R_HEURE=1,R_PERIODE=2,R_PHONE=3,R_NOM=4,R_DEPOT=5;
var R_STATUT=6,R_VENTES=7,R_XTRA=8,R_CHOCO=9,R_VAN=10;
var R_LIEU=11,R_CAT=12,R_PRIME=13,R_COMM=14;


// ============================================================
//  POINT D'ENTRÉE
// ============================================================
function doGet(e) {
  try {
    var output = ContentService.createTextOutput(JSON.stringify(buildData()));
    output.setMimeType(ContentService.MimeType.JSON);
    return output;
  } catch(err) {
    var out = ContentService.createTextOutput(JSON.stringify({error:err.message}));
    out.setMimeType(ContentService.MimeType.JSON);
    return out;
  }
}


// ============================================================
//  DONNÉES PRINCIPALES
// ============================================================
function buildData() {
  var ss         = SpreadsheetApp.openById(SHEET_ID);
  var vendorRows = readSheet(ss, SHEET_VENDORS);
  var repRows    = readSheet(ss, SHEET_REPONSES);
  var today      = Utilities.formatDate(new Date(), TIMEZONE, "dd/MM/yyyy");

  return {
    updated_at         : new Date().toISOString(),
    today_date         : today,
    vendors            : buildVendors(vendorRows, repRows),
    weekly             : buildWeekly(repRows),
    today              : buildToday(repRows, today),
    depots             : buildDepots(repRows),        // ← depuis Réponses
    depot_today        : buildDepotToday(repRows, today), // ← ventes du jour par dépôt
    problems           : buildProblems(repRows, today),
    prime              : buildPrime(repRows),
    hotspots           : buildHotspots(repRows),
    morning_vs_evening : buildMorningEvening(repRows),
    satisfaction       : buildSatisfaction(repRows, today),
    equipment          : buildEquipment(repRows, today),
  };
}

function readSheet(ss, name) {
  var s = ss.getSheetByName(name);
  if (!s) return [];
  var v = s.getDataRange().getValues();
  return v.length>1 ? v.slice(1).filter(function(r){return String(r[0]||"").trim();}) : [];
}


// ============================================================
//  VENDORS — jours réels depuis Réponses
// ============================================================
function buildVendors(vendorRows, repRows) {
  // Compter jours uniques par phone depuis Réponses
  var joursParPhone = {};
  // Calculer ventes totales réelles par phone (seulement "J ai deja vendu")
  var ventesParPhone = {};

  repRows.forEach(function(r) {
    var ph   = String(r[R_PHONE]||"").trim();
    var date = String(r[R_DATE] ||"").trim();
    var stat = String(r[R_STATUT]||"").trim();
    if (!ph || !date) return;

    // Jours uniques
    if (!joursParPhone[ph]) joursParPhone[ph] = {};
    joursParPhone[ph][date] = true;

    // Ventes réelles = seulement quand "J ai deja vendu" (ventes du jour même)
    if (stat === "J ai deja vendu") {
      if (!ventesParPhone[ph]) ventesParPhone[ph] = {ventes:0, fx:0, fc:0, fv:0};
      ventesParPhone[ph].ventes += parseInt(r[R_VENTES])||0;
      ventesParPhone[ph].fx     += parseInt(r[R_XTRA])  ||0;
      ventesParPhone[ph].fc     += parseInt(r[R_CHOCO]) ||0;
      ventesParPhone[ph].fv     += parseInt(r[R_VAN])   ||0;
    }
  });

  return vendorRows.map(function(r) {
    var phone    = String(r[V_PHONE]||"").trim();
    var fanxtra  = parseInt(r[V_FANXTRA]) ||0;
    var fanchoco = parseInt(r[V_FANCHOCO])||0;
    var fanvan   = parseInt(r[V_FANVAN])  ||0;
    var pieces   = parseInt(r[V_PIECES])  ||(fanxtra+fanchoco+fanvan);
    var ventes   = parseInt(r[V_VENTES])  ||0;
    var jours    = joursParPhone[phone]
      ? Object.keys(joursParPhone[phone]).length : 0;

    return {
      phone:String(r[V_PHONE]||"").trim(), nom:String(r[V_NOM]||"").trim(),
      depot:String(r[V_DEPOT]||"").trim(), last_decl:String(r[V_LAST_DEC]||"").trim(),
      ventes:ventes, fanxtra:fanxtra, fanchoco:fanchoco, fanvanille:fanvan,
      pieces:pieces, jours:jours, prev_ventes:0,
      last_date:String(r[V_DATE_V]||"").trim(),
    };
  }).filter(function(v){return v.nom;});
}


// ============================================================
//  TODAY — vendors UNIQUES + ventes réelles du jour
//  ✅ "Je vais vendre" avec chiffres = ventes d'HIER → ne pas compter dans today
//  ✅ "J ai deja vendu" = ventes d'AUJOURD'HUI → compter
//  ✅ 1 seul comptage par vendor (le dernier du jour)
// ============================================================
function buildToday(rows, today) {
  var todayRows = rows.filter(function(r){
    return String(r[R_DATE]||"").trim() === today;
  });

  // Un dict par phone → garder la dernière déclaration du jour
  var parPhone = {};
  todayRows.forEach(function(r) {
    var ph = String(r[R_PHONE]||"").trim();
    if (!ph) return;
    parPhone[ph] = r; // écrase → garde la plus récente
  });

  var vendorsUniques    = Object.keys(parPhone).length;
  var nbDeclarations    = todayRows.length; // toutes les lignes du jour
  var ventesAujourdHui  = 0;
  var xtraAujourdHui    = 0;
  var chocoAujourdHui   = 0;
  var vanAujourdHui     = 0;
  var aucunPb           = 0;
  var vendorsQuiVendent = 0;

  Object.values(parPhone).forEach(function(r) {
    var stat = String(r[R_STATUT]||"").trim();
    var cat  = String(r[R_CAT]   ||"").trim();

    // Compter satisfaction
    if (cat === "Aucun probleme" || cat === "") aucunPb++;

    // Ventes TODAY = seulement ceux qui ont DÉJÀ vendu aujourd'hui
    if (stat === "J ai deja vendu") {
      ventesAujourdHui += parseInt(r[R_VENTES])||0;
      xtraAujourdHui   += parseInt(r[R_XTRA])  ||0;
      chocoAujourdHui  += parseInt(r[R_CHOCO]) ||0;
      vanAujourdHui    += parseInt(r[R_VAN])   ||0;
      vendorsQuiVendent++;
    }
  });

  var satisfToday = vendorsUniques > 0
    ? Math.round((aucunPb/vendorsUniques)*100) : 0;

  // Live feed — 10 dernières lignes du jour, plus récentes en premier
  var last10 = todayRows.slice(-10).reverse().map(function(r){
    return {
      heure  :String(r[R_HEURE] ||""),
      nom    :String(r[R_NOM]   ||""),
      depot  :String(r[R_DEPOT] ||""),
      statut :String(r[R_STATUT]||""),
      ventes :parseInt(r[R_VENTES])||0,
      xtra   :parseInt(r[R_XTRA])  ||0,
      choco  :parseInt(r[R_CHOCO]) ||0,
      van    :parseInt(r[R_VAN])   ||0,
      cat    :String(r[R_CAT]   ||""),
    };
  });

  return {
    nb_declarations      : nbDeclarations,    // toutes les interactions du jour
    vendors_uniques      : vendorsUniques,    // ← nombre RÉEL de vendors distincts
    vendors_qui_vendent  : vendorsQuiVendent, // ceux qui ont déclaré des ventes aujourd'hui
    ventes_total         : ventesAujourdHui,  // ventes du JOUR uniquement
    fanxtra_total        : xtraAujourdHui,
    fanchoco_total       : chocoAujourdHui,
    fanvan_total         : vanAujourdHui,
    satisfaction_today   : satisfToday,
    last_declarations    : last10,
  };
}


// ============================================================
//  DEPOTS — depuis Réponses (toutes les déclarations)
//  + calcul CA réel (seulement "J ai deja vendu")
// ============================================================
function buildDepots(rows) {
  var m = {};
  rows.forEach(function(r) {
    var dep  = String(r[R_DEPOT] ||"").trim();
    var stat = String(r[R_STATUT]||"").trim();
    if (!dep) return;
    if (!m[dep]) m[dep] = {nom:dep, declarations:0, vendors:new Set(),
      ventes:0, fx:0, fc:0, fv:0};
    m[dep].declarations++;
    var ph = String(r[R_PHONE]||"").trim();
    if (ph) m[dep].vendors.add(ph);
    // Compter ventes seulement quand "J ai deja vendu"
    if (stat === "J ai deja vendu") {
      m[dep].ventes += parseInt(r[R_VENTES])||0;
      m[dep].fx     += parseInt(r[R_XTRA])  ||0;
      m[dep].fc     += parseInt(r[R_CHOCO]) ||0;
      m[dep].fv     += parseInt(r[R_VAN])   ||0;
    }
  });
  return Object.values(m).map(function(d){
    return {
      nom:d.nom, declarations:d.declarations,
      nb_vendors:d.vendors.size, ventes:d.ventes,
      fanxtra:d.fx, fanchoco:d.fc, fanvan:d.fv,
      pieces:d.fx+d.fc+d.fv,
    };
  }).sort(function(a,b){return b.ventes-a.ventes;});
}


// ============================================================
//  DEPOT TODAY — performances du jour par dépôt
// ============================================================
function buildDepotToday(rows, today) {
  var todayRows = rows.filter(function(r){
    return String(r[R_DATE]||"").trim()===today;
  });
  var m = {};
  todayRows.forEach(function(r) {
    var dep  = String(r[R_DEPOT] ||"").trim();
    var stat = String(r[R_STATUT]||"").trim();
    if (!dep) return;
    if (!m[dep]) m[dep]={nom:dep,declarations:0,vendors:new Set(),ventes:0,fx:0,fc:0,fv:0};
    m[dep].declarations++;
    var ph=String(r[R_PHONE]||"").trim(); if(ph) m[dep].vendors.add(ph);
    if (stat==="J ai deja vendu") {
      m[dep].ventes+=parseInt(r[R_VENTES])||0;
      m[dep].fx    +=parseInt(r[R_XTRA])  ||0;
      m[dep].fc    +=parseInt(r[R_CHOCO]) ||0;
      m[dep].fv    +=parseInt(r[R_VAN])   ||0;
    }
  });
  return Object.values(m).map(function(d){
    return {nom:d.nom,declarations:d.declarations,nb_vendors:d.vendors.size,
      ventes:d.ventes,fanxtra:d.fx,fanchoco:d.fc,fanvan:d.fv,pieces:d.fx+d.fc+d.fv};
  }).sort(function(a,b){return b.ventes-a.ventes;});
}


// ============================================================
//  SATISFACTION
// ============================================================
function buildSatisfaction(rows, today) {
  var parts=today.split("/"), mois=parseInt(parts[1]), annee=parseInt(parts[2]);
  var total=0, aucun=0;
  // Par vendor unique par jour (pas par ligne)
  var parJourPhone = {};
  rows.forEach(function(r) {
    var dp=String(r[R_DATE]||"").split("/");
    if(dp.length<3||parseInt(dp[1])!==mois||parseInt(dp[2])!==annee) return;
    var ph=String(r[R_PHONE]||"").trim(); if(!ph) return;
    var key=dp[0]+"-"+ph;
    parJourPhone[key]={cat:String(r[R_CAT]||"").trim()};
  });
  Object.values(parJourPhone).forEach(function(v){
    total++;
    if(v.cat==="Aucun probleme"||v.cat==="") aucun++;
  });
  return {rate:total>0?Math.round((aucun/total)*100):0, aucun_probleme:aucun, total_decla:total};
}


// ============================================================
//  EQUIPMENT
// ============================================================
function buildEquipment(rows, today) {
  var parts=today.split("/"), mois=parseInt(parts[1]), annee=parseInt(parts[2]);
  var issues=0;
  rows.forEach(function(r){
    var cat=String(r[R_CAT]||"").trim();
    if(cat!=="Probleme d equipement") return;
    var dp=String(r[R_DATE]||"").split("/");
    if(dp.length<3||parseInt(dp[1])!==mois||parseInt(dp[2])!==annee) return;
    issues++;
  });
  return {issues_mois:issues,jours_perdus:0,semaines:0,heures:0,
    statut:issues===0?"OK":"ALERTE"};
}


// ============================================================
//  WEEKLY QPVD
// ============================================================
function buildWeekly(rows) {
  var bySem={};
  rows.forEach(function(r){
    var ds=String(r[R_DATE]||"").trim(); if(!ds) return;
    var p=ds.split("/"); if(p.length<3) return;
    var d=new Date(parseInt(p[2]),parseInt(p[1])-1,parseInt(p[0]));
    var key=getWeekKey(d);
    if(!bySem[key]) bySem[key]={pieces:0,days:{},key:key};
    // Compter pièces seulement pour "J ai deja vendu"
    var stat=String(r[R_STATUT]||"").trim();
    if(stat==="J ai deja vendu") {
      bySem[key].pieces+=(parseInt(r[R_XTRA])||0)+(parseInt(r[R_CHOCO])||0)+(parseInt(r[R_VAN])||0);
    }
    // Jours uniques par vendor
    bySem[key].days[String(r[R_PHONE]||"")+"_"+ds]=true;
  });
  var keys=Object.keys(bySem).sort().slice(-7);
  return keys.map(function(k,i){
    var s=bySem[k],n=Object.keys(s.days).length;
    return{sem:"W"+(i+1),qpvd:n>0?Math.round(s.pieces/n):0,target:132};
  });
}
function getWeekKey(d){
  var j=new Date(d.getFullYear(),0,1);
  var w=Math.ceil(((d-j)/86400000+j.getDay()+1)/7);
  return d.getFullYear()+"-W"+(w<10?"0"+w:w);
}


// ============================================================
//  PROBLEMS, PRIME, HOTSPOTS, MORNING/EVENING
// ============================================================
function buildProblems(rows, today) {
  var p=today.split("/"),mois=parseInt(p[1]),annee=parseInt(p[2]),m={};
  rows.forEach(function(r){
    var cat=String(r[R_CAT]||"").trim();
    if(!cat||cat==="-"||cat==="Aucun probleme") return;
    var dp=String(r[R_DATE]||"").split("/");
    if(dp.length<3||parseInt(dp[1])!==mois||parseInt(dp[2])!==annee) return;
    m[cat]=(m[cat]||0)+1;
  });
  return Object.entries(m).map(function(e){return{categorie:e[0],count:e[1]};})
    .sort(function(a,b){return b.count-a.count;});
}

function buildPrime(rows){
  var m={};
  rows.forEach(function(r){
    var pr=String(r[R_PRIME]||"").trim(); if(!pr||pr==="-") return;
    m[pr]=(m[pr]||0)+1;
  });
  return Object.entries(m).map(function(e){return{pilier:e[0],count:e[1]};})
    .sort(function(a,b){return b.count-a.count;});
}

function buildHotspots(rows){
  var m={};
  rows.forEach(function(r){
    var lx=String(r[R_LIEU]||"").trim(); if(!lx||lx==="-") return;
    lx.split(",").forEach(function(l){l=l.trim();if(l)m[l]=(m[l]||0)+1;});
  });
  return Object.entries(m).map(function(e){return{lieu:e[0],count:e[1]};})
    .sort(function(a,b){return b.count-a.count;}).slice(0,10);
}

function buildMorningEvening(rows){
  var mt={declarations:0,ventes:0},so={declarations:0,ventes:0};
  rows.forEach(function(r){
    var per=String(r[R_PERIODE]||"").trim();
    var ca=parseInt(r[R_VENTES])||0;
    if(per==="Matin"){mt.declarations++;mt.ventes+=ca;}
    else{so.declarations++;so.ventes+=ca;}
  });
  return{
    morning:{declarations:mt.declarations,ventes:mt.ventes,
      avg:mt.declarations>0?Math.round(mt.ventes/mt.declarations):0},
    evening:{declarations:so.declarations,ventes:so.ventes,
      avg:so.declarations>0?Math.round(so.ventes/so.declarations):0},
  };
}


// ============================================================
//  RÉCONCILIATION
// ============================================================
function reconcilierVendors(){
  try{
    var ss=SpreadsheetApp.openById(SHEET_ID);
    var sv=ss.getSheetByName(SHEET_VENDORS),sr=ss.getSheetByName(SHEET_REPONSES);
    if(!sv||!sr){Logger.log("Onglet introuvable");return;}
    var rv=sv.getDataRange().getValues(),ph={};
    for(var i=1;i<rv.length;i++){var p=String(rv[i][V_PHONE]||"").trim();if(p)ph[p]=i+1;}
    var rr=sr.getDataRange().getValues(),last={};
    for(var j=1;j<rr.length;j++){
      var r=rr[j],p2=String(r[R_PHONE]||"").trim();if(!p2)continue;
      last[p2]={nom:String(r[R_NOM]||"").trim(),depot:String(r[R_DEPOT]||"").trim(),
        date:String(r[R_DATE]||"").trim(),ventes:parseInt(r[R_VENTES])||0,
        fx:parseInt(r[R_XTRA])||0,fc:parseInt(r[R_CHOCO])||0,fv:parseInt(r[R_VAN])||0};
    }
    var now=Utilities.formatDate(new Date(),TIMEZONE,"dd/MM/yyyy HH:mm"),a=0,m=0;
    Object.keys(last).forEach(function(p){
      var info=last[p];if(!info.nom||!info.depot)return;
      var pc=info.fx+info.fc+info.fv;
      if(!ph[p]){sv.appendRow([p,info.nom,info.depot,now,info.ventes,info.fx,info.fc,info.fv,pc,info.date]);a++;}
      else if(info.ventes>0||pc>0){sv.getRange(ph[p],V_LAST_DEC+1,1,7).setValues([[now,info.ventes,info.fx,info.fc,info.fv,pc,info.date]]);m++;}
    });
    Logger.log("Synchro OK : "+a+" ajoutés, "+m+" mis à jour");
  }catch(e){Logger.log("Erreur: "+e.message);}
}


// ============================================================
//  MENU & DÉCLENCHEUR
// ============================================================
function onOpen(){
  try{
    SpreadsheetApp.getUi().createMenu("FanMilk Dashboard")
      .addItem("🔗 Tester l'API","testerAPI")
      .addItem("🔄 Synchro Vendors","reconcilierVendors")
      .addItem("⏰ Déclencheur 7h","installerDeclencheur")
      .addToUi();
  }catch(e){Logger.log("onOpen skipped: "+e.message);}
}

function testerAPI(){
  try{
    var d=buildData();
    SpreadsheetApp.getUi().alert(
      "✅ API OK\n\n"+
      "📅 Aujourd'hui : "+d.today_date+"\n"+
      "👤 Vendors actifs : "+d.vendors.length+"\n"+
      "💬 Déclarations aujourd'hui : "+d.today.nb_declarations+"\n"+
      "👥 Vendors UNIQUES aujourd'hui : "+d.today.vendors_uniques+"\n"+
      "💰 Ventes du JOUR (déjà vendus) : "+d.today.ventes_total+" FCFA\n"+
      "⭐ Satisfaction : "+d.satisfaction.rate+"%\n\n"+
      "🔗 https://fanmilk-dashboard.vercel.app/"
    );
  }catch(e){SpreadsheetApp.getUi().alert("Erreur: "+e.message);}
}

function installerDeclencheur(){
  ScriptApp.getProjectTriggers().forEach(function(t){
    if(t.getHandlerFunction()==="reconcilierVendors")ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("reconcilierVendors").timeBased().everyDays(1).atHour(7).create();
  SpreadsheetApp.getUi().alert("✅ Déclencheur installé à 7h chaque jour");
}
