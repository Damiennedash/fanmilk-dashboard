// ============================================================
//  FANMILK TOGO — Apps Script Web App
//  Version corrigée :
//  ✅ onOpen sans getUi() dans les déclencheurs
//  ✅ Today : comparaison date robuste (fuseau horaire Africa/Lome)
//  ✅ Satisfaction calculée depuis "Aucun probleme"
//  ✅ Equipement depuis Réponses (Probleme d equipement)
//  ✅ reconcilierVendors sans getUi() → fonctionne en déclencheur
// ============================================================

var SHEET_ID       = "COLLEZ_VOTRE_SHEET_ID_ICI"; // ← remplacez ici
var SHEET_VENDORS  = "Vendors";
var SHEET_REPONSES = "Reponses Vendors";
var TIMEZONE       = "Africa/Lome"; // GMT+0 Togo

// Colonnes Vendors (A=0)
var V_PHONE=0, V_NOM=1, V_DEPOT=2, V_LAST_DEC=3;
var V_VENTES=4, V_FANXTRA=5, V_FANCHOCO=6, V_FANVAN=7, V_PIECES=8, V_DATE_V=9;

// Colonnes Reponses Vendors (A=0)
var R_DATE=0, R_HEURE=1, R_PERIODE=2, R_PHONE=3, R_NOM=4, R_DEPOT=5;
var R_STATUT=6, R_VENTES=7, R_XTRA=8, R_CHOCO=9, R_VAN=10;
var R_LIEU=11, R_CAT=12, R_PRIME=13, R_COMM=14;


// ============================================================
//  POINT D'ENTRÉE API — appelé par le dashboard React
// ============================================================
function doGet(e) {
  try {
    var data = buildData();
    var output = ContentService.createTextOutput(JSON.stringify(data));
    output.setMimeType(ContentService.MimeType.JSON);
    return output;
  } catch(err) {
    var errOut = ContentService.createTextOutput(JSON.stringify({error: err.message, stack: err.stack}));
    errOut.setMimeType(ContentService.MimeType.JSON);
    return errOut;
  }
}


// ============================================================
//  CONSTRUCTION DONNÉES
// ============================================================
function buildData() {
  var ss          = SpreadsheetApp.openById(SHEET_ID);
  var vendorRows  = readSheet(ss, SHEET_VENDORS);
  var repRows     = readSheet(ss, SHEET_REPONSES);

  // Date du jour en format dd/MM/yyyy — FUSEAU TOGO
  var today = Utilities.formatDate(new Date(), TIMEZONE, "dd/MM/yyyy");

  // KPIs globaux calculés une seule fois
  var kpis = buildKPIs(repRows, today);

  return {
    updated_at         : new Date().toISOString(),
    today_date         : today,
    vendors            : buildVendors(vendorRows, repRows),
    weekly             : buildWeekly(repRows),
    today              : buildToday(repRows, today),
    depots             : buildDepots(vendorRows),
    problems           : buildProblems(repRows, today),
    prime              : buildPrime(repRows),
    hotspots           : buildHotspots(repRows),
    morning_vs_evening : buildMorningEvening(repRows),
    satisfaction       : kpis.satisfaction,
    equipment          : kpis.equipment,
    kpis_global        : kpis.global,
  };
}

function readSheet(ss, name) {
  var s = ss.getSheetByName(name);
  if (!s) return [];
  var v = s.getDataRange().getValues();
  return v.length > 1 ? v.slice(1).filter(function(r){ return String(r[0]||"").trim(); }) : [];
}


// ============================================================
//  KPIs GLOBAUX — satisfaction + équipement + résumé
// ============================================================
function buildKPIs(rows, today) {
  var parts    = today.split("/");
  var moisCur  = parseInt(parts[1]);
  var anneeCur = parseInt(parts[2]);

  var totalDecla   = 0;
  var aucunPb      = 0;    // → satisfaction
  var pbEquipement = 0;    // → equipment issues
  var nonVente     = 0;
  var totalCA      = 0;

  rows.forEach(function(r) {
    var dp = String(r[R_DATE]||"").split("/");
    if (dp.length < 3) return;
    if (parseInt(dp[1]) !== moisCur || parseInt(dp[2]) !== anneeCur) return;

    totalDecla++;
    totalCA += parseInt(r[R_VENTES]) || 0;

    var cat    = String(r[R_CAT]    || "").trim();
    var statut = String(r[R_STATUT] || "").trim();

    // "Aucun probleme" = vendor satisfait
    if (cat === "Aucun probleme" || cat === "") aucunPb++;

    // Problème équipement
    if (cat === "Probleme d equipement") pbEquipement++;

    // Non vente
    if (statut === "Non") nonVente++;
  });

  var satisfactionRate = totalDecla > 0 ? Math.round((aucunPb / totalDecla) * 100) : 0;

  return {
    satisfaction: {
      rate         : satisfactionRate,
      aucun_probleme: aucunPb,
      total_decla  : totalDecla,
    },
    equipment: {
      issues_mois  : pbEquipement,
      jours_perdus : 0,  // à renseigner manuellement si besoin
      semaines     : 0,
      heures       : 0,
      statut       : pbEquipement === 0 ? "OK" : "ALERTE",
    },
    global: {
      total_ca     : totalCA,
      total_decla  : totalDecla,
      taux_non_vente: totalDecla > 0 ? Math.round((nonVente/totalDecla)*100) : 0,
    }
  };
}


