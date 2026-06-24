// ============================================================
//  FANMILK TOGO — Google Apps Script v6
//  Sheet ID : 1SxJcVdSTWfeG_v6ey9gCSKgqSgqhKlbbcbp5cLZEnn4
// ============================================================

var SHEET_ID       = "1SxJcVdSTWfeG_v6ey9gCSKgqSgqhKlbbcbp5cLZEnn4";
var SHEET_VENDORS  = "Vendors";
var SHEET_REPONSES = "Réponses Vendors";
var TIMEZONE       = "Africa/Abidjan"; // GMT+0 — même fuseau que Togo (Africa/Lome parfois buggé)

// Colonnes Reponses Vendors (A=0)
var R_DATE=0, R_HEURE=1, R_PERIODE=2, R_PHONE=3, R_NOM=4, R_DEPOT=5;
var R_STATUT=6, R_VENTES=7, R_XTRA=8, R_CHOCO=9, R_VAN=10;
var R_LIEU=11, R_CAT=12, R_PRIME=13, R_COMM=14;

// Colonnes Vendors (A=0)
var V_PHONE=0, V_NOM=1, V_DEPOT=2, V_LAST_DEC=3;
var V_VENTES=4, V_FANXTRA=5, V_FANCHOCO=6, V_FANVAN=7, V_PIECES=8, V_DATE_V=9;


// ============================================================
//  POINT D'ENTRÉE
// ============================================================
function doGet(e) {
  try {
    var out = ContentService.createTextOutput(JSON.stringify(buildData()));
    out.setMimeType(ContentService.MimeType.JSON);
    return out;
  } catch(err) {
    var e2 = ContentService.createTextOutput(JSON.stringify({error: err.message}));
    e2.setMimeType(ContentService.MimeType.JSON);
    return e2;
  }
}


// ============================================================
//  CONVERSION DATE — robuste (objet Date OU string)
// ============================================================
function toDateStr(val) {
  if (!val) return "";
  if (val instanceof Date) {
    return Utilities.formatDate(val, TIMEZONE, "dd/MM/yyyy");
  }
  var s = String(val).trim();
  // Format dd/MM/yyyy déjà correct
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;
  // Format MM/dd/yyyy (américain) → convertir
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
    try {
      return Utilities.formatDate(new Date(s), TIMEZONE, "dd/MM/yyyy");
    } catch(e) { return s; }
  }
  return s;
}

function todayStr() {
  return Utilities.formatDate(new Date(), TIMEZONE, "dd/MM/yyyy");
}

function yesterdayStr() {
  var d = new Date();
  d.setDate(d.getDate() - 1);
  return Utilities.formatDate(d, TIMEZONE, "dd/MM/yyyy");
}

function thisMonth() {
  return Utilities.formatDate(new Date(), TIMEZONE, "MM/yyyy");
}


// ============================================================
//  LECTURE SHEETS
// ============================================================
function readSheet(ss, name) {
  var s = ss.getSheetByName(name);
  if (!s) return [];
  var v = s.getDataRange().getValues();
  return v.length > 1 ? v.slice(1) : [];
}


