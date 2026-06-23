// ============================================================
//  FANMILK TOGO — Apps Script Web App (API only)
//  Ce script expose vos données Google Sheets en JSON
//  pour le dashboard React sur fanmilk-dashboard.vercel.app
//
//  ❌ La génération de dashboard dans le Sheet est supprimée
//  ✅ Seule l'API JSON reste — légère et rapide
// ============================================================

// ── CONFIGURATION ───────────────────────────────────────────
// Votre Google Sheet ID (dans l'URL entre /d/ et /edit)
var SHEET_ID = "COLLEZ_VOTRE_SHEET_ID_ICI";

// Noms des onglets (ne pas modifier sauf si vous les avez renommés)
var SHEET_VENDORS  = "Vendors";
var SHEET_REPONSES = "Reponses Vendors";

// Colonnes onglet "Vendors" (A=0, B=1, ...)
var V_PHONE    = 0;  // A — Telephone
var V_NOM      = 1;  // B — Nom
var V_DEPOT    = 2;  // C — Depot
var V_LAST_DEC = 3;  // D — Derniere declaration
var V_VENTES   = 4;  // E — Dernieres ventes FCFA
var V_FANXTRA  = 5;  // F — FanXtra
var V_FANCHOCO = 6;  // G — FanChoco
var V_FANVAN   = 7;  // H — FanVanille
var V_PIECES   = 8;  // I — Total pieces
var V_DATE_V   = 9;  // J — Date dernieres ventes

// Colonnes onglet "Reponses Vendors" (A=0, B=1, ...)
var R_DATE     = 0;  // A — Date
var R_HEURE    = 1;  // B — Heure
var R_PERIODE  = 2;  // C — Periode
var R_PHONE    = 3;  // D — Telephone
var R_NOM      = 4;  // E — Nom Vendor
var R_DEPOT    = 5;  // F — Depot
var R_STATUT   = 6;  // G — Statut Vente
var R_VENTES   = 7;  // H — Ventes FCFA
var R_XTRA     = 8;  // I — FanXtra
var R_CHOCO    = 9;  // J — FanChoco
var R_VAN      = 10; // K — FanVanille
var R_LIEU     = 11; // L — Lieu de vente
var R_CAT      = 12; // M — Categorie Probleme
var R_PRIME    = 13; // N — Pilier PRIME
var R_COMM     = 14; // O — Commentaire


// ============================================================
//  POINT D'ENTRÉE — appelé par le dashboard React
// ============================================================
function doGet(e) {
  try {
    var data = buildData();
    return ContentService
      .createTextOutput(JSON.stringify(data))
      .setMimeType(ContentService.MimeType.JSON);
  } catch(err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}


// ============================================================
//  CONSTRUCTION DES DONNÉES
// ============================================================
function buildData() {
  var ss = SpreadsheetApp.openById(SHEET_ID);

  // Lire les deux onglets en une seule fois
  var vendorRows   = readSheet(ss, SHEET_VENDORS);
  var reponseRows  = readSheet(ss, SHEET_REPONSES);

  var today = Utilities.formatDate(
    new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy"
  );

  return {
    updated_at : new Date().toISOString(),
    today_date : today,
    vendors    : buildVendors(vendorRows),
    weekly     : buildWeekly(reponseRows),
    today      : buildToday(reponseRows, today),
    depots     : buildDepots(vendorRows),
    problems   : buildProblems(reponseRows, today),
    prime      : buildPrime(reponseRows),
    hotspots   : buildHotspots(reponseRows),
    morning_vs_evening : buildMorningEvening(reponseRows),
  };
}


// ── Lecture Sheet → tableau de lignes (sans l'en-tête) ──────
function readSheet(ss, name) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) return [];
  var vals = sheet.getDataRange().getValues();
  return vals.length > 1 ? vals.slice(1).filter(function(r){ return String(r[0]||"").trim(); }) : [];
}