// ============================================================
//  VENDORS — enrichis avec jours travaillés depuis Réponses
// ============================================================
function buildVendors(vendorRows, repRows) {
  // Calculer les jours travaillés par vendor depuis Réponses
  var joursParPhone = {};
  repRows.forEach(function(r) {
    var ph   = String(r[R_PHONE]||"").trim();
    var date = String(r[R_DATE] ||"").trim();
    if (!ph || !date) return;
    if (!joursParPhone[ph]) joursParPhone[ph] = {};
    joursParPhone[ph][date] = true; // date unique = 1 jour
  });

  return vendorRows.map(function(r) {
    var phone    = String(r[V_PHONE]||"").trim();
    var fanxtra  = parseInt(r[V_FANXTRA]) || 0;
    var fanchoco = parseInt(r[V_FANCHOCO])|| 0;
    var fanvan   = parseInt(r[V_FANVAN])  || 0;
    var pieces   = parseInt(r[V_PIECES])  || (fanxtra + fanchoco + fanvan);
    var ventes   = parseInt(r[V_VENTES])  || 0;

    // Jours réels depuis Réponses
    var jours = joursParPhone[phone]
      ? Object.keys(joursParPhone[phone]).length
      : 0;

    return {
      phone      : phone,
      nom        : String(r[V_NOM]     ||"").trim(),
      depot      : String(r[V_DEPOT]   ||"").trim(),
      last_decl  : String(r[V_LAST_DEC]||"").trim(),
      ventes     : ventes,
      fanxtra    : fanxtra,
      fanchoco   : fanchoco,
      fanvanille : fanvan,
      pieces     : pieces,
      jours      : jours,
      prev_ventes: 0,
      last_date  : String(r[V_DATE_V]  ||"").trim(),
    };
  }).filter(function(v){ return v.nom; });
}


// ============================================================
//  TODAY — robuste sur le fuseau horaire
// ============================================================
function buildToday(rows, today) {
  // Comparaison stricte dd/MM/yyyy
  var todayRows = rows.filter(function(r) {
    var d = String(r[R_DATE]||"").trim();
    // Gérer aussi le cas où Google Sheets retourne un objet Date
    if (d instanceof Date || (typeof d === "object" && d !== null)) {
      d = Utilities.formatDate(new Date(d), TIMEZONE, "dd/MM/yyyy");
    }
    return d === today;
  });

  var phones = {}, ventes=0, xtra=0, choco=0, van=0;
  var aucunPbAujourdHui = 0;

  todayRows.forEach(function(r) {
    var ph = String(r[R_PHONE]||"").trim();
    if (ph) phones[ph] = true;
    ventes += parseInt(r[R_VENTES])||0;
    xtra   += parseInt(r[R_XTRA])  ||0;
    choco  += parseInt(r[R_CHOCO]) ||0;
    van    += parseInt(r[R_VAN])   ||0;

    var cat = String(r[R_CAT]||"").trim();
    if (cat === "Aucun probleme" || cat === "") aucunPbAujourdHui++;
  });

  var satisfToday = todayRows.length > 0
    ? Math.round((aucunPbAujourdHui / todayRows.length) * 100)
    : 0;

  var last10 = todayRows.slice(-10).reverse().map(function(r){
    return {
      heure  : String(r[R_HEURE] ||""),
      nom    : String(r[R_NOM]   ||""),
      depot  : String(r[R_DEPOT] ||""),
      statut : String(r[R_STATUT]||""),
      ventes : parseInt(r[R_VENTES])||0,
      xtra   : parseInt(r[R_XTRA])  ||0,
      choco  : parseInt(r[R_CHOCO]) ||0,
      van    : parseInt(r[R_VAN])   ||0,
      cat    : String(r[R_CAT]   ||""),
    };
  });

  return {
    nb_declarations  : todayRows.length,
    vendors_actifs   : Object.keys(phones).length,
    ventes_total     : ventes,
    fanxtra_total    : xtra,
    fanchoco_total   : choco,
    fanvan_total     : van,
    satisfaction_today: satisfToday,
    last_declarations: last10,
  };
}