// ============================================================
//  DONNÉES PRINCIPALES
// ============================================================
function buildData() {
  var ss      = SpreadsheetApp.openById(SHEET_ID);
  var repRows = readSheet(ss, SHEET_REPONSES);
  var venRows = readSheet(ss, SHEET_VENDORS);
  var today     = todayStr();
  var yesterday = yesterdayStr();
  var month     = thisMonth();

  // Filtrer les lignes valides (avec date et téléphone)
  var validRows = repRows.filter(function(r) {
    return toDateStr(r[R_DATE]) !== "" && String(r[R_PHONE]||"").trim() !== "";
  });

  // Lignes du mois en cours
  var monthRows = validRows.filter(function(r) {
    var ds = toDateStr(r[R_DATE]);
    if (!ds || ds.length < 8) return false;
    var parts = ds.split("/");
    if (parts.length < 3) return false;
    // Comparer mois et année
    var mm = parts[1].length === 1 ? "0"+parts[1] : parts[1];
    var yyyy = parts[2];
    return (mm + "/" + yyyy) === month;
  });
  Logger.log("monthRows: " + monthRows.length + " lignes pour " + month);

  // Lignes d'aujourd'hui
  var todayRows = validRows.filter(function(r) {
    return toDateStr(r[R_DATE]) === today;
  });

  // Lignes "J ai deja vendu" aujourd'hui = ventes réelles du jour
  var todaySales = todayRows.filter(function(r) {
    return String(r[R_STATUT]||"").trim() === "J ai deja vendu";
  });

  return {
    updated_at         : new Date().toISOString(),
    today_date         : today,
    overview           : buildOverview(monthRows, todayRows, todaySales, venRows, yesterday, validRows, month),
    today              : buildToday(todayRows, todaySales),
    vendors            : buildVendors(venRows, validRows),
    depots             : buildDepots(monthRows),
    depot_today        : buildDepotToday(todaySales),
    depot_yesterday    : buildDepotYesterday(validRows, today, yesterday),
    yesterday_sales    : buildYesterdaySales(validRows, today, yesterday),
    weekly             : buildWeekly(validRows),
    hotspots           : buildHotspots(monthRows),
    morning_vs_evening : buildMorningEvening(monthRows),
    problems           : buildProblems(monthRows),
    prime              : buildPrime(monthRows),
    satisfaction       : buildSatisfaction(monthRows),
    equipment          : buildEquipment(monthRows, todayRows),
  };
}