// ============================================================
//  1. VENDORS — liste complète depuis l'onglet Vendors
// ============================================================
function buildVendors(rows) {
  // Calculer les ventes du mois précédent par téléphone
  // (on utilise prev_ventes = 0 car on n'a pas l'historique ici,
  //  mais vous pouvez enrichir plus tard)
  return rows.map(function(r) {
    var ventes   = parseInt(r[V_VENTES])  || 0;
    var fanxtra  = parseInt(r[V_FANXTRA]) || 0;
    var fanchoco = parseInt(r[V_FANCHOCO])|| 0;
    var fanvan   = parseInt(r[V_FANVAN])  || 0;
    var pieces   = parseInt(r[V_PIECES])  || (fanxtra + fanchoco + fanvan);
    var jours    = 26; // valeur par défaut — vous pouvez ajouter une colonne "Jours" au sheet

    return {
      phone      : String(r[V_PHONE]    || "").trim(),
      nom        : String(r[V_NOM]      || "").trim(),
      depot      : String(r[V_DEPOT]    || "").trim(),
      last_decl  : String(r[V_LAST_DEC] || "").trim(),
      ventes     : ventes,
      fanxtra    : fanxtra,
      fanchoco   : fanchoco,
      fanvanille : fanvan,
      pieces     : pieces,
      jours      : jours,
      prev_ventes: 0,
      last_date  : String(r[V_DATE_V]   || "").trim(),
    };
  }).filter(function(v){ return v.nom; });
}


// ============================================================
//  2. WEEKLY QPVD — 7 dernières semaines depuis Réponses
// ============================================================
function buildWeekly(rows) {
  var bySem = {};

  rows.forEach(function(r) {
    var dateStr = String(r[R_DATE] || "").trim();
    if (!dateStr) return;
    var parts = dateStr.split("/");
    if (parts.length < 3) return;
    var d = new Date(parseInt(parts[2]), parseInt(parts[1])-1, parseInt(parts[0]));
    var key   = getWeekKey(d);
    var label = getWeekLabel(d);

    if (!bySem[key]) bySem[key] = { label:label, pieces:0, vendorDays:{}, key:key };

    var pieces = (parseInt(r[R_XTRA])||0) + (parseInt(r[R_CHOCO])||0) + (parseInt(r[R_VAN])||0);
    bySem[key].pieces += pieces;

    // Compter les couples phone+date uniques (= jours effectifs)
    var phone  = String(r[R_PHONE]||"").trim();
    var dayKey = phone + "_" + dateStr;
    bySem[key].vendorDays[dayKey] = true;
  });

  var keys = Object.keys(bySem).sort();
  // Garder les 7 dernières semaines
  keys = keys.slice(-7);

  return keys.map(function(k, idx) {
    var s      = bySem[k];
    var nbJours = Object.keys(s.vendorDays).length;
    var qpvd   = nbJours > 0 ? Math.round(s.pieces / nbJours) : 0;
    return { sem:"W"+(idx+1), qpvd:qpvd, target:132 };
  });
}

function getWeekKey(d) {
  var jan1 = new Date(d.getFullYear(), 0, 1);
  var w    = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return d.getFullYear() + "-W" + (w < 10 ? "0"+w : w);
}

function getWeekLabel(d) {
  var jan1 = new Date(d.getFullYear(), 0, 1);
  return "W" + Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
}


// ============================================================
//  3. TODAY — activité du jour
// ============================================================
function buildToday(rows, today) {
  var todayRows = rows.filter(function(r){ return String(r[R_DATE]||"").trim() === today; });

  var phones = {};
  var ventes = 0, xtra = 0, choco = 0, van = 0;

  todayRows.forEach(function(r) {
    var phone = String(r[R_PHONE]||"").trim();
    if (phone) phones[phone] = true;
    ventes += parseInt(r[R_VENTES]) || 0;
    xtra   += parseInt(r[R_XTRA])   || 0;
    choco  += parseInt(r[R_CHOCO])  || 0;
    van    += parseInt(r[R_VAN])    || 0;
  });

  // 10 dernières déclarations du jour (plus récentes en premier)
  var last10 = todayRows.slice(-10).reverse().map(function(r){
    return {
      heure  : String(r[R_HEURE]  ||""),
      nom    : String(r[R_NOM]    ||""),
      depot  : String(r[R_DEPOT]  ||""),
      statut : String(r[R_STATUT] ||""),
      ventes : parseInt(r[R_VENTES])||0,
      xtra   : parseInt(r[R_XTRA])  ||0,
      choco  : parseInt(r[R_CHOCO]) ||0,
      van    : parseInt(r[R_VAN])   ||0,
    };
  });

  return {
    nb_declarations : todayRows.length,
    vendors_actifs  : Object.keys(phones).length,
    ventes_total    : ventes,
    fanxtra_total   : xtra,
    fanchoco_total  : choco,
    fanvan_total    : van,
    last_declarations: last10,
  };
}