// ============================================================
//  WEEKLY QPVD
// ============================================================
function buildWeekly(rows) {
  var bySem = {};
  rows.forEach(function(r) {
    var ds = String(r[R_DATE]||"").trim();
    if (!ds) return;
    var p = ds.split("/");
    if (p.length < 3) return;
    var d   = new Date(parseInt(p[2]), parseInt(p[1])-1, parseInt(p[0]));
    var key = getWeekKey(d);
    if (!bySem[key]) bySem[key] = { pieces:0, days:{}, key:key };
    bySem[key].pieces += (parseInt(r[R_XTRA])||0)+(parseInt(r[R_CHOCO])||0)+(parseInt(r[R_VAN])||0);
    bySem[key].days[String(r[R_PHONE]||"")+"_"+ds] = true;
  });
  var keys = Object.keys(bySem).sort().slice(-7);
  return keys.map(function(k,i){
    var s=bySem[k], n=Object.keys(s.days).length;
    return { sem:"W"+(i+1), qpvd:n>0?Math.round(s.pieces/n):0, target:132 };
  });
}

function getWeekKey(d) {
  var j=new Date(d.getFullYear(),0,1);
  var w=Math.ceil(((d-j)/86400000+j.getDay()+1)/7);
  return d.getFullYear()+"-W"+(w<10?"0"+w:w);
}


// ============================================================
//  DEPOTS
// ============================================================
function buildDepots(vendorRows) {
  var m={};
  vendorRows.forEach(function(r){
    var d=String(r[V_DEPOT]||"").trim(); if(!d) return;
    if(!m[d]) m[d]={nom:d,count:0,ventes:0,fanxtra:0,fanchoco:0,fanvan:0};
    m[d].count++; m[d].ventes+=parseInt(r[V_VENTES])||0;
    m[d].fanxtra+=parseInt(r[V_FANXTRA])||0; m[d].fanchoco+=parseInt(r[V_FANCHOCO])||0;
    m[d].fanvan+=parseInt(r[V_FANVAN])||0;
  });
  return Object.values(m).sort(function(a,b){return b.ventes-a.ventes;});
}