// ============================================================
//  OVERVIEW
//  - Total ventes MTD (toutes déclarations du mois)
//  - Moyenne ventes par vendor
//  - QPVD (pièces/vendor-day)
//  - Vendors actifs
//  - Ventes du jour (J ai deja vendu uniquement)
//  - Problème équipement aujourd'hui (0 ou >0)
// ============================================================
function buildOverview(monthRows, todayRows, todaySales, venRows, yesterday, validRows, month) {
  // ── MTD — somme de TOUTES les ventes du mois ─────────────
  var totalVentesMTD=0, totalXtraMTD=0, totalChocoMTD=0, totalVanMTD=0;
  var vendorsActifs = new Set();
  var vendorDays    = new Set();

  monthRows.forEach(function(r) {
    totalVentesMTD += parseInt(r[R_VENTES])||0;
    totalXtraMTD   += parseInt(r[R_XTRA])  ||0;
    totalChocoMTD  += parseInt(r[R_CHOCO]) ||0;
    totalVanMTD    += parseInt(r[R_VAN])   ||0;
    var ph = String(r[R_PHONE]||"").trim();
    if (ph) {
      vendorsActifs.add(ph);
      vendorDays.add(ph + "_" + toDateStr(r[R_DATE]));
    }
  });

  var totalPiecesMTD  = totalXtraMTD + totalChocoMTD + totalVanMTD;
  var nbVendorsActifs = vendorsActifs.size;
  var nbVendorDays    = vendorDays.size;
  var avgVentesVendor = nbVendorsActifs > 0
    ? Math.round(totalVentesMTD / nbVendorsActifs) : 0;
  var qpvd = nbVendorDays > 0
    ? Math.round(totalPiecesMTD / nbVendorDays) : 0;

  // Jours travaillés moyens — calculé depuis TOUTES les lignes valides
  // en filtrant par mois directement dans la boucle
  var joursParVendor = {};
  validRows.forEach(function(r) {
    var ph = String(r[R_PHONE]||"").trim();
    var ds = toDateStr(r[R_DATE]);
    if (!ph || !ds) return;
    var parts = ds.split("/");
    if (parts.length < 3) return;
    // Filtrer par mois courant
    var mm   = parts[1].length===1 ? "0"+parts[1] : parts[1];
    var yyyy = parts[2];
    if ((mm+"/"+yyyy) !== month) return;
    if (!joursParVendor[ph]) joursParVendor[ph] = new Set();
    joursParVendor[ph].add(ds);
  });
  var totalJours = 0, nbV = Object.keys(joursParVendor).length;
  Object.values(joursParVendor).forEach(function(s){ totalJours += s.size; });
  var avgJours = nbV > 0 ? Math.round(totalJours / nbV) : 0;
  Logger.log("Jours: nbVendors=" + nbV + " totalJours=" + totalJours + " avg=" + avgJours + " month=" + month);

  // ── AUJOURD'HUI ──────────────────────────────────────────
  // Ventes = seulement "J ai deja vendu"
  var ventesAujourdHui=0, xtraAujourdHui=0, chocoAujourdHui=0, vanAujourdHui=0;
  var vendorsQuiVendent = new Set();
  todaySales.forEach(function(r) {
    ventesAujourdHui += parseInt(r[R_VENTES]) || 0;
    xtraAujourdHui   += parseInt(r[R_XTRA])   || 0;
    chocoAujourdHui  += parseInt(r[R_CHOCO])  || 0;
    vanAujourdHui    += parseInt(r[R_VAN])     || 0;
    var ph = String(r[R_PHONE]||"").trim();
    if (ph) vendorsQuiVendent.add(ph);
  });

  // Vendors uniques aujourd'hui (toutes déclarations)
  var vendorsUniqueAujourdHui = new Set();
  todayRows.forEach(function(r) {
    var ph = String(r[R_PHONE]||"").trim();
    if (ph) vendorsUniqueAujourdHui.add(ph);
  });

  // Problème équipement aujourd'hui
  var pbEquipAujourdHui = todayRows.filter(function(r) {
    return String(r[R_CAT]||"").trim() === "Probleme d equipement";
  }).length;

  // Moyenne ventes par vendor aujourd'hui
  var avgVentesAujourdHui = vendorsQuiVendent.size > 0
    ? Math.round(ventesAujourdHui / vendorsQuiVendent.size) : 0;

  return {
    // MTD
    total_ventes_mtd    : totalVentesMTD,
    total_xtra_mtd      : totalXtraMTD,
    total_choco_mtd     : totalChocoMTD,
    total_van_mtd       : totalVanMTD,
    total_pieces_mtd    : totalPiecesMTD,
    nb_vendors_actifs   : nbVendorsActifs,
    avg_ventes_vendor   : avgVentesVendor,
    qpvd                : qpvd,
    avg_jours           : avgJours,
    // Aujourd'hui
    ventes_today        : ventesAujourdHui,
    xtra_today          : xtraAujourdHui,
    choco_today         : chocoAujourdHui,
    van_today           : vanAujourdHui,
    pieces_today        : xtraAujourdHui + chocoAujourdHui + vanAujourdHui,
    vendors_today       : vendorsUniqueAujourdHui.size,
    vendors_qui_vendent : vendorsQuiVendent.size,
    avg_ventes_today    : avgVentesAujourdHui,
    pb_equip_today      : pbEquipAujourdHui,
    interactions_today  : todayRows.length,
  };
}