// ============================================================
//  4. DEPOTS — performance par dépôt
// ============================================================
function buildDepots(vendorRows) {
  var map = {};
  vendorRows.forEach(function(r) {
    var depot = String(r[V_DEPOT]||"").trim();
    if (!depot) return;
    if (!map[depot]) map[depot] = { nom:depot, count:0, ventes:0, fanxtra:0, fanchoco:0, fanvan:0 };
    map[depot].count++;
    map[depot].ventes   += parseInt(r[V_VENTES])  ||0;
    map[depot].fanxtra  += parseInt(r[V_FANXTRA]) ||0;
    map[depot].fanchoco += parseInt(r[V_FANCHOCO])||0;
    map[depot].fanvan   += parseInt(r[V_FANVAN])  ||0;
  });
  return Object.values(map).sort(function(a,b){ return b.ventes - a.ventes; });
}


// ============================================================
//  5. PROBLEMS — catégories de problèmes du mois
// ============================================================
function buildProblems(rows, today) {
  var parts = today.split("/");
  var mois  = parseInt(parts[1]);
  var annee = parseInt(parts[2]);
  var map   = {};

  rows.forEach(function(r) {
    var cat = String(r[R_CAT]||"").trim();
    if (!cat || cat==="-" || cat==="Aucun probleme") return;
    var dp  = String(r[R_DATE]||"").split("/");
    if (dp.length < 3) return;
    if (parseInt(dp[1])!==mois || parseInt(dp[2])!==annee) return;
    map[cat] = (map[cat]||0)+1;
  });

  return Object.entries(map)
    .map(function(e){ return { categorie:e[0], count:e[1] }; })
    .sort(function(a,b){ return b.count - a.count; });
}


// ============================================================
//  6. PRIME — piliers PRIME du mois
// ============================================================
function buildPrime(rows) {
  var map = {};
  rows.forEach(function(r) {
    var pr = String(r[R_PRIME]||"").trim();
    if (!pr || pr==="-" || pr==="") return;
    map[pr] = (map[pr]||0)+1;
  });
  return Object.entries(map)
    .map(function(e){ return { pilier:e[0], count:e[1] }; })
    .sort(function(a,b){ return b.count - a.count; });
}


// ============================================================
//  7. HOTSPOTS — lieux de vente les plus fréquents
// ============================================================
function buildHotspots(rows) {
  var map = {};
  rows.forEach(function(r) {
    var lieux = String(r[R_LIEU]||"").trim();
    if (!lieux || lieux==="-") return;
    lieux.split(",").forEach(function(l){
      l = l.trim();
      if (l) map[l] = (map[l]||0)+1;
    });
  });
  return Object.entries(map)
    .map(function(e){ return { lieu:e[0], count:e[1] }; })
    .sort(function(a,b){ return b.count - a.count; })
    .slice(0,10);
}


// ============================================================
//  8. MORNING vs EVENING
// ============================================================
function buildMorningEvening(rows) {
  var matin = { declarations:0, ventes:0 };
  var soir  = { declarations:0, ventes:0 };

  rows.forEach(function(r) {
    var per = String(r[R_PERIODE]||"").trim();
    var ca  = parseInt(r[R_VENTES])||0;
    if (per === "Matin") { matin.declarations++; matin.ventes+=ca; }
    else                 { soir.declarations++;  soir.ventes+=ca;  }
  });

  return {
    morning : { declarations:matin.declarations, ventes:matin.ventes,
                avg: matin.declarations>0 ? Math.round(matin.ventes/matin.declarations):0 },
    evening : { declarations:soir.declarations,  ventes:soir.ventes,
                avg: soir.declarations>0  ? Math.round(soir.ventes/soir.declarations):0 },
  };
}