// ============================================================
//  PROBLEMES du mois (sans "Aucun probleme")
// ============================================================
function buildProblems(rows, today) {
  var p=today.split("/"), mois=parseInt(p[1]), annee=parseInt(p[2]), m={};
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


// ============================================================
//  PRIME
// ============================================================
function buildPrime(rows) {
  var m={};
  rows.forEach(function(r){
    var pr=String(r[R_PRIME]||"").trim(); if(!pr||pr==="-") return;
    m[pr]=(m[pr]||0)+1;
  });
  return Object.entries(m).map(function(e){return{pilier:e[0],count:e[1]};})
    .sort(function(a,b){return b.count-a.count;});
}


// ============================================================
//  HOTSPOTS
// ============================================================
function buildHotspots(rows) {
  var m={};
  rows.forEach(function(r){
    var lx=String(r[R_LIEU]||"").trim(); if(!lx||lx==="-") return;
    lx.split(",").forEach(function(l){l=l.trim();if(l)m[l]=(m[l]||0)+1;});
  });
  return Object.entries(m).map(function(e){return{lieu:e[0],count:e[1]};})
    .sort(function(a,b){return b.count-a.count;}).slice(0,10);
}


// ============================================================
//  MORNING vs EVENING
// ============================================================
function buildMorningEvening(rows) {
  var mt={declarations:0,ventes:0}, so={declarations:0,ventes:0};
  rows.forEach(function(r){
    var per=String(r[R_PERIODE]||"").trim(), ca=parseInt(r[R_VENTES])||0;
    if(per==="Matin"){mt.declarations++;mt.ventes+=ca;}
    else{so.declarations++;so.ventes+=ca;}
  });
  return {
    morning:{declarations:mt.declarations,ventes:mt.ventes,
             avg:mt.declarations>0?Math.round(mt.ventes/mt.declarations):0},
    evening:{declarations:so.declarations,ventes:so.ventes,
             avg:so.declarations>0?Math.round(so.ventes/so.declarations):0},
  };
}


// ============================================================
//  RÉCONCILIATION Réponses → Vendors
//  ✅ Sans getUi() → fonctionne en déclencheur automatique
// ============================================================
function reconcilierVendors() {
  try {
    var ss     = SpreadsheetApp.openById(SHEET_ID);
    var sheetV = ss.getSheetByName(SHEET_VENDORS);
    var sheetR = ss.getSheetByName(SHEET_REPONSES);
    if (!sheetV || !sheetR) { Logger.log("Onglet introuvable"); return; }

    var rowsV = sheetV.getDataRange().getValues();
    var phones = {};
    for (var i=1; i<rowsV.length; i++) {
      var p = String(rowsV[i][V_PHONE]||"").trim();
      if (p) phones[p] = i+1;
    }

    var rowsR = sheetR.getDataRange().getValues();
    var last  = {};
    for (var j=1; j<rowsR.length; j++) {
      var r  = rowsR[j];
      var ph = String(r[R_PHONE]||"").trim();
      if (!ph) continue;
      last[ph] = {
        nom   : String(r[R_NOM]   ||"").trim(),
        depot : String(r[R_DEPOT] ||"").trim(),
        date  : String(r[R_DATE]  ||"").trim(),
        ventes: parseInt(r[R_VENTES])||0,
        fx    : parseInt(r[R_XTRA])  ||0,
        fc    : parseInt(r[R_CHOCO]) ||0,
        fv    : parseInt(r[R_VAN])   ||0,
      };
    }

    var now = Utilities.formatDate(new Date(), TIMEZONE, "dd/MM/yyyy HH:mm");
    var ajoutes=0, maj=0;

    Object.keys(last).forEach(function(ph) {
      var info=last[ph];
      if (!info.nom||!info.depot) return;
      var pieces=info.fx+info.fc+info.fv;
      if (!phones[ph]) {
        sheetV.appendRow([ph,info.nom,info.depot,now,
          info.ventes,info.fx,info.fc,info.fv,pieces,info.date]);
        ajoutes++;
      } else if (info.ventes>0||pieces>0) {
        sheetV.getRange(phones[ph], V_LAST_DEC+1, 1, 7)
          .setValues([[now,info.ventes,info.fx,info.fc,info.fv,pieces,info.date]]);
        maj++;
      }
    });

    Logger.log("Synchro OK : "+ajoutes+" ajoutés, "+maj+" mis à jour");
  } catch(e) {
    Logger.log("Erreur reconcilierVendors : "+e.message);
  }
}


// ============================================================
//  MENU — ✅ onOpen simplifié sans appel dangereux
// ============================================================
function onOpen() {
  try {
    var ui = SpreadsheetApp.getUi();
    ui.createMenu("FanMilk Dashboard")
      .addItem("🔗 Tester l'API", "testerAPI")
      .addItem("🔄 Synchro Vendors maintenant", "reconcilierVendors")
      .addItem("⏰ Installer déclencheur 7h", "installerDeclencheur")
      .addToUi();
  } catch(e) {
    // Si appelé depuis un déclencheur, getUi() échoue → on ignore
    Logger.log("onOpen skipped (triggered context): " + e.message);
  }
}

function testerAPI() {
  try {
    var data = buildData();
    var ui   = SpreadsheetApp.getUi();
    ui.alert(
      "✅ API OK\n\n" +
      "📅 Aujourd'hui : " + data.today_date + "\n" +
      "👤 Vendors : " + data.vendors.length + "\n" +
      "💬 Déclarations aujourd'hui : " + data.today.nb_declarations + "\n" +
      "💰 Ventes aujourd'hui : " + data.today.ventes_total + " FCFA\n" +
      "⭐ Satisfaction mois : " + data.satisfaction.rate + "%\n" +
      "⚙️ Pb équipement mois : " + data.equipment.issues_mois + "\n\n" +
      "🔗 Dashboard :\nhttps://fanmilk-dashboard.vercel.app/"
    );
  } catch(e) {
    SpreadsheetApp.getUi().alert("Erreur : " + e.message);
  }
}


// ============================================================
//  DÉCLENCHEUR QUOTIDIEN 7h — exécuter UNE SEULE FOIS
// ============================================================
function installerDeclencheur() {
  // Supprimer anciens déclencheurs reconcilierVendors
  ScriptApp.getProjectTriggers().forEach(function(t){
    if (t.getHandlerFunction() === "reconcilierVendors") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("reconcilierVendors")
    .timeBased().everyDays(1).atHour(7).create();
  SpreadsheetApp.getUi().alert("✅ Déclencheur installé : synchro chaque jour à 7h");
}