// ============================================================
//  TODAY — live feed + détails
// ============================================================
function buildToday(todayRows, todaySales) {
  // Satisfaction du jour
  var parPhone = {};
  todayRows.forEach(function(r) {
    var ph = String(r[R_PHONE]||"").trim();
    if (ph) parPhone[ph] = String(r[R_CAT]||"").trim();
  });
  var total = Object.keys(parPhone).length;
  var aucun = Object.values(parPhone).filter(function(c){
    return c === "Aucun probleme" || c === "";
  }).length;

  // Live feed — 15 dernières déclarations
  var last15 = todayRows.slice(-15).reverse().map(function(r) {
    var stat = String(r[R_STATUT]||"").trim();
    return {
      heure  : String(r[R_HEURE] ||""),
      nom    : String(r[R_NOM]   ||""),
      depot  : String(r[R_DEPOT] ||""),
      statut : stat,
      ventes : parseInt(r[R_VENTES])||0,
      xtra   : parseInt(r[R_XTRA])  ||0,
      choco  : parseInt(r[R_CHOCO]) ||0,
      van    : parseInt(r[R_VAN])   ||0,
      cat    : String(r[R_CAT]   ||""),
      is_today_sale: stat === "J ai deja vendu",
    };
  });

  return {
    nb_declarations   : todayRows.length,
    vendors_uniques   : Object.keys(parPhone).length,
    satisfaction_today: total > 0 ? Math.round((aucun/total)*100) : 0,
    last_declarations : last15,
  };
}


// ============================================================
//  VENDORS — jours réels depuis Réponses
// ============================================================
function buildVendors(venRows, validRows) {
  var joursParPhone = {};
  validRows.forEach(function(r) {
    var ph = String(r[R_PHONE]||"").trim();
    var ds = toDateStr(r[R_DATE]);
    if (!ph || !ds) return;
    if (!joursParPhone[ph]) joursParPhone[ph] = new Set();
    joursParPhone[ph].add(ds);
  });

  return venRows.filter(function(r){ return String(r[V_NOM]||"").trim(); })
    .map(function(r) {
      var phone    = String(r[V_PHONE]||"").trim();
      var fanxtra  = parseInt(r[V_FANXTRA]) ||0;
      var fanchoco = parseInt(r[V_FANCHOCO])||0;
      var fanvan   = parseInt(r[V_FANVAN])  ||0;
      return {
        phone      : phone,
        nom        : String(r[V_NOM]     ||"").trim(),
        depot      : String(r[V_DEPOT]   ||"").trim(),
        last_decl  : String(r[V_LAST_DEC]||"").trim(),
        ventes     : parseInt(r[V_VENTES]) ||0,
        fanxtra    : fanxtra,
        fanchoco   : fanchoco,
        fanvanille : fanvan,
        pieces     : parseInt(r[V_PIECES]) ||(fanxtra+fanchoco+fanvan),
        jours      : joursParPhone[phone] ? joursParPhone[phone].size : 0,
        prev_ventes: 0,
        last_date  : String(r[V_DATE_V]  ||"").trim(),
      };
    });
}


// ============================================================
//  DEPOTS MTD
// ============================================================
function buildDepots(monthRows) {
  var m = {};
  monthRows.forEach(function(r) {
    var dep = String(r[R_DEPOT]||"").trim();
    if (!dep) return;
    if (!m[dep]) m[dep] = {nom:dep, declarations:0, vendors:new Set(),
      ventes:0, fx:0, fc:0, fv:0};
    m[dep].declarations++;
    var ph = String(r[R_PHONE]||"").trim();
    if (ph) m[dep].vendors.add(ph);
    m[dep].ventes += parseInt(r[R_VENTES])||0;
    m[dep].fx     += parseInt(r[R_XTRA])  ||0;
    m[dep].fc     += parseInt(r[R_CHOCO]) ||0;
    m[dep].fv     += parseInt(r[R_VAN])   ||0;
  });
  return Object.values(m).map(function(d) {
    return {nom:d.nom, declarations:d.declarations,
      nb_vendors:d.vendors.size, ventes:d.ventes,
      fanxtra:d.fx, fanchoco:d.fc, fanvan:d.fv, pieces:d.fx+d.fc+d.fv};
  }).sort(function(a,b){ return b.ventes-a.ventes; });
}