// ============================================================
//  MENU GOOGLE SHEETS (bouton manuel pour tester l'API)
// ============================================================
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("FanMilk Dashboard")
    .addItem("🔗 Voir les données JSON (test)", "testerAPI")
    .addItem("🔄 Forcer synchro Vendors", "reconcilierVendors")
    .addToUi();
}

function testerAPI() {
  var data = buildData();
  var msg  = "✅ API OK\n\n"
    + "Vendors: "         + data.vendors.length          + "\n"
    + "Déclarations auj.: "+ data.today.nb_declarations   + "\n"
    + "Ventes auj.: "     + data.today.ventes_total + " FCFA\n"
    + "Semaines dispo: "  + data.weekly.length            + "\n\n"
    + "Lien dashboard:\nhttps://fanmilk-dashboard.vercel.app/";
  SpreadsheetApp.getUi().alert(msg);
}


// ============================================================
//  RÉCONCILIATION — synchro Réponses → Vendors
//  (même logique que dans l'Apps Script précédent)
// ============================================================
function reconcilierVendors() {
  var ss = SpreadsheetApp.openById(SHEET_ID);

  var sheetV = ss.getSheetByName(SHEET_VENDORS);
  var sheetR = ss.getSheetByName(SHEET_REPONSES);
  if (!sheetV || !sheetR) {
    SpreadsheetApp.getUi().alert("Onglet introuvable !");
    return;
  }

  // Phones déjà dans Vendors
  var rowsV  = sheetV.getDataRange().getValues();
  var phones = {};
  for (var i=1; i<rowsV.length; i++) {
    var p = String(rowsV[i][V_PHONE]||"").trim();
    if (p) phones[p] = i+1; // numéro de ligne
  }

  // Dernière déclaration par phone dans Réponses
  var rowsR  = sheetR.getDataRange().getValues();
  var dernierParPhone = {};
  for (var j=1; j<rowsR.length; j++) {
    var r = rowsR[j];
    var ph = String(r[R_PHONE]||"").trim();
    if (!ph) continue;
    dernierParPhone[ph] = {
      nom   : String(r[R_NOM]   ||"").trim(),
      depot : String(r[R_DEPOT] ||"").trim(),
      date  : String(r[R_DATE]  ||"").trim(),
      ventes: parseInt(r[R_VENTES])||0,
      fx    : parseInt(r[R_XTRA])  ||0,
      fc    : parseInt(r[R_CHOCO]) ||0,
      fv    : parseInt(r[R_VAN])   ||0,
    };
  }

  var now    = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy HH:mm");
  var ajoutes = 0, majCount = 0;

  Object.keys(dernierParPhone).forEach(function(ph) {
    var info   = dernierParPhone[ph];
    if (!info.nom || !info.depot) return;
    var pieces = info.fx + info.fc + info.fv;

    if (!phones[ph]) {
      // Nouveau vendor → ajouter
      sheetV.appendRow([ph, info.nom, info.depot, now,
        info.ventes, info.fx, info.fc, info.fv, pieces, info.date]);
      ajoutes++;
    } else if (info.ventes > 0 || pieces > 0) {
      // Vendor existant → MAJ ventes
      var ln = phones[ph];
      sheetV.getRange(ln, V_LAST_DEC+1, 1, 7).setValues([[
        now, info.ventes, info.fx, info.fc, info.fv, pieces, info.date
      ]]);
      majCount++;
    }
  });

  SpreadsheetApp.getUi().alert(
    "✅ Synchro terminée !\n" +
    ajoutes + " nouveau(x) vendor(s) ajouté(s)\n" +
    majCount + " vendor(s) mis à jour"
  );
}


// ============================================================
//  DÉCLENCHEUR QUOTIDIEN — à installer UNE SEULE FOIS
//  Exécuter manuellement : installerDeclencheur()
// ============================================================
function installerDeclencheur() {
  ScriptApp.getProjectTriggers().forEach(function(t){
    if (t.getHandlerFunction()==="reconcilierVendors") ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger("reconcilierVendors")
    .timeBased().everyDays(1).atHour(7).create();
  SpreadsheetApp.getUi().alert("✅ Déclencheur installé : synchro automatique chaque jour à 7h");
}