// ============================================================
//  DEPOT TODAY — seulement "J ai deja vendu"
// ============================================================
function buildDepotToday(todaySales) {
  var m = {};
  todaySales.forEach(function(r) {
    var dep = String(r[R_DEPOT]||"").trim();
    if (!dep) return;
    if (!m[dep]) m[dep] = {nom:dep, declarations:0, vendors:new Set(),
      ventes:0, fx:0, fc:0, fv:0};
    m[dep].declarations++;
    var ph = String(r[R_PHONE]||"").trim();
    if (ph) m[dep].vendors.add(ph);
    m[dep].ventes += parseInt(r[R_VENTES])||0;
    m[dep].fx     += parseInt(r[R_XTRA])  ||0;
    m[dep].fc     += parseInt(r[R_CHOCO]) ||0;
    m[dep].fv     += parseInt(r[R_VAN])   ||0;
  });
  return Object.values(m).map(function(d) {
    return {nom:d.nom, declarations:d.declarations,
      nb_vendors:d.vendors.size, ventes:d.ventes,
      fanxtra:d.fx, fanchoco:d.fc, fanvan:d.fv, pieces:d.fx+d.fc+d.fv};
  }).sort(function(a,b){ return b.ventes-a.ventes; });
}


// ============================================================
//  VENTES D'HIER
//  = lignes d'aujourd'hui avec "Je vais vendre" ou "Non"
//  + toutes les lignes d'hier
// ============================================================
function buildYesterdaySales(validRows, today, yesterday) {
  // Yesterday = TOUTES les lignes du jour J-1 (hier)
  // On prend directement toutes les déclarations d'hier
  // peu importe le statut
  var ventes=0, xtra=0, choco=0, van=0, count=0;
  var vendors = new Set();
  validRows.forEach(function(r) {
    var ds = toDateStr(r[R_DATE]);
    if (ds !== yesterday) return; // seulement les lignes d'hier
    ventes += parseInt(r[R_VENTES])||0;
    xtra   += parseInt(r[R_XTRA])  ||0;
    choco  += parseInt(r[R_CHOCO]) ||0;
    van    += parseInt(r[R_VAN])   ||0;
    count++;
    var ph = String(r[R_PHONE]||"").trim();
    if (ph) vendors.add(ph);
  });
  return {
    date       : yesterday,
    nb         : count,
    nb_vendors : vendors.size,
    ventes     : ventes,
    xtra       : xtra,
    choco      : choco,
    van        : van,
  };
}


// ============================================================
//  DEPOT YESTERDAY
// ============================================================
function buildDepotYesterday(validRows, today, yesterday) {
  var m = {};
  validRows.forEach(function(r) {
    var ds   = toDateStr(r[R_DATE]);
    var stat = String(r[R_STATUT]||"").trim();
    var dep  = String(r[R_DEPOT] ||"").trim();
    if (!dep) return;
    // Ventes d'hier = lignes d'aujourd'hui avec "Je vais vendre"/"Non"
    //              + toutes les lignes d'hier
    // Ventes d'hier = toutes les lignes du jour J-1
    var inclure = (ds===yesterday);
    if (!inclure) return;
    if (!m[dep]) m[dep]={nom:dep,declarations:0,vendors:new Set(),ventes:0,fx:0,fc:0,fv:0};
    m[dep].declarations++;
    var ph=String(r[R_PHONE]||"").trim(); if(ph) m[dep].vendors.add(ph);
    m[dep].ventes += parseInt(r[R_VENTES])||0;
    m[dep].fx     += parseInt(r[R_XTRA])  ||0;
    m[dep].fc     += parseInt(r[R_CHOCO]) ||0;
    m[dep].fv     += parseInt(r[R_VAN])   ||0;
  });
  return Object.values(m).map(function(d){
    return {nom:d.nom, declarations:d.declarations, nb_vendors:d.vendors.size,
      ventes:d.ventes, fanxtra:d.fx, fanchoco:d.fc, fanvan:d.fv,
      pieces:d.fx+d.fc+d.fv};
  }).sort(function(a,b){return b.ventes-a.ventes;});
}


// ============================================================
//  WEEKLY QPVD
// ============================================================
function buildWeekly(validRows) {
  var bySem = {};
  validRows.forEach(function(r) {
    var ds = toDateStr(r[R_DATE]);
    if (!ds) return;
    var p = ds.split("/");
    if (p.length < 3) return;
    var d   = new Date(parseInt(p[2]), parseInt(p[1])-1, parseInt(p[0]));
    var key = getWeekKey(d);
    if (!bySem[key]) bySem[key] = {pieces:0, days:new Set()};
    bySem[key].pieces += (parseInt(r[R_XTRA])||0)
                       + (parseInt(r[R_CHOCO])||0)
                       + (parseInt(r[R_VAN])||0);
    bySem[key].days.add(String(r[R_PHONE]||"") + "_" + ds);
  });
  var keys = Object.keys(bySem).sort().slice(-7);
  return keys.map(function(k, i) {
    var s = bySem[k];
    var n = s.days.size;
    return {sem:"W"+(i+1), qpvd: n>0 ? Math.round(s.pieces/n) : 0, target:132};
  });
}

function getWeekKey(d) {
  var j = new Date(d.getFullYear(), 0, 1);
  var w = Math.ceil(((d-j)/86400000 + j.getDay() + 1) / 7);
  return d.getFullYear() + "-W" + (w<10?"0"+w:w);
}


// ============================================================
//  SATISFACTION — mois courant
// ============================================================
function buildSatisfaction(monthRows) {
  var parJourPhone = {};
  monthRows.forEach(function(r) {
    var ph = String(r[R_PHONE]||"").trim();
    var ds = toDateStr(r[R_DATE]);
    if (!ph || !ds) return;
    parJourPhone[ds+"_"+ph] = String(r[R_CAT]||"").trim();
  });
  var total = Object.keys(parJourPhone).length;
  var aucun = Object.values(parJourPhone).filter(function(c){
    return c === "Aucun probleme" || c === "";
  }).length;
  return {
    rate          : total>0 ? Math.round((aucun/total)*100) : 0,
    aucun_probleme: aucun,
    total_decla   : total,
  };
}


// ============================================================
//  EQUIPMENT
//  - issues_mois : total du mois
//  - issues_today : problèmes d'AUJOURD'HUI (s'affiche en rouge)
// ============================================================
function buildEquipment(monthRows, todayRows) {
  var issuesMois  = 0;
  var issuesToday = 0;
  monthRows.forEach(function(r) {
    if (String(r[R_CAT]||"").trim() === "Probleme d equipement") issuesMois++;
  });
  todayRows.forEach(function(r) {
    if (String(r[R_CAT]||"").trim() === "Probleme d equipement") issuesToday++;
  });
  return {
    issues_mois : issuesMois,
    issues_today: issuesToday,
    jours_perdus: 0,
    semaines    : 0,
    heures      : 0,
    statut      : issuesToday > 0 ? "ALERTE" : (issuesMois > 0 ? "ATTENTION" : "OK"),
  };
}


// ============================================================
//  PROBLEMS, PRIME, HOTSPOTS, MORNING/EVENING
// ============================================================
function buildProblems(monthRows) {
  var m = {};
  monthRows.forEach(function(r) {
    var cat = String(r[R_CAT]||"").trim();
    if (!cat || cat==="-" || cat==="Aucun probleme") return;
    m[cat] = (m[cat]||0) + 1;
  });
  return Object.entries(m)
    .map(function(e){ return {categorie:e[0], count:e[1]}; })
    .sort(function(a,b){ return b.count-a.count; });
}

function buildPrime(monthRows) {
  var m = {};
  monthRows.forEach(function(r) {
    var pr = String(r[R_PRIME]||"").trim();
    if (!pr || pr==="-") return;
    m[pr] = (m[pr]||0) + 1;
  });
  return Object.entries(m)
    .map(function(e){ return {pilier:e[0], count:e[1]}; })
    .sort(function(a,b){ return b.count-a.count; });
}

function buildHotspots(monthRows) {
  var m = {};
  monthRows.forEach(function(r) {
    var lx = String(r[R_LIEU]||"").trim();
    if (!lx || lx==="-") return;
    lx.split(",").forEach(function(l) {
      l = l.trim(); if (l) m[l] = (m[l]||0) + 1;
    });
  });
  return Object.entries(m)
    .map(function(e){ return {lieu:e[0], count:e[1]}; })
    .sort(function(a,b){ return b.count-a.count; })
    .slice(0, 10);
}

function buildMorningEvening(monthRows) {
  var mt={declarations:0,ventes:0}, so={declarations:0,ventes:0};
  monthRows.forEach(function(r) {
    var per = String(r[R_PERIODE]||"").trim();
    var ca  = parseInt(r[R_VENTES])||0;
    if (per==="Matin") { mt.declarations++; mt.ventes+=ca; }
    else               { so.declarations++; so.ventes+=ca; }
  });
  return {
    morning:{declarations:mt.declarations, ventes:mt.ventes,
      avg: mt.declarations>0 ? Math.round(mt.ventes/mt.declarations) : 0},
    evening:{declarations:so.declarations, ventes:so.ventes,
      avg: so.declarations>0 ? Math.round(so.ventes/so.declarations) : 0},
  };
}


// ============================================================
//  RÉCONCILIATION
// ============================================================
function reconcilierVendors() {
  try {
    var ss=SpreadsheetApp.openById(SHEET_ID);
    var sv=ss.getSheetByName(SHEET_VENDORS);
    var sr=ss.getSheetByName(SHEET_REPONSES);
    if(!sv||!sr){Logger.log("Onglet introuvable");return;}
    var rv=sv.getDataRange().getValues(), ph={};
    for(var i=1;i<rv.length;i++){
      var p2=String(rv[i][V_PHONE]||"").trim(); if(p2) ph[p2]=i+1;
    }
    var rr=sr.getDataRange().getValues(), last={};
    for(var j=1;j<rr.length;j++){
      var r=rr[j], p3=String(r[R_PHONE]||"").trim(); if(!p3) continue;
      last[p3]={nom:String(r[R_NOM]||"").trim(), depot:String(r[R_DEPOT]||"").trim(),
        date:toDateStr(r[R_DATE]), ventes:parseInt(r[R_VENTES])||0,
        fx:parseInt(r[R_XTRA])||0, fc:parseInt(r[R_CHOCO])||0, fv:parseInt(r[R_VAN])||0};
    }
    var now=Utilities.formatDate(new Date(),TIMEZONE,"dd/MM/yyyy HH:mm"),a=0,m=0;
    Object.keys(last).forEach(function(p4) {
      var info=last[p4]; if(!info.nom||!info.depot) return;
      var pc=info.fx+info.fc+info.fv;
      if(!ph[p4]){
        sv.appendRow([p4,info.nom,info.depot,now,
          info.ventes,info.fx,info.fc,info.fv,pc,info.date]);
        a++;
      } else if(info.ventes>0||pc>0){
        sv.getRange(ph[p4],V_LAST_DEC+1,1,7)
          .setValues([[now,info.ventes,info.fx,info.fc,info.fv,pc,info.date]]);
        m++;
      }
    });
    Logger.log("Synchro OK: "+a+" ajoutés, "+m+" mis à jour");
  } catch(e) { Logger.log("Erreur: "+e.message); }
}


// ============================================================
//  MENU
// ============================================================
function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu("FanMilk Dashboard")
      .addItem("🔗 Tester l'API",          "testerAPI")
      .addItem("🔄 Synchro Vendors",        "reconcilierVendors")
      .addItem("⏰ Déclencheur 7h",         "installerDeclencheur")
      .addToUi();
  } catch(e) { Logger.log("onOpen skipped: "+e.message); }
}

function testerAPI() {
  try {
    var d  = buildData();
    var ov = d.overview;
    // Utilise Logger.log — visible dans "Journal d'exécution"
    Logger.log("=== API OK === " + d.today_date);
    Logger.log("MTD: ventes=" + ov.total_ventes_mtd + " pieces=" + ov.total_pieces_mtd);
    Logger.log("MTD: vendors=" + ov.nb_vendors_actifs + " avgVentes=" + ov.avg_ventes_vendor);
    Logger.log("MTD: qpvd=" + ov.qpvd + " avgJours=" + ov.avg_jours);
    Logger.log("MTD: satisfaction=" + d.satisfaction.rate + "% (" + d.satisfaction.aucun_probleme + "/" + d.satisfaction.total_decla + ")");
    Logger.log("TODAY: interactions=" + ov.interactions_today + " vendors=" + ov.vendors_today);
    Logger.log("TODAY: vendorsQuiVendent=" + ov.vendors_qui_vendent + " ventes=" + ov.ventes_today);
    Logger.log("TODAY: pieces=" + ov.pieces_today + " pbEquip=" + ov.pb_equip_today);
    Logger.log("DATA: depots=" + d.depots.length + " hotspots=" + d.hotspots.length + " weekly=" + d.weekly.length);
    Logger.log("=== FIN ===");
  } catch(e) {
    Logger.log("ERREUR testerAPI: " + e.message + " | " + e.stack);
  }
}

function installerDeclencheur() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if(t.getHandlerFunction()==="reconcilierVendors") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("reconcilierVendors")
    .timeBased().everyDays(1).atHour(7).create();
  SpreadsheetApp.getUi().alert("✅ Déclencheur installé à 7h chaque jour");
}


// ============================================================
//  DIAGNOSTIC COMPLET — Exécutez cette fonction
//  Menu déroulant → diagComplet → ▶️ Exécuter
// ============================================================
function diagComplet() {
  try {
    var ss    = SpreadsheetApp.openById(SHEET_ID);
    var sr    = ss.getSheetByName(SHEET_REPONSES);
    var today = Utilities.formatDate(new Date(), TIMEZONE, "dd/MM/yyyy");

    Logger.log("TODAY = " + today);

    if (!sr) { Logger.log("ERREUR: Onglet introuvable: " + SHEET_REPONSES); return; }

    var vals = sr.getDataRange().getValues();
    Logger.log("Nb lignes Reponses: " + (vals.length - 1));

    // 5 premières dates brutes
    for (var i = 1; i <= Math.min(5, vals.length-1); i++) {
      var raw       = vals[i][0];
      var type      = Object.prototype.toString.call(raw);
      var converted = toDateStr(raw);
      Logger.log("L"+i+" type="+type+" brut="+raw+" converti="+converted+" matchToday="+(converted===today));
    }

    // Compter lignes du jour
    var countToday = 0;
    for (var j = 1; j < vals.length; j++) {
      if (toDateStr(vals[j][0]) === today) countToday++;
    }
    Logger.log("Lignes du jour: " + countToday);

    // Compter Aucun probleme
    var aucun = 0;
    for (var k = 1; k < vals.length; k++) {
      if (String(vals[k][12]||"").trim() === "Aucun probleme") aucun++;
    }
    Logger.log("Aucun probleme total: " + aucun);

    // Mois courant
    var month = Utilities.formatDate(new Date(), TIMEZONE, "MM/yyyy");
    var countMonth = 0;
    for (var l = 1; l < vals.length; l++) {
      var ds = toDateStr(vals[l][0]);
      var p  = ds.split("/");
      if (p.length >= 3 && (p[1]+"/"+p[2]) === month) countMonth++;
    }
    Logger.log("Lignes du mois ("+month+"): " + countMonth);
    Logger.log("=== DIAG FIN ===");

  } catch(e) {
    Logger.log("ERREUR diagComplet: " + e.message);
  }
}
