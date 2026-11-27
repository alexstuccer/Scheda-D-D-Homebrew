
const { useState, useMemo, useRef, useEffect } = React;
const APP_VERSION = "10.7.9"; // ← unica fonte della versione. Bump a ogni cambiamento importante.
try { document.title = "La Gemma di San Batacchio · v" + APP_VERSION; } catch (e) {}
// Altezza della barra campagna (sticky) in --dash-h: serve alle intestazioni sticky delle competenze.
(function() {
  try {
    let last = -1, seen = null, ro = null;
    const upd = function() {
      const b = document.querySelector(".dash-bar");
      const h = b ? b.offsetHeight : 0;
      if (h !== last) { last = h; document.documentElement.style.setProperty("--dash-h", h + "px"); }
      if (b && b !== seen && ro) { seen = b; ro.observe(b); }
    };
    ro = typeof ResizeObserver === "function" ? new ResizeObserver(upd) : null;
    window.addEventListener("resize", upd);
    const tick = function(n) { upd(); if (n > 0 && !seen) setTimeout(function() { tick(n - 1); }, 250); };
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function() { tick(40); }); else tick(40);
    setInterval(function() { const b = document.querySelector(".dash-bar"); if (b !== seen) upd(); }, 2000);
  } catch (e) {}
})();
/* ═══════════ BUG REPORTER — cattura errori automatica ═══════════ */
window.__BUG__ = window.__BUG__ || { list: [], ctx: {}, version: APP_VERSION, listeners: [], _setup: false };
const BUG = window.__BUG__;
function bugNotify(){ BUG.listeners.forEach(function(fn){ try { fn(); } catch(e){} }); }
function bugPush(entry){
  entry.time = new Date().toLocaleTimeString();
  BUG.list.push(entry);
  if (BUG.list.length > 50) BUG.list.shift();
  bugNotify();
}
const SPELLS_DB = (function(){ try { return JSON.parse(document.getElementById("spells-db").textContent); } catch(e){ if(typeof bugPush!=="undefined") bugPush({kind:"DB",msg:"SPELLS_DB parse fallito: "+e.message}); return []; } })();
// Indice per dbId: il repertorio del PG salva solo dbId, i dati di combattimento (danni/attacco/CD) stanno qui.
const SPELLS_BY_ID = (function() {
  const m = {};
  SPELLS_DB.forEach(function(d) {
    if (d && d.id) m[d.id] = d;
    if (d && d.aliases) d.aliases.forEach(function(a) { if (a && !m[a]) m[a] = d; });
  });
  return m;
})();
// Indice per nome (it/en/userName): fallback quando il repertorio non ha dbId (schede vecchie o voci a mano).
const SPELLS_BY_NAME = (function() {
  const m = {};
  const put = function(k, d) {
    if (k) {
      const kk = String(k).toLowerCase().trim();
      if (kk && !m[kk]) m[kk] = d;
    }
  };
  SPELLS_DB.forEach(function(d) {
    if (d) {
      put(d.name, d);
      put(d.nameEn, d);
      put(d.userName, d);
      (d.aliases || []).forEach(function(a) { put(a, d); });
    }
  });
  return m;
})();
// Recupera i dati DB di un incantesimo del repertorio: prima per dbId, poi per nome.
function resolveSpellDb(sp){
  if(!sp) return null;
  if(sp.dbId && SPELLS_BY_ID[sp.dbId]) return SPELLS_BY_ID[sp.dbId];
  if(sp.name){ const d=SPELLS_BY_NAME[String(sp.name).toLowerCase().trim()]; if(d) return d; }
  return null;
}
// Trasforma un'espressione danno ("8d6", "10d6 + 40", "4d6 + 4d6", "20") nei gruppi per onRollDamage.
function parseDmgExpr(expr, type){
  const toks = String(expr==null?"":expr).split("+").map(function(s){ return s.trim(); });
  const groups = []; let flat = 0;
  toks.forEach(function(tok){
    if (/^\d+d\d+$/.test(tok)) groups.push({ dice:tok, type:type||"", flat:0 });
    else { const n = parseInt(tok,10); if (!isNaN(n)) flat += n; }
  });
  if (groups.length){ groups[0].flat += flat; return groups; }
  if (flat) return [{ dice:String(flat), type:type||"", flat:0 }];
  return [];
}
// Espressione danno di un incantesimo a un dato livello di lancio (slot) o livello PG (cantrip "char").
function spellDiceAt(dmg, castLevel, charLevel){
  if (!dmg || !dmg.table) return null;
  const t = dmg.table;
  const keys = Object.keys(t).map(Number).sort(function(a,b){ return a-b; });
  if (!keys.length) return null;
  const ref = dmg.scale === "char" ? charLevel : castLevel;
  let pick = keys[0];
  keys.forEach(function(k){ if (k <= ref) pick = k; });
  return t[String(pick)];
}

(function(){
  if (BUG._setup) return; BUG._setup = true;
  window.addEventListener("error", function(e){
    bugPush({ kind:"JS", msg: e.message || String((e.error&&e.error.message)||e.error||""),
      src: (e.filename? (e.filename.split("/").pop()) : "") + ":" + (e.lineno||"?") + ":" + (e.colno||"?"),
      stack: e.error && e.error.stack });
  });
  window.addEventListener("unhandledrejection", function(e){
    var r = e.reason;
    bugPush({ kind:"Promise", msg: (r && r.message) || String(r), stack: r && r.stack });
  });
  var _err = console.error.bind(console);
  console.error = function(){
    try {
      var parts = Array.prototype.map.call(arguments, function(a){
        if (a && a.message) return a.message;
        if (typeof a === "object") { try { return JSON.stringify(a); } catch(_) { return String(a); } }
        return String(a);
      });
      bugPush({ kind:"console.error", msg: parts.join(" ") });
    } catch(_){}
    _err.apply(console, arguments);
  };
})();


/* ═══ MINIMAL DATA ═══ */
const CLASSES = ["Artefice", "Bardo", "Barbaro", "Chierico", "Druido", "Guerriero", "Warlock", "Ladro", "Mago", "Monaco", "Paladino", "Ranger", "Stregone"];
const STATS=["Forza","Destrezza","Costituzione","Intelligenza","Saggezza","Carisma"];
const SS={Forza:"FOR",Destrezza:"DES",Costituzione:"COS",Intelligenza:"INT",Saggezza:"SAG",Carisma:"CAR"};
const HD = { Artefice: 8, Barbaro: 12, Bardo: 8, Chierico: 8, Druido: 8, Guerriero: 10, Warlock: 8, Ladro: 8, Mago: 6, Monaco: 8, Paladino: 10, Ranger: 10, Stregone: 6 };
const MS = { Paladino: "Carisma", Bardo: "Carisma", Stregone: "Carisma", Warlock: "Carisma", Mago: "Intelligenza", Artefice: "Intelligenza", Chierico: "Saggezza", Druido: "Saggezza", Ranger: "Saggezza", Monaco: "Saggezza" };

const RACES = [
  { id: "umano", name: "Umano", speed: 9, bonuses: {}, cc: 2, desc: "+1 a 2 stat a scelta" },
  { id: "nano", name: "Nano", speed: 7.5, bonuses: { Costituzione: 2, Forza: 1 }, desc: "+2 COS, +1 FOR" },
  { id: "elfo_alto", name: "Elfo Alto", speed: 9, bonuses: { Destrezza: 1, Carisma: 1, Intelligenza: 1 }, desc: "+1 DES, +1 CAR, +1 INT" },
  { id: "mezzorco", name: "Mezzorco", speed: 9, bonuses: { Forza: 2, Costituzione: 1 }, desc: "+2 FOR, +1 COS" },
  { id: "tiefling", name: "Tiefling", speed: 9, bonuses: { Carisma: 1, Intelligenza: 1 }, cc: 1, desc: "+1 CAR, +1 INT, +1 a scelta" },
  { id: "dwaran", name: "Dwaran", speed: 7.5, bonuses: { Costituzione: 1, Saggezza: 1, Forza: 1 }, desc: "+1 COS, +1 SAG, +1 FOR" },
  { id: "dragonide", name: "Dragonide", speed: 9, bonuses: {}, cc: 3, desc: "+1 a 3 stat a scelta" },
  { id: "halfling", name: "Halfling", speed: 7.5, bonuses: { Destrezza: 2, Forza: -1 }, desc: "+2 DES, −1 FOR (base — scegli una sottorazza)" },
  { id: "irda", name: "Irda", speed: 9, bonuses: { Intelligenza: 2, Carisma: 1 }, desc: "+2 INT, +1 CAR" },
  { id: "orco", name: "Orco", speed: 9, bonuses: { Forza: 2, Costituzione: 1, Intelligenza: -1 }, desc: "+2 FOR, +1 COS, -1 INT" },
  { id: "drow", name: "Drow", speed: 9, bonuses: { Destrezza: 1, Carisma: 2 }, desc: "+1 DES, +2 CAR" },
  { id: "elfo_boschi", name: "Elfo dei Boschi", speed: 10.5, bonuses: { Destrezza: 1, Carisma: 1, Saggezza: 1 }, desc: "+1 DES, +1 CAR, +1 SAG" },
  { id: "goblin", name: "Goblin", speed: 7.5, bonuses: { Destrezza: 2, Intelligenza: 1, Forza: -1 }, desc: "+2 DES, +1 INT, -1 FOR" },
  { id: "goblin_foreste", name: "Goblin delle Foreste", speed: 7.5, bonuses: { Destrezza: 2, Intelligenza: 1, Forza: -1, Saggezza: 1 }, desc: "+2 DES, +1 INT, +1 SAG, -1 FOR" },
  { id: "goblin_caverne", name: "Goblin delle Caverne", speed: 7.5, bonuses: { Destrezza: 2, Intelligenza: 2, Forza: -1 }, desc: "+2 DES, +2 INT, -1 FOR" },
  { id: "gnomo_colline", name: "Gnomo delle Colline", speed: 7.5, bonuses: { Intelligenza: 2, Destrezza: 1, Saggezza: 1, Forza: -2 }, desc: "+2 INT, +1 DES, +1 SAG, −2 FOR" },
  { id: "gnomo_rocce", name: "Gnomo delle Rocce", speed: 7.5, bonuses: { Intelligenza: 2, Destrezza: 1, Costituzione: 1, Forza: -2 }, desc: "+2 INT, +1 DES, +1 COS, −2 FOR" },
  { id: "gnomo_foreste", name: "Gnomo delle Foreste", speed: 7.5, bonuses: { Intelligenza: 2, Destrezza: 2, Forza: -2 }, desc: "+2 INT, +2 DES, −2 FOR" },
  { id: "mezzelfo", name: "Mezzelfo", speed: 9, bonuses: { Carisma: 1 }, cc: 2, desc: "+1 CAR, +1 a 2 stat a scelta" },
  { id: "halfling_piedelesti", name: "Halfling Piedelesti", speed: 7.5, bonuses: { Destrezza: 2, Carisma: 1, Forza: -1 }, desc: "+2 DES, +1 CAR, −1 FOR" },
  { id: "halfling_tozzaquercia", name: "Halfling Tozzaquercia", speed: 7.5, bonuses: { Destrezza: 2, Costituzione: 1, Forza: -1 }, desc: "+2 DES, +1 COS, −1 FOR" },
  { id: "nano_colline", name: "Nano delle Colline", speed: 7.5, bonuses: { Costituzione: 2, Forza: 1 }, desc: "+2 COS, +1 FOR (sottorazza: saggezza/robustezza)" },
  { id: "nano_montagne", name: "Nano delle Montagne", speed: 7.5, bonuses: { Costituzione: 2, Forza: 1 }, desc: "+2 COS, +1 FOR (sottorazza: abilità marziale)" },
  { id: "orco_montagne", name: "Orco delle Montagne", speed: 9, bonuses: { Forza: 2, Costituzione: 1, Intelligenza: -1 }, desc: "+2 FOR, +1 COS, -1 INT (sottorazza)" },
  { id: "orco_pianure", name: "Orco delle Pianure", speed: 9, speedAdd: 1.5, bonuses: { Forza: 2, Costituzione: 1, Intelligenza: -1 }, desc: "+2 FOR, +1 COS, -1 INT (sottorazza)" }
];

/* ═══ SKILLS - all 162 from Excel ═══ */
const SD = [
  { c: "Abilità Atletiche: Destrezza", s: "x", n: "Acrobazia", a: "Destrezza", f: "affine", k: { Artefice: 3, Bardo: 1, Barbaro: 2, Chierico: 3, Druido: 2, Guerriero: 2, Warlock: 3, Ladro: 1, Mago: 3, Monaco: 1, Paladino: 3, Ranger: 1, Stregone: 3 } },
  { c: "Abilità Atletiche: Destrezza", s: "x", n: "Contorsionismo", a: "Destrezza", f: "affine", k: { Artefice: 3, Bardo: 1, Barbaro: 2, Chierico: 3, Druido: 3, Guerriero: 2, Warlock: 3, Ladro: 1, Mago: 3, Monaco: 1, Paladino: 3, Ranger: 1, Stregone: 3 } },
  { c: "Abilità Atletiche: Destrezza", s: "x", n: "Scalare", a: "Destrezza", f: "affine", k: { Artefice: 2, Bardo: 1, Barbaro: 1, Chierico: 2, Druido: 2, Guerriero: 2, Warlock: 3, Ladro: 1, Mago: 3, Monaco: 1, Paladino: 2, Ranger: 1, Stregone: 3 } },
  { c: "Abilità Atletiche: Forza", s: "x", n: "Sfondamento", a: "Forza", f: "affine", k: { Artefice: 3, Bardo: 3, Barbaro: 1, Chierico: 1, Druido: 2, Guerriero: 1, Warlock: 2, Ladro: 2, Mago: 3, Monaco: 1, Paladino: 1, Ranger: 1, Stregone: 3 } },
  { c: "Abilità Atletiche: Forza", s: "x", n: "Lancio / Sollevamento", a: "Forza", f: "affine", k: { Artefice: 3, Bardo: 3, Barbaro: 1, Chierico: 1, Druido: 1, Guerriero: 1, Warlock: 2, Ladro: 2, Mago: 3, Monaco: 1, Paladino: 1, Ranger: 1, Stregone: 3 } },
  { c: "Abilità Atletiche: Resistenza", s: "x", n: "Resistenza fisica", a: "Costituzione", f: "affine", k: { Artefice: 1, Bardo: 2, Barbaro: 1, Chierico: 1, Druido: 1, Guerriero: 1, Warlock: 2, Ladro: 1, Mago: 3, Monaco: 1, Paladino: 1, Ranger: 1, Stregone: 3 } },
  { c: "Abilità Atletiche: Resistenza", s: "x", n: "Nuotare", a: "Costituzione", f: "affine", k: { Artefice: 1, Bardo: 2, Barbaro: 1, Chierico: 1, Druido: 1, Guerriero: 1, Warlock: 2, Ladro: 1, Mago: 3, Monaco: 1, Paladino: 1, Ranger: 1, Stregone: 3 } },
  { c: "Armature e scudi", s: "x", n: "Armature Leggere", a: "Destrezza", f: "sep", k: { Artefice: 1, Bardo: 1, Barbaro: 1, Chierico: 1, Druido: 1, Guerriero: 1, Warlock: 1, Ladro: 1, Mago: 3, Monaco: 2, Paladino: 1, Ranger: 1, Stregone: 2 } },
  { c: "Armature e scudi", s: "x", n: "Armature Medie", a: "Forza", f: "sep", k: { Artefice: 1, Bardo: 2, Barbaro: 1, Chierico: 1, Druido: 1, Guerriero: 1, Warlock: 3, Ladro: 2, Mago: 3, Monaco: 2, Paladino: 1, Ranger: 2, Stregone: 3 } },
  { c: "Armature e scudi", s: "x", n: "Armature Pesanti", a: "Forza", f: "sep", k: { Artefice: 3, Bardo: 3, Barbaro: 2, Chierico: 2, Druido: 3, Guerriero: 1, Warlock: 3, Ladro: 3, Mago: 3, Monaco: 3, Paladino: 1, Ranger: 3, Stregone: 3 } },
  { c: "Armature e scudi", s: "x", n: "Scudi Grandi", a: "Forza", f: "sep", k: { Artefice: 3, Bardo: 3, Barbaro: 2, Chierico: 2, Druido: 3, Guerriero: 1, Warlock: 3, Ladro: 3, Mago: 3, Monaco: 3, Paladino: 1, Ranger: 3, Stregone: 3 } },
  { c: "Armature e scudi", s: "x", n: "Scudi Medi", a: "Forza", f: "sep", k: { Artefice: 1, Bardo: 2, Barbaro: 1, Chierico: 1, Druido: 1, Guerriero: 1, Warlock: 3, Ladro: 3, Mago: 3, Monaco: 3, Paladino: 1, Ranger: 2, Stregone: 3 } },
  { c: "Armature e scudi", s: "x", n: "Scudi Piccoli", a: "Destrezza", f: "sep", k: { Artefice: 1, Bardo: 2, Barbaro: 1, Chierico: 1, Druido: 1, Guerriero: 1, Warlock: 3, Ladro: 2, Mago: 3, Monaco: 3, Paladino: 1, Ranger: 1, Stregone: 3 } },
  { c: "Combattimento senza armi", s: "x", n: "Mani Nude", a: "_m", f: "affine", k: { Artefice: 2, Bardo: 2, Barbaro: 1, Chierico: 2, Druido: 2, Guerriero: 1, Warlock: 3, Ladro: 1, Mago: 3, Monaco: 1, Paladino: 1, Ranger: 1, Stregone: 3 } },
  { c: "Armi da mischia a 1 mano", s: "x", n: "Coltelli e Pugnali", a: "_m", f: "affine", k: { Artefice: 1, Bardo: 1, Barbaro: 1, Chierico: 2, Druido: 1, Guerriero: 1, Warlock: 2, Ladro: 1, Mago: 2, Monaco: 1, Paladino: 1, Ranger: 1, Stregone: 2 } },
  { c: "Armi da mischia a 1 mano", s: "x", n: "Spade", a: "_m", f: "affine", k: { Artefice: 1, Bardo: 1, Barbaro: 1, Chierico: 3, Druido: 3, Guerriero: 1, Warlock: 2, Ladro: 1, Mago: 3, Monaco: 1, Paladino: 1, Ranger: 1, Stregone: 3 } },
  { c: "Armi da mischia a 1 mano", s: "x", n: "Armi da impatto a 1 mano", a: "Forza", f: "affine", k: { Artefice: 1, Bardo: 1, Barbaro: 1, Chierico: 1, Druido: 1, Guerriero: 1, Warlock: 3, Ladro: 1, Mago: 3, Monaco: 1, Paladino: 1, Ranger: 1, Stregone: 3 } },
  { c: "Armi da mischia a 1 mano", s: "x", n: "Altre armi da mischia a 1 mano", a: "_m", f: "affine", k: { Artefice: 2, Bardo: 2, Barbaro: 1, Chierico: 2, Druido: 2, Guerriero: 1, Warlock: 3, Ladro: 2, Mago: 3, Monaco: 1, Paladino: 1, Ranger: 1, Stregone: 3 } },
  { c: "Armi con Asta", s: "x", n: "Armi con Asta", a: "Forza", f: "affine", k: { Artefice: 3, Bardo: 3, Barbaro: 1, Chierico: 1, Druido: 1, Guerriero: 1, Warlock: 3, Ladro: 2, Mago: 3, Monaco: 1, Paladino: 1, Ranger: 1, Stregone: 3 } },
  { c: "Armi da mischia a 2 mani", s: "x", n: "Armi a 2 mani", a: "Forza", f: "affine", k: { Artefice: 3, Bardo: 3, Barbaro: 1, Chierico: 3, Druido: 3, Guerriero: 1, Warlock: 3, Ladro: 3, Mago: 3, Monaco: 3, Paladino: 1, Ranger: 3, Stregone: 3 } },
  { c: "Armi da Lancio", s: "x", n: "Armi da lancio", a: "Destrezza", f: "affine", k: { Artefice: 1, Bardo: 1, Barbaro: 1, Chierico: 1, Druido: 1, Guerriero: 1, Warlock: 2, Ladro: 1, Mago: 2, Monaco: 1, Paladino: 1, Ranger: 1, Stregone: 2 } },
  { c: "Armi da tiro", s: "x", n: "Archi", a: "Destrezza", f: "affine", k: { Artefice: 2, Bardo: 1, Barbaro: 1, Chierico: 2, Druido: 2, Guerriero: 1, Warlock: 3, Ladro: 1, Mago: 3, Monaco: 1, Paladino: 1, Ranger: 1, Stregone: 3 } },
  { c: "Armi da tiro", s: "x", n: "Balestre", a: "Destrezza", f: "affine", k: { Artefice: 1, Bardo: 1, Barbaro: 1, Chierico: 2, Druido: 2, Guerriero: 1, Warlock: 3, Ladro: 1, Mago: 3, Monaco: 1, Paladino: 1, Ranger: 1, Stregone: 3 } },
  { c: "Armi da tiro", s: "x", n: "Altre Armi da tiro", a: "Destrezza", f: "affine", k: { Artefice: 1, Bardo: 1, Barbaro: 1, Chierico: 1, Druido: 1, Guerriero: 1, Warlock: 2, Ladro: 1, Mago: 2, Monaco: 1, Paladino: 1, Ranger: 1, Stregone: 2 } },
  { c: "Arti figurative", s: "x", n: "Disegno e Pittura", a: "Saggezza", f: "affine", k: { Artefice: 1, Bardo: 1, Barbaro: 2, Chierico: 2, Druido: 2, Guerriero: 2, Warlock: 2, Ladro: 2, Mago: 2, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 2 } },
  { c: "Arti figurative", s: "x", n: "Scultura", a: "Saggezza", f: "affine", k: { Artefice: 1, Bardo: 1, Barbaro: 2, Chierico: 2, Druido: 2, Guerriero: 2, Warlock: 2, Ladro: 2, Mago: 2, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 2 } },
  { c: "Arti letterarie", s: "x", n: "Scrittura creativa", a: "Saggezza", f: "affine", k: { Artefice: 1, Bardo: 1, Barbaro: 3, Chierico: 2, Druido: 2, Guerriero: 2, Warlock: 2, Ladro: 2, Mago: 2, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 2 } },
  { c: "Arti musicali", s: "x", n: "Cantare", a: "Carisma", f: "affine", k: { Artefice: 2, Bardo: 1, Barbaro: 2, Chierico: 1, Druido: 1, Guerriero: 2, Warlock: 2, Ladro: 2, Mago: 2, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 2 } },
  { c: "Arti musicali", s: "x", n: "Strumento 1", a: "Carisma", f: "affine", k: { Artefice: 2, Bardo: 1, Barbaro: 2, Chierico: 2, Druido: 2, Guerriero: 2, Warlock: 2, Ladro: 2, Mago: 2, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 2 }, e: 1 },
  { c: "Arti musicali", s: "x", n: "Strumento 2", a: "Carisma", f: "affine", k: { Artefice: 2, Bardo: 1, Barbaro: 2, Chierico: 2, Druido: 2, Guerriero: 2, Warlock: 2, Ladro: 2, Mago: 2, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 2 }, e: 1 },
  { c: "Arti musicali", s: "x", n: "Strumento 3", a: "Carisma", f: "affine", k: { Artefice: 2, Bardo: 1, Barbaro: 2, Chierico: 2, Druido: 2, Guerriero: 2, Warlock: 2, Ladro: 2, Mago: 2, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 2 }, e: 1 },
  { c: "Arti musicali", s: "x", n: "Strumento 4", a: "Carisma", f: "affine", k: { Artefice: 2, Bardo: 1, Barbaro: 2, Chierico: 2, Druido: 2, Guerriero: 2, Warlock: 2, Ladro: 2, Mago: 2, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 2 }, e: 1 },
  { c: "Arti musicali", s: "x", n: "Strumento 5", a: "Carisma", f: "affine", k: { Artefice: 2, Bardo: 1, Barbaro: 2, Chierico: 2, Druido: 2, Guerriero: 2, Warlock: 2, Ladro: 2, Mago: 2, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 2 }, e: 1 },
  { c: "Arti musicali", s: "x", n: "Strumento 6", a: "Carisma", f: "affine", k: { Artefice: 2, Bardo: 1, Barbaro: 2, Chierico: 2, Druido: 2, Guerriero: 2, Warlock: 2, Ladro: 2, Mago: 2, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 2 }, e: 1 },
  { c: "Arti performative", s: "x", n: "Danzare", a: "Carisma", f: "affine", k: { Artefice: 3, Bardo: 1, Barbaro: 3, Chierico: 2, Druido: 2, Guerriero: 2, Warlock: 2, Ladro: 2, Mago: 2, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 2 } },
  { c: "Arti performative", s: "x", n: "Recitare / Mimare", a: "Carisma", f: "affine", k: { Artefice: 3, Bardo: 1, Barbaro: 3, Chierico: 2, Druido: 2, Guerriero: 2, Warlock: 2, Ladro: 2, Mago: 2, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 2 } },
  { c: "Arti performative", s: "x", n: "Raccontare", a: "Carisma", f: "affine", k: { Artefice: 3, Bardo: 1, Barbaro: 2, Chierico: 1, Druido: 1, Guerriero: 2, Warlock: 2, Ladro: 2, Mago: 2, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 2 } },
  { c: "Artigianato", s: "", n: "Alchimia", a: "Intelligenza", f: "sep", k: { Artefice: 3, Bardo: 1, Barbaro: 3, Chierico: 2, Druido: 2, Guerriero: 2, Warlock: 2, Ladro: 1, Mago: 2, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 2 } },
  { c: "Artigianato", s: "", n: "Cartografia", a: "Saggezza", f: "sep", k: { Artefice: 1, Bardo: 2, Barbaro: 2, Chierico: 2, Druido: 1, Guerriero: 2, Warlock: 1, Ladro: 2, Mago: 1, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 2 } },
  { c: "Artigianato", s: "", n: "Ceramica", a: "Destrezza", f: "sep", k: { Artefice: 1, Bardo: 2, Barbaro: 3, Chierico: 2, Druido: 2, Guerriero: 2, Warlock: 2, Ladro: 2, Mago: 1, Monaco: 2, Paladino: 2, Ranger: 1, Stregone: 1 } },
  { c: "Artigianato", s: "", n: "Contraffare", a: "Saggezza", f: "sep", k: { Artefice: 1, Bardo: 2, Barbaro: 2, Chierico: 2, Druido: 2, Guerriero: 2, Warlock: 2, Ladro: 2, Mago: 2, Monaco: 2, Paladino: 2, Ranger: 3, Stregone: 2 } },
  { c: "Artigianato", s: "", n: "Costruire e preparare trappole", a: "Destrezza", f: "sep", k: { Artefice: 1, Bardo: 2, Barbaro: 2, Chierico: 1, Druido: 1, Guerriero: 2, Warlock: 2, Ladro: 1, Mago: 2, Monaco: 3, Paladino: 2, Ranger: 2, Stregone: 2 } },
  { c: "Artigianato", s: "", n: "Cucinare", a: "Saggezza", f: "sep", k: { Artefice: 1, Bardo: 2, Barbaro: 2, Chierico: 3, Druido: 3, Guerriero: 2, Warlock: 3, Ladro: 1, Mago: 3, Monaco: 3, Paladino: 2, Ranger: 1, Stregone: 3 } },
  { c: "Artigianato", s: "", n: "Cucire", a: "Destrezza", f: "sep", k: { Artefice: 1, Bardo: 1, Barbaro: 1, Chierico: 1, Druido: 1, Guerriero: 1, Warlock: 1, Ladro: 1, Mago: 1, Monaco: 1, Paladino: 1, Ranger: 1, Stregone: 1 } },
  { c: "Artigianato", s: "", n: "Erboristeria", a: "Intelligenza", f: "sep", k: { Artefice: 1, Bardo: 2, Barbaro: 2, Chierico: 2, Druido: 2, Guerriero: 2, Warlock: 2, Ladro: 2, Mago: 2, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 2 } },
  { c: "Artigianato", s: "", n: "Falegnameria", a: "Destrezza", f: "sep", k: { Artefice: 1, Bardo: 1, Barbaro: 2, Chierico: 1, Druido: 1, Guerriero: 2, Warlock: 1, Ladro: 1, Mago: 1, Monaco: 1, Paladino: 2, Ranger: 1, Stregone: 2 } },
  { c: "Artigianato", s: "", n: "Lavorazione del ferro", a: "Forza", f: "sep", k: { Artefice: 1, Bardo: 2, Barbaro: 2, Chierico: 2, Druido: 2, Guerriero: 1, Warlock: 3, Ladro: 2, Mago: 2, Monaco: 2, Paladino: 2, Ranger: 1, Stregone: 2 } },
  { c: "Artigianato", s: "", n: "Lavorazione della pietra", a: "Destrezza", f: "sep", k: { Artefice: 1, Bardo: 3, Barbaro: 2, Chierico: 2, Druido: 3, Guerriero: 1, Warlock: 3, Ladro: 2, Mago: 2, Monaco: 3, Paladino: 2, Ranger: 3, Stregone: 2 } },
  { c: "Artigianato", s: "", n: "Veleni", a: "Intelligenza", f: "sep", k: { Artefice: 1, Bardo: 2, Barbaro: 2, Chierico: 3, Druido: 3, Guerriero: 2, Warlock: 3, Ladro: 1, Mago: 2, Monaco: 2, Paladino: 2, Ranger: 1, Stregone: 2 } },
  { c: "Artigianato", s: "", n: "Altro", a: "", f: "sep", k: { Artefice: 1, Bardo: 2, Barbaro: 2, Chierico: 2, Druido: 2, Guerriero: 2, Warlock: 1, Ladro: 1, Mago: 1, Monaco: 1, Paladino: 2, Ranger: 1, Stregone: 2 }, e: 1 },
  { c: "Artigianato", s: "", n: "Altro", a: "", f: "sep", k: { Artefice: 1, Bardo: 2, Barbaro: 2, Chierico: 2, Druido: 2, Guerriero: 2, Warlock: 1, Ladro: 1, Mago: 1, Monaco: 1, Paladino: 2, Ranger: 1, Stregone: 2 }, e: 1 },
  { c: "Artigianato", s: "", n: "Altro", a: "", f: "sep", k: { Artefice: 1, Bardo: 2, Barbaro: 2, Chierico: 2, Druido: 2, Guerriero: 2, Warlock: 1, Ladro: 1, Mago: 1, Monaco: 1, Paladino: 2, Ranger: 1, Stregone: 2 }, e: 1 },
  { c: "Artigianato", s: "", n: "Altro", a: "", f: "sep", k: { Artefice: 1, Bardo: 2, Barbaro: 2, Chierico: 2, Druido: 2, Guerriero: 2, Warlock: 1, Ladro: 1, Mago: 1, Monaco: 1, Paladino: 2, Ranger: 1, Stregone: 2 }, e: 1 },
  { c: "Artigianato", s: "", n: "Altro", a: "", f: "sep", k: { Artefice: 1, Bardo: 2, Barbaro: 2, Chierico: 2, Druido: 2, Guerriero: 2, Warlock: 1, Ladro: 1, Mago: 1, Monaco: 1, Paladino: 2, Ranger: 1, Stregone: 2 }, e: 1 },
  { c: "Artigianato", s: "", n: "Altro", a: "", f: "sep", k: { Artefice: 1, Bardo: 2, Barbaro: 2, Chierico: 2, Druido: 2, Guerriero: 2, Warlock: 1, Ladro: 1, Mago: 1, Monaco: 1, Paladino: 2, Ranger: 1, Stregone: 2 }, e: 1 },
  { c: "Comunicazione", s: "A", n: "Lettura delle labbra", a: "Intelligenza", f: "affine", k: { Artefice: 3, Bardo: 2, Barbaro: 3, Chierico: 3, Druido: 3, Guerriero: 3, Warlock: 3, Ladro: 3, Mago: 3, Monaco: 3, Paladino: 3, Ranger: 3, Stregone: 3 } },
  { c: "Comunicazione", s: "Famiglia 1", n: "Lingua 1.1", a: "Intelligenza", f: "affine", k: { Artefice: 1, Bardo: 1, Barbaro: 2, Chierico: 1, Druido: 1, Guerriero: 2, Warlock: 1, Ladro: 1, Mago: 1, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 1 }, e: 1 },
  { c: "Comunicazione", s: "Famiglia 1", n: "Lingua 1.2", a: "Intelligenza", f: "affine", k: { Artefice: 1, Bardo: 1, Barbaro: 2, Chierico: 1, Druido: 1, Guerriero: 2, Warlock: 1, Ladro: 1, Mago: 1, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 1 }, e: 1 },
  { c: "Comunicazione", s: "Famiglia 1", n: "Lingua 1.3", a: "Intelligenza", f: "affine", k: { Artefice: 1, Bardo: 1, Barbaro: 2, Chierico: 1, Druido: 1, Guerriero: 2, Warlock: 1, Ladro: 1, Mago: 1, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 1 }, e: 1 },
  { c: "Comunicazione", s: "Famiglia 2", n: "Lingua 2.1", a: "Intelligenza", f: "affine", k: { Artefice: 1, Bardo: 1, Barbaro: 2, Chierico: 1, Druido: 1, Guerriero: 2, Warlock: 1, Ladro: 1, Mago: 1, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 1 }, e: 1 },
  { c: "Comunicazione", s: "Famiglia 2", n: "Lingua 2.2", a: "Intelligenza", f: "affine", k: { Artefice: 1, Bardo: 1, Barbaro: 2, Chierico: 1, Druido: 1, Guerriero: 2, Warlock: 1, Ladro: 1, Mago: 1, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 1 }, e: 1 },
  { c: "Comunicazione", s: "Famiglia 2", n: "Lingua 2.3", a: "Intelligenza", f: "affine", k: { Artefice: 1, Bardo: 1, Barbaro: 2, Chierico: 1, Druido: 1, Guerriero: 2, Warlock: 1, Ladro: 1, Mago: 1, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 1 }, e: 1 },
  { c: "Comunicazione", s: "Famiglia 3", n: "Lingua 3.1", a: "Intelligenza", f: "affine", k: { Artefice: 1, Bardo: 1, Barbaro: 2, Chierico: 1, Druido: 1, Guerriero: 2, Warlock: 1, Ladro: 1, Mago: 1, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 1 }, e: 1 },
  { c: "Comunicazione", s: "Famiglia 3", n: "Lingua 3.2", a: "Intelligenza", f: "affine", k: { Artefice: 1, Bardo: 1, Barbaro: 2, Chierico: 1, Druido: 1, Guerriero: 2, Warlock: 1, Ladro: 1, Mago: 1, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 1 }, e: 1 },
  { c: "Comunicazione", s: "Famiglia 3", n: "Lingua 3.3", a: "Intelligenza", f: "affine", k: { Artefice: 1, Bardo: 1, Barbaro: 2, Chierico: 1, Druido: 1, Guerriero: 2, Warlock: 1, Ladro: 1, Mago: 1, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 1 }, e: 1 },
  { c: "Comunicazione", s: "B", n: "Lingue dei segni", a: "Saggezza", f: "affine", k: { Artefice: 2, Bardo: 1, Barbaro: 3, Chierico: 1, Druido: 1, Guerriero: 2, Warlock: 2, Ladro: 2, Mago: 2, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 2 } },
  { c: "Comunicazione", s: "C", n: "Segnalare", a: "Saggezza", f: "affine", k: { Artefice: 1, Bardo: 1, Barbaro: 1, Chierico: 2, Druido: 2, Guerriero: 1, Warlock: 2, Ladro: 1, Mago: 2, Monaco: 1, Paladino: 2, Ranger: 1, Stregone: 2 } },
  { c: "Conoscenze", s: "x", n: "Araldica", a: "Intelligenza", f: "sep", k: { Artefice: 2, Bardo: 1, Barbaro: 3, Chierico: 1, Druido: 1, Guerriero: 1, Warlock: 2, Ladro: 2, Mago: 2, Monaco: 2, Paladino: 1, Ranger: 3, Stregone: 2 } },
  { c: "Conoscenze", s: "x", n: "Architettura", a: "Saggezza", f: "sep", k: { Artefice: 1, Bardo: 3, Barbaro: 3, Chierico: 1, Druido: 1, Guerriero: 3, Warlock: 2, Ladro: 3, Mago: 1, Monaco: 2, Paladino: 2, Ranger: 3, Stregone: 2 } },
  { c: "Conoscenze", s: "x", n: "Astronomia", a: "Intelligenza", f: "sep", k: { Artefice: 1, Bardo: 2, Barbaro: 3, Chierico: 1, Druido: 1, Guerriero: 3, Warlock: 1, Ladro: 3, Mago: 1, Monaco: 1, Paladino: 2, Ranger: 3, Stregone: 2 } },
  { c: "Conoscenze", s: "x", n: "Conoscenza dei Metalli", a: "Intelligenza", f: "sep", k: { Artefice: 1, Bardo: 2, Barbaro: 2, Chierico: 1, Druido: 1, Guerriero: 2, Warlock: 2, Ladro: 3, Mago: 1, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 2 } },
  { c: "Conoscenze", s: "x", n: "Conoscenza della Fauna", a: "Intelligenza", f: "sep", k: { Artefice: 2, Bardo: 1, Barbaro: 1, Chierico: 1, Druido: 1, Guerriero: 2, Warlock: 2, Ladro: 2, Mago: 2, Monaco: 2, Paladino: 2, Ranger: 1, Stregone: 2 } },
  { c: "Conoscenze", s: "x", n: "Conoscenza della Flora", a: "Intelligenza", f: "sep", k: { Artefice: 2, Bardo: 1, Barbaro: 1, Chierico: 1, Druido: 1, Guerriero: 2, Warlock: 2, Ladro: 2, Mago: 2, Monaco: 1, Paladino: 2, Ranger: 1, Stregone: 2 } },
  { c: "Conoscenze", s: "x", n: "Conoscenza delle pietre", a: "Intelligenza", f: "sep", k: { Artefice: 1, Bardo: 2, Barbaro: 2, Chierico: 1, Druido: 1, Guerriero: 3, Warlock: 2, Ladro: 2, Mago: 1, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 2 } },
  { c: "Conoscenze", s: "x", n: "Conoscenza di culture", a: "Intelligenza", f: "sep", k: { Artefice: 2, Bardo: 1, Barbaro: 2, Chierico: 1, Druido: 1, Guerriero: 2, Warlock: 2, Ladro: 2, Mago: 2, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 2 } },
  { c: "Conoscenze", s: "x", n: "Conoscenze arcane", a: "Intelligenza", f: "sep", k: { Artefice: 1, Bardo: 2, Barbaro: 3, Chierico: 1, Druido: 1, Guerriero: 3, Warlock: 1, Ladro: 3, Mago: 1, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 1 } },
  { c: "Conoscenze", s: "x", n: "Conoscenze delle creature", a: "Intelligenza", f: "sep", k: { Artefice: 2, Bardo: 2, Barbaro: 2, Chierico: 1, Druido: 1, Guerriero: 3, Warlock: 1, Ladro: 3, Mago: 1, Monaco: 2, Paladino: 2, Ranger: 1, Stregone: 1 } },
  { c: "Conoscenze", s: "x", n: "Conoscenze demoniache", a: "Intelligenza", f: "sep", k: { Artefice: 2, Bardo: 2, Barbaro: 3, Chierico: 1, Druido: 1, Guerriero: 3, Warlock: 1, Ladro: 3, Mago: 1, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 1 } },
  { c: "Conoscenze", s: "x", n: "Filosofia", a: "Intelligenza", f: "sep", k: { Artefice: 2, Bardo: 2, Barbaro: 3, Chierico: 1, Druido: 1, Guerriero: 2, Warlock: 1, Ladro: 2, Mago: 1, Monaco: 1, Paladino: 1, Ranger: 2, Stregone: 2 } },
  { c: "Conoscenze", s: "x", n: "Geografia", a: "Intelligenza", f: "sep", k: { Artefice: 2, Bardo: 1, Barbaro: 2, Chierico: 1, Druido: 1, Guerriero: 2, Warlock: 1, Ladro: 2, Mago: 1, Monaco: 2, Paladino: 2, Ranger: 1, Stregone: 2 } },
  { c: "Conoscenze", s: "x", n: "Ingegneria", a: "Intelligenza", f: "sep", k: { Artefice: 1, Bardo: 3, Barbaro: 3, Chierico: 1, Druido: 1, Guerriero: 3, Warlock: 2, Ladro: 3, Mago: 2, Monaco: 2, Paladino: 2, Ranger: 3, Stregone: 2 } },
  { c: "Conoscenze", s: "x", n: "Matematica", a: "Intelligenza", f: "sep", k: { Artefice: 1, Bardo: 3, Barbaro: 2, Chierico: 1, Druido: 1, Guerriero: 2, Warlock: 2, Ladro: 2, Mago: 1, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 2 } },
  { c: "Conoscenze", s: "Medicina", n: "Medicina", a: "Intelligenza", f: "affine", k: { Artefice: 1, Bardo: 3, Barbaro: 3, Chierico: 1, Druido: 1, Guerriero: 3, Warlock: 2, Ladro: 3, Mago: 2, Monaco: 1, Paladino: 1, Ranger: 2, Stregone: 2 } },
  { c: "Conoscenze", s: "Medicina", n: "Pronto Soccorso", a: "Intelligenza", f: "affine", k: { Artefice: 2, Bardo: 2, Barbaro: 2, Chierico: 1, Druido: 1, Guerriero: 2, Warlock: 2, Ladro: 2, Mago: 2, Monaco: 2, Paladino: 2, Ranger: 1, Stregone: 2 } },
  { c: "Conoscenze", s: "x", n: "Religione", a: "Saggezza", f: "sep", k: { Artefice: 2, Bardo: 2, Barbaro: 2, Chierico: 1, Druido: 1, Guerriero: 2, Warlock: 1, Ladro: 2, Mago: 2, Monaco: 1, Paladino: 1, Ranger: 2, Stregone: 2 } },
  { c: "Conoscenze", s: "x", n: "Storia", a: "Intelligenza", f: "sep", k: { Artefice: 2, Bardo: 1, Barbaro: 2, Chierico: 1, Druido: 1, Guerriero: 2, Warlock: 1, Ladro: 2, Mago: 1, Monaco: 1, Paladino: 1, Ranger: 2, Stregone: 2 } },
  { c: "Furtività", s: "x", n: "Borseggiare", a: "Destrezza", f: "affine", k: { Artefice: 3, Bardo: 2, Barbaro: 2, Chierico: 3, Druido: 3, Guerriero: 2, Warlock: 3, Ladro: 1, Mago: 3, Monaco: 2, Paladino: 3, Ranger: 2, Stregone: 3 } },
  { c: "Furtività", s: "x", n: "Camuffamento", a: "Carisma", f: "affine", k: { Artefice: 3, Bardo: 1, Barbaro: 2, Chierico: 3, Druido: 3, Guerriero: 2, Warlock: 3, Ladro: 1, Mago: 3, Monaco: 1, Paladino: 3, Ranger: 2, Stregone: 3 } },
  { c: "Furtività", s: "x", n: "Disarmare trappole", a: "Saggezza", f: "affine", k: { Artefice: 1, Bardo: 2, Barbaro: 2, Chierico: 3, Druido: 3, Guerriero: 2, Warlock: 3, Ladro: 1, Mago: 3, Monaco: 2, Paladino: 3, Ranger: 1, Stregone: 3 } },
  { c: "Furtività", s: "x", n: "Furtività", a: "Destrezza", f: "affine", k: { Artefice: 2, Bardo: 2, Barbaro: 1, Chierico: 2, Druido: 2, Guerriero: 1, Warlock: 2, Ladro: 1, Mago: 2, Monaco: 1, Paladino: 2, Ranger: 1, Stregone: 2 } },
  { c: "Furtività", s: "x", n: "Rapidità di mano", a: "Destrezza", f: "affine", k: { Artefice: 1, Bardo: 2, Barbaro: 2, Chierico: 3, Druido: 3, Guerriero: 2, Warlock: 3, Ladro: 1, Mago: 3, Monaco: 2, Paladino: 3, Ranger: 2, Stregone: 3 } },
  { c: "Furtività", s: "x", n: "Scassinare Serrature", a: "Destrezza", f: "affine", k: { Artefice: 1, Bardo: 2, Barbaro: 2, Chierico: 3, Druido: 3, Guerriero: 2, Warlock: 3, Ladro: 1, Mago: 3, Monaco: 2, Paladino: 3, Ranger: 2, Stregone: 3 } },
  { c: "Incantesimi", s: "x", n: "Abiurazione", a: "_g", f: "sep", k: { Artefice: 2, Bardo: 2, Barbaro: 3, Chierico: 1, Druido: 1, Guerriero: 3, Warlock: 2, Ladro: 3, Mago: 1, Monaco: 3, Paladino: 2, Ranger: 2, Stregone: 1 } },
  { c: "Incantesimi", s: "x", n: "Divinazione", a: "_g", f: "sep", k: { Artefice: 2, Bardo: 2, Barbaro: 3, Chierico: 1, Druido: 1, Guerriero: 3, Warlock: 2, Ladro: 3, Mago: 1, Monaco: 3, Paladino: 2, Ranger: 2, Stregone: 1 } },
  { c: "Incantesimi", s: "x", n: "Evocazione", a: "_g", f: "sep", k: { Artefice: 2, Bardo: 2, Barbaro: 3, Chierico: 1, Druido: 1, Guerriero: 3, Warlock: 1, Ladro: 3, Mago: 1, Monaco: 3, Paladino: 2, Ranger: 2, Stregone: 1 } },
  { c: "Incantesimi", s: "x", n: "Illusione", a: "_g", f: "sep", k: { Artefice: 2, Bardo: 2, Barbaro: 3, Chierico: 1, Druido: 1, Guerriero: 3, Warlock: 1, Ladro: 3, Mago: 1, Monaco: 3, Paladino: 3, Ranger: 2, Stregone: 1 } },
  { c: "Incantesimi", s: "x", n: "Ammaliamento", a: "_g", f: "sep", k: { Artefice: 2, Bardo: 2, Barbaro: 3, Chierico: 1, Druido: 1, Guerriero: 3, Warlock: 1, Ladro: 3, Mago: 1, Monaco: 3, Paladino: 2, Ranger: 3, Stregone: 1 } },
  { c: "Incantesimi", s: "x", n: "Invocazione", a: "_g", f: "sep", k: { Artefice: 2, Bardo: 2, Barbaro: 3, Chierico: 1, Druido: 1, Guerriero: 3, Warlock: 1, Ladro: 3, Mago: 1, Monaco: 3, Paladino: 2, Ranger: 2, Stregone: 1 } },
  { c: "Incantesimi", s: "x", n: "Necromanzia", a: "_g", f: "sep", k: { Artefice: 2, Bardo: 2, Barbaro: 3, Chierico: 1, Druido: 1, Guerriero: 3, Warlock: 1, Ladro: 3, Mago: 1, Monaco: 3, Paladino: 3, Ranger: 3, Stregone: 1 } },
  { c: "Incantesimi", s: "x", n: "Trasmutazione", a: "_g", f: "sep", k: { Artefice: 2, Bardo: 2, Barbaro: 3, Chierico: 1, Druido: 1, Guerriero: 3, Warlock: 1, Ladro: 3, Mago: 1, Monaco: 3, Paladino: 2, Ranger: 2, Stregone: 1 } },
  { c: "Influenza", s: "x", n: "Corrompere", a: "Carisma", f: "affine", k: { Artefice: 2, Bardo: 1, Barbaro: 2, Chierico: 2, Druido: 3, Guerriero: 2, Warlock: 1, Ladro: 1, Mago: 2, Monaco: 3, Paladino: 2, Ranger: 2, Stregone: 2 } },
  { c: "Influenza", s: "x", n: "Diplomazia", a: "Carisma", f: "affine", k: { Artefice: 2, Bardo: 1, Barbaro: 3, Chierico: 1, Druido: 1, Guerriero: 2, Warlock: 1, Ladro: 2, Mago: 1, Monaco: 2, Paladino: 1, Ranger: 2, Stregone: 1 } },
  { c: "Influenza", s: "x", n: "Empatia", a: "Saggezza", f: "affine", k: { Artefice: 1, Bardo: 1, Barbaro: 2, Chierico: 1, Druido: 1, Guerriero: 2, Warlock: 2, Ladro: 2, Mago: 2, Monaco: 1, Paladino: 1, Ranger: 2, Stregone: 2 } },
  { c: "Influenza", s: "x", n: "Etichetta", a: "Carisma", f: "affine", k: { Artefice: 2, Bardo: 1, Barbaro: 3, Chierico: 1, Druido: 1, Guerriero: 2, Warlock: 1, Ladro: 2, Mago: 1, Monaco: 2, Paladino: 1, Ranger: 2, Stregone: 1 } },
  { c: "Influenza", s: "x", n: "Inganno", a: "Carisma", f: "affine", k: { Artefice: 3, Bardo: 1, Barbaro: 2, Chierico: 2, Druido: 2, Guerriero: 2, Warlock: 1, Ladro: 1, Mago: 2, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 1 } },
  { c: "Influenza", s: "x", n: "Interrogare", a: "Carisma", f: "affine", k: { Artefice: 2, Bardo: 1, Barbaro: 1, Chierico: 2, Druido: 2, Guerriero: 2, Warlock: 2, Ladro: 1, Mago: 2, Monaco: 3, Paladino: 1, Ranger: 2, Stregone: 1 } },
  { c: "Influenza", s: "x", n: "Intimidire", a: "Carisma", f: "affine", k: { Artefice: 2, Bardo: 1, Barbaro: 1, Chierico: 2, Druido: 3, Guerriero: 1, Warlock: 1, Ladro: 1, Mago: 2, Monaco: 2, Paladino: 1, Ranger: 2, Stregone: 1 } },
  { c: "Influenza", s: "x", n: "Leadership e Comando", a: "Carisma", f: "affine", k: { Artefice: 2, Bardo: 1, Barbaro: 2, Chierico: 1, Druido: 1, Guerriero: 1, Warlock: 2, Ladro: 2, Mago: 2, Monaco: 2, Paladino: 1, Ranger: 2, Stregone: 2 } },
  { c: "Influenza", s: "x", n: "Mercanteggiare", a: "Carisma", f: "affine", k: { Artefice: 2, Bardo: 1, Barbaro: 2, Chierico: 3, Druido: 3, Guerriero: 2, Warlock: 2, Ladro: 1, Mago: 2, Monaco: 3, Paladino: 2, Ranger: 2, Stregone: 1 } },
  { c: "Influenza", s: "x", n: "Parlare in pubblico", a: "Carisma", f: "affine", k: { Artefice: 2, Bardo: 1, Barbaro: 3, Chierico: 1, Druido: 1, Guerriero: 2, Warlock: 2, Ladro: 2, Mago: 2, Monaco: 2, Paladino: 1, Ranger: 2, Stregone: 1 } },
  { c: "Influenza", s: "x", n: "Persuasione", a: "Carisma", f: "affine", k: { Artefice: 2, Bardo: 1, Barbaro: 2, Chierico: 1, Druido: 1, Guerriero: 2, Warlock: 1, Ladro: 1, Mago: 1, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 1 } },
  { c: "Influenza", s: "x", n: "Sedurre", a: "Carisma", f: "affine", k: { Artefice: 2, Bardo: 1, Barbaro: 2, Chierico: 2, Druido: 2, Guerriero: 2, Warlock: 2, Ladro: 2, Mago: 2, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 2 } },
  { c: "Influenza", s: "x", n: "Supercazzola", a: "Carisma", f: "affine", k: { Artefice: 2, Bardo: 1, Barbaro: 3, Chierico: 3, Druido: 3, Guerriero: 2, Warlock: 2, Ladro: 2, Mago: 2, Monaco: 3, Paladino: 2, Ranger: 2, Stregone: 1 } },
  { c: "Manipolazione arcana", s: "x", n: "Astrologia", a: "Intelligenza", f: "sep", k: { Artefice: 1, Bardo: 2, Barbaro: 3, Chierico: 1, Druido: 1, Guerriero: 3, Warlock: 1, Ladro: 3, Mago: 1, Monaco: 3, Paladino: 3, Ranger: 2, Stregone: 1 } },
  { c: "Manipolazione arcana", s: "x", n: "Rituali Divinatori", a: "Saggezza", f: "sep", k: { Artefice: 2, Bardo: 2, Barbaro: 3, Chierico: 1, Druido: 1, Guerriero: 3, Warlock: 2, Ladro: 3, Mago: 2, Monaco: 3, Paladino: 2, Ranger: 2, Stregone: 2 } },
  { c: "Manipolazione arcana", s: "x", n: "Incantamento", a: "Intelligenza", f: "sep", k: { Artefice: 1, Bardo: 3, Barbaro: 3, Chierico: 2, Druido: 2, Guerriero: 3, Warlock: 2, Ladro: 3, Mago: 2, Monaco: 3, Paladino: 3, Ranger: 2, Stregone: 3 } },
  { c: "Manipolazione arcana", s: "x", n: "Lettura Rune", a: "Intelligenza", f: "sep", k: { Artefice: 1, Bardo: 1, Barbaro: 3, Chierico: 1, Druido: 1, Guerriero: 3, Warlock: 1, Ladro: 3, Mago: 1, Monaco: 3, Paladino: 1, Ranger: 1, Stregone: 1 } },
  { c: "Manovre di Combattimento", s: "x", n: "Disimpegno", a: "_m", f: "sep", k: { Artefice: 1, Bardo: 1, Barbaro: 1, Chierico: 1, Druido: 1, Guerriero: 1, Warlock: 1, Ladro: 1, Mago: 1, Monaco: 1, Paladino: 1, Ranger: 1, Stregone: 1 } },
  { c: "Manovre di Combattimento", s: "x", n: "Attacco di Manovra", a: "Forza", f: "sep", k: { Artefice: 3, Bardo: 3, Barbaro: 1, Chierico: 3, Druido: 3, Guerriero: 1, Warlock: 3, Ladro: 2, Mago: 3, Monaco: 2, Paladino: 2, Ranger: 3, Stregone: 3 } },
  { c: "Manovre di Combattimento", s: "x", n: "Attacco Disarmante", a: "Destrezza", f: "sep", k: { Artefice: 3, Bardo: 3, Barbaro: 1, Chierico: 3, Druido: 3, Guerriero: 1, Warlock: 3, Ladro: 1, Mago: 3, Monaco: 1, Paladino: 2, Ranger: 1, Stregone: 3 } },
  { c: "Manovre di Combattimento", s: "x", n: "Attacco Minaccioso", a: "Carisma", f: "sep", k: { Artefice: 3, Bardo: 3, Barbaro: 1, Chierico: 3, Druido: 3, Guerriero: 1, Warlock: 3, Ladro: 2, Mago: 3, Monaco: 2, Paladino: 2, Ranger: 3, Stregone: 3 } },
  { c: "Manovre di Combattimento", s: "x", n: "Attacco Preciso", a: "Destrezza", f: "sep", k: { Artefice: 3, Bardo: 3, Barbaro: 1, Chierico: 3, Druido: 3, Guerriero: 1, Warlock: 3, Ladro: 1, Mago: 3, Monaco: 2, Paladino: 2, Ranger: 1, Stregone: 3 } },
  { c: "Manovre di Combattimento", s: "x", n: "Attacco Provocatorio", a: "Forza", f: "sep", k: { Artefice: 3, Bardo: 3, Barbaro: 1, Chierico: 3, Druido: 3, Guerriero: 1, Warlock: 3, Ladro: 2, Mago: 3, Monaco: 2, Paladino: 2, Ranger: 3, Stregone: 3 } },
  { c: "Manovre di Combattimento", s: "x", n: "Attacco Repulsivo", a: "Forza", f: "sep", k: { Artefice: 3, Bardo: 3, Barbaro: 1, Chierico: 3, Druido: 3, Guerriero: 1, Warlock: 3, Ladro: 2, Mago: 3, Monaco: 2, Paladino: 2, Ranger: 3, Stregone: 3 } },
  { c: "Manovre di Combattimento", s: "x", n: "Attacco Sbilanciante", a: "Forza", f: "sep", k: { Artefice: 3, Bardo: 3, Barbaro: 1, Chierico: 3, Druido: 3, Guerriero: 1, Warlock: 3, Ladro: 2, Mago: 3, Monaco: 2, Paladino: 2, Ranger: 1, Stregone: 3 } },
  { c: "Manovre di Combattimento", s: "x", n: "Attacco Spazzante", a: "Forza", f: "sep", k: { Artefice: 3, Bardo: 3, Barbaro: 1, Chierico: 3, Druido: 3, Guerriero: 1, Warlock: 3, Ladro: 2, Mago: 3, Monaco: 2, Paladino: 2, Ranger: 3, Stregone: 3 } },
  { c: "Manovre di Combattimento", s: "x", n: "Colpo Affondo", a: "Destrezza", f: "sep", k: { Artefice: 3, Bardo: 3, Barbaro: 1, Chierico: 3, Druido: 3, Guerriero: 1, Warlock: 3, Ladro: 2, Mago: 3, Monaco: 2, Paladino: 2, Ranger: 3, Stregone: 3 } },
  { c: "Manovre di Combattimento", s: "x", n: "Colpo del Comandante", a: "Forza", f: "sep", k: { Artefice: 3, Bardo: 3, Barbaro: 1, Chierico: 3, Druido: 3, Guerriero: 1, Warlock: 3, Ladro: 2, Mago: 3, Monaco: 2, Paladino: 2, Ranger: 3, Stregone: 3 } },
  { c: "Manovre di Combattimento", s: "x", n: "Colpo Distrattore", a: "Destrezza", f: "sep", k: { Artefice: 3, Bardo: 3, Barbaro: 1, Chierico: 3, Druido: 3, Guerriero: 1, Warlock: 3, Ladro: 1, Mago: 3, Monaco: 1, Paladino: 2, Ranger: 3, Stregone: 3 } },
  { c: "Manovre di Combattimento", s: "x", n: "Combattimento a 2 armi", a: "Destrezza", f: "sep", k: { Artefice: 3, Bardo: 3, Barbaro: 1, Chierico: 2, Druido: 3, Guerriero: 1, Warlock: 3, Ladro: 1, Mago: 3, Monaco: 1, Paladino: 2, Ranger: 1, Stregone: 3 } },
  { c: "Manovre di Combattimento", s: "x", n: "Combattimento a cavallo", a: "Destrezza", f: "sep", k: { Artefice: 3, Bardo: 3, Barbaro: 1, Chierico: 2, Druido: 3, Guerriero: 1, Warlock: 3, Ladro: 3, Mago: 3, Monaco: 3, Paladino: 1, Ranger: 2, Stregone: 3 } },
  { c: "Manovre di Combattimento", s: "x", n: "Combattimento alla cieca", a: "Saggezza", f: "sep", k: { Artefice: 3, Bardo: 3, Barbaro: 1, Chierico: 3, Druido: 3, Guerriero: 1, Warlock: 3, Ladro: 1, Mago: 3, Monaco: 1, Paladino: 2, Ranger: 2, Stregone: 3 } },
  { c: "Manovre di Combattimento", s: "x", n: "Contrattacco", a: "Destrezza", f: "sep", k: { Artefice: 3, Bardo: 3, Barbaro: 1, Chierico: 3, Druido: 3, Guerriero: 1, Warlock: 3, Ladro: 1, Mago: 3, Monaco: 1, Paladino: 2, Ranger: 2, Stregone: 3 } },
  { c: "Manovre di Combattimento", s: "x", n: "Finta d'Attacco", a: "Destrezza", f: "sep", k: { Artefice: 3, Bardo: 3, Barbaro: 1, Chierico: 3, Druido: 3, Guerriero: 1, Warlock: 3, Ladro: 1, Mago: 3, Monaco: 1, Paladino: 2, Ranger: 2, Stregone: 3 } },
  { c: "Manovre di Combattimento", s: "x", n: "Incitamento", a: "Carisma", f: "sep", k: { Artefice: 3, Bardo: 3, Barbaro: 1, Chierico: 2, Druido: 2, Guerriero: 1, Warlock: 3, Ladro: 2, Mago: 3, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 3 } },
  { c: "Manovre di Combattimento", s: "x", n: "Parata", a: "Destrezza", f: "sep", k: { Artefice: 3, Bardo: 3, Barbaro: 1, Chierico: 3, Druido: 3, Guerriero: 1, Warlock: 3, Ladro: 2, Mago: 3, Monaco: 2, Paladino: 2, Ranger: 1, Stregone: 3 } },
  { c: "Manovre di Combattimento", s: "x", n: "Passi Elusivi", a: "Destrezza", f: "sep", k: { Artefice: 3, Bardo: 3, Barbaro: 2, Chierico: 3, Druido: 3, Guerriero: 1, Warlock: 3, Ladro: 1, Mago: 3, Monaco: 1, Paladino: 2, Ranger: 1, Stregone: 3 } },
  { c: "Manovre di Combattimento", s: "x", n: "Colpo di Scudo", a: "Forza", f: "sep", k: { Artefice: 3, Bardo: 3, Barbaro: 2, Chierico: 3, Druido: 3, Guerriero: 1, Warlock: 3, Ladro: 3, Mago: 3, Monaco: 3, Paladino: 1, Ranger: 2, Stregone: 3 } },
  { c: "Natura e Sopravvivenza", s: "x", n: "Addestramento Animali", a: "Saggezza", f: "affine", k: { Artefice: 2, Bardo: 2, Barbaro: 2, Chierico: 2, Druido: 1, Guerriero: 2, Warlock: 3, Ladro: 2, Mago: 2, Monaco: 2, Paladino: 2, Ranger: 1, Stregone: 2 } },
  { c: "Natura e Sopravvivenza", s: "x", n: "Caccia", a: "Saggezza", f: "sep", k: { Artefice: 2, Bardo: 2, Barbaro: 1, Chierico: 2, Druido: 2, Guerriero: 1, Warlock: 3, Ladro: 2, Mago: 2, Monaco: 1, Paladino: 2, Ranger: 1, Stregone: 2 } },
  { c: "Natura e Sopravvivenza", s: "x", n: "Cavalcare", a: "Destrezza", f: "affine", k: { Artefice: 2, Bardo: 1, Barbaro: 1, Chierico: 1, Druido: 2, Guerriero: 1, Warlock: 2, Ladro: 1, Mago: 1, Monaco: 2, Paladino: 1, Ranger: 1, Stregone: 2 } },
  { c: "Natura e Sopravvivenza", s: "x", n: "Gestire animali", a: "Saggezza", f: "affine", k: { Artefice: 2, Bardo: 2, Barbaro: 2, Chierico: 2, Druido: 1, Guerriero: 2, Warlock: 3, Ladro: 2, Mago: 2, Monaco: 2, Paladino: 2, Ranger: 1, Stregone: 2 } },
  { c: "Natura e Sopravvivenza", s: "x", n: "Meteorologia", a: "Saggezza", f: "sep", k: { Artefice: 2, Bardo: 2, Barbaro: 1, Chierico: 2, Druido: 1, Guerriero: 2, Warlock: 2, Ladro: 2, Mago: 2, Monaco: 2, Paladino: 2, Ranger: 1, Stregone: 2 } },
  { c: "Natura e Sopravvivenza", s: "x", n: "Navigazione", a: "Intelligenza", f: "sep", k: { Artefice: 2, Bardo: 2, Barbaro: 3, Chierico: 2, Druido: 2, Guerriero: 2, Warlock: 2, Ladro: 2, Mago: 2, Monaco: 2, Paladino: 2, Ranger: 2, Stregone: 2 } },
  { c: "Natura e Sopravvivenza", s: "x", n: "Pesca", a: "Saggezza", f: "sep", k: { Artefice: 2, Bardo: 2, Barbaro: 1, Chierico: 2, Druido: 2, Guerriero: 1, Warlock: 3, Ladro: 2, Mago: 2, Monaco: 1, Paladino: 2, Ranger: 1, Stregone: 2 } },
  { c: "Natura e Sopravvivenza", s: "x", n: "Sopravvivenza", a: "Saggezza", f: "sep", k: { Artefice: 2, Bardo: 2, Barbaro: 1, Chierico: 2, Druido: 1, Guerriero: 2, Warlock: 3, Ladro: 2, Mago: 2, Monaco: 1, Paladino: 2, Ranger: 1, Stregone: 2 } },
  { c: "Natura e Sopravvivenza", s: "x", n: "Speleologia", a: "Intelligenza", f: "sep", k: { Artefice: 2, Bardo: 3, Barbaro: 1, Chierico: 2, Druido: 1, Guerriero: 2, Warlock: 2, Ladro: 2, Mago: 2, Monaco: 2, Paladino: 2, Ranger: 1, Stregone: 2 } },
  { c: "Percezione", s: "x", n: "Individuare bugie", a: "Saggezza", f: "sep", k: { Artefice: 1, Bardo: 1, Barbaro: 3, Chierico: 1, Druido: 1, Guerriero: 2, Warlock: 2, Ladro: 1, Mago: 2, Monaco: 2, Paladino: 1, Ranger: 1, Stregone: 2 } },
  { c: "Percezione", s: "x", n: "Individuare trappole", a: "Saggezza", f: "sep", k: { Artefice: 1, Bardo: 2, Barbaro: 2, Chierico: 2, Druido: 2, Guerriero: 1, Warlock: 2, Ladro: 1, Mago: 2, Monaco: 2, Paladino: 2, Ranger: 1, Stregone: 2 } },
  { c: "Percezione", s: "x", n: "Orientamento", a: "Saggezza", f: "sep", k: { Artefice: 1, Bardo: 1, Barbaro: 1, Chierico: 2, Druido: 1, Guerriero: 1, Warlock: 2, Ladro: 1, Mago: 2, Monaco: 1, Paladino: 1, Ranger: 1, Stregone: 2 } },
  { c: "Percezione", s: "x", n: "Osservazione e Percezione", a: "Saggezza", f: "sep", k: { Artefice: 1, Bardo: 1, Barbaro: 1, Chierico: 1, Druido: 1, Guerriero: 1, Warlock: 1, Ladro: 1, Mago: 1, Monaco: 1, Paladino: 1, Ranger: 1, Stregone: 1 } },
  { c: "Percezione", s: "x", n: "Seguire/leggere tracce", a: "Saggezza", f: "sep", k: { Artefice: 1, Bardo: 2, Barbaro: 1, Chierico: 2, Druido: 1, Guerriero: 2, Warlock: 2, Ladro: 1, Mago: 2, Monaco: 1, Paladino: 2, Ranger: 1, Stregone: 2 } },
  { c: "Percezione", s: "", n: "Sesto Senso", a: "Saggezza", f: "sep", k: { Artefice: 3, Bardo: 3, Barbaro: 3, Chierico: 3, Druido: 3, Guerriero: 3, Warlock: 3, Ladro: 3, Mago: 3, Monaco: 3, Paladino: 3, Ranger: 3, Stregone: 3 } },
  { c: "Strategia e Tattiche", s: "x", n: "Gestione delle Risorse/Logistica", a: "Intelligenza", f: "sep", k: { Artefice: 1, Bardo: 2, Barbaro: 3, Chierico: 1, Druido: 1, Guerriero: 1, Warlock: 1, Ladro: 2, Mago: 1, Monaco: 2, Paladino: 1, Ranger: 2, Stregone: 1 } },
  { c: "Strategia e Tattiche", s: "x", n: "Strategia", a: "Saggezza", f: "sep", k: { Artefice: 1, Bardo: 2, Barbaro: 3, Chierico: 1, Druido: 1, Guerriero: 1, Warlock: 1, Ladro: 2, Mago: 1, Monaco: 2, Paladino: 1, Ranger: 2, Stregone: 1 } },
  { c: "Strategia e Tattiche", s: "x", n: "Tattica", a: "Intelligenza", f: "sep", k: { Artefice: 1, Bardo: 2, Barbaro: 3, Chierico: 1, Druido: 1, Guerriero: 1, Warlock: 1, Ladro: 2, Mago: 1, Monaco: 2, Paladino: 1, Ranger: 2, Stregone: 1 } },
  { c: "Tiri Salvezza", s: "", n: "Forza", a: "Forza", f: "self", k: { Artefice: 3, Bardo: 3, Barbaro: 1, Chierico: 3, Druido: 3, Guerriero: 1, Warlock: 3, Ladro: 3, Mago: 3, Monaco: 1, Paladino: 3, Ranger: 1, Stregone: 3 }, z: 1 },
  { c: "Tiri Salvezza", s: "", n: "Destrezza", a: "Destrezza", f: "self", k: { Artefice: 3, Bardo: 1, Barbaro: 3, Chierico: 3, Druido: 3, Guerriero: 3, Warlock: 3, Ladro: 1, Mago: 3, Monaco: 1, Paladino: 3, Ranger: 1, Stregone: 3 }, z: 1 },
  { c: "Tiri Salvezza", s: "", n: "Costituzione", a: "Costituzione", f: "self", k: { Artefice: 1, Bardo: 3, Barbaro: 1, Chierico: 3, Druido: 3, Guerriero: 1, Warlock: 3, Ladro: 3, Mago: 3, Monaco: 3, Paladino: 3, Ranger: 3, Stregone: 1 }, z: 1 },
  { c: "Tiri Salvezza", s: "", n: "Intelligenza", a: "Intelligenza", f: "self", k: { Artefice: 1, Bardo: 3, Barbaro: 3, Chierico: 3, Druido: 1, Guerriero: 3, Warlock: 3, Ladro: 1, Mago: 1, Monaco: 3, Paladino: 3, Ranger: 3, Stregone: 3 }, z: 1 },
  { c: "Tiri Salvezza", s: "", n: "Saggezza", a: "Saggezza", f: "self", k: { Artefice: 3, Bardo: 3, Barbaro: 3, Chierico: 1, Druido: 1, Guerriero: 3, Warlock: 1, Ladro: 3, Mago: 1, Monaco: 3, Paladino: 1, Ranger: 3, Stregone: 3 }, z: 1 },
  { c: "Tiri Salvezza", s: "", n: "Carisma", a: "Carisma", f: "self", k: { Artefice: 3, Bardo: 1, Barbaro: 3, Chierico: 1, Druido: 3, Guerriero: 3, Warlock: 1, Ladro: 3, Mago: 3, Monaco: 3, Paladino: 1, Ranger: 3, Stregone: 1 }, z: 1 }
];

/* ═══ ENGINE ═══ */
const gm = v => Math.floor((v-10)/2);
const bonusLvl = r => Math.ceil(r/3) + Math.floor(r/24);
// Formatta un modificatore col segno: 5 -> "+5", -3 -> "-3", 0 -> "+0".
const fmtMod = m => (m >= 0 ? "+" : "") + m;
// Punteggio totale di una competenza già calcolata da computeAll (.tot c'è sempre);
// il fallback resta solo come difesa se passata una skill parziale.
function skScore(s, statMods){ if(!s) return null; return s.tot != null ? s.tot : ((statMods[s.attr]||0) + (s.parz||0)); }
const resolveAttr = (sd, meleeA, magicA) => {
  if (!sd) return "Forza";
  if (sd.a === "_m") return meleeA;
  if (sd.a === "_g") return magicA;
  return sd.a;
};

// ===== MOTORE MAGIA (PM / Soglia / Sovra-lancio) — homebrew rev10 =====
const PM_PROG = {
  full:[[2,1],[3,1],[8,2],[10,2],[16,3],[19,3],[23,4],[27,4],[36,5],[41,5],[47,6],[47,6],[54,7],[54,7],[62,8],[62,8],[71,9],[76,9],[82,9],[89,9]],
  half:[[0,0],[2,1],[3,1],[3,1],[8,2],[8,2],[10,2],[10,2],[16,3],[16,3],[19,3],[19,3],[23,4],[23,4],[27,4],[27,4],[36,5],[36,5],[41,5],[41,5]],
  arti:[[2,1],[2,1],[3,1],[3,1],[8,2],[8,2],[10,2],[10,2],[16,3],[16,3],[19,3],[19,3],[23,4],[23,4],[27,4],[27,4],[36,5],[36,5],[41,5],[41,5]],
  third:[[0,0],[0,0],[2,1],[3,1],[3,1],[3,1],[8,2],[8,2],[8,2],[10,2],[10,2],[10,2],[16,3],[16,3],[16,3],[19,3],[19,3],[19,3],[23,4],[23,4]],
  warlock:[[1,1],[2,1],[4,2],[4,2],[6,3],[6,3],[8,4],[8,4],[10,5],[10,5],[15,5],[15,5],[15,5],[15,5],[15,5],[15,5],[20,5],[20,5],[20,5],[20,5]]
};
const CLASS_PROG = {
  Bardo: "full",
  Chierico: "full",
  Druido: "full",
  Mago: "full",
  Stregone: "full",
  Paladino: "half",
  Ranger: "half",
  Artefice: "arti",
  Warlock: "warlock",
  Barbaro: "none",
  Guerriero: "none",
  Ladro: "none",
  Monaco: "none"
};
// PM e Soglia del personaggio: PM = somma per classe; Soglia = max tra le classi.
function pmSoglia(classes) {
  let pm = 0, soglia = 0; const per = [];
  (classes || []).forEach(function(c) {
    if (!c || !c.name || !c.level) return;
    const prog = CLASS_PROG[c.name];
    if (!prog || prog === "none") { per.push({name:c.name, level:c.level, pm:0, soglia:0, prog:"none"}); return; }
    const lvl = Math.min(20, Math.max(1, c.level));
    const row = PM_PROG[prog][lvl - 1]; // [pm, soglia]
    pm += row[0]; if (row[1] > soglia) soglia = row[1];
    per.push({name:c.name, level:c.level, pm:row[0], soglia:row[1], prog:prog, recovery: prog==="warlock" ? "breve" : "lungo"});
  });
  return { pm:pm, soglia:soglia, per:per };
}
// CD del sovra-lancio (rev14): base 10 + due termini situazionali che si sommano.
//   Base 10 — presente appena scatta un sovra-lancio (sopra soglia OPPURE a secco), una volta sola.
//   Sforamento (solo se L > soglia):        (L − soglia) × L
//   A secco di PM (solo se overPM):          2 × L
// La base 10 fa già da pavimento (niente sfori "gratis"); lo sforamento (L−soglia)×L da' la curva ripida.
// Se NON sopra soglia e NON a secco → CD 0: lancio normale entro soglia con PM, nessun tiro.
// Il tiro è 1d20 + mod. scuola (pulito) contro questa CD: il sovraccarico vive nella CD, non nel dado.
function overcastCD(level, soglia, overPM) {
  const over = level > soglia;
  if (!over && !overPM) return 0;
  let cd = 10;
  if (over) cd += (level - soglia) * level;
  if (overPM) cd += 1 + level;
  return cd;
}
// Danni del pedaggio (rev15): x6 sia riuscito sia fallito / x12 su 1 naturale.
// Il tiro decide solo se l'incantesimo parte (cilecca su fallimento), non quanto paghi: lo sforzo c'è stato comunque.
function overcastDamage(level, outcome) {
  const mult = outcome === "nat1" ? 12 : outcome === "fail" ? 6 : 3;
  return level * mult;
}

function computeAll(skills, statMods, meleeA, magicA, sdList) {
  const sdL = sdList || SD;   // 10.7.4: con le competenze aggiunte dal master la lista è quella del personaggio (SD + ch.skExtra)
  const pass1 = skills.map((sk, i) => {
    const sd = sdL[i];
    if (!sd) return { ...sk, idx: i, bl: 0, parz: -3, rank: 0, attr: "Forza", cat: "?", sub: "", aff: "sep", name: "?" };
    const rank = sk.rank || 0;
    const attr = sk.ao || resolveAttr(sd, meleeA, magicA);
    const bl2 = bonusLvl(rank);
    const zeroPen = rank === 0 && sd.c !== "Tiri Salvezza" ? -3 : 0;   // tiri salvezza senza rank: solo il modificatore (P-97, modifica P-34)
    const parz = bl2 + zeroPen;
    return { ...sk, idx: i, bl: bl2, parz, rank, attr, cat: sd.c, sub: sd.s || "", aff: sd.f, name: sk.cn || sd.n };
  });
  return pass1.map((sk) => {
    let maxAff;
    if (sk.aff === "sep" || sk.aff === "self") {
      maxAff = sk.parz;
    } else {
      const grp = pass1.filter((s) => s.cat === sk.cat && s.sub === sk.sub && s.idx !== sk.idx);
      const maxR = Math.max(0, ...grp.map((s) => s.rank));
      maxAff = maxR > 0 ? Math.floor(Math.max(0, ...grp.map((s) => s.parz)) / 2) - 1 : -3;
    }
    const sm2 = statMods[sk.attr] || 0;
    const tot = Math.max(sk.parz, maxAff) + sm2 + (sk.bs || 0) + (sk.ms || 0);
    return { ...sk, maxAff, sm2, tot };
  });
}

function calcCost(base, from, adds, isLv1) {
  let c = 0;
  const to = from + adds;
  c += base * Math.max(0, Math.min(8, to) - Math.max(from, 0));
  c += base * 2 * Math.max(0, Math.min(16, to) - Math.max(from, 8));
  c += base * 3 * Math.max(0, Math.min(23, to) - Math.max(from, 16));
  c += base * 4 * Math.max(0, Math.min(24, to) - Math.max(from, 23));
  if (adds > 0 && from === 0 && !isLv1) c += base;
  return c;
}

// Restituisce il costo base di una skill per una data classe.
// Se la skill ha un costOverride valido (intero >= 1) lo usa al posto del costo classe.
// Serve per: regola "regno ostile" (-1 min 1), Bardo Sapienza/Valore, Campione,
// Slippery Mind, Diamond Soul, sconto razziale armi, e in generale qualsiasi
// modifica permanente al costo decisa dal Master.
function getSkillCost(sk, sd, cls) {
  if (sk && Number.isInteger(sk.costOverride) && sk.costOverride >= 1) return sk.costOverride;
  return sd && sd.k ? (sd.k[cls] || 2) : 2;
}

/* P-110 (21/11/2026, Alessandro): la base B è 9 m per tutte le razze; la differenza la fanno altezza, Destrezza e Forza (R1.8bis). */
const VEL_BASE = 9;
function calcVel(base, height, modDes, modFor) {
  const f = base * 2/3;
  const hf = (height - 60) / 100;
  return Math.round((f + base*hf*((modDes+5)/5)*0.22 + base*hf*((modFor+5)/5)*0.12) * 2) / 2;
}

function pointBuyCost(statVal) {
  if (statVal <= 8) return 0;
  if (statVal <= 13) return statVal - 8;
  return (statVal - 13) * 2 + 5; // 14=7, 15=9
}

/* ═══ EQUIPMENT ENGINE ═══ */
const ARM_IDX = {light:7, medium:8, heavy:9};
const SH_IDX = {small:12, medium:11, large:10};
const COIN_W = 0.01; // kg per coin
const COIN_MO = {mp:10, mo:1, ma:0.1, mr:0.01};
const COIN_NAMES = {mp:"MP",mo:"MO",ma:"MA",mr:"MR"};

function calcDexCap(eq, skills) {
  skills = skills || [];
  const arm = eq && eq.armor || {};
  const pb = (r) => r > 0 ? bonusLvl(r) : -3;
  if (arm.heavy && arm.heavy.equipped) return pb((skills[9] || {}).rank || 0) - 5;
  if (arm.medium && arm.medium.equipped) return pb((skills[8] || {}).rank || 0) - 3;
  if (arm.light && arm.light.equipped) return pb((skills[7] || {}).rank || 0) + 2;
  return 999;
}
function shieldDexPen(eq) {
  const sh = eq && eq.shield || {};
  return sh.large && sh.large.equipped ? -2 : 0;
}
function calcCA(eq, dexMod) {
  const arm = eq && eq.armor || {};
  const sh = eq && eq.shield || {};
  let ca = 10 + dexMod;
  ["light", "medium", "heavy"].forEach((k) => {
    if (arm[k] && arm[k].equipped) ca += (arm[k].caBase || 0) + (arm[k].bonusSpec || 0);
  });
  ["small", "medium", "large"].forEach((k) => {
    if (sh[k] && sh[k].equipped) ca += (sh[k].caBonus || 0) + (sh[k].bonusSpec || 0);
  });
  return ca;
}
const WEAPONS_DB = [
  { "id": "pugnale", "name": "Pugnale", "nameEn": "Dagger", "family": "semplice", "category": "Coltelli e Pugnali", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Perforante", "props": "Leggera, Accurata, Lancio (6/18)", "weight": 0.5, "cost": 2, "range": null, "ranged": false, "source": "PHB" },
  { "id": "coltello", "name": "Coltello", "nameEn": "Knife", "family": "semplice", "category": "Coltelli e Pugnali", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Tagliente", "props": "Leggera, Accurata, Lancio (6/18)", "weight": 0.3, "cost": 1, "range": null, "ranged": false, "source": "storica" },
  { "id": "stiletto", "name": "Stiletto", "nameEn": "Stiletto", "family": "semplice", "category": "Coltelli e Pugnali", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Perforante", "props": "Leggera, Accurata, ignora 1 pt di CA da armatura", "weight": 0.3, "cost": 2, "range": null, "ranged": false, "source": "AD&D" },
  { "id": "daga", "name": "Daga", "nameEn": "Dirk", "family": "semplice", "category": "Coltelli e Pugnali", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Perforante", "props": "Leggera, Accurata", "weight": 0.5, "cost": 2, "range": null, "ranged": false, "source": "storica" },
  { "id": "main_gauche", "name": "Main-gauche", "nameEn": "Main-gauche", "family": "marziale", "category": "Coltelli e Pugnali", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Perforante", "props": "Leggera, Accurata, +1 CA se usata per parare con altra arma in mano", "weight": 0.5, "cost": 3, "range": null, "ranged": false, "source": "AD&D" },
  { "id": "pugnale_punzone", "name": "Pugnale punzone", "nameEn": "Punching dagger (Katar)", "family": "semplice", "category": "Coltelli e Pugnali", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Perforante", "props": "Leggera, Accurata", "weight": 0.5, "cost": 2, "range": null, "ranged": false, "source": "PF" },
  { "id": "kukri", "name": "Kukri", "nameEn": "Kukri", "family": "marziale", "category": "Coltelli e Pugnali", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Tagliente", "props": "Leggera, Accurata, critico migliorato (19-20)", "weight": 0.9, "cost": 5, "range": null, "ranged": false, "source": "PF" },
  { "id": "kerambit", "name": "Kerambit", "nameEn": "Kerambit", "family": "marziale", "category": "Coltelli e Pugnali", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Tagliente", "props": "Leggera, Accurata", "weight": 0.3, "cost": 2, "range": null, "ranged": false, "source": "PF" },
  { "id": "tanto", "name": "Tanto", "nameEn": "Tantō", "family": "semplice", "category": "Coltelli e Pugnali", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Perforante", "props": "Leggera, Accurata", "weight": 0.5, "cost": 2, "range": null, "ranged": false, "source": "orientale" },
  { "id": "jambiya", "name": "Jambiya", "nameEn": "Jambiya", "family": "semplice", "category": "Coltelli e Pugnali", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Perforante/Tagliente", "props": "Leggera, Accurata", "weight": 0.5, "cost": 4, "range": null, "ranged": false, "source": "AD&D" },
  { "id": "bichhwa", "name": "Bich'hwa", "nameEn": "Bich'hwa", "family": "marziale", "category": "Coltelli e Pugnali", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Perforante", "props": "Leggera, Accurata", "weight": 0.3, "cost": 4, "range": null, "ranged": false, "source": "PF" },
  { "id": "kris", "name": "Kris", "nameEn": "Kris", "family": "marziale", "category": "Coltelli e Pugnali", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Tagliente", "props": "Leggera, Accurata, ferite sanguinanti (+1 al danno vs non corazzati)", "weight": 0.5, "cost": 4, "range": null, "ranged": false, "source": "storica" },
  { "id": "misericordia", "name": "Misericordia", "nameEn": "Misericorde", "family": "marziale", "category": "Coltelli e Pugnali", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Perforante", "props": "Leggera, Accurata, ignora 2 pt di CA da armatura vs bersagli proni", "weight": 0.4, "cost": 6, "range": null, "ranged": false, "source": "storica" },
  { "id": "cesto", "name": "Cesto", "nameEn": "Cestus", "family": "semplice", "category": "Coltelli e Pugnali", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Contundente", "props": "Leggera", "weight": 0.5, "cost": 5, "range": null, "ranged": false, "source": "PF" },
  { "id": "tirapugni", "name": "Tirapugni", "nameEn": "Brass knuckles", "family": "semplice", "category": "Coltelli e Pugnali", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Contundente", "props": "Leggera", "weight": 0.5, "cost": 1, "range": null, "ranged": false, "source": "storica" },
  { "id": "artigli_della_tigre", "name": "Artigli della tigre", "nameEn": "Bagh nakh", "family": "marziale", "category": "Coltelli e Pugnali", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Tagliente", "props": "Leggera, Accurata, occultabile", "weight": 0.2, "cost": 4, "range": null, "ranged": false, "source": "indiana" },
  { "id": "sai", "name": "Sai", "nameEn": "Sai", "family": "marziale", "category": "Coltelli e Pugnali", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Perforante", "props": "Leggera, Accurata, vantaggio a Disarmare", "weight": 0.5, "cost": 1, "range": null, "ranged": false, "source": "orientale" },
  { "id": "punteruolo_emei", "name": "Punteruolo Emei", "nameEn": "Emei piercer", "family": "marziale", "category": "Coltelli e Pugnali", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Perforante", "props": "Leggera, Accurata", "weight": 0.2, "cost": 5, "range": null, "ranged": false, "source": "PF" },
  { "id": "spezza_spada", "name": "Spezza-spada", "nameEn": "Swordbreaker dagger", "family": "marziale", "category": "Coltelli e Pugnali", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Perforante", "props": "Leggera, vantaggio a Disarmare lame", "weight": 1, "cost": 10, "range": null, "ranged": false, "source": "PF" },
  { "id": "stocco_da_bastone", "name": "Stocco da bastone", "nameEn": "Sword cane", "family": "marziale", "category": "Coltelli e Pugnali", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Perforante", "props": "Leggera, Accurata, occultabile", "weight": 0.9, "cost": 45, "range": null, "ranged": false, "source": "PF" },
  { "id": "scannacani", "name": "Scannacani", "nameEn": "Dogslicer", "family": "semplice", "category": "Coltelli e Pugnali", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Tagliente", "props": "Leggera, Accurata, fragile", "weight": 0.5, "cost": 8, "range": null, "ranged": false, "source": "PF" },
  { "id": "spada_corta", "name": "Spada corta", "nameEn": "Shortsword", "family": "marziale", "category": "Spade", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Perforante", "props": "Leggera, Accurata", "weight": 1, "cost": 10, "range": null, "ranged": false, "source": "PHB" },
  { "id": "spada_lunga", "name": "Spada lunga", "nameEn": "Longsword", "family": "marziale", "category": "Spade", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Tagliente", "props": "Versatile (1d10)", "weight": 1.5, "cost": 15, "range": null, "ranged": false, "source": "PHB" },
  { "id": "stocco", "name": "Stocco", "nameEn": "Rapier", "family": "marziale", "category": "Spade", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Perforante", "props": "Accurata", "weight": 1, "cost": 25, "range": null, "ranged": false, "source": "PHB" },
  { "id": "scimitarra", "name": "Scimitarra", "nameEn": "Scimitar", "family": "marziale", "category": "Spade", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Tagliente", "props": "Leggera, Accurata", "weight": 1.5, "cost": 25, "range": null, "ranged": false, "source": "PHB" },
  { "id": "spada_bastarda", "name": "Spada bastarda", "nameEn": "Bastard sword", "family": "marziale", "category": "Spade", "dmg5e": "1d10", "dmg": "1d10", "dmgType": "Tagliente", "props": "Versatile (1d12), richiede For 13 a 1 mano", "weight": 2, "cost": 35, "range": null, "ranged": false, "source": "3.5e" },
  { "id": "gladio", "name": "Gladio", "nameEn": "Gladius", "family": "semplice", "category": "Spade", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Perforante/Tagliente", "props": "Leggera", "weight": 1, "cost": 8, "range": null, "ranged": false, "source": "storica" },
  { "id": "spada_larga", "name": "Spada larga", "nameEn": "Broadsword", "family": "marziale", "category": "Spade", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Tagliente", "props": "Versatile (1d10)", "weight": 1.8, "cost": 15, "range": null, "ranged": false, "source": "AD&D" },
  { "id": "scimitarrone", "name": "Scimitarrone", "nameEn": "Falchion", "family": "marziale", "category": "Spade", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Tagliente", "props": "Critico migliorato (19-20)", "weight": 1.8, "cost": 30, "range": null, "ranged": false, "source": "3.5e/PF" },
  { "id": "falcata", "name": "Falcata", "nameEn": "Falcata", "family": "marziale", "category": "Spade", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Tagliente", "props": "", "weight": 1.8, "cost": 18, "range": null, "ranged": false, "source": "PF" },
  { "id": "sciabola", "name": "Sciabola", "nameEn": "Sabre", "family": "marziale", "category": "Spade", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Tagliente", "props": "Accurata", "weight": 1.1, "cost": 20, "range": null, "ranged": false, "source": "storica" },
  { "id": "storta", "name": "Storta", "nameEn": "Cutlass", "family": "marziale", "category": "Spade", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Tagliente", "props": "Leggera", "weight": 1.2, "cost": 12, "range": null, "ranged": false, "source": "storica" },
  { "id": "khopesh", "name": "Khopesh", "nameEn": "Khopesh", "family": "marziale", "category": "Spade", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Tagliente", "props": "Speciale (sgambetto)", "weight": 1.4, "cost": 20, "range": null, "ranged": false, "source": "PF" },
  { "id": "shotel", "name": "Shotel", "nameEn": "Shotel", "family": "marziale", "category": "Spade", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Perforante", "props": "Accurata, ignora il bonus CA degli scudi", "weight": 1.4, "cost": 20, "range": null, "ranged": false, "source": "africana" },
  { "id": "talwar", "name": "Talwar", "nameEn": "Talwar", "family": "marziale", "category": "Spade", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Tagliente", "props": "Versatile (1d10)", "weight": 1.4, "cost": 20, "range": null, "ranged": false, "source": "indiana" },
  { "id": "shamshir", "name": "Shamshir", "nameEn": "Shamshir", "family": "marziale", "category": "Spade", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Tagliente", "props": "Leggera, Accurata", "weight": 1.4, "cost": 20, "range": null, "ranged": false, "source": "storica" },
  { "id": "kilij", "name": "Kilij", "nameEn": "Kilij", "family": "marziale", "category": "Spade", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Tagliente", "props": "", "weight": 1.4, "cost": 25, "range": null, "ranged": false, "source": "storica" },
  { "id": "katana", "name": "Katana", "nameEn": "Katana", "family": "marziale", "category": "Spade", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Tagliente", "props": "Versatile (1d10), Accurata", "weight": 1.2, "cost": 30, "range": null, "ranged": false, "source": "orientale" },
  { "id": "wakizashi", "name": "Wakizashi", "nameEn": "Wakizashi", "family": "marziale", "category": "Spade", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Tagliente", "props": "Leggera, Accurata", "weight": 0.8, "cost": 15, "range": null, "ranged": false, "source": "orientale" },
  { "id": "jian", "name": "Jian", "nameEn": "Jian", "family": "marziale", "category": "Spade", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Tagliente", "props": "Accurata", "weight": 1.4, "cost": 20, "range": null, "ranged": false, "source": "orientale" },
  { "id": "dao", "name": "Dao", "nameEn": "Dao", "family": "marziale", "category": "Spade", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Tagliente", "props": "Leggera", "weight": 1.4, "cost": 15, "range": null, "ranged": false, "source": "orientale" },
  { "id": "spada_del_tempio", "name": "Spada del tempio", "nameEn": "Temple sword", "family": "marziale", "category": "Spade", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Tagliente", "props": "Accurata, Speciale (sgambetto)", "weight": 1.4, "cost": 30, "range": null, "ranged": false, "source": "PF" },
  { "id": "sciabola_dentata", "name": "Sciabola dentata", "nameEn": "Sawtooth sabre", "family": "marziale", "category": "Spade", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Tagliente", "props": "Leggera, Accurata", "weight": 1.4, "cost": 35, "range": null, "ranged": false, "source": "PF" },
  { "id": "spada_da_duello", "name": "Spada da duello", "nameEn": "Aldori dueling sword", "family": "marziale", "category": "Spade", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Tagliente", "props": "Accurata", "weight": 1.4, "cost": 20, "range": null, "ranged": false, "source": "PF" },
  { "id": "spada_serpeggiante", "name": "Spada serpeggiante", "nameEn": "Flambard", "family": "marziale", "category": "Spade", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Tagliente", "props": "Versatile (1d10), ferite laceranti (+1 al danno vs non corazzati)", "weight": 1.8, "cost": 75, "range": null, "ranged": false, "source": "storica" },
  { "id": "estoc", "name": "Estoc", "nameEn": "Estoc", "family": "marziale", "category": "Spade", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Perforante", "props": "Versatile (1d10), ignora 1 pt di CA da armatura", "weight": 1.8, "cost": 40, "range": null, "ranged": false, "source": "storica" },
  { "id": "spada_ad_anelli", "name": "Spada ad anelli", "nameEn": "Nine-ring broadsword", "family": "marziale", "category": "Spade", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Tagliente", "props": "", "weight": 1.8, "cost": 15, "range": null, "ranged": false, "source": "orientale" },
  { "id": "sica", "name": "Sica", "nameEn": "Sica", "family": "semplice", "category": "Spade", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Tagliente", "props": "Leggera, Accurata", "weight": 0.9, "cost": 10, "range": null, "ranged": false, "source": "storica" },
  { "id": "macuahuitl", "name": "Macuahuitl", "nameEn": "Macuahuitl", "family": "marziale", "category": "Spade", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Tagliente", "props": "Versatile (1d10), fragile", "weight": 1.8, "cost": 20, "range": null, "ranged": false, "source": "mesoamericana" },
  { "id": "spada_uncinata", "name": "Spada uncinata", "nameEn": "Hook sword", "family": "marziale", "category": "Spade", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Tagliente", "props": "Leggera, Speciale (sgambetto)", "weight": 1.4, "cost": 30, "range": null, "ranged": false, "source": "orientale" },
  { "id": "spadino", "name": "Spadino", "nameEn": "Smallsword", "family": "marziale", "category": "Spade", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Perforante", "props": "Leggera, Accurata", "weight": 0.7, "cost": 18, "range": null, "ranged": false, "source": "storica" },
  { "id": "mazza", "name": "Mazza", "nameEn": "Mace", "family": "semplice", "category": "Armi da impatto a 1 mano", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Contundente", "props": "", "weight": 2, "cost": 5, "range": null, "ranged": false, "source": "PHB" },
  { "id": "randello", "name": "Randello", "nameEn": "Club", "family": "semplice", "category": "Armi da impatto a 1 mano", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Contundente", "props": "Leggera", "weight": 1, "cost": 0.1, "range": null, "ranged": false, "source": "PHB" },
  { "id": "martello_leggero", "name": "Martello leggero", "nameEn": "Light hammer", "family": "semplice", "category": "Armi da impatto a 1 mano", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Contundente", "props": "Leggera, Lancio (6/18)", "weight": 1, "cost": 2, "range": null, "ranged": false, "source": "PHB" },
  { "id": "martello_da_guerra", "name": "Martello da guerra", "nameEn": "Warhammer", "family": "marziale", "category": "Armi da impatto a 1 mano", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Contundente", "props": "Versatile (1d10)", "weight": 1, "cost": 15, "range": null, "ranged": false, "source": "PHB" },
  { "id": "stella_del_mattino", "name": "Mazza chiodata", "nameEn": "Morningstar", "family": "marziale", "category": "Armi da impatto a 1 mano", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Perforante", "props": "", "weight": 2, "cost": 15, "range": null, "ranged": false, "source": "PHB" },
  { "id": "piccone_da_guerra", "name": "Piccone da guerra", "nameEn": "War pick", "family": "marziale", "category": "Armi da impatto a 1 mano", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Perforante", "props": "", "weight": 1, "cost": 5, "range": null, "ranged": false, "source": "PHB" },
  { "id": "mazzafrusto", "name": "Mazzafrusto", "nameEn": "Flail", "family": "marziale", "category": "Armi da impatto a 1 mano", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Contundente", "props": "", "weight": 1, "cost": 10, "range": null, "ranged": false, "source": "PHB" },
  { "id": "mazza_chiodata", "name": "Mazza ferrata", "nameEn": "Spiked mace", "family": "semplice", "category": "Armi da impatto a 1 mano", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Perforante", "props": "", "weight": 1.8, "cost": 5, "range": null, "ranged": false, "source": "storica" },
  { "id": "mazza_pesante", "name": "Mazza pesante", "nameEn": "Heavy mace", "family": "marziale", "category": "Armi da impatto a 1 mano", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Contundente", "props": "", "weight": 3.6, "cost": 12, "range": null, "ranged": false, "source": "3.5e" },
  { "id": "manganello", "name": "Manganello", "nameEn": "Sap", "family": "semplice", "category": "Armi da impatto a 1 mano", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Contundente", "props": "Leggera, danni non letali senza malus", "weight": 0.5, "cost": 1, "range": null, "ranged": false, "source": "3.5e" },
  { "id": "mazza_da_cavaliere", "name": "Mazza da cavaliere", "nameEn": "Horseman's mace", "family": "semplice", "category": "Armi da impatto a 1 mano", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Contundente", "props": "Leggera", "weight": 1.4, "cost": 5, "range": null, "ranged": false, "source": "AD&D" },
  { "id": "mazzafrusto_da_cavaliere", "name": "Mazzafrusto da cavaliere", "nameEn": "Horseman's flail", "family": "marziale", "category": "Armi da impatto a 1 mano", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Contundente", "props": "Leggera, ignora il bonus CA degli scudi", "weight": 1.4, "cost": 8, "range": null, "ranged": false, "source": "AD&D" },
  { "id": "nunchaku", "name": "Nunchaku", "nameEn": "Nunchaku", "family": "marziale", "category": "Armi da impatto a 1 mano", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Contundente", "props": "Leggera, Accurata", "weight": 0.5, "cost": 2, "range": null, "ranged": false, "source": "orientale" },
  { "id": "tonfa", "name": "Tonfa", "nameEn": "Tonfa", "family": "semplice", "category": "Armi da impatto a 1 mano", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Contundente", "props": "Leggera, +1 CA se usata in difesa", "weight": 0.5, "cost": 1, "range": null, "ranged": false, "source": "orientale" },
  { "id": "aclide", "name": "Aclide", "nameEn": "Aklys", "family": "marziale", "category": "Armi da impatto a 1 mano", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Contundente", "props": "Leggera, Lancio (6/18) con cordino di recupero, Speciale (sgambetto)", "weight": 0.9, "cost": 5, "range": null, "ranged": false, "source": "PF" },
  { "id": "knobkerrie", "name": "Knobkerrie", "nameEn": "Knobkerrie", "family": "semplice", "category": "Armi da impatto a 1 mano", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Contundente", "props": "Lancio (6/18)", "weight": 0.9, "cost": 1, "range": null, "ranged": false, "source": "africana" },
  { "id": "rungu", "name": "Rungu", "nameEn": "Rungu", "family": "semplice", "category": "Armi da impatto a 1 mano", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Contundente", "props": "Leggera, Lancio (6/18)", "weight": 0.9, "cost": 1, "range": null, "ranged": false, "source": "africana" },
  { "id": "aspersorio_da_battaglia", "name": "Aspersorio da battaglia", "nameEn": "Battle aspergillum", "family": "semplice", "category": "Armi da impatto a 1 mano", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Contundente", "props": "Contiene acqua santa (1d4 radiante vs non morti, 5 cariche)", "weight": 1.4, "cost": 5, "range": null, "ranged": false, "source": "PF" },
  { "id": "frusta_di_ferro", "name": "Frusta di ferro", "nameEn": "Iron whip (bian)", "family": "marziale", "category": "Armi da impatto a 1 mano", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Contundente", "props": "", "weight": 1.8, "cost": 10, "range": null, "ranged": false, "source": "orientale" },
  { "id": "wahaika", "name": "Wahaika", "nameEn": "Wahaika", "family": "marziale", "category": "Armi da impatto a 1 mano", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Contundente", "props": "Leggera, vantaggio a Disarmare", "weight": 0.9, "cost": 2, "range": null, "ranged": false, "source": "PF" },
  { "id": "ascia", "name": "Ascia", "nameEn": "Handaxe", "family": "semplice", "category": "Altre armi da mischia a 1 mano", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Tagliente", "props": "Leggera, Lancio (6/18)", "weight": 1, "cost": 5, "range": null, "ranged": false, "source": "PHB" },
  { "id": "ascia_da_battaglia", "name": "Ascia da battaglia", "nameEn": "Battleaxe", "family": "marziale", "category": "Altre armi da mischia a 1 mano", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Tagliente", "props": "Versatile (1d10)", "weight": 2, "cost": 10, "range": null, "ranged": false, "source": "PHB" },
  { "id": "falcetto", "name": "Falcetto", "nameEn": "Sickle", "family": "semplice", "category": "Altre armi da mischia a 1 mano", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Tagliente", "props": "Leggera", "weight": 1, "cost": 1, "range": null, "ranged": false, "source": "PHB" },
  { "id": "frusta", "name": "Frusta", "nameEn": "Whip", "family": "marziale", "category": "Altre armi da mischia a 1 mano", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Tagliente", "props": "Accurata, Portata", "weight": 1.5, "cost": 2, "range": null, "ranged": false, "source": "PHB" },
  { "id": "kama", "name": "Kama", "nameEn": "Kama", "family": "marziale", "category": "Altre armi da mischia a 1 mano", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Tagliente", "props": "Leggera, Accurata", "weight": 0.9, "cost": 2, "range": null, "ranged": false, "source": "orientale" },
  { "id": "ascia_da_guerra_nanica", "name": "Ascia da guerra nanica", "nameEn": "Dwarven waraxe", "family": "marziale", "category": "Altre armi da mischia a 1 mano", "dmg5e": "1d10", "dmg": "1d10", "dmgType": "Tagliente", "props": "Versatile (1d12), richiede For 13 a 1 mano", "weight": 3.6, "cost": 30, "range": null, "ranged": false, "source": "3.5e" },
  { "id": "scure_uncinata", "name": "Scure uncinata", "nameEn": "Hooked axe", "family": "marziale", "category": "Altre armi da mischia a 1 mano", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Tagliente", "props": "Speciale (sgambetto)", "weight": 3.6, "cost": 20, "range": null, "ranged": false, "source": "PF" },
  { "id": "pata", "name": "Pata", "nameEn": "Pata", "family": "marziale", "category": "Altre armi da mischia a 1 mano", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Perforante", "props": "Leggera, non può essere disarmata", "weight": 1.4, "cost": 14, "range": null, "ranged": false, "source": "indiana" },
  { "id": "machete", "name": "Machete", "nameEn": "Machete", "family": "semplice", "category": "Altre armi da mischia a 1 mano", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Tagliente", "props": "Leggera", "weight": 0.9, "cost": 10, "range": null, "ranged": false, "source": "PF" },
  { "id": "tomahawk", "name": "Tomahawk", "nameEn": "Tomahawk", "family": "semplice", "category": "Altre armi da mischia a 1 mano", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Tagliente", "props": "Leggera, Lancio (6/18)", "weight": 0.8, "cost": 4, "range": null, "ranged": false, "source": "storica" },
  { "id": "nzappa_zap", "name": "Nzappa zap", "nameEn": "Nzappa zap", "family": "marziale", "category": "Altre armi da mischia a 1 mano", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Tagliente", "props": "Leggera, Lancio (6/18)", "weight": 0.9, "cost": 8, "range": null, "ranged": false, "source": "africana" },
  { "id": "urumi", "name": "Urumi", "nameEn": "Urumi", "family": "marziale", "category": "Altre armi da mischia a 1 mano", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Tagliente", "props": "Accurata, Speciale (distraente)", "weight": 2.7, "cost": 30, "range": null, "ranged": false, "source": "indiana" },
  { "id": "frusta_a_scorpione", "name": "Frusta a scorpione", "nameEn": "Scorpion whip", "family": "marziale", "category": "Altre armi da mischia a 1 mano", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Tagliente", "props": "Accurata, Portata", "weight": 1.4, "cost": 5, "range": null, "ranged": false, "source": "PF" },
  { "id": "frusta_a_nove_sezioni", "name": "Frusta a nove sezioni", "nameEn": "Nine-section whip", "family": "marziale", "category": "Altre armi da mischia a 1 mano", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Contundente", "props": "Speciale (sgambetto)", "weight": 1.4, "cost": 8, "range": null, "ranged": false, "source": "orientale" },
  { "id": "catena_chiodata", "name": "Catena chiodata", "nameEn": "Spiked chain", "family": "marziale", "category": "Altre armi da mischia a 1 mano", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Perforante", "props": "Portata, Speciale (sgambetto/disarmo)", "weight": 4.5, "cost": 25, "range": null, "ranged": false, "source": "3.5e" },
  { "id": "martello_uncinato_gnomico", "name": "Martello uncinato gnomico", "nameEn": "Gnome hooked hammer", "family": "marziale", "category": "Altre armi da mischia a 1 mano", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Contundente/Perforante", "props": "Versatile, Speciale (doppia)", "weight": 2.7, "cost": 20, "range": null, "ranged": false, "source": "3.5e" },
  { "id": "klar", "name": "Klar", "nameEn": "Klar", "family": "marziale", "category": "Altre armi da mischia a 1 mano", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Tagliente", "props": "Speciale (funge anche da scudo: +1 CA)", "weight": 1.8, "cost": 12, "range": null, "ranged": false, "source": "PF" },
  { "id": "madu", "name": "Madu", "nameEn": "Madu", "family": "marziale", "category": "Altre armi da mischia a 1 mano", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Perforante", "props": "Speciale (funge anche da scudo: +1 CA)", "weight": 1.8, "cost": 10, "range": null, "ranged": false, "source": "indiana" },
  { "id": "terbutje", "name": "Terbutje", "nameEn": "Terbutje", "family": "marziale", "category": "Altre armi da mischia a 1 mano", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Tagliente", "props": "Fragile", "weight": 1.4, "cost": 5, "range": null, "ranged": false, "source": "PF" },
  { "id": "tabar", "name": "Tabar", "nameEn": "Tabar", "family": "marziale", "category": "Altre armi da mischia a 1 mano", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Tagliente", "props": "", "weight": 1.8, "cost": 10, "range": null, "ranged": false, "source": "indiana" },
  { "id": "uncino_da_guerra", "name": "Uncino da guerra", "nameEn": "War hook", "family": "marziale", "category": "Altre armi da mischia a 1 mano", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Perforante", "props": "Vantaggio a Disarmare", "weight": 1.4, "cost": 6, "range": null, "ranged": false, "source": "storica" },
  { "id": "ascia_barbuta", "name": "Ascia barbuta", "nameEn": "Bearded axe", "family": "marziale", "category": "Altre armi da mischia a 1 mano", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Tagliente", "props": "Può agganciare scudi (vantaggio a Disarmare scudi)", "weight": 1.9, "cost": 14, "range": null, "ranged": false, "source": "storica" },
  { "id": "lancia", "name": "Lancia", "nameEn": "Spear", "family": "semplice", "category": "Armi con Asta", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Perforante", "props": "Lancio (6/18), Versatile (1d8)", "weight": 1.5, "cost": 1, "range": null, "ranged": false, "source": "PHB" },
  { "id": "bastone_ferrato", "name": "Bastone ferrato", "nameEn": "Quarterstaff", "family": "semplice", "category": "Armi con Asta", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Contundente", "props": "Versatile (1d8)", "weight": 2, "cost": 0.2, "range": null, "ranged": false, "source": "PHB" },
  { "id": "tridente", "name": "Tridente", "nameEn": "Trident", "family": "marziale", "category": "Armi con Asta", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Perforante", "props": "Lancio (6/18), Versatile (1d8)", "weight": 2, "cost": 5, "range": null, "ranged": false, "source": "PHB" },
  { "id": "lancia_lunga", "name": "Lancia lunga", "nameEn": "Longspear", "family": "marziale", "category": "Armi con Asta", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Perforante", "props": "Portata, 2 mani", "weight": 2.7, "cost": 5, "range": null, "ranged": false, "source": "3.5e" },
  { "id": "picca", "name": "Picca", "nameEn": "Pike", "family": "marziale", "category": "Armi con Asta", "dmg5e": "1d10", "dmg": "1d10", "dmgType": "Perforante", "props": "Pesante, Portata, 2 mani", "weight": 9, "cost": 5, "range": null, "ranged": false, "source": "PHB" },
  { "id": "lancia_da_cavaliere", "name": "Lancia da cavaliere", "nameEn": "Lance", "family": "marziale", "category": "Armi con Asta", "dmg5e": "1d12", "dmg": "1d12", "dmgType": "Perforante", "props": "Portata, svantaggio entro 1,5m, 2 mani se non a cavallo", "weight": 3, "cost": 10, "range": null, "ranged": false, "source": "PHB" },
  { "id": "yklwa", "name": "Yklwa", "nameEn": "Yklwa", "family": "semplice", "category": "Armi con Asta", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Perforante", "props": "Lancio (3/9)", "weight": 1.4, "cost": 1, "range": null, "ranged": false, "source": "ToA" },
  { "id": "alabarda", "name": "Alabarda", "nameEn": "Halberd", "family": "marziale", "category": "Armi con Asta", "dmg5e": "1d10", "dmg": "1d10", "dmgType": "Tagliente", "props": "Pesante, Portata, 2 mani", "weight": 3, "cost": 20, "range": null, "ranged": false, "source": "PHB" },
  { "id": "falcione", "name": "Falcione", "nameEn": "Glaive", "family": "marziale", "category": "Armi con Asta", "dmg5e": "1d10", "dmg": "1d10", "dmgType": "Tagliente", "props": "Pesante, Portata, 2 mani", "weight": 3, "cost": 20, "range": null, "ranged": false, "source": "PHB" },
  { "id": "bardiche", "name": "Bardiche", "nameEn": "Bardiche", "family": "marziale", "category": "Armi con Asta", "dmg5e": "1d10", "dmg": "1d10", "dmgType": "Tagliente", "props": "Portata, 2 mani", "weight": 6.3, "cost": 13, "range": null, "ranged": false, "source": "PF" },
  { "id": "guisarma", "name": "Guisarma", "nameEn": "Guisarme", "family": "marziale", "category": "Armi con Asta", "dmg5e": "1d10", "dmg": "1d10", "dmgType": "Tagliente", "props": "Portata, 2 mani, Speciale (sgambetto)", "weight": 2.7, "cost": 9, "range": null, "ranged": false, "source": "AD&D" },
  { "id": "voulge", "name": "Voulge", "nameEn": "Voulge", "family": "marziale", "category": "Armi con Asta", "dmg5e": "1d10", "dmg": "1d10", "dmgType": "Tagliente", "props": "Pesante, Portata, 2 mani", "weight": 5.5, "cost": 8, "range": null, "ranged": false, "source": "AD&D" },
  { "id": "corsesca", "name": "Corsesca", "nameEn": "Ranseur", "family": "marziale", "category": "Armi con Asta", "dmg5e": "1d10", "dmg": "1d10", "dmgType": "Perforante", "props": "Portata, 2 mani, vantaggio a Disarmare", "weight": 5.5, "cost": 10, "range": null, "ranged": false, "source": "AD&D" },
  { "id": "spetum", "name": "Spetum", "nameEn": "Spetum", "family": "marziale", "category": "Armi con Asta", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Perforante", "props": "Portata, 2 mani", "weight": 2.7, "cost": 8, "range": null, "ranged": false, "source": "AD&D" },
  { "id": "partigiana", "name": "Partigiana", "nameEn": "Partisan", "family": "marziale", "category": "Armi con Asta", "dmg5e": "1d10", "dmg": "1d10", "dmgType": "Perforante", "props": "Portata, 2 mani", "weight": 3.6, "cost": 10, "range": null, "ranged": false, "source": "AD&D" },
  { "id": "fauchard", "name": "Fauchard", "nameEn": "Fauchard", "family": "marziale", "category": "Armi con Asta", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Tagliente", "props": "Portata, 2 mani", "weight": 2.7, "cost": 7, "range": null, "ranged": false, "source": "AD&D" },
  { "id": "roncone", "name": "Roncone", "nameEn": "Bill-guisarme", "family": "marziale", "category": "Armi con Asta", "dmg5e": "1d10", "dmg": "1d10", "dmgType": "Perforante/Tagliente", "props": "Portata, 2 mani", "weight": 6.8, "cost": 7, "range": null, "ranged": false, "source": "AD&D" },
  { "id": "becco_di_corvo", "name": "Becco di corvo", "nameEn": "Bec de corbin", "family": "marziale", "category": "Armi con Asta", "dmg5e": "1d10", "dmg": "1d10", "dmgType": "Perforante/Contundente", "props": "Pesante, Portata, 2 mani", "weight": 4.5, "cost": 8, "range": null, "ranged": false, "source": "AD&D" },
  { "id": "martello_di_lucerna", "name": "Martello di Lucerna", "nameEn": "Lucerne hammer", "family": "marziale", "category": "Armi con Asta", "dmg5e": "1d12", "dmg": "1d12", "dmgType": "Contundente", "props": "Pesante, Portata, 2 mani", "weight": 5.5, "cost": 15, "range": null, "ranged": false, "source": "AD&D" },
  { "id": "falcione_guisarma", "name": "Falcione-guisarma", "nameEn": "Glaive-guisarme", "family": "marziale", "category": "Armi con Asta", "dmg5e": "1d10", "dmg": "1d10", "dmgType": "Tagliente", "props": "Pesante, Portata, 2 mani, Speciale (sgambetto)", "weight": 4.5, "cost": 10, "range": null, "ranged": false, "source": "AD&D" },
  { "id": "forca_militare", "name": "Forca militare", "nameEn": "Military fork", "family": "marziale", "category": "Armi con Asta", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Perforante", "props": "Portata, 2 mani", "weight": 3.6, "cost": 5, "range": null, "ranged": false, "source": "AD&D" },
  { "id": "picca_lunga", "name": "Picca lunga", "nameEn": "Awl pike", "family": "marziale", "category": "Armi con Asta", "dmg5e": "1d10", "dmg": "1d10", "dmgType": "Perforante", "props": "Pesante, Portata, 2 mani", "weight": 5.5, "cost": 5, "range": null, "ranged": false, "source": "AD&D" },
  { "id": "naginata", "name": "Naginata", "nameEn": "Naginata", "family": "marziale", "category": "Armi con Asta", "dmg5e": "1d10", "dmg": "1d10", "dmgType": "Tagliente", "props": "Portata, 2 mani", "weight": 2.7, "cost": 25, "range": null, "ranged": false, "source": "orientale" },
  { "id": "guandao", "name": "Guandao", "nameEn": "Guandao", "family": "marziale", "category": "Armi con Asta", "dmg5e": "1d10", "dmg": "1d10", "dmgType": "Tagliente", "props": "Pesante, Portata, 2 mani", "weight": 3.6, "cost": 25, "range": null, "ranged": false, "source": "orientale" },
  { "id": "vanga_del_monaco", "name": "Vanga del monaco", "nameEn": "Monk's spade", "family": "marziale", "category": "Armi con Asta", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Tagliente/Perforante", "props": "2 mani, Speciale (doppia)", "weight": 1.4, "cost": 3, "range": null, "ranged": false, "source": "orientale" },
  { "id": "urgrosh_nanico", "name": "Urgrosh nanico", "nameEn": "Dwarven urgrosh", "family": "marziale", "category": "Armi con Asta", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Tagliente/Perforante", "props": "Versatile, Speciale (doppia)", "weight": 5.5, "cost": 50, "range": null, "ranged": false, "source": "3.5e" },
  { "id": "sasumata", "name": "Sasumata", "nameEn": "Sasumata", "family": "marziale", "category": "Armi con Asta", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Perforante", "props": "Portata, 2 mani, Speciale (afferrare)", "weight": 2.7, "cost": 10, "range": null, "ranged": false, "source": "orientale" },
  { "id": "trishula", "name": "Trishula", "nameEn": "Trishula", "family": "marziale", "category": "Armi con Asta", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Perforante", "props": "Versatile (1d10)", "weight": 1.8, "cost": 15, "range": null, "ranged": false, "source": "indiana" },
  { "id": "brandistocco", "name": "Brandistocco", "nameEn": "Brandistock", "family": "semplice", "category": "Armi con Asta", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Perforante", "props": "2 mani, occultabile (punta retrattile)", "weight": 1.8, "cost": 10, "range": null, "ranged": false, "source": "storica" },
  { "id": "assegai", "name": "Assegai", "nameEn": "Assegai", "family": "marziale", "category": "Armi con Asta", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Perforante/Tagliente", "props": "Lancio (3/9), Versatile (1d10)", "weight": 0.9, "cost": 2, "range": null, "ranged": false, "source": "africana" },
  { "id": "bo", "name": "Bo", "nameEn": "Bo", "family": "semplice", "category": "Armi con Asta", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Contundente", "props": "Versatile (1d8)", "weight": 1.8, "cost": 0.1, "range": null, "ranged": false, "source": "orientale" },
  { "id": "sarissa", "name": "Sarissa", "nameEn": "Sarissa", "family": "marziale", "category": "Armi con Asta", "dmg5e": "1d10", "dmg": "1d10", "dmgType": "Perforante", "props": "Pesante, Portata (4,5m), 2 mani, svantaggio entro 3m", "weight": 5.5, "cost": 8, "range": null, "ranged": false, "source": "storica" },
  { "id": "falce_da_guerra", "name": "Falce da guerra", "nameEn": "War scythe", "family": "marziale", "category": "Armi con Asta", "dmg5e": "1d10", "dmg": "1d10", "dmgType": "Tagliente", "props": "Portata, 2 mani, Speciale (sgambetto)", "weight": 3.4, "cost": 18, "range": null, "ranged": false, "source": "storica" },
  { "id": "spiedo_da_guerra", "name": "Spiedo da guerra", "nameEn": "Boar spear", "family": "marziale", "category": "Armi con Asta", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Perforante", "props": "Versatile (1d10), danno raddoppiato vs creature in carica", "weight": 2.3, "cost": 9, "range": null, "ranged": false, "source": "storica" },
  { "id": "spadone", "name": "Spadone", "nameEn": "Greatsword", "family": "marziale", "category": "Armi a 2 mani", "dmg5e": "2d6", "dmg": "2d6", "dmgType": "Tagliente", "props": "Pesante, 2 mani", "weight": 3, "cost": 50, "range": null, "ranged": false, "source": "PHB" },
  { "id": "ascia_bipenne", "name": "Ascia bipenne", "nameEn": "Greataxe", "family": "marziale", "category": "Armi a 2 mani", "dmg5e": "1d12", "dmg": "1d12", "dmgType": "Tagliente", "props": "Pesante, 2 mani", "weight": 3.5, "cost": 30, "range": null, "ranged": false, "source": "PHB" },
  { "id": "maglio", "name": "Maglio", "nameEn": "Maul", "family": "marziale", "category": "Armi a 2 mani", "dmg5e": "2d6", "dmg": "2d6", "dmgType": "Contundente", "props": "Pesante, 2 mani", "weight": 5, "cost": 10, "range": null, "ranged": false, "source": "PHB" },
  { "id": "randellone", "name": "Randello pesante", "nameEn": "Greatclub", "family": "semplice", "category": "Armi a 2 mani", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Contundente", "props": "2 mani", "weight": 5, "cost": 0.2, "range": null, "ranged": false, "source": "PHB" },
  { "id": "scimitarra_a_doppia_lama", "name": "Scimitarra a doppia lama", "nameEn": "Double-bladed scimitar", "family": "marziale", "category": "Armi a 2 mani", "dmg5e": "2d4", "dmg": "2d4", "dmgType": "Tagliente", "props": "2 mani, attacco bonus da 1d4", "weight": 2.7, "cost": 100, "range": null, "ranged": false, "source": "Eberron" },
  { "id": "spada_a_due_lame", "name": "Spada a due lame", "nameEn": "Two-bladed sword", "family": "marziale", "category": "Armi a 2 mani", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Tagliente", "props": "2 mani, Speciale (doppia)", "weight": 4.5, "cost": 100, "range": null, "ranged": false, "source": "3.5e" },
  { "id": "ascia_doppia_orchesca", "name": "Ascia doppia orchesca", "nameEn": "Orc double axe", "family": "marziale", "category": "Armi a 2 mani", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Tagliente", "props": "2 mani, Speciale (doppia)", "weight": 6.8, "cost": 60, "range": null, "ranged": false, "source": "3.5e" },
  { "id": "mazzafrusto_orrendo", "name": "Mazzafrusto orrendo", "nameEn": "Dire flail", "family": "marziale", "category": "Armi a 2 mani", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Contundente", "props": "2 mani, Speciale (doppia), ignora il bonus CA degli scudi", "weight": 4.5, "cost": 90, "range": null, "ranged": false, "source": "3.5e" },
  { "id": "mazzafrusto_pesante", "name": "Mazzafrusto pesante", "nameEn": "Heavy flail", "family": "marziale", "category": "Armi a 2 mani", "dmg5e": "1d12", "dmg": "1d12", "dmgType": "Contundente", "props": "Pesante, 2 mani, ignora il bonus CA degli scudi", "weight": 4.6, "cost": 18, "range": null, "ranged": false, "source": "3.5e" },
  { "id": "claymore", "name": "Claymore", "nameEn": "Claymore", "family": "marziale", "category": "Armi a 2 mani", "dmg5e": "2d6", "dmg": "2d6", "dmgType": "Tagliente", "props": "Pesante, 2 mani", "weight": 3.2, "cost": 50, "range": null, "ranged": false, "source": "storica" },
  { "id": "zweihander", "name": "Zweihander", "nameEn": "Zweihänder", "family": "marziale", "category": "Armi a 2 mani", "dmg5e": "2d6", "dmg": "2d6", "dmgType": "Tagliente", "props": "Pesante, 2 mani", "weight": 3.2, "cost": 75, "range": null, "ranged": false, "source": "storica" },
  { "id": "flamberga", "name": "Flamberga", "nameEn": "Flamberge", "family": "marziale", "category": "Armi a 2 mani", "dmg5e": "2d6", "dmg": "2d6", "dmgType": "Tagliente", "props": "Pesante, 2 mani, ferite laceranti (+1 al danno vs non corazzati)", "weight": 3.1, "cost": 60, "range": null, "ranged": false, "source": "storica" },
  { "id": "nodachi", "name": "Nodachi", "nameEn": "Nodachi", "family": "marziale", "category": "Armi a 2 mani", "dmg5e": "1d12", "dmg": "1d12", "dmgType": "Tagliente", "props": "Pesante, 2 mani", "weight": 3.6, "cost": 60, "range": null, "ranged": false, "source": "orientale" },
  { "id": "lama_curva_elfica", "name": "Lama curva elfica", "nameEn": "Elven curve blade", "family": "marziale", "category": "Armi a 2 mani", "dmg5e": "1d10", "dmg": "1d10", "dmgType": "Tagliente", "props": "Accurata, Pesante, 2 mani", "weight": 3.2, "cost": 80, "range": null, "ranged": false, "source": "3.5e" },
  { "id": "falce", "name": "Falce", "nameEn": "Scythe", "family": "marziale", "category": "Armi a 2 mani", "dmg5e": "1d10", "dmg": "1d10", "dmgType": "Tagliente", "props": "2 mani, critico devastante (danni ×3 su critico)", "weight": 4, "cost": 8, "range": null, "ranged": false, "source": "3.5e" },
  { "id": "grande_falce_da_guerra", "name": "Grande falce da guerra", "nameEn": "Greatscythe", "family": "marziale", "category": "Armi a 2 mani", "dmg5e": "1d12", "dmg": "1d12", "dmgType": "Tagliente", "props": "Pesante, 2 mani", "weight": 4.5, "cost": 20, "range": null, "ranged": false, "source": "storica" },
  { "id": "maglio_frantumatore", "name": "Maglio frantumatore", "nameEn": "Earth breaker", "family": "marziale", "category": "Armi a 2 mani", "dmg5e": "2d6", "dmg": "2d6", "dmgType": "Contundente", "props": "Pesante, 2 mani", "weight": 6.3, "cost": 40, "range": null, "ranged": false, "source": "PF" },
  { "id": "tetsubo", "name": "Tetsubo", "nameEn": "Tetsubo (Kanabo)", "family": "marziale", "category": "Armi a 2 mani", "dmg5e": "1d12", "dmg": "1d12", "dmgType": "Contundente", "props": "Pesante, 2 mani", "weight": 4.5, "cost": 20, "range": null, "ranged": false, "source": "orientale" },
  { "id": "grande_martello", "name": "Grande martello", "nameEn": "Great hammer", "family": "marziale", "category": "Armi a 2 mani", "dmg5e": "1d12", "dmg": "1d12", "dmgType": "Contundente", "props": "Pesante, 2 mani", "weight": 5.5, "cost": 30, "range": null, "ranged": false, "source": "storica" },
  { "id": "ascia_da_macellaio", "name": "Ascia da macellaio", "nameEn": "Butchering axe", "family": "marziale", "category": "Armi a 2 mani", "dmg5e": "2d6", "dmg": "2d6", "dmgType": "Tagliente", "props": "Pesante, 2 mani", "weight": 11, "cost": 35, "range": null, "ranged": false, "source": "PF" },
  { "id": "spadone_massiccio", "name": "Spadone massiccio", "nameEn": "Fullblade", "family": "marziale", "category": "Armi a 2 mani", "dmg5e": "2d6", "dmg": "2d6", "dmgType": "Tagliente", "props": "Pesante, 2 mani, richiede For 15", "weight": 4.5, "cost": 100, "range": null, "ranged": false, "source": "3.5e" },
  { "id": "martello_meteora", "name": "Martello meteora", "nameEn": "Meteor hammer", "family": "marziale", "category": "Armi a 2 mani", "dmg5e": "1d10", "dmg": "1d10", "dmgType": "Contundente", "props": "Portata, 2 mani, Speciale (sgambetto)", "weight": 4.5, "cost": 20, "range": null, "ranged": false, "source": "orientale" },
  { "id": "bastone_a_tre_sezioni", "name": "Bastone a tre sezioni", "nameEn": "Three-section staff", "family": "marziale", "category": "Armi a 2 mani", "dmg5e": "1d10", "dmg": "1d10", "dmgType": "Contundente", "props": "2 mani", "weight": 1.8, "cost": 5, "range": null, "ranged": false, "source": "orientale" },
  { "id": "goedendag", "name": "Goedendag", "nameEn": "Goedendag", "family": "marziale", "category": "Armi a 2 mani", "dmg5e": "1d10", "dmg": "1d10", "dmgType": "Contundente/Perforante", "props": "Pesante, 2 mani", "weight": 3.2, "cost": 10, "range": null, "ranged": false, "source": "storica" },
  { "id": "mazza_enorme_chiodata", "name": "Mazza enorme chiodata", "nameEn": "Greatstar", "family": "marziale", "category": "Armi a 2 mani", "dmg5e": "1d12", "dmg": "1d12", "dmgType": "Perforante", "props": "Pesante, 2 mani", "weight": 4.5, "cost": 30, "range": null, "ranged": false, "source": "storica" },
  { "id": "giavellotto", "name": "Giavellotto", "nameEn": "Javelin", "family": "semplice", "category": "Armi da lancio", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Perforante", "props": "Lancio (9/36)", "weight": 1, "cost": 0.5, "range": "9/36", "ranged": true, "source": "PHB" },
  { "id": "dardo", "name": "Dardo", "nameEn": "Dart", "family": "semplice", "category": "Armi da lancio", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Perforante", "props": "Accurata, Lancio (6/18)", "weight": 0.1, "cost": 0.05, "range": "6/18", "ranged": true, "source": "PHB" },
  { "id": "ascia_da_lancio", "name": "Ascia da lancio", "nameEn": "Throwing axe", "family": "marziale", "category": "Armi da lancio", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Tagliente", "props": "Leggera, Lancio (6/18)", "weight": 0.9, "cost": 8, "range": "6/18", "ranged": true, "source": "PF" },
  { "id": "francisca", "name": "Francisca", "nameEn": "Francisca", "family": "marziale", "category": "Armi da lancio", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Tagliente", "props": "Lancio (6/18)", "weight": 1.2, "cost": 6, "range": "6/18", "ranged": true, "source": "storica" },
  { "id": "chakram", "name": "Chakram", "nameEn": "Chakram", "family": "marziale", "category": "Armi da lancio", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Tagliente", "props": "Lancio (9/36)", "weight": 0.5, "cost": 1, "range": "9/36", "ranged": true, "source": "PF" },
  { "id": "shuriken", "name": "Shuriken", "nameEn": "Shuriken", "family": "marziale", "category": "Armi da lancio", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Perforante", "props": "Leggera, Accurata, Lancio (6/18)", "weight": 0.1, "cost": 1, "range": "6/18", "ranged": true, "source": "orientale" },
  { "id": "hunga_munga", "name": "Hunga munga", "nameEn": "Hunga munga", "family": "marziale", "category": "Armi da lancio", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Perforante", "props": "Lancio (6/18)", "weight": 0.9, "cost": 5, "range": "6/18", "ranged": true, "source": "africana" },
  { "id": "kpinga", "name": "Kpinga", "nameEn": "Kpinga", "family": "marziale", "category": "Armi da lancio", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Tagliente", "props": "Lancio (6/18)", "weight": 1.4, "cost": 8, "range": "6/18", "ranged": true, "source": "africana" },
  { "id": "boomerang", "name": "Boomerang", "nameEn": "Boomerang", "family": "semplice", "category": "Armi da lancio", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Contundente", "props": "Lancio (12/36), torna al lanciatore se manca", "weight": 0.4, "cost": 3, "range": "12/36", "ranged": true, "source": "PF" },
  { "id": "pilum", "name": "Pilum", "nameEn": "Pilum", "family": "marziale", "category": "Armi da lancio", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Perforante", "props": "Lancio (9/27), si pianta nello scudo: il bersaglio perde il bonus scudo finché non lo rimuove", "weight": 1.1, "cost": 4, "range": "9/27", "ranged": true, "source": "storica" },
  { "id": "arpione", "name": "Arpione", "nameEn": "Harpoon", "family": "marziale", "category": "Armi da lancio", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Perforante", "props": "Lancio (6/18), Speciale (afferrare)", "weight": 2.7, "cost": 5, "range": "6/18", "ranged": true, "source": "PF" },
  { "id": "bolas", "name": "Bolas", "nameEn": "Bolas", "family": "marziale", "category": "Armi da lancio", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Contundente", "props": "Lancio (6/18), TS Des o bersaglio intralciato", "weight": 0.9, "cost": 5, "range": "6/18", "ranged": true, "source": "PF" },
  { "id": "rete", "name": "Rete", "nameEn": "Net", "family": "marziale", "category": "Armi da lancio", "dmg5e": "0", "dmg": "0", "dmgType": "—", "props": "Lancio (1,5/4,5), Speciale (intralcia)", "weight": 1.5, "cost": 1, "range": "1,5/4,5", "ranged": true, "source": "PHB" },
  { "id": "coltello_da_lancio", "name": "Coltello da lancio", "nameEn": "Throwing knife", "family": "semplice", "category": "Armi da lancio", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Perforante", "props": "Leggera, Accurata, Lancio (6/18)", "weight": 0.3, "cost": 1, "range": "6/18", "ranged": true, "source": "storica" },
  { "id": "chatkcha", "name": "Chatkcha", "nameEn": "Chatkcha", "family": "marziale", "category": "Armi da lancio", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Tagliente", "props": "Lancio (6/18), torna al lanciatore se manca", "weight": 0.2, "cost": 1, "range": "6/18", "ranged": true, "source": "Dark Sun" },
  { "id": "lancia_corta", "name": "Lancia corta", "nameEn": "Shortspear", "family": "semplice", "category": "Armi da lancio", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Perforante", "props": "Lancio (6/18)", "weight": 1.4, "cost": 1, "range": "6/18", "ranged": true, "source": "PF" },
  { "id": "mambele", "name": "Mambele", "nameEn": "Mambele", "family": "marziale", "category": "Armi da lancio", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Tagliente", "props": "Lancio (6/18)", "weight": 0.9, "cost": 8, "range": "6/18", "ranged": true, "source": "africana" },
  { "id": "chakram_tamchal", "name": "Chakram tamchal", "nameEn": "Tamchal chakram", "family": "marziale", "category": "Armi da lancio", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Tagliente", "props": "Leggera, Lancio (6/18)", "weight": 0.5, "cost": 5, "range": "6/18", "ranged": true, "source": "PF" },
  { "id": "stella_fuma", "name": "Stella fuma", "nameEn": "Fuma shuriken", "family": "marziale", "category": "Armi da lancio", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Tagliente", "props": "Lancio (6/18)", "weight": 0.9, "cost": 10, "range": "6/18", "ranged": true, "source": "orientale" },
  { "id": "arco_corto", "name": "Arco corto", "nameEn": "Shortbow", "family": "semplice", "category": "Archi", "dmg5e": "1d6", "dmg": "1d8", "dmgType": "Perforante", "props": "Munizioni, 2 mani", "weight": 1, "cost": 25, "range": "24/96", "ranged": true, "source": "PHB" },
  { "id": "arco_lungo", "name": "Arco lungo", "nameEn": "Longbow", "family": "marziale", "category": "Archi", "dmg5e": "1d8", "dmg": "1d10", "dmgType": "Perforante", "props": "Munizioni, Pesante, 2 mani", "weight": 1, "cost": 50, "range": "45/180", "ranged": true, "source": "PHB" },
  { "id": "arco_corto_composito", "name": "Arco corto composito", "nameEn": "Composite shortbow", "family": "marziale", "category": "Archi", "dmg5e": "1d6", "dmg": "1d8", "dmgType": "Perforante", "props": "Munizioni, 2 mani, aggiunge il mod For al danno (max +2)", "weight": 0.9, "cost": 75, "range": "21/84", "ranged": true, "source": "3.5e" },
  { "id": "arco_lungo_composito", "name": "Arco lungo composito", "nameEn": "Composite longbow", "family": "marziale", "category": "Archi", "dmg5e": "1d8", "dmg": "1d10", "dmgType": "Perforante", "props": "Munizioni, 2 mani, aggiunge il mod For al danno (max +2)", "weight": 1.4, "cost": 100, "range": "33/132", "ranged": true, "source": "3.5e" },
  { "id": "arco_da_guerra", "name": "Arco da guerra", "nameEn": "Warbow (Daikyu)", "family": "marziale", "category": "Archi", "dmg5e": "1d8", "dmg": "1d10", "dmgType": "Perforante", "props": "Munizioni, Pesante, 2 mani, richiede For 15", "weight": 1.4, "cost": 100, "range": "45/180", "ranged": true, "source": "orientale" },
  { "id": "arco_elfico", "name": "Arco elfico", "nameEn": "Elven bow", "family": "marziale", "category": "Archi", "dmg5e": "1d6", "dmg": "1d8", "dmgType": "Perforante", "props": "Munizioni, 2 mani", "weight": 1.4, "cost": 150, "range": "33/132", "ranged": true, "source": "AD&D" },
  { "id": "arco_corno_orchesco", "name": "Arco-corno orchesco", "nameEn": "Orc hornbow", "family": "marziale", "category": "Archi", "dmg5e": "1d8", "dmg": "1d10", "dmgType": "Perforante", "props": "Munizioni, Pesante, 2 mani", "weight": 2.7, "cost": 130, "range": "24/96", "ranged": true, "source": "PF" },
  { "id": "arco_di_spine", "name": "Arco di spine", "nameEn": "Thorn bow", "family": "marziale", "category": "Archi", "dmg5e": "1d6", "dmg": "1d8", "dmgType": "Perforante", "props": "Munizioni, 2 mani", "weight": 1.4, "cost": 75, "range": "24/96", "ranged": true, "source": "PF" },
  { "id": "arco_lungo_kenyota", "name": "Arco lungo kenyota", "nameEn": "Kenyan longbow", "family": "marziale", "category": "Archi", "dmg5e": "1d8", "dmg": "1d10", "dmgType": "Perforante", "props": "Munizioni, Pesante, 2 mani", "weight": 1.8, "cost": 60, "range": "45/180", "ranged": true, "source": "africana" },
  { "id": "arco_corto_pieghevole", "name": "Arco corto pieghevole", "nameEn": "Folding bow", "family": "marziale", "category": "Archi", "dmg5e": "1d6", "dmg": "1d8", "dmgType": "Perforante", "props": "Munizioni, 2 mani, occultabile", "weight": 0.9, "cost": 45, "range": "24/96", "ranged": true, "source": "AD&D" },
  { "id": "balestra_leggera", "name": "Balestra leggera", "nameEn": "Light crossbow", "family": "semplice", "category": "Balestre", "dmg5e": "1d8", "dmg": "1d10", "dmgType": "Perforante", "props": "Munizioni, Ricarica, 2 mani", "weight": 2.5, "cost": 25, "range": "24/96", "ranged": true, "source": "PHB" },
  { "id": "balestra_pesante", "name": "Balestra pesante", "nameEn": "Heavy crossbow", "family": "marziale", "category": "Balestre", "dmg5e": "1d10", "dmg": "1d12", "dmgType": "Perforante", "props": "Munizioni, Pesante, Ricarica, 2 mani", "weight": 9, "cost": 50, "range": "30/120", "ranged": true, "source": "PHB" },
  { "id": "balestra_a_mano", "name": "Balestra a mano", "nameEn": "Hand crossbow", "family": "marziale", "category": "Balestre", "dmg5e": "1d6", "dmg": "1d8", "dmgType": "Perforante", "props": "Munizioni, Leggera, Ricarica", "weight": 1.5, "cost": 75, "range": "9/36", "ranged": true, "source": "PHB" },
  { "id": "balestra_ripetente_leggera", "name": "Balestra ripetente leggera", "nameEn": "Repeating light crossbow", "family": "marziale", "category": "Balestre", "dmg5e": "1d8", "dmg": "1d10", "dmgType": "Perforante", "props": "Munizioni, 2 mani, caricatore da 5 (niente Ricarica fino a esaurimento)", "weight": 2.7, "cost": 250, "range": "24/96", "ranged": true, "source": "3.5e" },
  { "id": "balestra_ripetente_pesante", "name": "Balestra ripetente pesante", "nameEn": "Repeating heavy crossbow", "family": "marziale", "category": "Balestre", "dmg5e": "1d10", "dmg": "1d12", "dmgType": "Perforante", "props": "Munizioni, Pesante, 2 mani, caricatore da 5 (niente Ricarica fino a esaurimento)", "weight": 5.5, "cost": 400, "range": "36/144", "ranged": true, "source": "3.5e" },
  { "id": "balestra_doppia", "name": "Balestra doppia", "nameEn": "Double crossbow", "family": "marziale", "category": "Balestre", "dmg5e": "1d8", "dmg": "1d10", "dmgType": "Perforante", "props": "Munizioni, Pesante, Ricarica, 2 mani, 2 dardi per attacco (2° dardo a svantaggio)", "weight": 8.2, "cost": 300, "range": "24/96", "ranged": true, "source": "PF" },
  { "id": "balestra_a_manovella", "name": "Balestra a manovella", "nameEn": "Crank crossbow", "family": "marziale", "category": "Balestre", "dmg5e": "1d10", "dmg": "1d12", "dmgType": "Perforante", "props": "Munizioni, Pesante, Ricarica, 2 mani", "weight": 5.5, "cost": 400, "range": "36/144", "ranged": true, "source": "PF" },
  { "id": "gastrafete", "name": "Gastrafete", "nameEn": "Gastraphetes", "family": "marziale", "category": "Balestre", "dmg5e": "1d10", "dmg": "1d12", "dmgType": "Perforante", "props": "Munizioni, Pesante, Ricarica, 2 mani", "weight": 8.2, "cost": 100, "range": "30/120", "ranged": true, "source": "storica" },
  { "id": "balestra_da_caccia", "name": "Balestra da caccia", "nameEn": "Hunting crossbow", "family": "semplice", "category": "Balestre", "dmg5e": "1d8", "dmg": "1d10", "dmgType": "Perforante", "props": "Munizioni, Ricarica, 2 mani, +1 al colpire entro 18m", "weight": 2.8, "cost": 60, "range": "27/108", "ranged": true, "source": "storica" },
  { "id": "fionda", "name": "Fionda", "nameEn": "Sling", "family": "semplice", "category": "Altre Armi da tiro", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Contundente", "props": "Munizioni", "weight": 0, "cost": 0.1, "range": "9/36", "ranged": true, "source": "PHB" },
  { "id": "fionda_ad_asta", "name": "Fionda ad asta", "nameEn": "Sling staff", "family": "marziale", "category": "Altre Armi da tiro", "dmg5e": "1d8", "dmg": "1d8", "dmgType": "Contundente", "props": "Munizioni, 2 mani", "weight": 1.4, "cost": 20, "range": "24/96", "ranged": true, "source": "3.5e" },
  { "id": "cerbottana", "name": "Cerbottana", "nameEn": "Blowgun", "family": "marziale", "category": "Altre Armi da tiro", "dmg5e": "1", "dmg": "1", "dmgType": "Perforante", "props": "Munizioni, Ricarica", "weight": 0.5, "cost": 10, "range": "7,5/30", "ranged": true, "source": "PHB" },
  { "id": "atlatl", "name": "Atlatl", "nameEn": "Atlatl", "family": "semplice", "category": "Altre Armi da tiro", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Perforante", "props": "Munizioni (giavellotti corti), gittata estesa", "weight": 0.9, "cost": 2, "range": "15/60", "ranged": true, "source": "PF" },
  { "id": "fionda_da_guerra", "name": "Fionda da guerra", "nameEn": "War sling", "family": "semplice", "category": "Altre Armi da tiro", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Contundente", "props": "Munizioni, proiettili di piombo", "weight": 0.2, "cost": 1, "range": "12/48", "ranged": true, "source": "storica" },
  { "id": "hoopak", "name": "Hoopak", "nameEn": "Hoopak", "family": "marziale", "category": "Altre Armi da tiro", "dmg5e": "1d4", "dmg": "1d4", "dmgType": "Contundente", "props": "Munizioni, Accurata, 2 mani, in mischia infligge 1d6 perforante", "weight": 0.9, "cost": 1, "range": "12/48", "ranged": true, "source": "Dragonlance" },
  { "id": "kestros", "name": "Kestros", "nameEn": "Kestros", "family": "marziale", "category": "Altre Armi da tiro", "dmg5e": "1d6", "dmg": "1d6", "dmgType": "Perforante", "props": "Munizioni, dardi speciali", "weight": 0.9, "cost": 1, "range": "15/60", "ranged": true, "source": "storica" },
  { "id": "pistola", "name": "Pistola", "nameEn": "Pistol", "family": "marziale", "category": "Altre Armi da tiro", "dmg5e": "1d10", "dmg": "1d10", "dmgType": "Perforante", "props": "Munizioni, Ricarica", "weight": 1.4, "cost": 250, "range": "9/27", "ranged": true, "source": "DMG", "optional": true },
  { "id": "moschetto", "name": "Moschetto", "nameEn": "Musket", "family": "marziale", "category": "Altre Armi da tiro", "dmg5e": "1d12", "dmg": "1d12", "dmgType": "Perforante", "props": "Munizioni, Ricarica, 2 mani", "weight": 4.5, "cost": 500, "range": "12/36", "ranged": true, "source": "DMG", "optional": true },
  { "id": "archibugio", "name": "Archibugio", "nameEn": "Arquebus", "family": "marziale", "category": "Altre Armi da tiro", "dmg5e": "1d12", "dmg": "1d12", "dmgType": "Perforante", "props": "Munizioni, Ricarica, 2 mani, appoggio consigliato", "weight": 5.5, "cost": 400, "range": "12/36", "ranged": true, "source": "storica", "optional": true },
  { "id": "trombone", "name": "Trombone", "nameEn": "Blunderbuss", "family": "marziale", "category": "Altre Armi da tiro", "dmg5e": "2d6", "dmg": "2d6", "dmgType": "Perforante", "props": "Munizioni, Ricarica, 2 mani, rosa di pallini (svantaggio oltre gittata corta)", "weight": 4.5, "cost": 300, "range": "6/18", "ranged": true, "source": "storica", "optional": true }
];
const WEAPON_CATS=["Coltelli e Pugnali","Spade","Armi da impatto a 1 mano","Altre armi da mischia a 1 mano","Armi con Asta","Armi a 2 mani","Armi da lancio","Archi","Balestre","Altre Armi da tiro"];

// ── Proprietà armi speciali/magiche ──
const PHYS_DMG_TYPES = ["Contundente", "Perforante", "Tagliente"];
const ELEM_DMG_TYPES = ["Fuoco", "Freddo", "Fulmine", "Acido", "Veleno", "Necrotico", "Radioso", "Psichico", "Forza", "Tuono"];
const ALL_DMG_TYPES=PHYS_DMG_TYPES.concat(ELEM_DMG_TYPES);
const CREATURE_TYPES=["Aberrazione","Bestia","Celestiale","Costrutto","Drago","Elementale","Folletto","Immondo","Gigante","Umanoide","Mostruosità","Melma","Pianta","Non morto"];
const DMG_CONDITIONS=[{id:"always",label:"Sempre"},{id:"vsType",label:"Contro tipo"},{id:"onCrit",label:"Su critico"},{id:"onNat20",label:"Su 20 nat."}];
const DICE_OPTIONS=["1d4","1d6","1d8","1d10","1d12","2d6","2d8","2d10","3d6"];
const RARITIES=[{id:"comune",label:"Comune",gp:100,color:"#9a9a9a"},{id:"nonComune",label:"Non comune",gp:400,color:"#4a9a4a"},{id:"raro",label:"Raro",gp:4000,color:"#4a7ad4"},{id:"moltoRaro",label:"Molto raro",gp:40000,color:"#a04ad4"},{id:"leggendario",label:"Leggendario",gp:200000,color:"#d4a020"},{id:"artefatto",label:"Artefatto",gp:0,color:"#d44a4a"}];
const ARMA_CODE_PREFIX="ARMA1§";

// ── Manovre di combattimento: metadati + descrizioni (dal manuale) ──
// type: attacco (attacco con punteggio dedicato o arma-3) | bonus | reazione | rinuncia | situazionale
// roll: true se ha senso un tiro per colpire con il punteggio della manovra
const MANEUVERS_INFO = {
  "Attacco di Manovra": { type:"attacco", roll:true, desc:"Effettui un attacco con il punteggio di attacco di manovra (o dell'arma −3 nel caso sia inferiore). Permetti a un tuo alleato di muoversi di metà velocità senza provocare attacchi di opportunità." },
  "Attacco Disarmante": { type:"attacco", roll:true, desc:"Effettui un attacco con il punteggio di attacco disarmante (o dell'arma −3 nel caso sia inferiore). Il bersaglio deve superare un tiro salvezza su Forza o lascia cadere un oggetto che impugna." },
  "Attacco Minaccioso": { type:"attacco", roll:true, desc:"Effettui un attacco con il punteggio di Attacco Minaccioso (o dell'arma −3 nel caso sia inferiore). Il bersaglio deve superare un tiro salvezza su Saggezza o è spaventato fino alla fine del tuo prossimo turno." },
  "Attacco Preciso": { type:"rinuncia", roll:false, desc:"Rinunci ad azione e azione bonus per effettuare nel turno successivo un attacco preciso, che aggiunge il punteggio della competenza al tiro per colpire successivo. Il maestro di battaglia può aggiungere i dadi di superiorità al danno." },
  "Attacco Provocatorio": { type:"attacco", roll:true, desc:"Effettui un attacco con il punteggio di attacco provocatorio (o dell'arma −3 nel caso sia inferiore). Se il nemico fallisce il TS su Saggezza, ha svantaggio ad attaccare chiunque tranne te." },
  "Attacco Repulsivo": { type:"attacco", roll:true, desc:"Effettui un attacco con il punteggio di attacco repulsivo (o dell'arma −3 nel caso sia inferiore). Il nemico deve fare un tiro salvezza su Forza o viene spinto indietro di 4,5 m." },
  "Attacco Sbilanciante": { type:"attacco", roll:true, desc:"Effettui un attacco con il punteggio di attacco sbilanciante (o dell'arma −3 nel caso sia inferiore). Il nemico deve fare un tiro salvezza su Forza o cade prono." },
  "Attacco Spazzante": { type:"attacco", roll:true, desc:"Effettui un attacco con il punteggio di attacco spazzante (o dell'arma −3 nel caso sia inferiore). Se c'è un altro nemico entro 1,5 metri dal tuo avversario, infliggi danni anche all'altro nemico (se lo stesso tiro d'attacco l'avrebbe colpito)." },
  "Colpo Affondo": { type:"attacco", roll:true, desc:"Effettui un attacco con il punteggio di Colpo Affondo (o dell'arma −3 nel caso sia inferiore). Aggiunge al danno 2 danni, più 1 danno da sanguinamento fino a che il soggetto non viene curato. Il maestro di battaglia può aggiungere il dado di vantaggio: aggiunge la metà del risultato (arrotondata per difetto) al danno, e un ulteriore danno da sanguinamento." },
  "Colpo del Comandante": { type:"bonus", roll:false, desc:"Rinunci a un tuo attacco e usi un'azione bonus per ordinare a un alleato di attaccare. L'alleato usa la sua reazione per attaccare e aggiunge il tuo punteggio di competenza ai danni (più il dado di superiorità nel caso del maestro di battaglia che decide di impiegarlo)." },
  "Colpo Distrattore": { type:"attacco", roll:true, desc:"Effettui un attacco con il punteggio di colpo distrattore (o dell'arma −3 nel caso sia inferiore). Il prossimo attacco di un tuo alleato contro quella creatura ottiene vantaggio." },
  "Combattimento a 2 armi": { type:"situazionale", roll:false, desc:"Il punteggio della skill è da considerarsi come cap per entrambe le armi quando combatti con un'arma in ogni mano. (Vedi il toggle \"Un'arma in ogni mano\" nel sottotab Armi.)" },
  "Combattimento a cavallo": { type:"situazionale", roll:false, desc:"Combatti efficacemente da cavalcatura. Se si tratta di una cavalcatura esotica che non conosci, hai −3 il primo mese, −2 il secondo, −1 il terzo." },
  "Combattimento alla cieca": { type:"situazionale", roll:true, desc:"In condizioni in cui non puoi vedere, puoi attaccare avversari entro 3 metri da te. Il punteggio di attacco è pari al punteggio di Combattimento alla cieca −3 (o dell'arma −6 nel caso sia inferiore). Usando questo tipo di attacco non hai svantaggio. Il maestro di battaglia può usare il dado di combattimento: in tal caso il bonus per colpire viene aumentato del punteggio del dado." },
  "Contrattacco": { type:"reazione", roll:true, desc:"Quando una creatura manca un attacco corpo a corpo contro di te mancando per più di 6 punti, puoi usare la tua reazione per contrattaccare. Effettui un attacco con il punteggio di contrattacco (o dell'arma −3 nel caso sia inferiore). Il maestro di battaglia può spendere un dado di combattimento: se lo usa può contrattaccare contro qualsiasi attacco andato a vuoto a prescindere dal distacco, e aggiunge il dado ai danni." },
  "Disimpegno": { type:"situazionale", roll:false, desc:"Ti disimpegni dalla mischia senza provocare attacchi di opportunità." },
  "Finta d'Attacco": { type:"bonus", roll:false, desc:"Azione bonus. Effettui una finta per ottenere vantaggio all'attacco successivo. Se reiterato contro la stessa creatura, hai −2 per ogni tentativo successivo." },
  "Incitamento": { type:"rinuncia", roll:true, desc:"Rinunci ad attaccare per incitare gli alleati. Effettua una manovra di incitamento: se riesce, gli alleati avranno vantaggio fino alla fine del turno. Una volta per combattimento. Il maestro di battaglia può usare un dado di combattimento, dando anche +1 ai danni agli alleati con vantaggio per ogni punto del dado, da distribuire." },
  "Parata": { type:"rinuncia", roll:false, desc:"Rinunci ad attaccare per parare i colpi. Aggiungi il punteggio della skill alla tua CA contro gli avversari che ti attaccano corpo a corpo (non vale per attacchi di esseri molto più grandi). Devi suddividere il punteggio tra i vari avversari. Il maestro di battaglia può usare il dado di combattimento per aumentare i punti da distribuire." },
  "Passi Elusivi": { type:"bonus", roll:true, desc:"Quando ti muovi in combattimento, puoi usare un'azione bonus (effettua un tiro di competenza) per aumentare la CA di un punteggio pari alla competenza/2 (arrotonda per eccesso) contro tutti gli attacchi diretti. In caso di fallimento, gli attacchi contro di te hanno vantaggio. Il maestro di battaglia aggiunge, se lo usa, anche il dado di superiorità." },
  "Colpo di Scudo": { type:"bonus", roll:true, desc:"Azione bonus. Effettui un attacco con punteggio pari a Colpo di scudo −3 che fa 1d3 + bonus di Forza. Se il tiro va a segno con un distacco superiore a 3 o con un critico, puoi fare una prova di Forza contrapposta: se l'avversario perde, arretra di 3 metri (e altri combattenti possono fare un attacco di opportunità). Il maestro di battaglia può usare i dadi di combattimento: tiro senza penalità, dado ai danni, e prova di Forza senza distacco minimo." }
};
const MANEUVER_GROUPS = [
  { id:"attacco", label:"Attacchi speciali (azione)" },
  { id:"bonus", label:"Azione bonus" },
  { id:"reazione", label:"Reazione" },
  { id:"rinuncia", label:"Rinunci all'attacco" },
  { id:"situazionale", label:"Situazionali" }
];

function rarityFromScore(s){ if(s<=0)return "comune"; if(s===1)return "nonComune"; if(s===2)return "raro"; if(s<=4)return "moltoRaro"; return "leggendario"; }
function calcWeaponScore(sp){
  if(!sp)return 0;
  let s=(sp.enhancement||0);
  (sp.extraDamage||[]).forEach(function(ed){
    const n=parseInt((ed.dice||"1d6").split("d")[0],10)||1;
    let w=n>=2?2:1;
    if(ed.condition==="onCrit"||ed.condition==="onNat20"||ed.condition==="vsType")w=Math.max(1,w-1);
    s+=w;
  });
  (sp.onHit||[]).forEach(function(){s+=1;});
  if(sp.critRangeBonus)s+=1;
  if(sp.extraCritDice)s+=1;
  if(sp.grantsResistance)s+=1;
  if(sp.sentient&&sp.sentient.enabled)s+=1;
  if(sp.curse&&sp.curse.enabled)s-=1;
  return s;
}
// Danno effettivo dell'arma speciale (dado sovrascritto se presente)
function specialDmg(baseDef, sp){
  if(sp&&sp.dmgOverride)return sp.dmgOverride;
  return baseDef?baseDef.dmg:"—";
}
// Codice parlante: ARMA1§{json}
function encodeWeaponCode(we){
  const payload={base:we.id,sp:we.special||null,qty:we.qty||1};
  if(we.name)payload.name=we.name;
  try{ return ARMA_CODE_PREFIX+JSON.stringify(payload); }catch(e){ return ""; }
}
function decodeWeaponCode(txt){
  if(!txt)return null;
  let s=txt.trim();
  const i=s.indexOf(ARMA_CODE_PREFIX);
  if(i>=0)s=s.slice(i+ARMA_CODE_PREFIX.length);
  try{
    const p=JSON.parse(s);
    if(!p||!p.base)return null;
    if(!WEAPONS_DB.find(function(d){return d.id===p.base;}))return null;
    const out={id:p.base, qty:p.qty||1, equipped:false, special:p.sp||null};
    if(p.name)out.name=p.name;
    // retrocompat: vecchi codici col nome solo dentro special
    if(!out.name && p.sp && p.sp.name)out.name=p.sp.name;
    return out;
  }catch(e){ return null; }
}

function equipWeight(eq) {
  const items = (eq && eq.items) || [];
  const coins = (eq && eq.coins) || {};
  const weapons = (eq && eq.weapons) || [];
  let w = items.reduce((s,it) => s + (Number(it.weight)||0), 0);
  w += Object.values(coins).reduce((s,v) => s + (Number(v)||0), 0) * COIN_W;
  w += weapons.reduce(function(s,we){
    const def = WEAPONS_DB.find(function(d){ return d.id === we.id; });
    return s + (def ? (Number(def.weight)||0) * (Number(we.qty)||1) : 0);
  }, 0);
  return Math.round(w * 100) / 100;
}

function calcHP(classes, cosMod, hpBonus) {
  let hp = 0, totalLvl = 0;
  classes.forEach(function(cls, ci) {
    const hd = HD[cls.name] || 8;
    for (let l = 1; l <= (cls.level || 0); l++) {
      totalLvl++;
      const fixB = hd >= 10 ? 2 : 1;
      if (ci === 0 && l === 1) {
        hp += hd + Math.floor(hd / 2) + fixB + cosMod * 2;
      } else {
        hp += Math.floor(hd / 2) + fixB + cosMod;
      }
    }
  });
  return hp + (hpBonus || 0);
}

/* ═══ INIT STATE ═══ */
const INIT = {
  name: "", pn: "", raceId: "umano", align: "", gender: "M", deity: "",
  age: 18, height: 170, weight: 70, eyes: "", hair: "", portrait: null, miniature: null,
  classes: [{ name: "", level: 0 }],
  raceChoices: [],
  stats: { Forza:8, Destrezza:8, Costituzione:8, Intelligenza:8, Saggezza:8, Carisma:8 },
  bm: { Forza:0, Destrezza:0, Costituzione:0, Intelligenza:0, Saggezza:0, Carisma:0 },
  ma: "Forza", ga: "Carisma",
  skills: SD.map(() => ({ rank: 0, bs: 0, ms: 0 })),
  feats: [], spells: [],
  spellSlots: {1:{max:0,used:0},2:{max:0,used:0},3:{max:0,used:0},4:{max:0,used:0},5:{max:0,used:0},6:{max:0,used:0},7:{max:0,used:0},8:{max:0,used:0},9:{max:0,used:0}},
  hpBonus: 0, hpDmg: 0, hpTemp: 0,
  equipment: {
    items: [],
    weapons: [],
    armor: {light:{caBase:0,bonusSpec:0,equipped:false},medium:{caBase:0,bonusSpec:0,equipped:false},heavy:{caBase:0,bonusSpec:0,equipped:false}},
    shield: {small:{caBonus:0,bonusSpec:0,equipped:false},medium:{caBonus:0,bonusSpec:0,equipped:false},large:{caBonus:0,bonusSpec:0,equipped:false}},
    coins: {mp:0,mo:0,ma:0,mr:0},
    gems: []
  },
  locked: false, creationDone: false,
  savedPoints: 0, lvlUp: null,
  notes: "",   // note libere del giocatore (10.4.3)
};

/* ═══ CSS ═══ */
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
.theme-dark{--bg:#1a1714;--b2:#252119;--b3:#2e2922;--gd:#c9a84c;--gm:#8a7235;--gb:#e8c45a;--tx:#d4c5a9;--td:#a89a7a;--tb:#efe0c3;--rd:#a83232;--gn:#3a7a3a;--bd:#3d3529;--bl:#524a3a;--ip:#1f1b16;--hv:#332e25}
.theme-light{--bg:#f5f0e8;--b2:#fff;--b3:#f0ebe0;--gd:#6b4f1d;--gm:#8a7235;--gb:#4a3810;--tx:#3a3020;--td:#665b48;--tb:#2a2015;--rd:#b03030;--gn:#2a6a2a;--bd:#d0c8b8;--bl:#c0b8a0;--ip:#fff;--hv:#e8e0d0}
*{box-sizing:border-box;margin:0;padding:0}body{background:var(--bg);color:var(--tx);font-family:'Crimson Text',serif}
.app{max-width:1100px;margin:0 auto;padding:8px}
.cmb-cast{font-weight:700;margin-left:6px;padding:2px 10px}
.noheal{color:var(--rd);font-size:.85em;font-weight:600}
.theme-light,.theme-dark{background:var(--bg);min-height:100vh}
.hdr{text-align:center;padding:12px 0 6px;border-bottom:2px solid var(--gm);margin-bottom:8px;position:relative}
.hdr h1{font-family:'Cinzel',serif;color:var(--gd);font-size:1.3em;letter-spacing:3px}
.hdr .sub{color:var(--td);font-size:.78em;margin-top:2px}
.dash-bar .dash-ver{flex:none;font-family:'Cinzel',serif;font-size:.72em;letter-spacing:1px;color:var(--gd);border:1px solid var(--gm);border-radius:10px;padding:1px 7px;margin-right:6px;white-space:nowrap}
.ver-badge{display:inline-block;margin-top:3px;background:var(--b3);border:1px solid var(--gm);color:var(--gd);font-family:'Cinzel',serif;font-size:.62em;letter-spacing:1px;padding:1px 8px;border-radius:10px}
.hdr .theme-toggle{position:absolute;right:4px;top:10px;background:var(--b3);border:1px solid var(--bd);color:var(--gd);cursor:pointer;font-size:1.1em;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;line-height:1}
.hdr .theme-toggle:hover{background:var(--hv)}
.hdr .mobile-toggle{position:absolute;left:4px;top:10px;background:var(--b3);border:1px solid var(--bd);color:var(--gd);cursor:pointer;font-size:.95em;height:32px;padding:0 8px;border-radius:16px;display:flex;align-items:center;justify-content:center;line-height:1;gap:1px}
.hdr .mobile-toggle:hover{background:var(--hv)}
.tabs{display:flex;gap:2px;margin-bottom:8px;flex-wrap:wrap}
.tab{padding:6px 12px;background:var(--b2);border:1px solid var(--bd);color:var(--td);cursor:pointer;font-family:'Cinzel',serif;font-size:.7em;letter-spacing:1px;border-radius:4px 4px 0 0}
.tab:hover{background:var(--hv);color:var(--tx)}.tab.act{background:var(--b3);color:var(--gd);border-bottom-color:var(--b3)}
.pnl{background:var(--b2);border:1px solid var(--bd);border-radius:0 4px 4px 4px;padding:12px}
.st{font-family:'Cinzel',serif;color:var(--gd);font-size:.88em;letter-spacing:1px;border-bottom:1px solid var(--bl);padding-bottom:3px;margin:8px 0 5px}
.f{display:flex;align-items:center;gap:4px;margin-bottom:4px}
/* Frecce native degli input numerici nascoste ovunque: coprivano i valori nei campi stretti. Incremento ↑↓ da tastiera resta attivo. */
input[type=number]{-moz-appearance:textfield;appearance:textfield}
input[type=number]::-webkit-outer-spin-button,input[type=number]::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
.nstep{display:inline-flex;align-items:center;gap:3px}
.nstep input{text-align:center;background:var(--ip);border:1px solid var(--bd);color:var(--tb);padding:3px 4px;font-family:'Crimson Text',serif;font-size:.85em;border-radius:3px}
.nstep-b{width:26px;height:26px;min-width:26px;border:1px solid var(--bd);background:var(--b3);color:var(--gd);border-radius:3px;cursor:pointer;font-size:1.1em;line-height:1;display:flex;align-items:center;justify-content:center;padding:0;font-family:inherit}
.nstep-b:active{background:var(--hv)}
.nstep-b:disabled{opacity:.4;cursor:default}
.f label{color:var(--td);font-size:.78em;min-width:80px;text-align:right}
.f input,.f select{background:var(--ip);border:1px solid var(--bd);color:var(--tb);padding:3px 6px;font-family:'Crimson Text',serif;font-size:.85em;border-radius:3px}
.f input[type=number]{width:50px;text-align:center}.f input[type=text]{width:140px}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.sc{background:var(--b3);border:1px solid var(--bd);padding:6px;border-radius:4px;text-align:center}
.sc .nm{font-family:'Cinzel',serif;color:var(--gd);font-size:.68em}.sc .md{font-size:1.3em;color:var(--gb);font-weight:700}
.sc input{width:40px;text-align:center;background:var(--ip);border:1px solid var(--bd);color:var(--tb);font-size:.8em;padding:2px;border-radius:3px}
.sk{width:100%;border-collapse:collapse;font-size:.78em;table-layout:fixed}
.sk th{background:var(--b3);color:var(--gd);font-family:'Cinzel',serif;font-size:.68em;padding:3px 4px;text-align:center;border-bottom:1px solid var(--bl);position:sticky;top:var(--dash-h,0px);z-index:2;overflow:hidden}
.sk td{padding:2px 4px;border-bottom:1px solid var(--bd);text-align:center;overflow:hidden;text-overflow:ellipsis}
.sk col.sk-name{width:28%}.sk col.sk-attr{width:6%}.sk col.sk-rank{width:8%}.sk col.sk-num{width:7%}.sk col.sk-tot{width:7%}.sk col.sk-cst{width:7%}
.sk tr:hover{background:var(--hv)}.sk .sn{text-align:left;color:var(--tb)}
.sk input[type=number]{width:36px;text-align:center;background:var(--ip);border:1px solid var(--bd);color:var(--tb);padding:1px;font-size:.82em;border-radius:2px}
.sk input[type=text],.sk textarea,input[type=text]:not([class]),input:not([type]):not([class]),textarea:not([class]){background:var(--ip);color:var(--tb);border:1px solid var(--bd);border-radius:3px;font-family:'Crimson Text',serif;padding:2px 5px}
.vp{color:#2a8a2a}.vn{color:#b04040}.vz{color:var(--td)}
.theme-dark .vp{color:#6aaa6a}.theme-dark .vn{color:#aa5a5a}
.btn{padding:4px 10px;background:var(--b3);border:1px solid var(--gm);color:var(--gd);cursor:pointer;font-family:'Cinzel',serif;font-size:.72em;border-radius:3px}
.btn:hover{background:var(--hv)}.bs{padding:2px 6px;font-size:.68em}
.pb{display:flex;align-items:center;gap:8px;padding:6px 8px;background:var(--b3);border:1px solid var(--bd);border-radius:4px;margin-bottom:6px;flex-wrap:wrap;font-size:.82em}
.lk{background:var(--b3);border:2px solid var(--rd);border-radius:4px;padding:6px 10px;margin-bottom:8px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.lk.ul{border-color:var(--gn)}
.lu{background:#2a2518;border:2px solid #d4a020;border-radius:6px;padding:10px 14px;margin-bottom:8px}
.lu .lt{font-family:'Cinzel',serif;color:#d4a020;font-size:.9em}.lu .li{display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:5px;font-size:.8em}
.lu-new{background:#1a2a1a;border:1px solid var(--gn);color:#8f8;border-radius:2px;width:38px;text-align:center;padding:1px;font-size:.85em}
.theme-light .lu{background:#fdf6e3;border-color:#b8960a}
.theme-light .lu .lt{color:#8a6a0a}
.theme-light .lu-new{background:#eef8ee;color:#2a6a2a}
.msgbox{border-radius:6px;padding:10px 14px;margin-bottom:8px}
.expbox{background:var(--b3);border:2px solid var(--gm);border-radius:6px;padding:10px 14px;margin-bottom:8px}
.expbox textarea{width:100%;height:100px;background:var(--ip);border:1px solid var(--bd);color:var(--tb);font-family:monospace;font-size:.65em;padding:4px;border-radius:3px;resize:vertical}
.ib{background:var(--b3);border:1px solid var(--bd);border-radius:4px;padding:7px}
.ir{display:flex;justify-content:space-between;padding:1px 0;border-bottom:1px solid var(--bd)}.ir:last-child{border-bottom:none}
.ir .il{color:var(--td);font-size:.78em}.ir .iv{color:var(--tb);font-weight:600}
.compact{columns:3;column-gap:10px;font-size:.72em}
.ccat{break-inside:avoid;margin-bottom:6px;background:var(--b3);border:1px solid var(--bd);border-radius:3px;padding:5px}
.ccat h4{font-family:'Cinzel',serif;color:var(--gd);font-size:.72em;border-bottom:1px solid var(--bl);padding-bottom:2px;margin-bottom:2px}
.crow{display:flex;justify-content:space-between;padding:0 2px;border-bottom:1px solid var(--bd);line-height:1.4}.crow:last-child{border-bottom:none}
.droll{cursor:pointer;font-size:.85em;opacity:.45;transition:opacity .12s,transform .12s;user-select:none}
.droll:hover{opacity:1;transform:scale(1.25)}
.droll:active{transform:scale(.9)}
@media print{.droll{display:none!important}}
.portrait{width:120px;height:120px;border:2px solid var(--gm);border-radius:4px;overflow:hidden;cursor:pointer;background:var(--b3);display:flex;align-items:center;justify-content:center}
.portrait.minia{border-radius:50%}
.desc-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:16px;z-index:500}
.desc-modal{background:var(--b2);border:2px solid var(--gm);border-radius:8px;width:min(560px,94vw);max-height:84vh;overflow-y:auto;padding:14px 16px;box-shadow:0 8px 30px rgba(0,0,0,.55)}
.desc-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:6px}
.desc-lvl{background:var(--b3);color:var(--gd);border-radius:3px;padding:1px 7px;font-family:'Cinzel',serif;font-size:.74em}
.desc-x{background:none;border:none;color:var(--td);font-size:1.5em;line-height:1;cursor:pointer;padding:0 2px}
.desc-x:hover{color:var(--tb)}
.desc-meta{font-size:.78em;color:var(--td);margin-bottom:5px}
.desc-body{font-size:.94em;color:var(--tx);line-height:1.5;white-space:pre-wrap;margin-top:6px}
.desc-note{font-size:.74em;color:var(--td);font-style:italic;margin-top:8px}
.ib-row{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:4px}
.ib-chk{display:inline-flex;align-items:center;gap:5px;font-size:.85em;color:var(--tx);cursor:pointer}
.ib-note{font-size:.74em;color:var(--td);font-style:italic;margin-bottom:6px}
.ib-sec{font-family:'Cinzel',serif;font-size:.72em;letter-spacing:1px;color:var(--gd);text-transform:uppercase;margin:10px 0 5px;border-top:1px solid var(--bd);padding-top:8px}
.ib-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
.ib-stat{display:flex;align-items:center;justify-content:space-between;gap:6px;font-size:.84em;color:var(--tx);background:var(--b3);border:1px solid var(--bd);border-radius:3px;padding:3px 7px}
.ib-stat input{background:var(--ip);border:1px solid var(--bd);color:var(--tb);text-align:center;border-radius:3px;padding:2px}
.ib-skrow{display:flex;align-items:center;gap:8px;font-size:.86em;margin-bottom:4px}
.ib-skrow input{background:var(--ip);border:1px solid var(--bd);color:var(--tb);text-align:center;border-radius:3px;padding:2px}
.ib-skadd{margin-top:4px}
.ib-skadd select{background:var(--ip);border:1px solid var(--bd);color:var(--tb);padding:4px 7px;font-family:'Crimson Text',serif;font-size:.85em;border-radius:3px;max-width:100%}
.portrait img{width:100%;height:100%;object-fit:cover}
/* ═══ MOBILE RESPONSIVE ═══ */
.mobile .app{padding:4px}
.mobile .hdr{padding:8px 0 4px}
.mobile .hdr h1{font-size:1.05em;letter-spacing:1px;padding:0 80px}
.mobile .hdr .sub{font-size:.7em;padding:0 60px}
.mobile .tabs{gap:3px}
.mobile .tab{padding:6px 9px;font-size:.68em;letter-spacing:0;text-align:center}
.mobile .pnl{padding:6px;border-radius:0 4px 4px 4px}
.mobile .g2{grid-template-columns:1fr}
.mobile .compact{columns:1}
.mobile .f{flex-wrap:wrap;gap:3px}
.mobile .f label{min-width:auto;text-align:left;font-size:.78em}
.mobile .f input[type=text]{width:100%;flex:1;min-width:120px}
.mobile .f input[type=number]{width:55px}
.mobile .f select{flex:1;min-width:100px}
.mobile .sc{padding:4px}
.mobile .sc input{width:36px}
.mobile .pb{padding:5px 6px;font-size:.78em;gap:4px}
.mobile .lk{padding:5px 8px;gap:5px;font-size:.85em}
.mobile .lu{padding:7px 9px}
.mobile .ib{padding:5px}
.mobile .portrait{width:96px;height:96px}
.mobile .ccat{padding:4px}
.mobile .ccat h4{font-size:.78em}
.mobile .crow{font-size:.82em;padding:1px 0}
.mobile .btn{padding:5px 10px;font-size:.74em}
.mobile .btn.bs{padding:3px 7px;font-size:.7em}
.mobile .sk{font-size:.72em}
.mobile .sk th{font-size:.65em;padding:2px}
.mobile .sk td{padding:1px 2px}
.mobile .sk input[type=number]{width:30px;font-size:.78em}
.mobile .st{font-size:.82em;margin:6px 0 4px}
.mobile .hide-mobile{display:none!important}
@media print{
  @page{size:A4 landscape;margin:8mm}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  body,.app{background:#fff!important;color:#222!important;max-width:none!important;padding:0!important}
  .tabs,.lk,.lu,.btn,.msgbox,.expbox,.theme-toggle,.no-print{display:none!important}
  .pnl{border:none!important;padding:0!important;background:#fff!important}
  .hdr{border-bottom:2px solid #8a7235!important}
  .hdr h1{color:#4a3810!important}
  .hdr .sub{color:#666!important}
  .st{color:#4a3810!important;border-bottom-color:#ccc!important}
  .sc{background:#f5f0e8!important;border-color:#ccc!important}
  .sc .nm{color:#6b4f1d!important}.sc .md{color:#2a2015!important}
  .ib,.ccat,.eq-ca,.eq-carry{background:#f5f0e8!important;border-color:#ccc!important}
  .ir{border-color:#ddd!important}.ir .il{color:#666!important}.ir .iv{color:#222!important}
  .sk th,.eq-tbl th{background:#f0ebe0!important;color:#4a3810!important;border-color:#ccc!important}
  .sk td,.eq-tbl td{border-color:#ddd!important;color:#222!important}
  .sk .sn{color:#222!important}
  .sk tr:hover{background:transparent!important}
  .compact{columns:4}
  .ccat h4{color:#4a3810!important;border-color:#ccc!important}
  .crow{border-color:#eee!important}
  .crow span{color:#222!important}
  .vp{color:#1a6a1a!important}.vn{color:#b03030!important}.vz{color:#888!important}
  .ca-val{color:#2a2015!important}.ca-lbl{color:#6b4f1d!important}.ca-det{color:#666!important}
  .f label{color:#666!important}.f input,.f select{background:#f8f5f0!important;color:#222!important;border-color:#ccc!important}
  .eq-tbl input,.sk input{background:#f8f5f0!important;color:#222!important;border-color:#ccc!important}
  .eq-coins .coin{background:#f5f0e8!important;border-color:#ccc!important}
  .eq-coins .coin label{color:#6b4f1d!important}
  .eq-coins input{background:#f8f5f0!important;color:#222!important}
  .g2{gap:12px}
  input[type=checkbox]{accent-color:#6b4f1d!important}
}
.eq-sec{margin-bottom:10px}.eq-sec h3{font-family:'Cinzel',serif;color:var(--gd);font-size:.72em;margin-bottom:4px}
.pv{background:#fff;color:#222;padding:16px;border-radius:6px;font-size:.8em;line-height:1.4}
.pv *{color:#222}.pv h2{font-family:'Cinzel',serif;color:#4a3810;font-size:1.2em;text-align:center;margin-bottom:2px;letter-spacing:2px}
.pv .pv-sub{text-align:center;color:#666;font-size:.85em;margin-bottom:8px;border-bottom:2px solid #c0b090;padding-bottom:6px}
.pv-sec{font-family:'Cinzel',serif;color:#4a3810;font-size:.85em;border-bottom:1px solid #c0b090;padding-bottom:2px;margin:10px 0 5px;letter-spacing:1px}
.pv-row{display:flex;gap:16px;flex-wrap:wrap;margin-bottom:3px;font-size:.85em}
.pv-row .pv-l{color:#888;min-width:70px}.pv-row .pv-v{font-weight:600}
.pv-stats{display:flex;gap:6px;margin:6px 0;flex-wrap:wrap}
.pv-stat{border:1px solid #c0b090;border-radius:4px;padding:4px 8px;text-align:center;min-width:55px;background:#faf6ee}
.pv-stat .pv-sn{font-family:'Cinzel',serif;font-size:.65em;color:#8a7235}.pv-stat .pv-sm{font-size:1.1em;font-weight:700}.pv-stat .pv-sb{font-size:.65em;color:#888}
.pv-info{display:flex;gap:8px;margin:6px 0;flex-wrap:wrap}
.pv-box{border:2px solid #c0b090;border-radius:4px;padding:4px 10px;text-align:center;background:#faf6ee}
.pv-box .pv-bl{font-family:'Cinzel',serif;font-size:.6em;color:#8a7235}.pv-box .pv-bv{font-size:1.2em;font-weight:700;color:#4a3810}
.pv-skills{columns:3;column-gap:8px;font-size:.72em;margin:4px 0}
.pv-scat{break-inside:avoid;margin-bottom:5px;border:1px solid #ddd;border-radius:3px;padding:4px}
.pv-scat h5{font-family:'Cinzel',serif;color:#6b4f1d;font-size:.75em;border-bottom:1px solid #ddd;padding-bottom:1px;margin-bottom:2px}
.pv-sr{display:flex;justify-content:space-between;padding:0 2px;border-bottom:1px solid #eee;line-height:1.3}
.pv-sr:last-child{border-bottom:none}
.pv-sr .pv-pos{color:#2a7a2a}.pv-sr .pv-neg{color:#b03030}.pv-sr .pv-zer{color:#999}
.pv-tbl{width:100%;border-collapse:collapse;font-size:.78em;margin:4px 0}
.pv-tbl th{background:#f0ebe0;color:#6b4f1d;font-family:'Cinzel',serif;font-size:.65em;padding:2px 4px;text-align:center;border-bottom:1px solid #c0b090}
.pv-tbl td{padding:2px 4px;border-bottom:1px solid #eee;text-align:center;font-size:.85em}
.pv-tbl td:first-child{text-align:left}
.eq-tbl{width:100%;border-collapse:collapse;font-size:.78em}
.wpn-picker{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:6px}
.wpn-picker select,.wpn-picker input[type=text]{background:var(--ip);border:1px solid var(--bd);color:var(--tb);padding:4px 6px;font-size:.8em;border-radius:3px}
.wpn-ff{font-size:.72em;color:var(--td);display:flex;align-items:center;gap:3px;cursor:pointer;white-space:nowrap}
.wpn-props{font-size:.68em;color:var(--td);line-height:1.2;max-width:230px}
.wpn-name-in{background:transparent;border:1px solid transparent;border-radius:3px;padding:2px 4px;font-family:'Crimson Text',serif;font-size:1em;width:100%;min-width:90px}
.wpn-name-in:hover{border-color:var(--bd)}
.wpn-name-in:focus{background:var(--ip);border-color:var(--gd);outline:none}
.cmb-subtabs{display:flex;gap:4px;margin-bottom:12px;border-bottom:1px solid var(--bl)}
.cmb-subtab{padding:6px 16px;cursor:pointer;font-family:'Cinzel',serif;font-size:.74em;letter-spacing:1px;color:var(--td);border:1px solid transparent;border-bottom:none;border-radius:4px 4px 0 0}
.cmb-subtab:hover{color:var(--gb)}
.cmb-subtab.active{color:var(--gb);background:var(--b2);border-color:var(--bl)}
.cmb-empty{padding:24px 16px;text-align:center;color:var(--td);border:1px dashed var(--bd);border-radius:6px;line-height:1.6}

/* ═══ Tab Dadi ═══ */
.dice-tab{max-width:480px;margin:0 auto;display:flex;flex-direction:column;gap:10px}
.dice-tab-intro{font-size:.88em;color:var(--td);line-height:1.5}
.dice-tab-search{width:100%;box-sizing:border-box;padding:8px 10px;font-size:.95em;background:var(--b2);border:1px solid var(--bd);border-radius:4px;color:var(--tx);font-family:'Crimson Text',serif}
.dice-tab-select{width:100%;box-sizing:border-box;padding:4px;font-size:.92em;background:var(--b2);border:1px solid var(--bd);border-radius:4px;color:var(--tx);font-family:'Crimson Text',serif}
.dice-tab-select optgroup{font-family:'Cinzel',serif;font-size:.85em;letter-spacing:.5px;color:var(--gd);font-style:normal}
.dice-tab-select option{padding:3px 4px;color:var(--tx);font-size:1.05em}
.dice-tab-empty{text-align:center;color:var(--td);padding:10px;font-size:.9em}
.dice-tab-result{display:flex;flex-direction:column;align-items:center;gap:6px;background:var(--b3);border:1px solid var(--bd);border-radius:8px;padding:18px;margin-top:4px}
.dice-tab-sel-name{font-family:'Cinzel',serif;font-size:1em;letter-spacing:.5px;color:var(--gd);text-align:center}
.dice-tab-sel-mod{font-family:'Cinzel',serif;font-size:2em;font-weight:700;color:var(--gb)}
.dice-tab-roll{margin-top:4px;padding:12px 28px;font-family:'Cinzel',serif;font-size:1em;letter-spacing:1px;background:var(--gd);color:#241f16;border:none;border-radius:24px;cursor:pointer;font-weight:700;box-shadow:0 2px 8px rgba(0,0,0,.25)}
.dice-tab-roll:hover{filter:brightness(1.08)}
.dice-tab-roll:disabled{opacity:.5;cursor:not-allowed}
@media (max-width:768px){
  .dice-tab-select{font-size:1em}
  .dice-tab-sel-mod{font-size:1.8em}
}
.cmb-pm-bar{background:var(--b3);border:1px solid var(--bd);border-radius:4px;padding:6px 10px;font-size:.84em;color:var(--tx);margin-bottom:10px}
.cmb-spell-sec{font-family:'Cinzel',serif;font-size:.72em;letter-spacing:1px;color:var(--gd);margin:12px 0 6px;text-transform:uppercase}
.cmb-school-grid{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:4px}
.cmb-school-cell{background:var(--b2);border:1px solid var(--bd);border-radius:5px;padding:5px 9px;min-width:96px}
.cmb-school-name{font-size:.78em;color:var(--gd);font-family:'Cinzel',serif}
.cmb-school-vals{font-size:.82em;color:var(--tx);margin-top:2px}
.cmb-school-vals b{color:var(--tb)}
.cmb-spell-list{display:flex;flex-direction:column;gap:6px}
.cmb-spell-row{background:var(--b2);border:1px solid var(--bd);border-radius:6px;padding:8px 11px}
.cmb-spell-head{display:flex;align-items:baseline;justify-content:space-between;gap:8px;flex-wrap:wrap}
.cmb-spell-name{font-weight:700;color:var(--tb);font-size:.95em}
.cmb-spell-meta{font-size:.74em;color:var(--td)}
.cmb-spell-stats{display:flex;flex-wrap:wrap;gap:8px 14px;margin-top:6px}
.cmb-spell-stat{display:inline-flex;align-items:center;gap:5px;font-size:.84em;color:var(--tx)}
.cmb-spell-stat b{color:var(--tb);font-family:'Cinzel',serif}
.cmb-spell-lab{color:var(--gd);font-size:.92em}
.cmb-spell-sub{color:var(--td);font-size:.86em}
.cmb-spell-eff{margin-top:6px;font-size:.82em;color:var(--td);line-height:1.35}
.cmb-dry{margin-left:auto;font-size:.8em;color:var(--td);display:inline-flex;align-items:center;gap:5px;cursor:pointer}
.cmb-spell-row.over{border-color:var(--rd)}
.cmb-spell-cast{display:flex;flex-wrap:wrap;align-items:center;gap:8px 14px;margin-top:7px;padding-top:7px;border-top:1px solid var(--bd)}
.cmb-lvl-pick{font-size:.84em;color:var(--gd);display:inline-flex;align-items:center;gap:5px;font-family:'Cinzel',serif}
.cmb-lvl-pick input{width:44px;background:var(--ip);border:1px solid var(--gm);color:var(--tb);padding:3px 5px;font-size:.9em;border-radius:3px;text-align:center;font-family:'Crimson Text',serif}
.cmb-spell-over{margin-top:7px;padding:7px 9px;border-radius:5px;background:rgba(168,50,50,.12);border:1px solid var(--rd);font-size:.84em}
.cmb-spell-okline{margin-top:6px;font-size:.78em;color:var(--gn)}
.cmb-oc-line{color:var(--tx);margin-bottom:3px}
.cmb-oc-line b{color:var(--tb)}
.cmb-oc-note{font-size:.78em;color:var(--td);font-style:italic}
.cmb-oc-toll{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin-top:4px;font-size:.84em;color:var(--tx)}
.cmb-weapon{background:var(--b2);border:1px solid var(--bd);border-radius:6px;padding:10px 12px;margin-bottom:8px}
.cmb-weapon.inuse{border-color:var(--gd);box-shadow:0 0 0 1px var(--gm) inset}
.cmb-w-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap}
.cmb-inuse{display:flex;align-items:center;gap:7px;cursor:pointer;font-size:1.02em}
.cmb-inuse input{width:auto}
.cmb-w-cat{font-size:.74em;color:var(--td)}
.cmb-w-body{display:flex;gap:10px;flex-wrap:wrap}
.cmb-block{flex:1;min-width:200px;background:var(--b3);border:1px solid var(--bd);border-radius:5px;padding:7px 9px}
.cmb-b-lbl{font-family:'Cinzel',serif;color:var(--gd);font-size:.66em;letter-spacing:1px;margin-bottom:5px}
.cmb-tohit{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.cmb-bonus{font-size:1.4em;font-weight:700;color:var(--tb);font-family:'Cinzel',serif;min-width:42px}
.cmb-formula{font-size:.72em;color:var(--td);flex:1}
.cmb-crit-note{font-size:.7em;color:var(--gd);margin-top:4px}
.cmb-dmg-list{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px}
.cmb-dmg-tag{font-size:.78em;background:var(--ip);border:1px solid var(--bl);color:var(--tb);padding:2px 7px;border-radius:8px}
.cmb-dmg-btns{display:flex;gap:6px}
.cmb-roll{background:#2a2418;border:1px solid var(--gm);color:var(--gd);cursor:pointer;font-family:'Cinzel',serif;font-size:.68em;letter-spacing:.5px;padding:5px 11px;border-radius:3px;white-space:nowrap}
.cmb-roll:hover{background:var(--hv);color:var(--gb)}
.cmb-roll.crit{border-color:#c98a4a;color:#c98a4a}
.cmb-w-notes{font-size:.76em;color:var(--td);margin-top:6px;padding-top:6px;border-top:1px solid var(--bd);line-height:1.4}
.cmb-dw-bar{display:flex;align-items:center;gap:14px;flex-wrap:wrap;background:var(--b3);border:1px solid var(--bd);border-radius:6px;padding:8px 12px;margin-bottom:10px}
.cmb-dw-toggle{display:flex;align-items:center;gap:7px;cursor:pointer;font-family:'Cinzel',serif;font-size:.76em;letter-spacing:.5px;color:var(--gd)}
.cmb-dw-toggle input{width:auto}
.cmb-dw-info{font-size:.8em;color:var(--td)}
.cmb-dw-info b{color:var(--tb)}
.cmb-dw-feat{font-size:.74em;color:var(--td);display:flex;align-items:center;gap:5px}
.cmb-dw-feat input{background:var(--ip);border:1px solid var(--bd);color:var(--tb);padding:2px 4px;font-size:.92em;border-radius:3px;margin:0 2px}
.cmb-w-sel{display:flex;align-items:center;gap:8px}
.cmb-hand-btns{display:inline-flex;gap:3px}
.cmb-hand{width:24px;height:24px;border:1px solid var(--bd);background:var(--ip);color:var(--td);border-radius:3px;cursor:pointer;font-family:'Cinzel',serif;font-size:.74em;font-weight:700}
.cmb-hand:hover{border-color:var(--gd);color:var(--gb)}
.cmb-hand.act{background:#3a3220;border-color:var(--gd);color:var(--gb)}
.cmb-hand.off.act{background:#3a2c1c;border-color:#c98a4a;color:#c98a4a}
.cmb-role-badge{font-size:.64em;background:#3a3220;border:1px solid var(--gd);color:var(--gb);padding:1px 7px;border-radius:8px;font-family:'Cinzel',serif;letter-spacing:.5px}
.cmb-role-badge.off{background:#3a2c1c;border-color:#c98a4a;color:#c98a4a}
.man-bar{background:var(--b3);border:1px solid var(--bd);border-radius:6px;padding:7px 11px;margin-bottom:10px;font-size:.82em}
.man-ref b{color:var(--gb)}
.man-group{margin-bottom:12px}
.man-group-h{font-family:'Cinzel',serif;color:var(--gd);font-size:.72em;letter-spacing:1px;border-bottom:1px solid var(--bl);padding-bottom:3px;margin-bottom:5px}
.man-row{border:1px solid var(--bd);border-radius:5px;margin-bottom:4px;background:var(--b2);overflow:hidden}
.man-row.norank{opacity:.62}
.man-row.open{border-color:var(--gd)}
.man-row-h{display:flex;align-items:center;gap:8px;padding:7px 10px;cursor:pointer}
.man-row-h:hover{background:var(--hv)}
.man-caret{color:var(--gd);font-size:.8em;width:12px}
.man-name{flex:1;color:var(--tb);font-weight:600;font-size:.9em}
.man-attr{font-size:.72em;color:var(--td)}
.man-rank{font-size:.76em;color:var(--gb);font-family:'Cinzel',serif;background:#2a2418;border:1px solid var(--gm);padding:1px 8px;border-radius:8px}
.man-norank{font-size:.7em;color:var(--td);font-style:italic}
.man-detail{padding:2px 12px 10px 30px;border-top:1px solid var(--bd)}
.man-desc{font-size:.84em;color:var(--tx);line-height:1.5;margin:7px 0}
.man-roll-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:6px}
.man-score{font-size:.86em;color:var(--tx)}
.man-score b{color:var(--gb);font-size:1.1em}
.man-score-note{font-size:.8em;color:var(--td)}
.man-showall{background:var(--b3);border:1px solid var(--bd);color:var(--gd);cursor:pointer;font-family:'Cinzel',serif;font-size:.68em;letter-spacing:.5px;padding:7px 12px;border-radius:3px;margin-top:6px;width:100%}
.man-showall:hover{background:var(--hv);color:var(--gb)}
.wpn-tbl td{vertical-align:top;padding-top:4px}
.wpn-paste{margin:6px 0;display:flex;flex-direction:column;gap:5px}
.wpn-paste textarea{background:var(--ip);border:1px solid var(--bd);color:var(--tb);padding:6px;font-family:monospace;font-size:.78em;border-radius:3px;width:100%;resize:vertical}
.wpn-paste-btns{display:flex;gap:6px}
.wpe-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:flex-start;justify-content:center;padding:20px;z-index:400;overflow-y:auto}
.wpe-modal{background:var(--bg);border:1px solid var(--gd);border-radius:8px;width:100%;max-width:560px;box-shadow:0 10px 40px rgba(0,0,0,.6);margin:auto}
.wpe-head{display:flex;justify-content:space-between;align-items:center;padding:11px 15px;background:var(--b2);border-bottom:1px solid var(--gm);border-radius:8px 8px 0 0}
.wpe-head span:first-child{font-family:'Cinzel',serif;color:var(--gb);font-size:.95em;letter-spacing:1px}
.wpe-close{cursor:pointer;color:var(--td);font-size:1.1em}
.wpe-close:hover{color:var(--gb)}
.wpe-body{padding:13px 15px;display:flex;flex-direction:column;gap:9px;max-height:72vh;overflow-y:auto}
.wpe-row{display:flex;flex-direction:column;gap:3px}
.wpe-row>label{font-family:'Cinzel',serif;color:var(--gd);font-size:.66em;letter-spacing:1px}
.wpe-row input[type=text],.wpe-row select,.wpe-row textarea,.wpe-row input[type=number]{background:var(--ip);border:1px solid var(--bd);color:var(--tb);padding:5px 7px;font-family:'Crimson Text',serif;font-size:.88em;border-radius:3px;width:100%}
.wpe-grid2{display:grid;grid-template-columns:1fr 1fr;gap:9px;align-items:end}
.wpe-toggle{display:flex;align-items:center;gap:5px;font-size:.84em;color:var(--tx);cursor:pointer}
.wpe-toggle input{width:auto!important}
.wpe-base{font-size:.78em;color:var(--td);background:var(--b3);padding:5px 9px;border-radius:4px;border:1px solid var(--bd)}
.wpe-base b{color:var(--tb)}
.wpe-sec{border:1px solid var(--bd);border-radius:5px;padding:7px 9px;background:var(--b2)}
.wpe-sec-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px}
.wpe-sec-head span{font-family:'Cinzel',serif;color:var(--gd);font-size:.7em;letter-spacing:1px}
.wpe-add{background:var(--b3);border:1px solid var(--gm);color:var(--gd);cursor:pointer;font-size:.68em;padding:3px 8px;border-radius:3px;font-family:'Cinzel',serif}
.wpe-empty{font-size:.76em;color:var(--td);font-style:italic}
.wpe-extra,.wpe-onhit{display:flex;gap:4px;align-items:center;margin-top:4px;flex-wrap:wrap}
.wpe-extra select,.wpe-onhit select,.wpe-onhit input{background:var(--ip);border:1px solid var(--bd);color:var(--tb);padding:3px 5px;font-size:.8em;border-radius:3px;font-family:'Crimson Text',serif}
.wpe-onhit input[type=text]{flex:1;min-width:100px}
.wpe-onhit span{font-size:.76em;color:var(--td)}
.wpe-del{background:none;border:1px solid var(--rd);color:var(--rd);cursor:pointer;font-size:.68em;padding:2px 6px;border-radius:3px}
.wpe-adv-t{cursor:pointer;font-family:'Cinzel',serif;color:var(--gd);font-size:.72em;letter-spacing:1px;padding:5px 0;border-top:1px solid var(--bd)}
.wpe-adv-t:hover{color:var(--gb)}
.wpe-adv{display:flex;flex-direction:column;gap:9px;padding:3px 0}
.wpe-rarity{display:flex;justify-content:space-between;align-items:center;gap:9px;background:var(--b3);padding:7px 9px;border-radius:5px;flex-wrap:wrap}
.wpe-r-lbl{font-family:'Cinzel',serif;color:var(--gd);font-size:.66em;letter-spacing:1px;margin-right:5px}
.wpe-rarity select{background:var(--ip);border:1px solid var(--bd);color:var(--tb);padding:3px 7px;font-size:.84em;border-radius:3px;font-family:'Crimson Text',serif}
.wpe-r-info{font-size:.78em}
.wpe-foot{display:flex;justify-content:flex-end;padding:11px 15px;border-top:1px solid var(--bd);background:var(--b2);border-radius:0 0 8px 8px}
.wpe-btn{background:var(--b3);border:1px solid var(--gm);color:var(--gd);cursor:pointer;font-family:'Cinzel',serif;font-size:.74em;letter-spacing:1px;padding:6px 16px;border-radius:3px}
.wpe-btn.primary{background:#3a3220;border-color:var(--gd);color:var(--gb);font-weight:700}
@media(max-width:600px){.wpe-grid2{grid-template-columns:1fr}}
.eq-tbl th{background:var(--b3);color:var(--gd);font-family:'Cinzel',serif;font-size:.68em;padding:3px 4px;text-align:center;border-bottom:1px solid var(--bl)}
.eq-tbl td{padding:3px 4px;border-bottom:1px solid var(--bd);text-align:center}
.eq-tbl input[type=number],.eq-tbl input[type=text]{background:var(--ip);border:1px solid var(--bd);color:var(--tb);padding:2px 4px;font-size:.85em;border-radius:2px}
.eq-tbl input[type=number]{width:50px;text-align:center}.eq-tbl input[type=text]{width:100%}
.eq-tbl input[type=checkbox]{accent-color:var(--gd);width:16px;height:16px}
.eq-ca{display:flex;align-items:center;gap:12px;padding:8px 12px;background:var(--b3);border:2px solid var(--gm);border-radius:6px;margin-bottom:8px;flex-wrap:wrap}
.eq-ca .ca-val{font-family:'Cinzel',serif;font-size:1.6em;color:var(--gb);font-weight:700}
.eq-ca .ca-lbl{font-family:'Cinzel',serif;font-size:.72em;color:var(--gd)}
.eq-ca .ca-det{font-size:.72em;color:var(--td)}
.eq-carry{padding:6px 10px;background:var(--b3);border:1px solid var(--bd);border-radius:4px;margin-bottom:8px;font-size:.78em;color:var(--tb)}
.eq-carry-bar{height:8px;background:var(--bd);border-radius:4px;overflow:hidden;margin-top:3px}
.eq-carry-fill{height:100%;border-radius:4px;transition:width .3s}
.eq-coins{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}
.eq-coins .coin{display:flex;align-items:center;gap:3px;background:var(--b3);border:1px solid var(--bd);border-radius:4px;padding:3px 8px}
.eq-coins .coin label{font-family:'Cinzel',serif;font-size:.68em;color:var(--gd);min-width:22px}
.eq-coins input{width:50px;text-align:center;background:var(--ip);border:1px solid var(--bd);color:var(--tb);font-size:.82em;padding:2px;border-radius:2px}
`;

const V = ({v}) => {
  const n = typeof v === "number" ? v : 0;
  return <span className={n>0?"vp":n<0?"vn":"vz"}>{n>0?"+"+n:n}</span>;
};

/* ═══ MAIN APP ═══ */
// ── Editor proprietà arma speciale (pannello modale dentro la scheda) ──
function WeaponPropsEditor({ baseDef, special, weaponName, onChange, onName, onClose }) {
  const sp = special || {};
  const set = function(patch){ onChange(Object.assign({}, sp, patch)); };
  const [advOpen, setAdvOpen] = useState(false);

  const extraDamage = sp.extraDamage || [];
  const addExtra = function(){ set({extraDamage: extraDamage.concat([{dice:"1d6",damageType:"Fuoco",condition:"always",creatureType:""}])}); };
  const setExtra = function(i,patch){ const a=extraDamage.slice(); a[i]=Object.assign({},a[i],patch); set({extraDamage:a}); };
  const delExtra = function(i){ set({extraDamage: extraDamage.filter(function(_,j){return j!==i;})}); };

  const onHit = sp.onHit || [];
  const addOnHit = function(){ set({onHit: onHit.concat([{dc:13,ability:"Costituzione",effect:""}])}); };
  const setOnHit = function(i,patch){ const a=onHit.slice(); a[i]=Object.assign({},a[i],patch); set({onHit:a}); };
  const delOnHit = function(i){ set({onHit: onHit.filter(function(_,j){return j!==i;})}); };

  const score = calcWeaponScore(sp);
  const suggested = rarityFromScore(score);
  const rarityObj = RARITIES.find(function(r){return r.id===(sp.rarity||suggested);})||RARITIES[0];
  const effDmg = specialDmg(baseDef, sp);

  return (
    <div className="wpe-overlay" onClick={function(e){ if(e.target.className==="wpe-overlay") onClose(); }}>
      <div className="wpe-modal">
        <div className="wpe-head">
          <span>⚙ Proprietà arma</span>
          <span className="wpe-close" onClick={onClose}>✕</span>
        </div>
        <div className="wpe-body">
          <div className="wpe-row">
            <label>Nome dell'arma</label>
            <input type="text" value={weaponName||""} placeholder={baseDef?baseDef.name:"nome"} onChange={function(e){ onName(e.target.value); }}/>
          </div>
          {baseDef ? (
            <div className="wpe-base">Base: <b>{baseDef.name}</b> · {baseDef.dmg} {baseDef.dmgType} · {baseDef.category}{baseDef.props?" · "+baseDef.props:""}</div>
          ) : null}

          <div className="wpe-grid2">
            <div className="wpe-row">
              <label>Dado danni (sovrascrive base)</label>
              <select value={sp.dmgOverride||""} onChange={function(e){ set({dmgOverride:e.target.value||null}); }}>
                <option value="">base ({baseDef?baseDef.dmg:"—"})</option>
                {DICE_OPTIONS.map(function(d){ return <option key={d} value={d}>{d}</option>; })}
              </select>
            </div>
            <div className="wpe-row">
              <label>Bonus magico</label>
              <select value={sp.enhancement||0} onChange={function(e){ set({enhancement:+e.target.value, isMagic:+e.target.value>0?true:sp.isMagic}); }}>
                <option value={0}>nessuno</option><option value={1}>+1</option><option value={2}>+2</option><option value={3}>+3</option>
              </select>
            </div>
          </div>

          <div className="wpe-grid2">
            <label className="wpe-toggle"><input type="checkbox" checked={!!sp.isMagic} onChange={function(e){ set({isMagic:e.target.checked}); }}/> <span>magica</span></label>
            <label className="wpe-toggle"><input type="checkbox" checked={!!sp.requiresAttunement} onChange={function(e){ set({requiresAttunement:e.target.checked}); }}/> <span>richiede sintonia</span></label>
          </div>

          {/* Danni extra */}
          <div className="wpe-sec">
            <div className="wpe-sec-head"><span>Danni extra</span><button className="wpe-add" onClick={addExtra}>+ aggiungi</button></div>
            {extraDamage.length===0?<div className="wpe-empty">Nessuno.</div>:null}
            {extraDamage.map(function(ed,i){
              return (
                <div className="wpe-extra" key={i}>
                  <select value={ed.dice} onChange={function(e){ setExtra(i,{dice:e.target.value}); }}>
                    {DICE_OPTIONS.map(function(d){ return <option key={d} value={d}>{d}</option>; })}
                  </select>
                  <select value={ed.damageType} onChange={function(e){ setExtra(i,{damageType:e.target.value}); }}>
                    <optgroup label="Fisici">{PHYS_DMG_TYPES.map(function(t){return <option key={t} value={t}>{t}</option>;})}</optgroup>
                    <optgroup label="Elementali">{ELEM_DMG_TYPES.map(function(t){return <option key={t} value={t}>{t}</option>;})}</optgroup>
                  </select>
                  <select value={ed.condition} onChange={function(e){ setExtra(i,{condition:e.target.value}); }}>
                    {DMG_CONDITIONS.map(function(c){return <option key={c.id} value={c.id}>{c.label}</option>;})}
                  </select>
                  {ed.condition==="vsType"?(
                    <select value={ed.creatureType||""} onChange={function(e){ setExtra(i,{creatureType:e.target.value}); }}>
                      <option value="">— tipo —</option>
                      {CREATURE_TYPES.map(function(t){return <option key={t} value={t}>{t}</option>;})}
                    </select>
                  ):null}
                  <button className="wpe-del" onClick={function(){ delExtra(i); }}>✕</button>
                </div>
              );
            })}
          </div>

          <div className="wpe-adv-t" onClick={function(){ setAdvOpen(!advOpen); }}>{advOpen?"▾":"▸"} Proprietà avanzate</div>
          {advOpen?(
            <div className="wpe-adv">
              <div className="wpe-sec">
                <div className="wpe-sec-head"><span>Effetti a segno (TS)</span><button className="wpe-add" onClick={addOnHit}>+ aggiungi</button></div>
                {onHit.length===0?<div className="wpe-empty">Nessuno.</div>:null}
                {onHit.map(function(oh,i){
                  return (
                    <div className="wpe-onhit" key={i}>
                      <span>CD</span>
                      <input type="number" min={1} value={oh.dc} style={{width:46}} onChange={function(e){ setOnHit(i,{dc:+e.target.value}); }}/>
                      <select value={oh.ability} onChange={function(e){ setOnHit(i,{ability:e.target.value}); }}>
                        {["Forza","Destrezza","Costituzione","Intelligenza","Saggezza","Carisma"].map(function(a){return <option key={a} value={a}>{a}</option>;})}
                      </select>
                      <input type="text" placeholder="effetto" value={oh.effect} onChange={function(e){ setOnHit(i,{effect:e.target.value}); }}/>
                      <button className="wpe-del" onClick={function(){ delOnHit(i); }}>✕</button>
                    </div>
                  );
                })}
              </div>
              <div className="wpe-grid2">
                <div className="wpe-row">
                  <label>Range critico</label>
                  <select value={sp.critRangeBonus||0} onChange={function(e){ set({critRangeBonus:+e.target.value}); }}>
                    <option value={0}>20</option><option value={1}>19-20</option><option value={2}>18-20</option>
                  </select>
                </div>
                <div className="wpe-row">
                  <label>Dadi extra su critico</label>
                  <input type="text" placeholder="es. 1d6 Fuoco" value={sp.extraCritDice||""} onChange={function(e){ set({extraCritDice:e.target.value}); }}/>
                </div>
              </div>
              <div className="wpe-grid2">
                <div className="wpe-row">
                  <label>Resistenza concessa</label>
                  <select value={sp.grantsResistance||""} onChange={function(e){ set({grantsResistance:e.target.value}); }}>
                    <option value="">— nessuna —</option>
                    {ALL_DMG_TYPES.map(function(t){return <option key={t} value={t}>{t}</option>;})}
                  </select>
                </div>
                <div className="wpe-row">
                  <label>Luce (m)</label>
                  <input type="number" min={0} value={sp.lightRadius||0} onChange={function(e){ set({lightRadius:+e.target.value}); }}/>
                </div>
              </div>
              <label className="wpe-toggle"><input type="checkbox" checked={!!(sp.sentient&&sp.sentient.enabled)} onChange={function(e){ set({sentient:Object.assign({},sp.sentient,{enabled:e.target.checked})}); }}/> <span>senziente</span></label>
              {sp.sentient&&sp.sentient.enabled?<input type="text" placeholder="personalità / scopo" value={(sp.sentient&&sp.sentient.notes)||""} onChange={function(e){ set({sentient:Object.assign({},sp.sentient,{notes:e.target.value})}); }} style={{width:"100%"}}/>:null}
              <label className="wpe-toggle"><input type="checkbox" checked={!!(sp.curse&&sp.curse.enabled)} onChange={function(e){ set({curse:Object.assign({},sp.curse,{enabled:e.target.checked})}); }}/> <span>maledetta</span></label>
              {sp.curse&&sp.curse.enabled?<input type="text" placeholder="natura della maledizione" value={(sp.curse&&sp.curse.notes)||""} onChange={function(e){ set({curse:Object.assign({},sp.curse,{notes:e.target.value})}); }} style={{width:"100%"}}/>:null}
            </div>
          ):null}

          <div className="wpe-row">
            <label>Note / descrizione</label>
            <textarea rows={2} value={sp.notes||""} placeholder="lore, effetti narrativi…" onChange={function(e){ set({notes:e.target.value}); }}/>
          </div>

          <div className="wpe-rarity">
            <div><span className="wpe-r-lbl">Rarità</span>
              <select value={sp.rarity||suggested} onChange={function(e){ set({rarity:e.target.value}); }}>
                {RARITIES.map(function(r){return <option key={r.id} value={r.id}>{r.label}</option>;})}
              </select>
            </div>
            <div className="wpe-r-info" style={{color:rarityObj.color}}>punteggio {score} · danno effettivo <b>{effDmg}</b></div>
          </div>
        </div>
        <div className="wpe-foot">
          <button className="wpe-btn primary" onClick={onClose}>Fatto</button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * COMPONENTE: ItemBonusEditor — modale per i bonus di un oggetto d'inventario.
 * Imposta equip/sintonia e i bonus a CARATTERISTICHE e COMPETENZE dell'oggetto.
 * PROPS: item, skillList(string[]: nomi competenze per indice), onPatch(patch), onClose
 * CONNETTORE: scrive SOLO via onPatch (App applica la patch all'oggetto). Niente stato globale.
 * ══════════════════════════════════════════════════════════════════════════ */
function ItemBonusEditor({ item, skillList, onPatch, onClose }) {
  const it = item || {};
  const statMods = it.statMods || {};
  const skillMods = it.skillMods || {};
  const setStat = (st, v) => { const sm = Object.assign({}, statMods); if(v) sm[st]=v; else delete sm[st]; onPatch({statMods: sm}); };
  const setSkill = (idx, v) => { const sm = Object.assign({}, skillMods); if(v) sm[idx]=v; else delete sm[idx]; onPatch({skillMods: sm}); };
  return (
    <div className="wpe-overlay" onClick={e => { if(e.target.className==="wpe-overlay") onClose(); }}>
      <div className="desc-modal" onClick={e=>e.stopPropagation()}>
        <div className="desc-head">
          <b style={{color:"var(--tb)"}}>Bonus oggetto — {it.name||"(senza nome)"}</b>
          <button className="desc-x" onClick={onClose}>×</button>
        </div>
        <div className="ib-row">
          <label className="ib-chk"><input type="checkbox" checked={!!it.equipped} onChange={e=>onPatch({equipped:e.target.checked})}/> Equipaggiato</label>
          <label className="ib-chk"><input type="checkbox" checked={!!it.requiresAttunement} onChange={e=>onPatch({requiresAttunement:e.target.checked, attuned: e.target.checked ? it.attuned : false})}/> Richiede sintonia</label>
          <label className="ib-chk"><input type="checkbox" checked={!!it.attuned} disabled={!it.requiresAttunement} onChange={e=>onPatch({attuned:e.target.checked})}/> In sintonia</label>
        </div>
        <div className="ib-note">I bonus si applicano se l'oggetto è equipaggiato (e in sintonia, quando richiesta).</div>

        <div className="ib-sec">Caratteristiche</div>
        <div className="ib-stats">
          {STATS.map(st => (
            <label key={st} className="ib-stat">{SS[st]}
              <input type="number" value={statMods[st]||0} onChange={e=>setStat(st, +e.target.value||0)} style={{width:46}}/>
            </label>
          ))}
        </div>

        <div className="ib-sec">Competenze</div>
        {Object.keys(skillMods).map(idx => (
          <div key={idx} className="ib-skrow">
            <span style={{flex:1,color:"var(--tx)"}}>{skillList[idx]||("#"+idx)}</span>
            <input type="number" value={skillMods[idx]||0} onChange={e=>setSkill(idx, +e.target.value||0)} style={{width:46}}/>
            <button className="btn bs" style={{borderColor:"var(--rd)",color:"var(--rd)",padding:"1px 6px"}} onClick={()=>setSkill(idx, 0)}>✕</button>
          </div>
        ))}
        <div className="ib-skadd">
          <select value="" onChange={e=>{ if(e.target.value!==""){ setSkill(e.target.value, skillMods[e.target.value]||1); } }}>
            <option value="">+ aggiungi competenza…</option>
            {skillList.map((n,i) => skillMods[i]==null ? <option key={i} value={i}>{n}</option> : null)}
          </select>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * COMPONENTE: NumStepper — input numerico con pulsanti −/+ (riutilizzabile).
 * Serve perché su MOBILE gli input number non hanno frecce (si può solo digitare);
 * i pulsanti −/+ danno l'incremento al tocco su mobile e al clic su desktop.
 * PROPS: value(num), onChange(nuovoValore:num), min?, max?, step?(=1), disabled?, width?
 * Non legge/scrive nulla di condiviso: tutto via props. Connettore = solo onChange.
 * ══════════════════════════════════════════════════════════════════════════ */
function NumStepper({ value, onChange, min, max, step, disabled, width }) {
  const v = (value == null ? 0 : value);
  const st = step || 1;
  const clamp = (x) => { if (min != null && x < min) x = min; if (max != null && x > max) x = max; return x; };
  return (
    <span className="nstep">
      <button type="button" className="nstep-b" disabled={disabled} onClick={() => onChange(clamp(v - st))}>−</button>
      <input type="number" value={v} disabled={disabled} style={{width: width || 44}}
        onChange={(e) => onChange(clamp(+e.target.value || 0))}/>
      <button type="button" className="nstep-b" disabled={disabled} onClick={() => onChange(clamp(v + st))}>+</button>
    </span>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
 * COMPONENTE: CombatTab — Tab "⚔ Combat" (sotto-tab Armi / Manovre / Incantesimi)
 * Componente foglia autonomo: riceve tutto via props, non legge variabili di App
 * per chiusura. Vedi la "GUIDA AI CONNETTORI" in fondo al componente.
 * ══════════════════════════════════════════════════════════════════════════ */
function CombatTab({ ch, setCh, comp, statMods, pmInfo, tl, onRoll, onRollDamage, hpMax }) {
  const [combatSub, setCombatSub] = useState("armi");      // sottotab: armi|manovre|incantesimi
  const [castLv, setCastLv] = useState({});                // livello di lancio per riga incantesimo
  const [spellDry, setSpellDry] = useState(false);         // "a secco di PM"
  const [manExpanded, setManExpanded] = useState(null);    // manovra espansa
  const [manShowAll, setManShowAll] = useState(false);     // mostra manovre senza rank
            const eq = ch.equipment || {};
            const weapons = (eq.weapons || []).map(function(we, idx){ return {we: we, idx: idx}; });
            const equipped = weapons.filter(function(x){ return x.we.equipped; });
            const setWeapons = (arr) => setCh({...ch, equipment: {...eq, weapons: arr}});
            const dualWield = !!eq.dualWield;
            const setDualWield = function(on){
              // spegnendo il dual-wield, azzera le off-hand
              const arr = (eq.weapons||[]).map(function(w){ return on ? w : {...w, offHand:false}; });
              setCh({...ch, equipment: {...eq, weapons: arr, dualWield: on}});
            };

            // competenza "Combattimento a 2 armi": punteggio = cap per entrambe le armi
            const dualSkillIdx = SD.findIndex(function(s){ return s.n === "Combattimento a 2 armi"; });
            const dualSkill = dualSkillIdx >= 0 ? comp[dualSkillIdx] : null;
            const hasDualSkill = !!(dualSkill && (dualSkill.rank || 0) > 0);
            // punteggio competenza (totale = mod Destrezza + bonus competenza)
            const dualCap = skScore(dualSkill, statMods);

            // imposta arma principale "in uso"
            const setInUse = function(idx){
              const arr = (eq.weapons||[]).map(function(w, j){
                if (j === idx) return {...w, inUse: !w.inUse, offHand:false};
                return {...w, inUse:false};
              });
              setWeapons(arr);
            };
            // imposta off-hand (solo in dual-wield, non può essere la principale)
            const setOffHand = function(idx){
              const arr = (eq.weapons||[]).map(function(w, j){
                if (j === idx) return {...w, offHand: !w.offHand, inUse:false};
                return {...w, offHand:false};
              });
              setWeapons(arr);
            };

            // dato un'arma, calcola la sintesi di combattimento.
            // role: "normale" | "main" | "off" — applica cap/malus del dual-wield
            const weaponCombat = function(we, role){
              const def = WEAPONS_DB.find(function(d){ return d.id === we.id; });
              if (!def) return null;
              const sp = we.special;
              const skIdx = SD.findIndex(function(s){ return s.n === def.category; });
              const skc = skIdx >= 0 ? comp[skIdx] : null;
              const attrName = skc ? skc.attr : "Forza";
              const attrMod = statMods[attrName] || 0;
              const profBonus = skc ? Math.max(skc.parz || 0, skc.maxAff != null ? skc.maxAff : -3) + (skc.bs || 0) + (skc.ms || 0) : -3;
              const enh = (sp && sp.enhancement) || 0;
              let toHit = attrMod + profBonus + enh;
              // aggiustamento dual-wield
              let dwNote = "";
              if (role === "main" || role === "off") {
                if (hasDualSkill && dualCap != null) {
                  // il punteggio della competenza fa da CAP a entrambe le armi
                  if (toHit > dualCap) { toHit = dualCap; dwNote = "cap 2 armi " + fmtMod(dualCap); }
                  else dwNote = "sotto il cap (" + fmtMod(dualCap) + ")";
                } else {
                  // senza competenza: principale -3, off-hand -3
                  toHit = toHit - 3;
                  dwNote = (role === "main" ? "−3 principale" : "−3 secondaria") + " (no competenza)";
                }
                // feat / modifica manuale (es. Ambidestria)
                const fm = role === "main" ? (eq.dwMainMod||0) : (eq.dwOffMod||0);
                if (fm) { toHit += fm; dwNote += " · feat " + fmtMod(fm); }
              }
              const baseDmg = specialDmg(def, sp);
              const dmgGroups = [];
              if (baseDmg && baseDmg !== "0" && baseDmg !== "—") {
                dmgGroups.push({ dice: baseDmg, type: def.dmgType, flat: attrMod + enh, label: "base" });
              }
              (sp && sp.extraDamage || []).forEach(function(ed){
                dmgGroups.push({ dice: ed.dice, type: ed.damageType, flat: 0, label: ed.condition, creatureType: ed.creatureType });
              });
              const critRange = 20 - ((sp && sp.critRangeBonus) || 0);
              return { def, sp, attrName, attrMod, profBonus, enh, toHit, dmgGroups, critRange, dwNote, skName: skc ? skc.name : def.category };
            };

            const subTabs = [{id:"armi",l:"Armi"},{id:"manovre",l:"Manovre"},{id:"incantesimi",l:"Incantesimi"}];

            return (
              <div>
                <div className="cmb-subtabs">
                  {subTabs.map(function(st){
                    return <div key={st.id} className={"cmb-subtab" + (combatSub===st.id?" active":"")} onClick={function(){ setCombatSub(st.id); }}>{st.l}</div>;
                  })}
                </div>

                {combatSub === "armi" && (
                  <div>
                    {equipped.length > 0 && (
                      <div className="cmb-dw-bar">
                        <label className="cmb-dw-toggle" title="Attiva per impugnare un'arma in ogni mano">
                          <input type="checkbox" checked={dualWield} onChange={function(e){ setDualWield(e.target.checked); }}/>
                          <span>Un'arma in ogni mano</span>
                        </label>
                        {dualWield ? (
                          <span className="cmb-dw-info">
                            {hasDualSkill
                              ? <span>Competenza <b>Combattimento a 2 armi</b>: cap {fmtMod(dualCap)} su entrambe</span>
                              : <span>Senza competenza: principale −3, secondaria −3</span>}
                          </span>
                        ) : null}
                        {dualWield ? (
                          <span className="cmb-dw-feat" title="Modifica da feat (es. Ambidestria): si somma al tiro">
                            feat: princ.<input type="number" value={eq.dwMainMod||0} onChange={function(e){ setCh({...ch, equipment:{...eq, dwMainMod:+e.target.value||0}}); }} style={{width:38}}/>
                            sec.<input type="number" value={eq.dwOffMod||0} onChange={function(e){ setCh({...ch, equipment:{...eq, dwOffMod:+e.target.value||0}}); }} style={{width:38}}/>
                          </span>
                        ) : null}
                      </div>
                    )}
                    {equipped.length === 0 ? (
                      <div className="cmb-empty">Nessun'arma equipaggiata. Vai in <b>Equipaggiamento</b> e spunta "Equip." sulle armi che vuoi usare in combattimento.</div>
                    ) : equipped.map(function(x){
                      const we = x.we;
                      const role = we.inUse ? "main" : we.offHand ? "off" : (dualWield ? "normale" : "normale");
                      const wc = weaponCombat(we, (we.inUse && dualWield) ? "main" : (we.offHand && dualWield) ? "off" : "normale");
                      if (!wc) return null;
                      const sp = we.special;
                      const dispName = we.name || (sp && sp.name) || wc.def.name;
                      const rarityObj = sp ? (RARITIES.find(function(r){return r.id===(sp.rarity||rarityFromScore(calcWeaponScore(sp)));})||null) : null;
                      const hitStr = fmtMod(wc.toHit);
                      const dmgDisplay = wc.dmgGroups.map(function(g){
                        const flatStr = g.flat ? (g.flat>=0?"+"+g.flat:""+g.flat) : "";
                        const condStr = g.label==="vsType" ? " vs "+(g.creatureType||"?") : g.label==="onCrit" ? " (crit)" : g.label==="onNat20" ? " (20)" : "";
                        return g.dice + flatStr + " " + g.type + condStr;
                      });
                      const roleBadge = (we.inUse && dualWield) ? "principale" : (we.offHand && dualWield) ? "secondaria" : null;
                      return (
                        <div key={x.idx} className={"cmb-weapon" + (we.inUse||we.offHand?" inuse":"")}>
                          <div className="cmb-w-head">
                            <div className="cmb-w-sel">
                              {dualWield ? (
                                <span className="cmb-hand-btns">
                                  <button className={"cmb-hand" + (we.inUse?" act":"")} onClick={function(){ setInUse(x.idx); }} title="Arma principale (mano dominante)">P</button>
                                  <button className={"cmb-hand off" + (we.offHand?" act":"")} onClick={function(){ setOffHand(x.idx); }} title="Arma secondaria (off-hand)">S</button>
                                </span>
                              ) : (
                                <input type="radio" name="inUseWeapon" checked={!!we.inUse} onChange={function(){ setInUse(x.idx); }} title="Arma in uso (per le Manovre)"/>
                              )}
                              <span style={{color: sp ? (rarityObj?rarityObj.color:"var(--gb)") : "var(--tb)", fontWeight:700}}>{dispName}{wc.enh?" +"+wc.enh:""}</span>
                              {roleBadge ? <span className={"cmb-role-badge" + (roleBadge==="secondaria"?" off":"")}>{roleBadge}</span> : null}
                            </div>
                            <span className="cmb-w-cat">{wc.def.category}{wc.def.family==="marziale"?" (M)":""}</span>
                          </div>

                          <div className="cmb-w-body">
                            {/* Tiro per colpire */}
                            <div className="cmb-block">
                              <div className="cmb-b-lbl">Per colpire</div>
                              <div className="cmb-tohit">
                                <span className="cmb-bonus" title={wc.attrName + " " + fmtMod(wc.attrMod) + " · competenza " + fmtMod(wc.profBonus) + (wc.enh?" · magico +"+wc.enh:"")}>
                                  {hitStr}
                                </span>
                                <span className="cmb-formula">{wc.attrName.slice(0,3)} {fmtMod(wc.attrMod)} · comp {fmtMod(wc.profBonus)}{wc.enh?" · mag +"+wc.enh:""}{wc.dwNote?" · "+wc.dwNote:""}</span>
                                {onRoll ? <button className="cmb-roll" onClick={function(){ onRoll("⚔ " + dispName + " (per colpire)" + (roleBadge?" ["+roleBadge+"]":""), wc.toHit); }} title={"Tira d20 " + hitStr}>🎲 tira</button> : null}
                              </div>
                              {wc.critRange < 20 ? <div className="cmb-crit-note">critico {wc.critRange}-20</div> : null}
                            </div>

                            {/* Danni */}
                            <div className="cmb-block">
                              <div className="cmb-b-lbl">Danni {dmgDisplay.length>1?"("+dmgDisplay.length+" tipi)":""}</div>
                              <div className="cmb-dmg-list">
                                {dmgDisplay.map(function(d, di){ return <span key={di} className="cmb-dmg-tag">{d}</span>; })}
                              </div>
                              <div className="cmb-dmg-btns">
                                {onRollDamage ? <button className="cmb-roll" onClick={function(){ onRollDamage("⚔ " + dispName, wc.dmgGroups, false); }} title="Tira tutti i dadi danno">🎲 danni</button> : null}
                                {onRollDamage ? <button className="cmb-roll crit" onClick={function(){ onRollDamage("⚔ " + dispName, wc.dmgGroups, true); }} title="Tira i danni come critico (dadi raddoppiati)">💥 critico</button> : null}
                              </div>
                            </div>
                          </div>

                          {sp && sp.notes ? <div className="cmb-w-notes">{sp.notes}</div> : null}
                          {sp && (sp.onHit||[]).length ? (
                            <div className="cmb-w-notes">
                              {(sp.onHit||[]).map(function(oh,oi){ return <div key={oi}>A segno: TS {oh.ability} CD {oh.dc}{oh.effect?" o "+oh.effect:""}</div>; })}
                            </div>
                          ) : null}
                          {sp && sp.requiresAttunement ? <div className="cmb-w-notes">richiede sintonia</div> : null}
                        </div>
                      );
                    })}
                  </div>
                )}

                {combatSub === "manovre" && (function(){
                  // arma principale in uso (per il confronto "arma -3")
                  const mainW = (eq.weapons||[]).find(function(w){ return w.inUse; });
                  let mainHit = null, mainName = null;
                  if (mainW) {
                    const wcMain = weaponCombat(mainW, "normale");
                    if (wcMain) { mainHit = wcMain.toHit; mainName = mainW.name || (mainW.special&&mainW.special.name) || wcMain.def.name; }
                  }
                  // indicizza le manovre del SD con il punteggio calcolato
                  const maneuvers = [];
                  SD.forEach(function(sd, i){
                    if (sd.c !== "Manovre di Combattimento") return;
                    const info = MANEUVERS_INFO[sd.n];
                    if (!info) return;
                    const skc = comp[i];
                    const rank = skc ? (skc.rank||0) : 0;
                    const score = skScore(skc, statMods);
                    maneuvers.push({ name: sd.n, attr: skc?skc.attr:"?", rank: rank, score: score, info: info });
                  });

                  // punteggio effettivo di una manovra-attacco: max(score manovra, arma-3)
                  const effManScore = function(m, penalty){
                    const pen = penalty || 3;
                    const base = m.score != null ? m.score : -3;
                    if (mainHit != null) return Math.max(base, mainHit - pen);
                    return base;
                  };

                  const visible = manShowAll ? maneuvers : maneuvers.filter(function(m){ return m.rank > 0; });
                  const hiddenCount = maneuvers.length - maneuvers.filter(function(m){ return m.rank>0; }).length;

                  return (
                    <div>
                      <div className="man-bar">
                        {mainName
                          ? <span className="man-ref">Arma principale: <b style={{color:"var(--gb)"}}>{mainName}</b> (colpire {mainHit>=0?"+":""}{mainHit})</span>
                          : <span className="man-ref" style={{color:"var(--td)"}}>Nessun'arma principale selezionata nel sottotab Armi: i confronti "arma −3" non saranno calcolati.</span>}
                      </div>

                      {visible.length === 0 && !manShowAll ? (
                        <div className="cmb-empty">Non hai punti in nessuna manovra. {hiddenCount>0?<button className="cmb-roll" onClick={function(){ setManShowAll(true); }}>Mostra tutte le manovre</button>:null}</div>
                      ) : (
                        MANEUVER_GROUPS.map(function(g){
                          const inGroup = visible.filter(function(m){ return m.info.type === g.id; });
                          if (!inGroup.length) return null;
                          return (
                            <div key={g.id} className="man-group">
                              <div className="man-group-h">{g.label}</div>
                              {inGroup.map(function(m){
                                const open = manExpanded === m.name;
                                const isAttack = m.info.roll && (m.info.type==="attacco"||m.info.type==="reazione"||m.info.type==="bonus"||m.info.type==="situazionale"||m.info.type==="rinuncia");
                                // punteggio mostrato
                                const isBlind = m.name === "Combattimento alla cieca";
                                const isShield = m.name === "Colpo di Scudo";
                                let shownScore = m.score;
                                let scoreNote = "";
                                if (m.info.type === "attacco") {
                                  shownScore = effManScore(m, 3);
                                  if (mainHit != null && (m.score==null || m.score < mainHit - 3)) scoreNote = "arma −3";
                                  else scoreNote = "manovra";
                                } else if (isBlind) {
                                  // punteggio manovra -3, o arma -6
                                  const base = (m.score!=null?m.score:-3) - 3;
                                  shownScore = mainHit!=null ? Math.max(base, mainHit-6) : base;
                                } else if (isShield) {
                                  shownScore = (m.score!=null?m.score:-3) - 3;
                                }
                                return (
                                  <div key={m.name} className={"man-row" + (open?" open":"") + (m.rank===0?" norank":"")}>
                                    <div className="man-row-h" onClick={function(){ setManExpanded(open?null:m.name); }}>
                                      <span className="man-caret">{open?"▾":"▸"}</span>
                                      <span className="man-name">{m.name}</span>
                                      <span className="man-attr">{m.attr}</span>
                                      {m.rank>0 ? <span className="man-rank" title={"Rank "+m.rank}>punt. {m.score>=0?"+":""}{m.score}</span> : <span className="man-norank">no rank</span>}
                                    </div>
                                    {open ? (
                                      <div className="man-detail">
                                        <div className="man-desc">{m.info.desc}</div>
                                        {(m.info.type==="attacco" || isBlind || isShield) ? (
                                          <div className="man-roll-row">
                                            <span className="man-score">colpire: <b>{shownScore>=0?"+":""}{shownScore}</b>{scoreNote?<span className="man-score-note"> ({scoreNote})</span>:null}{isBlind?<span className="man-score-note"> (alla cieca)</span>:null}{isShield?<span className="man-score-note"> (scudo −3)</span>:null}</span>
                                            {onRoll ? <button className="cmb-roll" onClick={function(){ onRoll("⚔ " + m.name, shownScore); }}>🎲 tira</button> : null}
                                            {isShield && onRollDamage ? <button className="cmb-roll" onClick={function(){ onRollDamage("⚔ Colpo di Scudo", [{dice:"1d3", type:"Contundente", flat:(statMods.Forza||0)}], false); }}>🎲 danni 1d3+For</button> : null}
                                          </div>
                                        ) : null}
                                      </div>
                                    ) : null}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })
                      )}

                      {!manShowAll && hiddenCount>0 && visible.length>0 ? (
                        <button className="man-showall" onClick={function(){ setManShowAll(true); }}>+ Mostra anche le altre {hiddenCount} manovre (senza rank, tirabili con penalità)</button>
                      ) : null}
                      {manShowAll ? (
                        <button className="man-showall" onClick={function(){ setManShowAll(false); }}>− Mostra solo le mie manovre</button>
                      ) : null}
                    </div>
                  );
                })()}

                {combatSub === "incantesimi" && (function(){
                  // Modificatore di scuola: comp[].tot include GIÀ rank + caratteristica magica.
                  // Regole rev10: CD = 8 + mod. scuola; Attacco = mod. scuola (la caratteristica NON si risomma).
                  const schoolMod = {};
                  SD.forEach(function(sd, i){ if (sd.c === "Incantesimi" && comp[i]) schoolMod[sd.n] = comp[i].tot; });

                  const repertoire = ch.spells || [];
                  // Incantesimi del repertorio (dati dal DB via dbId): trucchetti sempre; gli altri se memorizzati,
                  // oppure tutti quando nessuno è segnato come memorizzato.
                  const anyPrep = repertoire.some(function(sp){ return sp && sp.prepared; });
                  const combatSpells = repertoire.map(function(sp, idx){
                    return { sp: sp, idx: idx, db: resolveSpellDb(sp) };
                  }).filter(function(o){ return o.db && ((o.db.level || 0) === 0 || !anyPrep || o.sp.prepared); })
                    .sort(function(a,b){ return (a.db.level||0) - (b.db.level||0) || (a.sp.name||a.db.name||"").localeCompare(b.sp.name||b.db.name||""); });

                  const pmUsed = ch.pmUsed || 0;
                  const pmRem  = Math.max(0, pmInfo.pm - pmUsed);
                  // Lancio (R4.12–R4.16): entro soglia toglie i PM; in sovra-lancio tira contro la CD, paga i PM che ha,
                  // applica il pedaggio ai PF e l'immunità alle cure per «livello» round.
                  const castSpell = function(dispName, lv, isOver, ocCD, rollMod){
                    const paid = Math.min(lv, pmRem);
                    if (!isOver) { setCh({ ...ch, pmUsed: pmUsed + paid }); return; }
                    const e = onRoll ? onRoll("✦ Sovra-lancio " + dispName + " L" + lv + " (CD " + ocCD + ")", rollMod) : null;
                    if (!e) return;
                    const outcome = e.chosen === 20 ? "ok" : e.chosen === 1 ? "nat1" : e.total >= ocCD ? "ok" : "fail";
                    const toll = overcastDamage(lv, outcome);
                    const curDmg = ch.hpDmg || 0;
                    const hpNow = (hpMax || 0) - curDmg;
                    const excess = toll - Math.max(0, hpNow);
                    const maxDmg = hpMax ? hpMax : curDmg + toll;
                    setCh({ ...ch, pmUsed: pmUsed + paid, hpDmg: Math.min(maxDmg, curDmg + toll), noHeal: { rounds: lv, spell: dispName, t: Date.now() } });
                    const what = outcome === "ok" ? (e.chosen === 20 ? "riuscito, 20 nat." : "riuscito") : outcome === "nat1" ? "1 naturale, fa cilecca" : "fallito, fa cilecca";
                    const tail = hpMax && excess >= hpMax ? " — danno in eccesso " + excess + " ≥ PF massimi: morte istantanea" : hpMax && excess > 0 ? " — a 0 PF" : "";
                    if (onRollDamage) onRollDamage("☠ Pedaggio " + dispName + " L" + lv + " (" + what + ", −" + paid + " PM, niente cure per " + lv + " round)" + tail, [{ dice: String(toll), type: "Pedaggio", flat: 0 }], false);
                  };
                  const soglia = pmInfo.soglia;

                  const ssLabel = function(s){ return s === "half" ? "½ TS" : s === "none" ? "TS nega" : "TS spec."; };
                  // Livello di lancio scelto per riga (default = livello base dell'incantesimo).
                  const lvOf  = function(idx, base){ const v = castLv[idx]; return v != null ? Math.max(base, Math.min(9, v)) : base; };
                  const setLvOf = function(idx, v){ const nv = {}; for (var k in castLv) nv[k] = castLv[k]; nv[idx] = v; setCastLv(nv); };

                  return (
                    <div className="cmb-spells">
                      {/* Stato Punti Magia */}
                      <div className="cmb-pm-bar">
                        {pmInfo.pm > 0
                          ? <span><b style={{color: pmRem<=0?"var(--rd)":"var(--gb)"}}>{pmRem}</b> / {pmInfo.pm} PM · soglia <b>{soglia}</b> (lanci fino al {soglia}° senza penalità)</span>
                          : <span>Nessun PM nativo — ogni lancio passa dal sovra-lancio.</span>}
                        <label className="cmb-dry" title="PM insufficienti per il lancio: aggiunge il pedaggio «a secco» anche entro soglia">
                          <input type="checkbox" checked={spellDry} onChange={function(e){ setSpellDry(e.target.checked); }}/> a secco di PM
                        </label>
                      </div>

                      {/* Sintesi CD / attacco per scuola */}
                      <div className="cmb-spell-sec">CD &amp; attacco per scuola</div>
                      <div className="cmb-school-grid">
                        {(function(){
                          const present = [];
                          combatSpells.forEach(function(o){ const s=(o.db && o.db.school) || o.sp.school; if(s && present.indexOf(s)<0) present.push(s); });
                          return present.map(function(s){
                            const m = schoolMod[s];
                            return (
                              <div key={s} className="cmb-school-cell">
                                <div className="cmb-school-name">{s}</div>
                                <div className="cmb-school-vals">CD <b>{m!=null?8+m:"—"}</b> · att <b>{m!=null?fmtMod(m):"—"}</b></div>
                              </div>
                            );
                          });
                        })()}
                      </div>

                      {/* Lista incantesimi: scegli il livello di lancio per riga (stile BG3) */}
                      <div className="cmb-spell-sec">Incantesimi ({combatSpells.length})</div>
                      <div className="cmb-spell-list">
                        {combatSpells.map(function(o){
                          const db = o.db, sp = o.sp, idx = o.idx;
                          const m = schoolMod[(db && db.school) || sp.school];
                          const mm = (m != null ? m : 0);
                          const base = db.level || 0;
                          const isCantrip = base === 0;
                          const lv = isCantrip ? base : lvOf(idx, base);
                          const dmgRef = isCantrip ? base : lv;
                          const dice = db.damage ? spellDiceAt(db.damage, dmgRef, tl) : null;
                          const dmgType = db.damage ? db.damage.type : "";
                          const groups = dice ? parseDmgExpr(dice, dmgType) : [];
                          const dispName = sp.name || db.name;
                          const rollTag = isCantrip ? dispName : (dispName + " (L" + lv + ")");
                          const canScale = !!(db.damage && db.damage.scale === "slot" && Object.keys(db.damage.table).length > 1);
                          const dry = !isCantrip && (spellDry || pmRem < lv);              // a secco: casella o PM insufficienti
                          const isOver = !isCantrip && (lv > soglia || dry);
                          const ocCD = isOver ? overcastCD(lv, soglia, dry) : 0;          // CD del sovra-lancio
                          const ocDry = (isOver && dry) ? (1 + lv) : 0;                   // termine a secco (P-15)
                          const ocOver = isOver ? (ocCD - 10 - ocDry) : 0;              // sforamento (derivato: CD − base 10 − a secco)
                          const rollMod = mm;                                           // tiro pulito: solo mod. scuola
                          return (
                            <div key={idx} className={"cmb-spell-row" + (isOver ? " over" : "")}>
                              <div className="cmb-spell-head">
                                <span className="cmb-spell-name">{dispName}</span>
                                <span className="cmb-spell-meta">{isCantrip?"Trucchetto":"L"+base} · {sp.school}{db.concentration?" · conc.":""}</span>
                              </div>
                              <div className="cmb-spell-stats">
                                {db.attack ? (
                                  <span className="cmb-spell-stat">
                                    <span className="cmb-spell-lab">Attacco</span> <b>{m!=null?fmtMod(m):"—"}</b> <span className="cmb-spell-sub">{db.attack==="ranged"?"dist.":"mischia"}</span>
                                    {onRoll && m!=null ? <button className="cmb-roll" title={"Tira d20 "+fmtMod(m)} onClick={function(){ onRoll("✦ "+dispName+" (per colpire)", m); }}>🎲</button> : null}
                                  </span>
                                ) : null}
                                {db.dc ? (
                                  <span className="cmb-spell-stat"><span className="cmb-spell-lab">CD</span> <b>{m!=null?8+m:"—"}</b> <span className="cmb-spell-sub">{db.dc.ability} · {ssLabel(db.dc.success)}</span></span>
                                ) : null}
                              </div>

                              {/* Livello di lancio + danni a quel livello */}
                              <div className="cmb-spell-cast">
                                {isCantrip ? (
                                  <span className="cmb-spell-sub">Trucchetto · scala al tuo livello (PG {tl})</span>
                                ) : (
                                  <label className="cmb-lvl-pick" title="Livello di lancio">lancio L
                                    <input type="number" min={base} max="9" value={lv} onChange={function(e){ setLvOf(idx, Math.max(base, Math.min(9, parseInt(e.target.value,10)||base))); }}/>
                                  </label>
                                )}
                                {groups.length ? (
                                  <span className="cmb-spell-stat">
                                    <span className="cmb-spell-lab">Danni</span> <b>{dice}</b> <span className="cmb-spell-sub">{dmgType}</span>
                                    {onRollDamage ? <button className="cmb-roll" title="Tira i dadi danno" onClick={function(){ onRollDamage("✦ "+rollTag, groups, false); }}>🎲</button> : null}
                                    {onRollDamage ? <button className="cmb-roll crit" title="Danni critici (dadi raddoppiati)" onClick={function(){ onRollDamage("✦ "+rollTag, groups, true); }}>💥</button> : null}
                                  </span>
                                ) : null}
                                {!isCantrip && db.damage && !canScale && lv > base ? <span className="cmb-spell-sub">· l'upcast non aumenta i danni</span> : null}
                              </div>

                              {/* Sovra-lancio inline quando il livello sfora la soglia (o a secco) */}
                              {isOver ? (
                                <div className="cmb-spell-over">
                                  <div className="cmb-oc-line">
                                    <b>⚠ Sovra-lancio</b> {lv>soglia?("L"+lv+" > soglia "+soglia):"a secco"} · 1d20 {fmtMod(rollMod)} vs <b style={{color:"var(--rd)"}}>CD {ocCD}</b> (base 10{ocOver>0?(" + sforamento "+ocOver):""}{ocDry>0?(" + a secco "+ocDry):""})
                                    {onRoll ? <button className="cmb-roll cmb-cast" title={"Lancia: tira contro CD " + ocCD + ", paga i PM che hai, applica il pedaggio ai PF e l'immunità alle cure"} onClick={function(){ castSpell(dispName, lv, true, ocCD, rollMod); }}>Lancia</button> : null}
                                  </div>
                                  <div className="cmb-oc-toll">
                                    Pedaggio a mano:
                                    {onRollDamage ? <button className="cmb-roll" title="Riuscito (livello ×3)" onClick={function(){ onRollDamage("☠ Pedaggio "+dispName+" (ok)", parseDmgExpr(String(overcastDamage(lv,"ok")),"Pedaggio"), false); }}>ok {overcastDamage(lv,"ok")}</button> : null}
                                    {onRollDamage ? <button className="cmb-roll" title="Fallito (livello ×6)" onClick={function(){ onRollDamage("☠ Pedaggio "+dispName+" (fallito)", parseDmgExpr(String(overcastDamage(lv,"fail")),"Pedaggio"), false); }}>fail {overcastDamage(lv,"fail")}</button> : null}
                                    {onRollDamage ? <button className="cmb-roll crit" title="1 naturale (livello ×12)" onClick={function(){ onRollDamage("☠ Pedaggio "+dispName+" (1 nat.)", parseDmgExpr(String(overcastDamage(lv,"nat1")),"Pedaggio"), false); }}>1nat {overcastDamage(lv,"nat1")}</button> : null}
                                    <span className="cmb-oc-note">· 20 nat. ok · 1 nat. ×12 · niente cure {lv} round</span>
                                  </div>
                                </div>
                              ) : (!isCantrip ? <div className="cmb-spell-okline">✓ entro soglia (L{lv} ≤ {soglia})<button className="cmb-roll cmb-cast" title={"Lancia: toglie " + lv + " PM"} onClick={function(){ castSpell(dispName, lv, false, 0, rollMod); }}>Lancia · {lv} PM</button></div> : null)}

                              {db.effects ? <div className="cmb-spell-eff">{db.effects}</div> : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
  /* ─────────────────────────── GUIDA AI CONNETTORI — CombatTab ───────────────────────────
   * PROPS IN (le riceve da App, non le calcola):
   *   ch            : oggetto personaggio (sola lettura qui dentro).
   *   setCh(next)    : unico canale di SCRITTURA sul personaggio.
   *   comp          : competenze già calcolate da computeAll (parallelo a SD). Da qui i mod. scuola.
   *   statMods      : modificatori di caratteristica finali { Forza:+n, ... }.
   *   pmInfo        : { pm, soglia, per } dal motore pmSoglia.
   *   tl            : livello totale del personaggio (per lo scaling dei trucchetti).
   *   onRoll(label, mod)            : tira 1d20+mod nel dock dadi (di Dashboard).
   *   onRollDamage(label, groups, crit): tira gruppi danno nel dock dadi.
   *
   * LEGGE da ch:   ch.equipment (armi, dwMainMod/dwOffMod), ch.spells (repertorio), ch.pmUsed.
   * SCRIVE su ch (solo via setCh): ch.equipment.weapons (uso/sintonia/2-armi), ch.pmUsed.
   *
   * STATO INTERNO (non esce dal componente): combatSub, castLv, spellDry, manExpanded, manShowAll.
   *
   * GLOBALI DI MODULO usati (definiti fuori, condivisi, NON props):
   *   SD, WEAPONS_DB, MANEUVERS_INFO, SPELLS_BY_ID, resolveSpellDb, fmtMod, skScore,
   *   parseDmgExpr, spellDiceAt, overcastCD, overcastDamage, weaponCombat-helpers.
   *
   * IMPATTO SUGLI ALTRI TAB: nessuna scrittura condivisa oltre a ch.equipment.weapons e ch.pmUsed.
   *   Modifiche qui NON toccano la struttura di ch né altri tab, finché si passa solo da setCh.
   *   Se cambia la forma di comp/statMods/pmInfo (in App), aggiornare i punti che li consumano qui.
   * ──────────────────────────────────────────────────────────────────────────────────────── */
}

/* ══════════════════════════════════════════════════════════════════════════
 * COMPONENTE: SpellsTab — Tab "Incantesimi" (repertorio del PG + catalogo SRD).
 * Componente foglia: tutto via props. Vedi "GUIDA AI CONNETTORI" in fondo.
 * ══════════════════════════════════════════════════════════════════════════ */
function SpellsTab({ ch, setCh, autoGA, pmInfo, isMobile, setDescSp }) {
  const [spellFilter, setSpellFilter] = useState("all");   // all | available | prepared
  const [spellSearch, setSpellSearch] = useState("");
  const [catOpen, setCatOpen] = useState(false);           // catalogo aperto
  const [catClass, setCatClass] = useState("__char__");    // __char__ = classi PG, __all__ = tutte
  const [catSchool, setCatSchool] = useState("");
  const [catLevel, setCatLevel] = useState("");
  const [catText, setCatText] = useState("");
  const [catDetail, setCatDetail] = useState(null);        // id incantesimo espanso nel catalogo
  const [spellOpen, setSpellOpen] = useState({});          // accordion repertorio mobile
            const allSpells = ch.spells || [];
            const sLow = (spellSearch || "").toLowerCase();
            // Filtraggio: mantengo l'indice originale per gli update
            const filteredSpells = allSpells.map((sp, origIdx) => ({sp, origIdx})).filter(({sp}) => {
              // Retrocompat: se available è undefined (scheda salvata prima di v5.2), trattiamolo come disponibile
              if (spellFilter === "available" && sp.available === false) return false;
              if (spellFilter === "prepared" && !sp.prepared) return false;
              if (sLow && !((sp.name||"").toLowerCase().includes(sLow))) return false;
              return true;
            }).sort(function(a,b){ return ((a.sp.level||0) - (b.sp.level||0)) || (a.sp.name||"").localeCompare(b.sp.name||""); });
            const slots = ch.spellSlots || {1:{max:0,used:0},2:{max:0,used:0},3:{max:0,used:0},4:{max:0,used:0},5:{max:0,used:0},6:{max:0,used:0},7:{max:0,used:0},8:{max:0,used:0},9:{max:0,used:0}};
            const updateSp = (i, patch) => { const s=[...allSpells]; s[i]={...s[i], ...patch}; setCh({...ch, spells:s}); };
            const toggleFlag = (i, flag) => { const s=[...allSpells]; s[i]={...s[i], [flag]: !s[i][flag]}; setCh({...ch, spells:s}); };
            const removeSp = (i) => { setCh({...ch, spells: allSpells.filter((_,j)=>j!==i)}); setSpellOpen(o=>{const n={...o};delete n[i];return n;}); };
            const addSp = () => {
              const newSp = {level:1,name:"",school:"",castTime:"",effects:"",available:true,prepared:false,concentration:false};
              setCh({...ch, spells:[...allSpells, newSp]});
              if (spellFilter === "prepared") setSpellFilter("all");
            };
            const setSlot = (lvl, field, val) => {
              const v = Math.max(0, parseInt(val,10)||0);
              const ns = {...slots, [lvl]: {...(slots[lvl]||{max:0,used:0}), [field]: v}};
              setCh({...ch, spellSlots: ns});
            };
            const incSlotUsed = (lvl, delta) => {
              const cur = slots[lvl] || {max:0,used:0};
              const nu = Math.max(0, Math.min(cur.max||0, (cur.used||0) + delta));
              setSlot(lvl, "used", nu);
            };
            // Le proprietà descrittive (nome, lv, scuola, lancio, effetti, concentration, slot max) sono editabili solo fuori da locked.
            // I "marker di sessione" (prepared, available, slot used) restano sempre editabili — riflettono lo stato del giocatore al tavolo.
            const dis = ch.locked && ch.creationDone;

            const filterPills = (
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {[{k:"all",l:"Tutti"},{k:"available",l:"Disponibili"},{k:"prepared",l:"Memorizzati"}].map(o => (
                  <button key={o.k} className="btn bs"
                    onClick={() => setSpellFilter(o.k)}
                    style={{
                      background: spellFilter===o.k ? "var(--gd)" : "var(--b3)",
                      color: spellFilter===o.k ? "var(--bg)" : "var(--tx)",
                      borderColor: spellFilter===o.k ? "var(--gd)" : "var(--bd)",
                      fontWeight: spellFilter===o.k ? 700 : 400
                    }}>
                    {o.l} ({o.k==="all" ? allSpells.length : allSpells.filter(s => o.k==="available" ? s.available !== false : !!s.prepared).length})
                  </button>
                ))}
              </div>
            );

            const pmUsed = ch.pmUsed || 0;
            const pmRem = Math.max(0, pmInfo.pm - pmUsed);
            const setPmUsed = (v) => setCh({...ch, pmUsed: Math.max(0, Math.min(pmInfo.pm, v))});
            const recovery = (pmInfo.per || []).some(function(p){ return p.recovery === "breve"; }) ? "riposo breve" : "riposo lungo";
            const pmTracker = pmInfo.pm > 0 ? (
              <div style={{background:"var(--b3)",border:"1px solid var(--bd)",borderRadius:4,padding:"6px 8px",marginTop:6,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
                <div style={{fontSize:".72em",color:"var(--gd)",fontFamily:"'Cinzel',serif"}}>Punti Magia</div>
                <div style={{display:"flex",alignItems:"center",gap:4}}>
                  <button className="btn bs" style={{padding:"0 6px",minWidth:24}} onClick={() => setPmUsed(pmUsed+1)} disabled={pmRem<=0} title="Spendi 1 PM">−</button>
                  <span style={{minWidth:62,textAlign:"center",fontWeight:700,color: pmRem<=0 ? "var(--rd)" : "var(--tb)"}}>{pmRem} / {pmInfo.pm}</span>
                  <button className="btn bs" style={{padding:"0 6px",minWidth:24}} onClick={() => setPmUsed(pmUsed-1)} disabled={pmUsed<=0} title="Recupera 1 PM">+</button>
                </div>
                <button className="btn bs" onClick={() => setPmUsed(0)} title={"Recupera tutti i PM ("+recovery+")"}>↻ Riposo</button>
                <div style={{fontSize:".72em",color:"var(--td)"}}>Soglia {pmInfo.soglia} · lanci fino al {pmInfo.soglia}° livello senza penalità · recupero: {recovery}</div>
              </div>
            ) : (
              <div style={{background:"var(--b3)",border:"1px solid var(--bd)",borderRadius:4,padding:"6px 8px",marginTop:6,fontSize:".74em",color:"var(--td)"}}>
                Nessun Punto Magia nativo per questa classe — ogni lancio passa dal sovra-lancio (vedi le regole della magia).
              </div>
            );

            const searchBox = (
              <input type="text" placeholder="🔍 Cerca incantesimo..." value={spellSearch} onChange={e => setSpellSearch(e.target.value)}
                style={{flex:1,minWidth:140,padding:"3px 6px",background:"var(--ip)",border:"1px solid var(--bd)",color:"var(--tb)",borderRadius:3,fontSize:".82em"}}/>
            );

            // ═════ DESKTOP LIST ═════
            const desktopList = (
              <table className="sk" style={{marginTop:6}}>
                <thead><tr>
                  <th style={{width:32}}>Lv</th>
                  <th style={{width:34}} title="Disponibile (lo conosci)">Disp</th>
                  <th style={{width:34}} title="Memorizzato (preparato per oggi)">Mem</th>
                  <th style={{width:34}} title="Richiede concentrazione">🌀</th>
                  <th style={{minWidth:120}}>Nome</th>
                  <th>Scuola</th>
                  <th>Lancio</th>
                  <th style={{minWidth:140}}>Effetti</th>
                  <th style={{width:30}}></th>
                </tr></thead>
                <tbody>
                  {filteredSpells.map(({sp,origIdx}) => (
                    <tr key={origIdx} style={sp.prepared ? {background:"rgba(90,170,90,0.20)"} : (sp.available === false ? {opacity:0.55} : undefined)}>
                      <td><input type="number" value={sp.level||0} min={0} max={9} disabled={dis} onChange={e => updateSp(origIdx,{level:+e.target.value})} style={{width:32}}/></td>
                      <td style={{textAlign:"center"}}><input type="checkbox" checked={!!sp.available} disabled={dis} onChange={() => toggleFlag(origIdx,"available")} title="Disponibile"/></td>
                      <td style={{textAlign:"center"}}><input type="checkbox" checked={!!sp.prepared} onChange={() => toggleFlag(origIdx,"prepared")} title="Memorizzato"/></td>
                      <td style={{textAlign:"center"}}><input type="checkbox" checked={!!sp.concentration} disabled={dis} onChange={() => toggleFlag(origIdx,"concentration")} title="Richiede concentrazione"/></td>
                      <td><input type="text" value={sp.name||""} disabled={dis} onChange={e => updateSp(origIdx,{name:e.target.value})} style={{width:"100%"}}/></td>
                      <td><input type="text" value={sp.school||""} disabled={dis} onChange={e => updateSp(origIdx,{school:e.target.value})} style={{width:80}}/></td>
                      <td><input type="text" value={sp.castTime||""} disabled={dis} onChange={e => updateSp(origIdx,{castTime:e.target.value})} style={{width:80}}/></td>
                      <td><span style={{display:"flex",gap:4,alignItems:"center"}}><input type="text" value={sp.effects||""} disabled={dis} onChange={e => updateSp(origIdx,{effects:e.target.value})} style={{flex:1,minWidth:0,width:"100%"}}/><button className="btn bs" style={{padding:"1px 5px"}} title="Descrizione completa" onClick={() => setDescSp(resolveSpellDb(sp) || sp)}>📖</button></span></td>
                      <td>{!dis && <button className="btn bs" style={{borderColor:"var(--rd)",color:"var(--rd)"}} onClick={() => removeSp(origIdx)}>✕</button>}</td>
                    </tr>
                  ))}
                  {filteredSpells.length === 0 && (
                    <tr><td colSpan={9} style={{textAlign:"center",color:"var(--td)",padding:"8px",fontStyle:"italic"}}>Nessun incantesimo {spellFilter==="available" ? "disponibile" : (spellFilter==="prepared" ? "memorizzato" : "")}{sLow ? " corrispondente alla ricerca" : ""}.</td></tr>
                  )}
                </tbody>
              </table>
            );

            // ═════ MOBILE LIST (accordion) ═════
            const mobileList = (
              <div style={{marginTop:6,display:"flex",flexDirection:"column",gap:4}}>
                {filteredSpells.map(({sp,origIdx}) => {
                  const open = !!spellOpen[origIdx];
                  return (
                    <div key={origIdx} style={{
                      border:"1px solid var(--bd)",
                      borderRadius:4,
                      background: sp.prepared ? "rgba(90,170,90,0.20)" : (sp.available === false ? "var(--b2)" : "var(--b3)"),
                      opacity: sp.available === false ? 0.7 : 1
                    }}>
                      {/* Header sempre visibile */}
                      <div style={{display:"flex",alignItems:"center",gap:6,padding:"6px 8px"}}>
                        <span style={{cursor:"pointer",color:"var(--gm)",fontSize:".9em",minWidth:14}}
                          onClick={() => setSpellOpen({...spellOpen, [origIdx]: !open})}>{open ? "▾" : "▸"}</span>
                        <span style={{background:"var(--b2)",color:"var(--gd)",padding:"1px 5px",borderRadius:3,fontWeight:700,fontSize:".82em",minWidth:22,textAlign:"center"}}>{sp.level||0}</span>
                        <span style={{flex:1,fontWeight:600,color:"var(--tb)",fontSize:".92em",cursor:"pointer"}}
                          onClick={() => setSpellOpen({...spellOpen, [origIdx]: !open})}>{sp.name || <em style={{color:"var(--td)"}}>(senza nome)</em>}</span>
                        {sp.concentration && <span title="Concentrazione" style={{color:"var(--gd)",fontSize:".9em"}}>🌀</span>}
                        <label style={{display:"flex",alignItems:"center",gap:2,fontSize:".72em",color:"var(--td)"}}>
                          <input type="checkbox" checked={!!sp.available} disabled={dis} onChange={() => toggleFlag(origIdx,"available")}/>
                          <span>D</span>
                        </label>
                        <label style={{display:"flex",alignItems:"center",gap:2,fontSize:".72em",color:"var(--td)"}}>
                          <input type="checkbox" checked={!!sp.prepared} onChange={() => toggleFlag(origIdx,"prepared")}/>
                          <span>M</span>
                        </label>
                      </div>
                      {/* Body espanso */}
                      {open && (
                        <div style={{borderTop:"1px solid var(--bd)",padding:"6px 8px",display:"flex",flexDirection:"column",gap:4,fontSize:".85em"}}>
                          <div style={{display:"flex",gap:6,alignItems:"center"}}>
                            <label style={{minWidth:60,color:"var(--td)",fontSize:".82em"}}>Livello</label>
                            <input type="number" value={sp.level||0} min={0} max={9} disabled={dis} onChange={e => updateSp(origIdx,{level:+e.target.value})} style={{width:50}}/>
                          </div>
                          <div style={{display:"flex",gap:6,alignItems:"center"}}>
                            <label style={{minWidth:60,color:"var(--td)",fontSize:".82em"}}>Nome</label>
                            <input type="text" value={sp.name||""} disabled={dis} onChange={e => updateSp(origIdx,{name:e.target.value})} style={{flex:1}}/>
                          </div>
                          <div style={{display:"flex",gap:6,alignItems:"center"}}>
                            <label style={{minWidth:60,color:"var(--td)",fontSize:".82em"}}>Scuola</label>
                            <input type="text" value={sp.school||""} disabled={dis} onChange={e => updateSp(origIdx,{school:e.target.value})} style={{flex:1}}/>
                          </div>
                          <div style={{display:"flex",gap:6,alignItems:"center"}}>
                            <label style={{minWidth:60,color:"var(--td)",fontSize:".82em"}}>Lancio</label>
                            <input type="text" value={sp.castTime||""} disabled={dis} onChange={e => updateSp(origIdx,{castTime:e.target.value})} style={{flex:1}}/>
                          </div>
                          <div style={{display:"flex",gap:6,alignItems:"center"}}>
                            <label style={{minWidth:60,color:"var(--td)",fontSize:".82em"}}>Descrizione</label>
                            <button className="btn bs" onClick={() => setDescSp(resolveSpellDb(sp) || sp)}>📖 Apri descrizione</button>
                          </div>
                          <div style={{display:"flex",gap:8,alignItems:"center"}}>
                            <label style={{display:"flex",alignItems:"center",gap:4,fontSize:".82em",color:"var(--td)"}}>
                              <input type="checkbox" checked={!!sp.concentration} disabled={dis} onChange={() => toggleFlag(origIdx,"concentration")}/>
                              <span>Richiede concentrazione</span>
                            </label>
                            {!dis && <button className="btn bs" style={{borderColor:"var(--rd)",color:"var(--rd)",marginLeft:"auto"}} onClick={() => removeSp(origIdx)}>✕ Rimuovi</button>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredSpells.length === 0 && (
                  <div style={{textAlign:"center",color:"var(--td)",padding:"10px",fontStyle:"italic",fontSize:".88em"}}>
                    Nessun incantesimo {spellFilter==="available" ? "disponibile" : (spellFilter==="prepared" ? "memorizzato" : "")}{sLow ? " corrispondente alla ricerca" : ""}.
                  </div>
                )}
              </div>
            );

            // ── Catalogo incantesimi (consultazione di tutto il DB) ──
            const SCHOOLS = ["Abiurazione","Ammaliamento","Divinazione","Evocazione","Illusione","Invocazione","Necromanzia","Trasmutazione"];
            const charClasses = (ch.classes||[]).filter(function(c){return c && c.name;}).map(function(c){return c.name;});
            const catLow = (catText||"").toLowerCase();
            const catResults = catOpen ? SPELLS_DB.filter(function(sp){
              if (catClass === "__char__") { if (charClasses.length && !(sp.classesHb||[]).some(function(c){return charClasses.indexOf(c)>=0;})) return false; }
              else if (catClass !== "__all__") { if (!(sp.classesHb||[]).some(function(c){return c===catClass;})) return false; }
              if (catSchool && sp.school !== catSchool) return false;
              if (catLevel !== "" && String(sp.level) !== String(catLevel)) return false;
              if (catLow && (sp.name||"").toLowerCase().indexOf(catLow) < 0 && (sp.nameEn||"").toLowerCase().indexOf(catLow) < 0) return false;
              return true;
            }).slice().sort(function(a,b){ return (Number(a.level)-Number(b.level)) || String(a.name).localeCompare(String(b.name)); }) : [];
            const accessOf = function(sp){
              const lv = Number(sp.level);
              if (lv === 0) return {label:"Trucchetto", color:"var(--gn)"};
              const onList = (sp.classesHb||[]).some(function(c){return charClasses.indexOf(c)>=0;});
              if (charClasses.length && !onList) return {label:"Fuori lista", color:"var(--td)"};
              if (lv <= pmInfo.soglia) return {label:"Entro soglia", color:"var(--gn)"};
              return {label:"Sovra-lancio", color:"var(--rd)"};
            };
            const addFromCatalog = function(sp){
              const entry = {level:sp.level, name:sp.name, school:sp.school, castTime:sp.castTime, effects:sp.effects||"", concentration:!!sp.concentration, available:true, prepared:false, dbId:sp.id};
              setCh({...ch, spells:[...(ch.spells||[]), entry]});
            };
            const catSel = {background:"var(--ip)",border:"1px solid var(--bd)",color:"var(--tb)",padding:"3px 6px",fontSize:".82em",borderRadius:3};
            const catalog = (
              <div style={{marginTop:8,border:"1px solid var(--bd)",borderRadius:6,overflow:"hidden"}}>
                <div onClick={function(){ setCatOpen(!catOpen); }} style={{cursor:"pointer",padding:"8px 10px",background:"var(--b3)",display:"flex",alignItems:"center",gap:8}}>
                  <span style={{color:"var(--gm)"}}>{catOpen ? "▾" : "▸"}</span>
                  <strong style={{color:"var(--gd)",fontFamily:"'Cinzel',serif",fontSize:".8em",letterSpacing:1}}>📖 Catalogo incantesimi</strong>
                  <span style={{fontSize:".7em",color:"var(--td)"}}>({SPELLS_DB.length} totali · ogni livello consultabile)</span>
                </div>
                {catOpen && (
                  <div style={{padding:10,background:"var(--b2)"}}>
                    <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:8}}>
                      <select value={catClass} onChange={function(e){ setCatClass(e.target.value); }} style={catSel}>
                        <option value="__char__">Le mie classi</option>
                        <option value="__all__">Tutte le classi</option>
                        {CLASSES.map(function(c){ return <option key={c} value={c}>{c}</option>; })}
                      </select>
                      <select value={catSchool} onChange={function(e){ setCatSchool(e.target.value); }} style={catSel}>
                        <option value="">Tutte le scuole</option>
                        {SCHOOLS.map(function(s){ return <option key={s} value={s}>{s}</option>; })}
                      </select>
                      <select value={catLevel} onChange={function(e){ setCatLevel(e.target.value); }} style={catSel}>
                        <option value="">Tutti i livelli</option>
                        {[0,1,2,3,4,5,6,7,8,9].map(function(l){ return <option key={l} value={l}>{l===0 ? "Trucchetti" : l+"° livello"}</option>; })}
                      </select>
                      <input value={catText} onChange={function(e){ setCatText(e.target.value); }} placeholder="cerca nome…" style={{...catSel,flex:1,minWidth:120}}/>
                    </div>
                    <div style={{fontSize:".7em",color:"var(--td)",marginBottom:6}}>{catResults.length} incantesimi · 🟢 entro soglia · 🔴 solo via sovra-lancio</div>
                    <div style={{maxHeight:380,overflowY:"auto",display:"flex",flexDirection:"column",gap:3}}>
                      {catResults.map(function(sp){
                        const acc = accessOf(sp);
                        const open = catDetail === sp.id;
                        const hasIt = (sp.desc && sp.desc.trim()) || (sp.effects && sp.effects.trim());
                        const body = (sp.desc && sp.desc.trim()) ? sp.desc : ((sp.effects && sp.effects.trim()) ? sp.effects : (sp.descEn||""));
                        const isEn = !hasIt && sp.descEn;
                        return (
                          <div key={sp.id} style={{border:"1px solid var(--bd)",borderRadius:4,background:"var(--b3)"}}>
                            <div onClick={function(){ setCatDetail(open ? null : sp.id); }} style={{cursor:"pointer",display:"flex",alignItems:"center",gap:8,padding:"5px 8px"}}>
                              <span style={{background:"var(--b2)",color:"var(--gd)",borderRadius:3,padding:"1px 6px",fontWeight:700,fontSize:".78em",minWidth:20,textAlign:"center"}}>{sp.level}</span>
                              <span style={{flex:1,fontWeight:600,color:"var(--tb)",fontSize:".9em"}}>{sp.name}</span>
                              <span style={{fontSize:".68em",color:"var(--td)"}}>{sp.school}</span>
                              <span style={{fontSize:".64em",color:acc.color,border:"1px solid "+acc.color,borderRadius:3,padding:"0 4px",whiteSpace:"nowrap"}}>{acc.label}</span>
                              <button title="Descrizione completa" onClick={function(e){ e.stopPropagation(); setDescSp(sp); }} style={{background:"none",border:"none",cursor:"pointer",fontSize:"1em",padding:"0 2px",lineHeight:1}}>📖</button>
                            </div>
                            {open && (
                              <div style={{borderTop:"1px solid var(--bd)",padding:"6px 10px",fontSize:".85em",color:"var(--tx)"}}>
                                <div style={{fontSize:".7em",color:"var(--td)",marginBottom:4}}>{sp.castTime||"—"} · gittata {sp.range||"—"} · durata {sp.duration||"—"} · {sp.components||""}{sp.concentration ? " · concentrazione" : ""}{sp.ritual ? " · rituale" : ""}</div>
                                {(sp.damage || sp.dc || sp.attack) && <div style={{fontSize:".7em",color:"var(--td)",marginBottom:4}}>{sp.damage ? ("danno " + (typeof sp.damage === "object" ? [spellDescDice(sp.damage, sp.level), sp.damage.type].filter(Boolean).join(" ") : sp.damage)) : ""}{sp.dc ? (" · TS " + (typeof sp.dc === "object" ? (sp.dc.ability || "") + (sp.dc.success === "half" ? " (½)" : "") : sp.dc)) : ""}{sp.attack ? " · tiro per colpire" : ""}</div>}
                                <div style={{whiteSpace:"pre-wrap"}}>{body || <em style={{color:"var(--td)"}}>(nessuna descrizione)</em>}</div>
                                {isEn && <div style={{fontSize:".66em",color:"var(--td)",marginTop:4,fontStyle:"italic"}}>(descrizione in inglese — traduzione IT in arrivo)</div>}
                                <div style={{fontSize:".68em",color:"var(--td)",marginTop:6}}>Classi: {(sp.classesHb||[]).join(", ") || "—"}</div>
                                {!dis && <button className="btn bs" style={{marginTop:6}} onClick={function(){ addFromCatalog(sp); }}>+ Aggiungi al repertorio</button>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {catResults.length === 0 && <div style={{textAlign:"center",color:"var(--td)",padding:10,fontStyle:"italic",fontSize:".85em"}}>Nessun incantesimo con questi filtri.</div>}
                    </div>
                  </div>
                )}
              </div>
            );

            return (
              <div>
                <div className="st">Incantesimi (Car.: {autoGA})</div>
                {(() => {
                  const per = (pmInfo.per || []);
                  const casters = per.filter(function(p){ return p.prog !== "none"; });
                  return (
                    <div style={{display:"flex",gap:14,flexWrap:"wrap",alignItems:"center",margin:"2px 0 8px",padding:"8px 12px",background:"var(--b3)",border:"1px solid var(--bd)",borderRadius:6}}>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",minWidth:60}}>
                        <div style={{fontSize:22,fontWeight:700,color:"var(--gd)",lineHeight:1}}>{pmInfo.pm}</div>
                        <div style={{fontSize:10,color:"var(--td)",marginTop:2}}>Punti Magia</div>
                      </div>
                      <div style={{display:"flex",flexDirection:"column",alignItems:"center",minWidth:60}}>
                        <div style={{fontSize:22,fontWeight:700,color:"var(--gd)",lineHeight:1}}>{pmInfo.soglia}</div>
                        <div style={{fontSize:10,color:"var(--td)",marginTop:2}}>Soglia</div>
                      </div>
                      <div style={{flex:1,minWidth:180,fontSize:11,color:"var(--td)"}}>
                        {casters.length === 0
                          ? "Nessuna progressione magica nativa: i lanci sono sovra-lancio (vedi regole)."
                          : casters.map(function(p){ return p.name+" "+p.level+"° → "+p.pm+" PM, soglia "+p.soglia+(p.recovery==="breve"?" (rip. breve)":""); }).join("  ·  ")}
                      </div>
                    </div>
                  );
                })()}
                <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center"}}>
                  {filterPills}
                  {searchBox}
                  {!dis && <button className="btn bs" onClick={addSp}>+ Aggiungi</button>}
                </div>
                {pmTracker}
                {catalog}
                {isMobile ? mobileList : desktopList}
              </div>
            );
  /* ─────────────────────── GUIDA AI CONNETTORI — SpellsTab ───────────────────────
   * PROPS IN: ch, setCh (unico canale di scrittura), autoGA (abilità magica auto),
   *           pmInfo {pm,soglia,per}, isMobile, setDescSp(sp) (apre il modale descrizione in App).
   * LEGGE da ch:   ch.spells (repertorio), ch.classes (filtro classi del catalogo).
   * SCRIVE su ch (solo via setCh): ch.spells (aggiungi/modifica/rimuovi incantesimi).
   * STATO INTERNO: spellFilter, spellSearch, catOpen, catClass, catSchool, catLevel, catText, catDetail, spellOpen.
   * GLOBALI DI MODULO: SPELLS_DB, SPELLS_BY_ID, resolveSpellDb, SD, SS, STATS, pmSoglia-derivati. Helper interni: accessOf, addFromCatalog, updateSp, addSp.
   * IMPATTO SUGLI ALTRI TAB: scrive solo ch.spells; il modale descrizione vive in App (via setDescSp).
   * ──────────────────────────────────────────────────────────────────────────── */
}

function DiceTab({ comp, onRoll }) {
  const [filter, setFilter] = useState("");
  const [selIdx, setSelIdx] = useState(null);
  const groups = useMemo(function(){
    const low = filter.trim().toLowerCase();
    const cats = [];
    let cur = null;
    comp.forEach(function(sk, i){
      if (low && !(sk.name || "").toLowerCase().includes(low)) return;
      if (!cur || cur.name !== sk.cat) { cur = { name: sk.cat, items: [] }; cats.push(cur); }
      cur.items.push({ ...sk, gi: i });
    });
    return cats;
  }, [comp, filter]);
  const flatVisible = useMemo(function(){
    const out = [];
    groups.forEach(function(g){ g.items.forEach(function(it){ out.push(it); }); });
    return out;
  }, [groups]);
  useEffect(function(){
    if (selIdx == null) return;
    if (!flatVisible.some(function(it){ return it.gi === selIdx; })) {
      setSelIdx(flatVisible.length ? flatVisible[0].gi : null);
    }
  }, [flatVisible]);
  const selected = selIdx != null ? comp[selIdx] : null;
  return (
    <div className="dice-tab">
      <div className="dice-tab-intro">Scegli una competenza, un tiro salvezza o una scuola di magia dal menù, poi lancia il d20. Il modificatore mostrato è già completo (gradi + caratteristica + bonus).</div>
      <input
        className="dice-tab-search"
        type="text"
        placeholder="Cerca…"
        value={filter}
        onChange={function(e){ setFilter(e.target.value); }}
      />
      <select
        className="dice-tab-select"
        size={Math.min(10, Math.max(6, flatVisible.length))}
        value={selIdx != null ? String(selIdx) : ""}
        onChange={function(e){ setSelIdx(e.target.value === "" ? null : parseInt(e.target.value, 10)); }}
      >
        {groups.map(function(g){
          return <optgroup key={g.name} label={g.name}>{g.items.map(function(it){ return <option key={it.gi} value={it.gi}>{it.name} ({fmtMod(it.tot)})</option>; })}</optgroup>;
        })}
      </select>
      {flatVisible.length === 0 ? <div className="dice-tab-empty">Nessuna competenza corrisponde alla ricerca.</div> : null}
      <div className="dice-tab-result">
        {selected ? (
          <React.Fragment>
            <div className="dice-tab-sel-name">{selected.name}</div>
            <div className="dice-tab-sel-mod">{fmtMod(selected.tot)}</div>
            <button className="dice-tab-roll" disabled={!onRoll} onClick={function(){ onRoll(selected.name, selected.tot); }}>🎲 Tira</button>
          </React.Fragment>
        ) : <div className="dice-tab-empty">Seleziona una voce dal menù per tirare.</div>}
      </div>
    </div>
  );
}

function App({ ch, setCh, onRoll, onRollDamage }) {
  const [tab, setTab] = useState("compact");
  const [skillView, setSkillView] = useState("estesa"); // vista del tab Competenze (desktop): estesa|compatta
  // Picker armi (tab Equipaggiamento)
  const [wpnSel, setWpnSel] = useState("");
  const [wpnCat, setWpnCat] = useState("tutte");
  const [wpnSearch, setWpnSearch] = useState("");
  const [showFirearms, setShowFirearms] = useState(false);
  const [wpnEdit, setWpnEdit] = useState(null);     // indice arma in modifica proprietà
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteTxt, setPasteTxt] = useState("");
  const [copiedIdx, setCopiedIdx] = useState(-1);
  const [coll, setColl] = useState({});
  const [flt, setFlt] = useState("");
  const [msg, setMsg] = useState(null);
  const [expData, setExpData] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [descSp, setDescSp] = useState(null); // incantesimo mostrato nel modale descrizione completa
  const [itemEdit, setItemEdit] = useState(null); // indice oggetto inventario in modifica bonus
  // Mobile detection: auto-detect <768px al mount, override manuale tramite toggle
  const [isMobile, setIsMobile] = useState(false);
  // mobileOverride: null = auto-detect attivo; "mobile" o "desktop" = forzato manualmente
  const [mobileOverride, setMobileOverride] = useState(null);
  useEffect(() => {
    if (mobileOverride === "mobile") { setIsMobile(true); return; }
    if (mobileOverride === "desktop") { setIsMobile(false); return; }
    // Auto-detect
    const check = () => setIsMobile(typeof window !== "undefined" && window.innerWidth < 768);
    check();
    if (typeof window !== "undefined") {
      window.addEventListener("resize", check);
      return () => window.removeEventListener("resize", check);
    }
  }, [mobileOverride]);
  const fileRef = useRef(null);
  const portraitRef = useRef(null);
  const miniatureRef = useRef(null);

  // Derived
  const tl = ch.classes.reduce((s,c) => s + (c.level||0), 0);
  const lastCls = ch.classes.length > 0 ? ch.classes[ch.classes.length-1] : {name:""};
  const ac = lastCls.name || "";
  const isL1 = tl <= 1; // level 0 (creation) and level 1 both count as "first level"
  const race = RACES.find(r => r.id === ch.raceId) || RACES[0];
  const inLU = Boolean(ch.lvlUp);

  // Racial bonuses (direct to modifier)
  const rb = useMemo(() => {
    const b = {Forza:0,Destrezza:0,Costituzione:0,Intelligenza:0,Saggezza:0,Carisma:0};
    if (race.bonuses) Object.entries(race.bonuses).forEach(([k,v]) => { b[k] = (b[k]||0) + v; });
    if (ch.raceChoices) ch.raceChoices.forEach(st => { if(st) b[st] = (b[st]||0) + 1; });
    return b;
  }, [race, ch.raceChoices]);

  const autoGA = useMemo(() => {
    const c = ch.classes.find(c2 => MS[c2.name]);
    return c ? MS[c.name] : ch.ga;
  }, [ch.classes, ch.ga]);

  // Bonus dagli OGGETTI attivi: equipaggiati e — se richiedono sintonia — anche in sintonia.
  // Sorgente separata da razza (rb) e da B/M manuale (ch.bm). Vedi tool Inventario.
  const itemBonus = useMemo(() => {
    const stats = {}, skills = {};
    ((ch.equipment && ch.equipment.items) || []).forEach(function(it){
      const active = it.equipped && (!it.requiresAttunement || it.attuned);
      if (!active) return;
      if (it.statMods) Object.keys(it.statMods).forEach(function(k){ if(it.statMods[k]) stats[k] = (stats[k]||0) + it.statMods[k]; });
      if (it.skillMods) Object.keys(it.skillMods).forEach(function(k){ if(it.skillMods[k]) skills[k] = (skills[k]||0) + it.skillMods[k]; });
    });
    return { stats: stats, skills: skills };
  }, [ch.equipment]);

  const getFM = (st) => gm(ch.stats[st]||8) + (rb[st]||0) + (ch.bm[st]||0) + (itemBonus.stats[st]||0);
  const eqDexCap = useMemo(() => calcDexCap(ch.equipment, ch.skills), [ch.equipment, ch.skills]);
  const eqShPen = useMemo(() => shieldDexPen(ch.equipment), [ch.equipment]);
  const statMods = useMemo(() => {
    const m = {};
    STATS.forEach(st => {
      m[st] = getFM(st);   // modificatore pieno: prove, tiri salvezza, attacchi (P-29)
    });
    return m;
  }, [ch.stats, rb, ch.bm, itemBonus]);
  // Destrezza alla CA e alla velocità: limite dell'armatura, poi penalità dello scudo (P-09, P-78, P-79)
  const dexCA = Math.min(statMods.Destrezza || 0, eqDexCap) + eqShPen;

  const statSum = STATS.reduce((s,st) => s + (ch.stats[st]||8), 0);
  const skPts = Math.ceil(statSum * (isL1 ? 1.5 : 1));
  const mcCost = Math.max(0, ch.classes.filter(c=>c.name&&c.level>0).length - 1) * 48;

  // Compute skills
  const compConf = useMemo(() => computeAll(ch.skills, statMods, ch.ma, autoGA), [ch.skills, statMods, ch.ma, autoGA]);
  const compPrev = useMemo(() => {
    if (!inLU) return compConf;
    const merged = ch.skills.map((sk,i) => ({...sk, rank:(sk.rank||0) + ((ch.lvlUp && ch.lvlUp.nr && ch.lvlUp.nr[i]) || 0)}));
    return computeAll(merged, statMods, ch.ma, autoGA);
  }, [ch.skills, ch.lvlUp, statMods, ch.ma, autoGA, inLU, compConf]);

  const comp = useMemo(() => {
    const base = inLU ? compPrev : compConf;
    const sm = itemBonus.skills;
    if (!Object.keys(sm).length) return base;
    return base.map(function(s, i){ const add = sm[i] || sm[String(i)] || 0; return add ? Object.assign({}, s, { tot: s.tot + add, im: add }) : s; });
  }, [inLU, compPrev, compConf, itemBonus]);

  // PM e Soglia del personaggio (motore magia homebrew rev10)
  const pmInfo = useMemo(() => pmSoglia(ch.classes), [ch.classes]);

  // Contesto per il bug report (tab + personaggio attuali)
  useEffect(function(){
    try {
      if (typeof BUG !== "undefined") BUG.ctx = {
        tab: tab,
        char: (ch && (ch.name || ch.charName)) || "(senza nome)",
        classes: ((ch && ch.classes) || []).filter(function(c){ return c && c.name; }).map(function(c){ return c.name + " " + (c.level || 0); }).join(", ") || "—"
      };
    } catch(e){}
  }, [tab, ch]);

  // Creation points
  const creationSpent = useMemo(() => {
    let s = 0;
    compConf.forEach((sk,i) => {
      const sd2 = SD[i];
      const bc = getSkillCost(ch.skills[i], sd2, ac);
      s += calcCost(bc, 0, sk.rank, isL1);
    });
    return s;
  }, [compConf, ac, isL1, ch.skills]);
  const creationAvail = skPts - mcCost;
  const creationRem = creationAvail - creationSpent;

  // Level-up points
  const luPts = useMemo(() => {
    if (!inLU || !ch.lvlUp) return {total:0,mc:0,spent:0,rem:0};
    const pts = statSum + (ch.savedPoints||0);
    const mc2 = ch.lvlUp.isNew ? 48 : 0;
    const luCls = ch.lvlUp.cls || ac;
    let spent = 0;
    if (ch.lvlUp.nr) {
      ch.lvlUp.nr.forEach((nr,i) => {
        if (nr > 0) {
          const sd2 = SD[i];
          const bc = getSkillCost(ch.skills[i], sd2, luCls);
          spent += calcCost(bc, ch.skills[i] ? ch.skills[i].rank||0 : 0, nr, false);
        }
      });
    }
    return {total:pts, mc:mc2, spent, rem:pts-mc2-spent};
  }, [inLU, ch.lvlUp, ch.savedPoints, statSum, ac, ch.skills]);

  // Categories
  const cats = useMemo(() => {
    const cs = [];
    let cur = null;
    comp.forEach((sk,i) => {
      if (!cur || cur.name !== sk.cat) { cur = {name:sk.cat, items:[]}; cs.push(cur); }
      cur.items.push({...sk, gi:i});
    });
    return cs;
  }, [comp]);

  // Affinity color map: per category, map subcategory → color (only for affine groups with 2+ members)
  const AFF_COLORS = ["#e06060","#50a0e0","#60c060","#d0a030","#c070d0","#40c0b0","#e08040","#8080e0"];
  const affMap = useMemo(() => {
    const m = {};
    cats.forEach(cat => {
      const subs = {};
      cat.items.forEach(sk => {
        if (sk.aff !== "affine") return;
        const key = sk.sub || "";
        if (!subs[key]) subs[key] = [];
        subs[key].push(sk.gi);
      });
      const groups = Object.entries(subs).filter(function(kv) { return kv[1].length >= 2; });
      if (groups.length > 0) {
        const cm = {};
        groups.forEach(function(kv, gi) { cm[kv[0]] = AFF_COLORS[gi % AFF_COLORS.length]; });
        groups.forEach(function(kv) { kv[1].forEach(function(idx) { m[idx] = {color: cm[kv[0]], sub: kv[0]}; }); });
      }
    });
    return m;
  }, [cats]);

  // Edit functions
  const canEditRank = !ch.locked && !ch.creationDone && !inLU;
  const canEditBonus = !ch.locked || inLU;
  // Override costo skill: editabile in Creazione e Master, NON in Bloccata o Level-Up
  const canEditCostOverride = !ch.locked && !inLU;

  const setRank = (i, v) => {
    if (!canEditRank) return;
    const s = [...ch.skills]; s[i] = {...s[i], rank: Math.max(0, Math.min(24, v))}; setCh({...ch, skills:s});
  };
  const setBonus = (i, v) => {
    if (!canEditBonus) return;
    const s = [...ch.skills]; s[i] = {...s[i], bs: v}; setCh({...ch, skills:s});
  };
  // Imposta override costo per skill i. v="" o non valido → reset a null (usa costo classe).
  // Valori ammessi: interi >= 1.
  const setCostOverride = (i, v) => {
    if (!canEditCostOverride) return;
    const s = [...ch.skills];
    const n = (v === "" || v == null) ? null : parseInt(v, 10);
    const ov = (Number.isInteger(n) && n >= 1) ? n : null;
    s[i] = {...s[i], costOverride: ov};
    setCh({...ch, skills:s});
  };
  const setLURank = (i, v) => {
    if (!inLU || !ch.lvlUp) return;
    const nr = [...ch.lvlUp.nr];
    const maxA = 24 - (ch.skills[i] ? ch.skills[i].rank||0 : 0);
    nr[i] = Math.max(0, Math.min(maxA, v));
    setCh({...ch, lvlUp:{...ch.lvlUp, nr}});
  };

  // Level-up actions
  const startLU = () => {
    const nr = SD.map(() => 0);
    setCh({...ch, locked:false, lvlUp:{cls:ac, isNew:false, nr}});
    setTab("competenze");
  };
  const applyLU = () => {
    if (luPts.rem < 0) { setMsg({t:"Non hai abbastanza punti!",c:"warn"}); return; }
    setMsg({t:"Confermi il passaggio di livello?", c:"confirm", fn:() => {
      const newSk = ch.skills.map((sk,i) => ({...sk, rank:(sk.rank||0)+((ch.lvlUp&&ch.lvlUp.nr&&ch.lvlUp.nr[i])||0)}));
      const newCl = [...ch.classes];
      const luCls = ch.lvlUp ? ch.lvlUp.cls : ac;
      const ei = newCl.findIndex(c=>c.name===luCls);
      if (ei>=0) newCl[ei] = {...newCl[ei], level:(newCl[ei].level||0)+1};
      else newCl.push({name:luCls, level:1});
      setCh({...ch, skills:newSk, classes:newCl, savedPoints:luPts.rem, lvlUp:null, locked:true, creationDone:true});
      setMsg({t:"Livello applicato!", c:"ok"});
    }});
  };
  const cancelLU = () => {
    setMsg({t:"Annullare? Tutte le modifiche verranno perse.", c:"confirm", fn:() => {
      setCh({...ch, lvlUp:null, locked:true});
      setMsg(null);
    }});
  };
  const saveLU = () => setExpData(JSON.stringify(ch, null, 2));

  // IO
  const doExport = () => {
    const json = JSON.stringify(ch,null,2);
    try {
      const blob = new Blob([json], {type:"application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (ch.name || "scheda") + ".json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (e) {
      setExpData(json);
    }
  };
  const doImport = (e) => {
    const f = e.target.files && e.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      try {
        const d = JSON.parse(ev.target.result);
        setCh({...INIT, ...migrateCh(d)});
        setMsg({t:"Caricato!" + (d.lvlUp ? " Level-up in corso." : ""), c:"ok"});
        if(d.lvlUp) setTab("competenze");
      } catch(err) { setMsg({t:"Errore nel file.", c:"warn"}); }
    };
    r.readAsText(f); e.target.value = "";
  };
  const doNew = () => setMsg({t:"Creare nuovo personaggio?", c:"confirm", fn:() => {setCh({...INIT});setMsg(null);setTab("char");setExpData(null);}});

  const handleImg = (field) => (e) => {
    const f = e.target.files && e.target.files[0]; if(!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const s = Math.min(img.width, img.height);
        const cv = document.createElement("canvas"); cv.width=200; cv.height=200;
        cv.getContext("2d").drawImage(img, (img.width-s)/2, (img.height-s)/2, s, s, 0, 0, 200, 200);
        setCh({...ch, [field]: cv.toDataURL("image/jpeg", 0.85)});
      };
      img.src = ev.target.result;
    };
    r.readAsDataURL(f);
  };
  const handlePortrait = handleImg("portrait");

  const setRaceId = (id) => {
    const r2 = RACES.find(x => x.id === id) || RACES[0];
    setCh({...ch, raceId:id, raceChoices: new Array(r2.cc||0).fill("")});
  };

  const velBase = calcVel(VEL_BASE, ch.height||170, dexCA, statMods.Forza||0) + (race.speedAdd||0);
  const velOverload = equipWeight(ch.equipment) > (ch.stats.Forza||8) * 7.5;
  const velFinal = velOverload ? Math.floor(velBase) / 2 : velBase;   // P-80
  const hpMax = useMemo(() => calcHP(ch.classes, getFM("Costituzione"), ch.hpBonus||0), [ch.classes, ch.stats, rb, ch.bm, ch.hpBonus]);
  const hpCur = hpMax - (ch.hpDmg||0);
  const hpPct = hpMax > 0 ? Math.round(hpCur / hpMax * 100) : 100;
  const fl2 = flt.toLowerCase();
  // Tab list completa (desktop)
  const allTabs = [{id:"char",l:"Personaggio"},{id:"stats",l:"Caratteristiche"},{id:"competenze",l:"Competenze"},{id:"equip",l:"Equipaggiamento"},{id:"combat",l:"⚔ Combat"},{id:"spells",l:"Incantesimi"},{id:"dadi",l:"🎲 Dadi"},{id:"print",l:"🖨 Vista Stampa"}];
  // In mobile nascondiamo solo "Vista Stampa" (meglio da desktop). La vista Estesa delle competenze resta desktop-only via toggle.
  const tabList = isMobile ? allTabs.filter(t => t.id !== "print") : allTabs;
  // Vista effettiva delle competenze: su mobile sempre compatta (l'estesa è troppo larga), su desktop quella scelta.
  const skillViewEff = isMobile && ch.locked && !ch.lvlUp ? "compatta" : skillView;
  // Se l'utente è su un tab nascosto in mobile, ridirigiamo a uno sensato
  useEffect(() => {
    if (isMobile && tab === "print") setTab("char");
    if (tab === "skills" || tab === "compact") setTab("competenze");
  }, [isMobile, tab]);

  return (
    <div className={"theme-" + theme + (isMobile ? " mobile" : "")}>
      <style>{CSS}</style>
      <div className="app">
        <div className="hdr">
          <button className="theme-toggle" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title={theme === "dark" ? "Tema chiaro" : "Tema scuro"}>{theme === "dark" ? "☀" : "🌙"}</button>
          <button className="mobile-toggle" onClick={() => {
            // Ciclo: auto → desktop → mobile → auto
            if (mobileOverride === null) setMobileOverride(isMobile ? "desktop" : "mobile");
            else if (mobileOverride === "desktop") setMobileOverride("mobile");
            else setMobileOverride(null);
          }} title={
            mobileOverride === null ? "Auto-detect (clicca per forzare)" :
            mobileOverride === "desktop" ? "Forzato Desktop (clicca per Mobile)" :
            "Forzato Mobile (clicca per Auto)"
          }>
            {isMobile ? "📱" : "🖥"}{mobileOverride === null ? "" : "·"}
          </button>
          <h1>Scheda Personaggio</h1>
          <div className="ver-badge" title="Versione in test">v{APP_VERSION}</div>
          <div className="sub">{ch.name && ac ? ch.name + " — " + ch.classes.filter(c=>c.name).map(c=>c.name+" Lv"+c.level).join(" / ") : "La Gemma di San Batacchio"}</div>
        </div>

        {/* ═══ CONTROL BAR ═══ */}
        {inLU ? (
          <div className="lu">
            <div className="lt">⬆ Passaggio di Livello</div>
            <div className="li">
              <span>Classe:</span>
              <select value={ch.lvlUp ? ch.lvlUp.cls : ""} style={{background:"var(--ip)",border:"1px solid #d4a020",color:"var(--gb)",fontFamily:"'Cinzel',serif",fontSize:".82em",padding:"2px 6px",borderRadius:3}}
                onChange={e => { const cls=e.target.value; const isNew=!ch.classes.some(c=>c.name===cls); setCh({...ch,lvlUp:{...ch.lvlUp,cls,isNew}}); }}>
                {ch.classes.filter(c=>c.name).map(c => <option key={c.name} value={c.name}>{c.name} (Lv{c.level})</option>)}
                <option value="" disabled>── nuova ──</option>
                {CLASSES.filter(cls => !ch.classes.some(c=>c.name===cls)).map(cls => <option key={cls} value={cls}>+ {cls}</option>)}
              </select>
              {ch.lvlUp && ch.lvlUp.isNew && <span style={{color:"var(--rd)"}}>-48 multiclasse</span>}
              <span>Punti:</span>
              <span style={{fontSize:"1.1em",fontWeight:700,color:luPts.rem>=0?"var(--gn)":"var(--rd)"}}>{luPts.rem}</span>
              <span style={{color:"var(--td)"}}>/ {luPts.total - luPts.mc} (spesi: {luPts.spent})</span>
              {(ch.savedPoints||0) > 0 && <span style={{color:"var(--gm)"}}>incl. {ch.savedPoints} accum.</span>}
            </div>
            <div style={{marginTop:8,display:"flex",gap:6,flexWrap:"wrap"}}>
              <button className="btn" style={{borderColor:"var(--gn)",color:"var(--gn)"}} onClick={applyLU}>✓ Applica</button>
              <button className="btn" onClick={saveLU}>💾 Salva progresso</button>
              <button className="btn" style={{borderColor:"var(--rd)",color:"var(--rd)"}} onClick={cancelLU}>✕ Annulla</button>
            </div>
          </div>
        ) : (
          <div className={"lk" + (ch.locked ? "" : " ul")}>
            {!ch.creationDone ? (
              <span style={{fontFamily:"'Cinzel',serif",fontSize:".8em",color:"var(--gn)"}}>
                {ac ? (
                  <span>📝 Creazione ({ac} Lv1) — punti: <strong>{creationRem}</strong>/{creationAvail}
                    <button className="btn bs" style={{marginLeft:8,borderColor:"#d4a020",color:"var(--gd)"}} onClick={() => {
                      if (!ac) { setMsg({t:"Scegli una classe prima di completare.",c:"warn"}); return; }
                      const pbSpent = STATS.reduce((s2, st) => s2 + pointBuyCost(ch.stats[st] || 8), 0);
                      if (pbSpent > 27) { setMsg({t:"Point buy oltre 27 (" + pbSpent + "): riduci le caratteristiche prima di completare.",c:"warn"}); return; }
                      if (creationRem < 0) { setMsg({t:"Punti competenza in negativo (" + creationRem + "): togli qualche rank prima di completare.",c:"warn"}); return; }
                      const cl = [...ch.classes]; cl[0] = {...cl[0], level:1};
                      setCh({...ch, classes:cl, locked:true, creationDone:true, savedPoints: Math.max(0, creationRem)});
                    }}>✓ Completa e blocca</button>
                  </span>
                ) : (
                  <span>📝 Nuovo personaggio — scegli classe, razza, caratteristiche</span>
                )}
              </span>
            ) : (
              <span style={{fontFamily:"'Cinzel',serif",fontSize:".8em",color:ch.locked?"var(--rd)":"var(--gn)"}}>
                {ch.locked ? "🔒 Bloccata" : "🔧 Modifica Master"}
              </span>
            )}
            {ch.creationDone && ch.locked && <button className="btn bs" style={{borderColor:"#d4a020",color:"var(--gd)"}} onClick={startLU}>⬆ Level-Up</button>}
            {ch.creationDone && ch.locked && <button className="btn bs" onClick={() => setCh({...ch,locked:false})}>🔧 Master</button>}
            {ch.creationDone && !ch.locked && <button className="btn bs" style={{borderColor:"var(--rd)",color:"var(--rd)"}} onClick={() => setCh({...ch,locked:true})}>🔒 Blocca</button>}
            <div style={{marginLeft:"auto",display:"flex",gap:4}}>
              <button className="btn bs" onClick={() => window.print()}>🖨 Stampa</button>
              <button className="btn bs" onClick={doExport}>⬇ Esporta</button>
              <button className="btn bs" onClick={() => fileRef.current && fileRef.current.click()}>⬆ Importa</button>
              <button className="btn bs" style={{borderColor:"var(--rd)",color:"var(--rd)"}} onClick={doNew}>+ Nuovo</button>
              <input ref={fileRef} type="file" accept=".json" style={{display:"none"}} onChange={doImport}/>
            </div>
          </div>
        )}

        {/* ═══ BONUS OGGETTO ═══ */}
        {itemEdit != null && ch.equipment && ch.equipment.items && ch.equipment.items[itemEdit] && (
          <ItemBonusEditor
            item={ch.equipment.items[itemEdit]}
            skillList={SD.map(function(s){ return s.n; })}
            onPatch={function(patch){ const a=[...(ch.equipment.items||[])]; a[itemEdit]=Object.assign({}, a[itemEdit], patch); setCh({...ch, equipment:Object.assign({}, ch.equipment, {items:a})}); }}
            onClose={function(){ setItemEdit(null); }}
          />
        )}

        {/* ═══ DESCRIZIONE INCANTESIMO ═══ */}
        {descSp && (() => {
          const sp = descSp;
          const body = (sp.desc && sp.desc.trim()) ? sp.desc : ((sp.effects && sp.effects.trim()) ? sp.effects : (sp.descEn||""));
          const isEn = !((sp.desc && sp.desc.trim()) || (sp.effects && sp.effects.trim())) && sp.descEn;
          return (
            <div className="desc-overlay" onClick={() => setDescSp(null)}>
              <div className="desc-modal" onClick={e => e.stopPropagation()}>
                <div className="desc-head">
                  <div>
                    <span className="desc-lvl">{sp.level === 0 ? "Trucchetto" : sp.level + "° liv."}</span>
                    <b style={{marginLeft:8,color:"var(--tb)"}}>{sp.name}</b>
                    <span style={{marginLeft:8,color:"var(--td)",fontSize:".82em"}}>{sp.school}</span>
                  </div>
                  <button className="desc-x" onClick={() => setDescSp(null)}>×</button>
                </div>
                <div className="desc-meta">{sp.castTime||"—"} · gittata {sp.range||"—"} · durata {sp.duration||"—"}{sp.components ? " · "+sp.components : ""}{sp.concentration ? " · concentrazione" : ""}{sp.ritual ? " · rituale" : ""}</div>
                {(sp.damage || sp.dc || sp.attack) && <div className="desc-meta">{sp.damage ? ("danno " + (typeof sp.damage === "object" ? [spellDescDice(sp.damage, sp.level), sp.damage.type].filter(Boolean).join(" ") : sp.damage)) : ""}{sp.dc ? (" · TS " + (typeof sp.dc === "object" ? (sp.dc.ability || "") + (sp.dc.success === "half" ? " (½)" : "") : sp.dc)) : ""}{sp.attack ? " · tiro per colpire" : ""}</div>}
                <div className="desc-body">{body || <em style={{color:"var(--td)"}}>(nessuna descrizione)</em>}</div>
                {isEn && <div className="desc-note">(descrizione in inglese — traduzione IT in arrivo)</div>}
                {(sp.classesHb||[]).length > 0 && <div className="desc-note">Classi: {(sp.classesHb||[]).join(", ")}</div>}
              </div>
            </div>
          );
        })()}

        {/* ═══ MSG ═══ */}
        {msg && (
          <div className="msgbox" style={{background:"var(--b3)",border:"2px solid "+(msg.c==="warn"?"var(--rd)":msg.c==="confirm"?"#d4a020":"var(--gn)")}}>
            <div style={{color:"var(--tb)",fontSize:".85em",marginBottom:msg.c==="confirm"?6:0}}>{msg.t}</div>
            {msg.c === "confirm" ? (
              <div style={{display:"flex",gap:6}}>
                <button className="btn bs" style={{borderColor:"var(--gn)",color:"var(--gn)"}} onClick={() => {if(msg.fn)msg.fn();setMsg(null);}}>✓ Sì</button>
                <button className="btn bs" style={{borderColor:"var(--rd)",color:"var(--rd)"}} onClick={() => setMsg(null)}>✕ No</button>
              </div>
            ) : (
              <button className="btn bs" style={{marginTop:4}} onClick={() => setMsg(null)}>OK</button>
            )}
          </div>
        )}

        {/* ═══ EXPORT ═══ */}
        {expData && (
          <div className="expbox">
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontFamily:"'Cinzel',serif",color:"var(--gd)",fontSize:".82em"}}>Esporta / Salva</span>
              <button className="btn bs" onClick={() => setExpData(null)}>✕</button>
            </div>
            <div style={{fontSize:".7em",color:"var(--td)",marginBottom:3}}>Copia il testo e salvalo come .json</div>
            <textarea value={expData} readOnly onClick={e => e.target.select()}/>
            <button className="btn bs" style={{marginTop:3}} onClick={() => {try{navigator.clipboard.writeText(expData);}catch(e){}}}>📋 Copia</button>
          </div>
        )}

        <div className="tabs">{tabList.map(t => <div key={t.id} className={"tab"+(tab===t.id?" act":"")} onClick={() => setTab(t.id)}>{t.l}</div>)}</div>
        <div className="pnl">

          {/* ═══ PERSONAGGIO ═══ */}
          {tab === "char" && (
            <div>
              <div className="st">Dati</div>
              <div className="g2">
                <div>
                  <div className="f"><label>Nome:</label><input type="text" value={ch.name} disabled={ch.locked&&ch.creationDone} onChange={e => setCh({...ch,name:e.target.value})}/></div>
                  <div className="f"><label>Giocatore:</label><input type="text" value={ch.pn} disabled={ch.locked&&ch.creationDone} onChange={e => setCh({...ch,pn:e.target.value})}/></div>
                  <div className="f"><label>Razza:</label><select value={ch.raceId} disabled={ch.creationDone} onChange={e => setRaceId(e.target.value)}>
                    {RACES.map(r2 => <option key={r2.id} value={r2.id}>{r2.name}</option>)}</select></div>
                  {race.cc > 0 && (
                    <div style={{marginLeft:84,fontSize:".75em",marginBottom:3}}>
                      <span style={{color:"var(--gd)"}}>+1 a {race.cc} stat:</span>
                      {(ch.raceChoices||[]).map((v,i) => (
                        <select key={i} value={v} disabled={ch.creationDone} style={{marginLeft:3,background:"var(--ip)",border:"1px solid var(--bd)",color:"var(--tb)",fontSize:".9em"}}
                          onChange={e => {const c2=[...(ch.raceChoices||[])];c2[i]=e.target.value;setCh({...ch,raceChoices:c2});}}>
                          <option value="">--</option>{STATS.filter(st => st === v || (!(race.bonuses && race.bonuses[st]) && !(ch.raceChoices||[]).some((x,j) => j !== i && x === st))).map(st => <option key={st} value={st}>{SS[st]}</option>)}
                        </select>
                      ))}
                    </div>
                  )}
                  <div style={{marginLeft:84,fontSize:".68em",color:"var(--td)",marginBottom:4}}>{race.desc}</div>
                </div>
                <div>
                  <div style={{display:"flex",gap:8,marginBottom:6}}>
                    <div style={{textAlign:"center"}}>
                      <div className="portrait" onClick={() => !ch.locked && portraitRef.current && portraitRef.current.click()}>
                        {ch.portrait ? <img src={ch.portrait} alt=""/> : <span style={{color:"var(--td)",fontSize:".62em"}}>📷 Ritratto</span>}
                      </div>
                      <div style={{fontSize:".58em",color:"var(--td)",marginTop:2}}>Ritratto</div>
                    </div>
                    <div style={{textAlign:"center"}}>
                      <div className="portrait minia" onClick={() => !ch.locked && miniatureRef.current && miniatureRef.current.click()}>
                        {ch.miniature ? <img src={ch.miniature} alt=""/> : <span style={{color:"var(--td)",fontSize:".62em"}}>♟ Miniatura</span>}
                      </div>
                      <div style={{fontSize:".58em",color:"var(--td)",marginTop:2}}>Vista dall'alto</div>
                    </div>
                    <input ref={portraitRef} type="file" accept="image/*" style={{display:"none"}} onChange={handlePortrait}/>
                    <input ref={miniatureRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleImg("miniature")}/>
                    <div>
                      <div className="f"><label>Altezza:</label><input type="number" value={ch.height} disabled={ch.locked&&ch.creationDone} onChange={e => setCh({...ch,height:+e.target.value})}/></div>
                      <div className="f"><label>Peso:</label><input type="number" value={ch.weight} disabled={ch.locked&&ch.creationDone} onChange={e => setCh({...ch,weight:+e.target.value})}/></div>
                    </div>
                  </div>
                  <div className="ib">
                    <div className="ir"><span className="il">Velocità</span><span className="iv">{velFinal} m</span></div>
                    <div className="ir"><span className="il">Classe Armatura</span><span className="iv">{calcCA(ch.equipment, dexCA)}</span></div>
                    <div className="ir"><span className="il">Punti Ferita</span><span className="iv" style={{color:hpPct<=25?"var(--rd)":hpPct<=50?"#d4a020":"var(--gn)"}}>{hpCur} / {hpMax}{(ch.hpTemp||0)>0?" (+"+ch.hpTemp+" temp)":""}</span></div>
                  </div>
                </div>
              </div>

              <div className="st">Classe</div>
              {ch.classes.map((cls,i) => (
                <div key={i} className="f">
                  <label>{["Prima","Seconda","Terza"][i]}:</label>
                  {ch.creationDone ? (
                    <span style={{color:"var(--gb)"}}>{cls.name} Lv{cls.level}</span>
                  ) : (
                    <select value={cls.name} onChange={e => {
                      const c2=[...ch.classes];
                      c2[i]={name:e.target.value, level:e.target.value?1:0};
                      setCh({...ch, classes:c2});
                    }}>
                      <option value="">-- scegli classe --</option>
                      {CLASSES.map(cl => <option key={cl} value={cl}>{cl}</option>)}
                    </select>
                  )}
                </div>
              ))}
              {(ch.savedPoints||0) > 0 && <div style={{fontSize:".75em",color:"var(--gm)"}}>Punti accumulati: {ch.savedPoints}</div>}

              <div className="st">Attributi globali</div>
              <div className="f"><label>Mischia:</label><select value={ch.ma} disabled={ch.locked&&ch.creationDone} onChange={e => setCh({...ch,ma:e.target.value})}><option value="Forza">FOR</option><option value="Destrezza">DES</option></select></div>
              <div className="f"><label>Magia:</label>{MS[ac] ? <span style={{color:"var(--gb)"}}>{autoGA}</span> : <select value={ch.ga} disabled={ch.locked&&ch.creationDone} onChange={e => setCh({...ch,ga:e.target.value})}><option value="Intelligenza">INT</option><option value="Saggezza">SAG</option><option value="Carisma">CAR</option></select>}</div>
            </div>
          )}

          {/* ═══ STATS ═══ */}
          {tab === "stats" && (
            <div>
              <div className="st">Caratteristiche</div>
              {!ch.creationDone && (
                <div className="pb" style={{marginBottom:6}}>
                  <span style={{fontFamily:"'Cinzel',serif",fontSize:".72em",color:"var(--gm)"}}>Point Buy:</span>
                  {(() => {
                    const totalPB = STATS.reduce((s,st) => s + pointBuyCost(ch.stats[st]||8), 0);
                    const remPB = 27 - totalPB;
                    return (
                      <span>
                        <span style={{fontWeight:700,color:remPB>=0?"var(--gn)":"var(--rd)"}}>{remPB}</span>
                        <span style={{color:"var(--td)"}}> / 27 rimanenti (spesi: {totalPB})</span>
                      </span>
                    );
                  })()}
                  <span style={{fontSize:".68em",color:"var(--td)",marginLeft:8}}>Base 8 · Max 15 · Dopo 13 costa doppio</span>
                </div>
              )}
              <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:5}}>
                {STATS.map(st => {
                  const val = ch.stats[st] || 8;
                  const pbCost = pointBuyCost(val);
                  const maxVal = ch.creationDone ? 30 : 15;
                  return (
                    <div key={st} className="sc">
                      <div className="nm">{SS[st]}</div>
                      <div className="md"><V v={statMods[st]}/></div>
                      <input type="number" min={ch.creationDone?1:8} max={maxVal} value={val}
                        disabled={ch.locked && ch.creationDone}
                        onChange={e => {
                          let v = +e.target.value;
                          if (!ch.creationDone) v = Math.max(8, Math.min(15, v));
                          setCh({...ch, stats:{...ch.stats, [st]:v}});
                        }}/>
                      {!ch.creationDone && <div style={{fontSize:".6em",color:pbCost>5?"#d4a020":"var(--td)"}}>costo: {pbCost}</div>}
                      <div style={{fontSize:".62em",color:rb[st]?"var(--gn)":"var(--td)"}}>raz:{rb[st]>0?"+":""}{rb[st]}</div>
                      <input type="number" value={ch.bm[st]||0} disabled={!canEditBonus}
                        onChange={e => setCh({...ch,bm:{...ch.bm,[st]:+e.target.value}})} style={{width:46,fontSize:".72em"}} title="Bonus/Malus al modificatore (oggetti, effetti). Gli aumenti di caratteristica vanno sul punteggio."/>
                      <div style={{fontSize:".55em",color:"var(--td)"}}>B/M</div>
                      {st === "Destrezza" && eqDexCap < 999 && (
                        <div style={{fontSize:".58em",color:"var(--rd)",marginTop:1}}>CAP: {eqDexCap >= 0 ? "+" : ""}{eqDexCap} | fin: {statMods.Destrezza >= 0 ? "+" : ""}{statMods.Destrezza}</div>
                      )}
                      {st === "Destrezza" && eqShPen < 0 && (
                        <div style={{fontSize:".58em",color:"var(--rd)"}}>Scudo: {eqShPen}</div>
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="ib" style={{marginTop:8}}>
                <div className="ir"><span className="il">Σ Caratteristiche</span><span className="iv">{statSum}</span></div>
                <div className="ir"><span className="il">Punti competenza</span><span className="iv">{skPts} {isL1?"(×1.5)":""}</span></div>
                <div className="ir"><span className="il">Iniziativa</span><span className="iv" style={{display:"flex",alignItems:"center",gap:6,justifyContent:"flex-end"}}><V v={statMods.Destrezza}/>{onRoll ? <span className="droll" onClick={() => onRoll("Iniziativa", statMods.Destrezza||0)} title={"Tira iniziativa d20 " + ((statMods.Destrezza||0)>=0?"+":"") + (statMods.Destrezza||0)}>🎲</span> : null}</span></div>
                <div className="ir"><span className="il">Velocità</span><span className="iv">{velFinal} m</span></div>
                <div className="ir"><span className="il">PF Max</span><span className="iv">{hpMax}</span></div>
              </div>

              <div className="st">Punti Ferita</div>
              <div style={{display:"flex",gap:12,alignItems:"flex-start",flexWrap:"wrap"}}>
                <div style={{flex:"1 1 200px"}}>
                  <div className="eq-ca" style={{borderColor:hpPct<=25?"var(--rd)":hpPct<=50?"#d4a020":"var(--gm)"}}>
                    <div>
                      <div className="ca-lbl">PF Attuali</div>
                      <div className="ca-val" style={{color:hpPct<=25?"var(--rd)":hpPct<=50?"#d4a020":"var(--gn)"}}>{hpCur}</div>
                    </div>
                    <div style={{fontSize:".85em",color:"var(--td)"}}>/</div>
                    <div>
                      <div className="ca-lbl">PF Massimi</div>
                      <div className="ca-val">{hpMax}</div>
                    </div>
                    {(ch.hpTemp||0) > 0 && <div><div className="ca-lbl">Temp</div><div style={{fontFamily:"'Cinzel',serif",fontSize:"1.2em",color:"#6ac",fontWeight:700}}>+{ch.hpTemp}</div></div>}
                  </div>
                  <div className="eq-carry-bar" style={{height:10,marginBottom:6}}>
                    <div className="eq-carry-fill" style={{width:Math.max(0,Math.min(100,hpPct))+"%",background:hpPct<=25?"var(--rd)":hpPct<=50?"#d4a020":"var(--gn)"}}/>
                  </div>
                </div>
                <div style={{flex:"0 0 auto"}}>
                  <div className="f"><label>Danni:</label><NumStepper value={ch.hpDmg||0} min={0} onChange={n => {
                    if (ch.noHeal && n < (ch.hpDmg||0)) return;   // immunità alle cure dopo il sovra-lancio (R4.16)
                    setCh({...ch,hpDmg:n});
                  }}/></div>
                  {ch.noHeal ? <div className="f noheal" title="Sovra-lancio: immune a ogni recupero di PF (R4.16)">⛔ Immune alle cure per {ch.noHeal.rounds} round ({ch.noHeal.spell}) <button className="cmb-roll" onClick={() => { const c2 = {...ch}; delete c2.noHeal; setCh(c2); }}>Termina</button></div> : null}
                  <div className="f"><label>PF temp:</label><NumStepper value={ch.hpTemp||0} min={0} onChange={n => setCh({...ch,hpTemp:n})}/></div>
                  <div className="f"><label>Bonus PF:</label><input type="number" value={ch.hpBonus||0} disabled={ch.locked} onChange={e => setCh({...ch,hpBonus:+e.target.value})}/></div>
                </div>
              </div>
              <div className="ib" style={{marginTop:6,fontSize:".75em"}}>
                {ch.classes.filter(function(c){return c.name && c.level > 0;}).map(function(cls,ci) {
                  const hd = HD[cls.name] || 8;
                  const cosMod = getFM("Costituzione");
                  const rows = [];
                  let runLvl = ch.classes.slice(0,ci).reduce(function(s,c2){return s+(c2.level||0);},0);
                  for (let l = 1; l <= cls.level; l++) {
                    runLvl++;
                    const fixB = hd >= 10 ? 2 : 1;
                    if (ci === 0 && l === 1) {
                      rows.push("Lv1: " + hd + " (max) + " + (Math.floor(hd/2)+fixB) + " (fisso" + (fixB===2?"+2":"+1") + ") + " + (cosMod*2) + " COS×2");
                    } else {
                      rows.push("Lv" + runLvl + ": " + (Math.floor(hd/2)+fixB) + " (d" + hd + "/2" + (fixB===2?"+2":"+1") + ") + " + cosMod + " COS");
                    }
                  }
                  return (
                    <div key={ci} style={{marginBottom:4}}>
                      <span style={{color:"var(--gd)",fontFamily:"'Cinzel',serif",fontSize:".9em"}}>{cls.name} (d{hd})</span>
                      {rows.map(function(r,ri){return <div key={ri} style={{color:"var(--td)",marginLeft:8}}>{r}</div>;})}
                    </div>
                  );
                })}
                {(ch.hpBonus||0) !== 0 && <div style={{color:"var(--gm)"}}>Bonus talenti: {ch.hpBonus > 0 ? "+" : ""}{ch.hpBonus}</div>}
              </div>
            </div>
          )}

          {/* ═══ COMPETENZE ═══ */}
          {tab === "competenze" && !isMobile && (
            <div className="cmb-subtabs comp-views">
              <div className={"cmb-subtab"+(skillView==="estesa"?" active":"")} onClick={() => setSkillView("estesa")}>Estesa</div>
              <div className={"cmb-subtab"+(skillView==="compatta"?" active":"")} onClick={() => setSkillView("compatta")}>Compatta</div>
            </div>
          )}
          {tab === "competenze" && skillViewEff === "estesa" && (
            <div>
              {!inLU && (
                <div className="pb">
                  <span style={{color:"var(--gm)",fontFamily:"'Cinzel',serif",fontSize:".72em"}}>Punti:</span>
                  <span style={{fontWeight:700,color:creationRem>=0?"var(--gn)":"var(--rd)"}}>{creationRem}</span>
                  <span style={{color:"var(--td)"}}>/ {creationAvail} (spesi: {creationSpent})</span>
                </div>
              )}
              {inLU && (
                <div className="pb" style={{borderColor:"#d4a020"}}>
                  <span style={{color:"var(--gd)",fontFamily:"'Cinzel',serif",fontSize:".72em"}}>⬆ Level-Up ({ch.lvlUp ? ch.lvlUp.cls : ""}):</span>
                  <span style={{fontWeight:700,color:luPts.rem>=0?"var(--gn)":"var(--rd)"}}>{luPts.rem}</span>
                  <span style={{color:"var(--td)"}}>/ {luPts.total-luPts.mc} (spesi: {luPts.spent})</span>
                </div>
              )}
              <input type="text" placeholder="🔍 Cerca..." value={flt} onChange={e => setFlt(e.target.value)}
                style={{width:"100%",padding:"3px 6px",background:"var(--ip)",border:"1px solid var(--bd)",color:"var(--tb)",borderRadius:3,marginBottom:4,fontSize:".82em"}}/>
              {cats.map(cat => {
                const items = flt ? cat.items.filter(s => (s.name||"").toLowerCase().includes(fl2)) : cat.items;
                if (!items.length) return null;
                const isC = coll[cat.name] && !flt;
                const luCls = (inLU && ch.lvlUp) ? ch.lvlUp.cls : ac;
                return (
                  <div key={cat.name}>
                    <div style={{background:"var(--b3)",padding:"3px 8px",cursor:"pointer",display:"flex",justifyContent:"space-between",border:"1px solid var(--bd)",borderRadius:3,marginTop:3}}
                      onClick={() => setColl({...coll, [cat.name]: !coll[cat.name]})}>
                      <span style={{fontFamily:"'Cinzel',serif",color:"var(--gd)",fontSize:".78em"}}>{cat.name} ({items.length})</span>
                      <span style={{color:"var(--gm)",fontSize:".72em"}}>{isC?"▸":"▾"}</span>
                    </div>
                    {!isC && (
                      <table className="sk">
                        <colgroup><col className="sk-name"/><col className="sk-attr"/>{inLU ? <><col className="sk-rank"/><col className="sk-rank"/></> : <col className="sk-rank"/>}<col className="sk-num"/><col className="sk-num"/><col className="sk-num"/><col className="sk-num"/><col className="sk-tot"/><col className="sk-cst"/>{canEditCostOverride && <col className="sk-cst"/>}</colgroup>
                        <thead><tr>
                          <th>Abilità</th><th>Car.</th>
                          {inLU ? <><th>Rank</th><th style={{color:"var(--gd)"}}>+Nuovi</th></> : <th>Rank</th>}
                          <th>Bon</th><th>Aff</th><th>Mod</th><th>B/M</th><th style={{fontWeight:700}}>Tot</th><th>Cst</th>
                          {canEditCostOverride && <th title="Override costo classe (Master). Vuoto = costo classe normale. Valori >= 1.">Ovr</th>}
                        </tr></thead>
                        <tbody>
                          {items.map(sk => {
                            const confR = ch.skills[sk.gi] ? ch.skills[sk.gi].rank||0 : 0;
                            const newR = (inLU && ch.lvlUp && ch.lvlUp.nr) ? ch.lvlUp.nr[sk.gi]||0 : 0;
                            const sd2 = SD[sk.gi];
                            const skState = ch.skills[sk.gi];
                            const classCost = sd2 && sd2.k ? (sd2.k[inLU ? luCls : ac]||2) : 2;
                            const bc = getSkillCost(skState, sd2, inLU ? luCls : ac);
                            const hasOvr = skState && Number.isInteger(skState.costOverride) && skState.costOverride >= 1;
                            const cost = inLU ? (newR>0 ? calcCost(bc,confR,newR,false) : 0) : calcCost(bc,0,confR,isL1);
                            return (
                              <tr key={sk.gi} style={newR>0?{background:"#1a2a1a"}:undefined}>
                                <td className="sn">{affMap[sk.gi] ? <span title={"Affine: " + affMap[sk.gi].sub} style={{color:affMap[sk.gi].color,marginRight:3,fontSize:"1.1em",cursor:"help"}}>●</span> : null}{sk.name||"?"}</td>
                                <td style={{fontSize:".72em",color:"var(--td)"}}>{SS[sk.attr]||(sk.attr?sk.attr.substring(0,3):"?")}</td>
                                {inLU ? (
                                  <>
                                    <td style={{color:"var(--td)",fontSize:".8em"}}>{confR}</td>
                                    <td><input className="lu-new" type="number" min={0} max={24-confR} value={newR} onChange={e => setLURank(sk.gi, +e.target.value)}/></td>
                                  </>
                                ) : (
                                  <td><input type="number" min={0} max={24} value={confR} onChange={e => setRank(sk.gi, +e.target.value)} disabled={!canEditRank}/></td>
                                )}
                                <td><V v={sk.bl}/></td>
                                <td><V v={sk.maxAff}/></td>
                                <td><V v={sk.sm2}/></td>
                                <td><input type="number" value={sk.bs||0} onChange={e => setBonus(sk.gi, +e.target.value)} style={{width:30}} disabled={!canEditBonus}/></td>
                                <td style={{fontWeight:700}}><V v={sk.tot}/></td>
                                <td style={{color: hasOvr ? "#d48a20" : (inLU&&newR>0?"#d4a020":"var(--td)"), fontSize:".78em", fontWeight: hasOvr ? 600 : 400}} title={hasOvr ? ("Override attivo. Costo classe normale: " + classCost) : undefined}>{cost>0?cost:"—"}</td>
                                {canEditCostOverride && (
                                  <td>
                                    <input type="number" min={1} max={9}
                                      value={hasOvr ? skState.costOverride : ""}
                                      placeholder={String(classCost)}
                                      onChange={e => setCostOverride(sk.gi, e.target.value)}
                                      style={{width:30, color: hasOvr ? "#d48a20" : "var(--td)", fontWeight: hasOvr ? 600 : 400}}
                                      title={hasOvr ? ("Override: " + skState.costOverride + " (classe: " + classCost + "). Svuota per resettare.") : ("Costo classe: " + classCost + ". Inserisci un valore per override.")}
                                    />
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ═══ EQUIPAGGIAMENTO ═══ */}
          {tab === "equip" && (() => {
            const eq = ch.equipment || {};
            const arm = eq.armor || {};
            const sh = eq.shield || {};
            const coins = eq.coins || {};
            const gems = eq.gems || [];
            const items = eq.items || [];
            const dis = false; // L'equipaggiamento è gestione di gioco: sempre editabile, anche a scheda bloccata
            const setEq = (patch) => setCh({...ch, equipment: {...eq, ...patch}});
            const setArm = (k, patch) => setEq({armor: {...arm, [k]: {...(arm[k]||{}), ...patch}}});
            const setSh = (k, patch) => setEq({shield: {...sh, [k]: {...(sh[k]||{}), ...patch}}});
            const equipArm = (k) => { const a2 = {}; ["light","medium","heavy"].forEach(t => { a2[t] = {...(arm[t]||{}), equipped: t===k ? !(arm[t]||{}).equipped : false}; }); setEq({armor:a2}); };
            const equipSh = (k) => { const s2 = {}; ["small","medium","large"].forEach(t => { s2[t] = {...(sh[t]||{}), equipped: t===k ? !(sh[t]||{}).equipped : false}; }); setEq({shield:s2}); };
            const totalCA = calcCA(eq, dexCA);
            const tw = equipWeight(eq);
            const forScore = ch.stats.Forza || 8;
            const cap = forScore * 7.5;
            const pctRaw = Math.round(tw / cap * 100);
            const pct = Math.min(100, pctRaw);
            const barCol = pctRaw > 100 ? "var(--rd)" : pct > 66 ? "#d4a020" : "var(--gn)";
            const armRows = [
              {k:"light",l:"Leggera",si:7,capF:(bl)=>bl+2},
              {k:"medium",l:"Media",si:8,capF:(bl)=>bl-3},
              {k:"heavy",l:"Pesante",si:9,capF:(bl)=>bl-5}
            ];
            const shRows = [
              {k:"small",l:"Piccolo",si:12,pen:0},
              {k:"medium",l:"Medio",si:11,pen:0},
              {k:"large",l:"Grande",si:10,pen:-2}
            ];
            const coinTotal = Object.entries(coins).reduce((s, kv) => s + (Number(kv[1])||0) * (COIN_MO[kv[0]]||0), 0);
            const gemsTotal = gems.reduce((s,g) => s + (Number(g.qty)||0) * (Number(g.unitValue)||0), 0);

            return (
              <div>
                {/* CA Box */}
                <div className="eq-ca">
                  <div><div className="ca-lbl">Classe Armatura</div><div className="ca-val">{totalCA}</div></div>
                  <div className="ca-det">
                    10 base {armRows.map(ar => (arm[ar.k]||{}).equipped ? " + " + ((arm[ar.k]||{}).caBase||0) + " " + ar.l : "").join("")}
                    {dexCA < 0 ? " − " + (-dexCA) : " + " + dexCA} DES
                    {armRows.map(ar => (arm[ar.k]||{}).equipped && (arm[ar.k]||{}).bonusSpec ? " + " + (arm[ar.k]||{}).bonusSpec + " spec" : "").join("")}
                    {shRows.map(sr => (sh[sr.k]||{}).equipped ? " + " + ((sh[sr.k]||{}).caBonus||0) + " scudo " + sr.l : "").join("")}
                    {shRows.map(sr => (sh[sr.k]||{}).equipped && (sh[sr.k]||{}).bonusSpec ? " + " + (sh[sr.k]||{}).bonusSpec + " spec" : "").join("")}
                  </div>
                </div>

                {/* Armatura */}
                <div className="st">Armatura</div>
                <table className="eq-tbl">
                  <thead><tr><th>Tipo</th><th>CA Base</th><th>Bonus Spec.</th><th>Equip.</th><th>DEX CAP</th><th>Rank</th></tr></thead>
                  <tbody>
                    {armRows.map(ar => {
                      const a = arm[ar.k] || {};
                      const rk = (ch.skills[ar.si]||{}).rank || 0;
                      const bl = rk > 0 ? bonusLvl(rk) : -3;
                      const dc = a.equipped ? ar.capF(bl) : "—";
                      return (
                        <tr key={ar.k} style={a.equipped ? {background:"rgba(201,168,76,0.1)"} : {}}>
                          <td style={{textAlign:"left",color:"var(--tb)",fontWeight:a.equipped?700:400}}>{ar.l}</td>
                          <td><input type="number" min={0} value={a.caBase||0} disabled={dis} onChange={e => setArm(ar.k,{caBase:+e.target.value})}/></td>
                          <td><input type="number" value={a.bonusSpec||0} disabled={dis} onChange={e => setArm(ar.k,{bonusSpec:+e.target.value})}/></td>
                          <td><input type="checkbox" checked={a.equipped||false} disabled={dis} onChange={() => equipArm(ar.k)}/></td>
                          <td style={{color:typeof dc==="number"&&dc<0?"var(--rd)":"var(--tb)",fontWeight:600}}>{typeof dc==="number"?(dc>=0?"+":"")+dc:dc}</td>
                          <td style={{color:"var(--td)"}}>{rk}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Scudo */}
                <div className="st">Scudo</div>
                <table className="eq-tbl">
                  <thead><tr><th>Tipo</th><th>CA Bonus</th><th>Bonus Spec.</th><th>Equip.</th><th>DES Pen.</th><th>Rank</th></tr></thead>
                  <tbody>
                    {shRows.map(sr => {
                      const s = sh[sr.k] || {};
                      const rk = (ch.skills[sr.si]||{}).rank || 0;
                      return (
                        <tr key={sr.k} style={s.equipped ? {background:"rgba(201,168,76,0.1)"} : {}}>
                          <td style={{textAlign:"left",color:"var(--tb)",fontWeight:s.equipped?700:400}}>{sr.l}</td>
                          <td><input type="number" min={0} value={s.caBonus||0} disabled={dis} onChange={e => setSh(sr.k,{caBonus:+e.target.value})}/></td>
                          <td><input type="number" value={s.bonusSpec||0} disabled={dis} onChange={e => setSh(sr.k,{bonusSpec:+e.target.value})}/></td>
                          <td><input type="checkbox" checked={s.equipped||false} disabled={dis} onChange={() => equipSh(sr.k)}/></td>
                          <td style={{color:sr.pen<0?"var(--rd)":"var(--td)"}}>{sr.pen===0?"—":sr.pen}</td>
                          <td style={{color:"var(--td)"}}>{rk}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Armi */}
                <div className="st">Armi</div>
                {(function(){
                  const disW = dis; // equipaggiamento sempre editabile
                  const weapons = eq.weapons || [];
                  const setWeapons = (arr) => setEq({weapons: arr});
                  const pool = WEAPONS_DB.filter(function(d){
                    if (d.optional && !showFirearms) return false;
                    if (wpnCat !== "tutte" && d.category !== wpnCat) return false;
                    if (wpnSearch && d.name.toLowerCase().indexOf(wpnSearch.toLowerCase()) < 0
                        && d.nameEn.toLowerCase().indexOf(wpnSearch.toLowerCase()) < 0) return false;
                    return true;
                  });
                  const addWeapon = function(){
                    if (!wpnSel) return;
                    const def = WEAPONS_DB.find(function(d){ return d.id === wpnSel; });
                    if (!def) return;
                    setWeapons(weapons.concat([{id: def.id, qty: 1, equipped: false, special: null}]));
                    setWpnSel("");
                  };
                  const doPaste = function(){
                    const parsed = decodeWeaponCode(pasteTxt);
                    if (!parsed) { alert("Codice arma non valido. Deve iniziare con " + ARMA_CODE_PREFIX + " e contenere un'arma base riconosciuta."); return; }
                    setWeapons(weapons.concat([parsed]));
                    setPasteTxt(""); setPasteOpen(false);
                  };
                  const copyCode = function(we, i){
                    const code = encodeWeaponCode(we);
                    const done = function(){ setCopiedIdx(i); setTimeout(function(){ setCopiedIdx(-1); }, 1500); };
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                      navigator.clipboard.writeText(code).then(done, function(){ window.prompt("Copia il codice arma:", code); });
                    } else { window.prompt("Copia il codice arma:", code); done(); }
                  };
                  return (
                    <div>
                      {!disW && (
                        <div className="wpn-picker">
                          <select value={wpnCat} onChange={e => {setWpnCat(e.target.value); setWpnSel("");}}>
                            <option value="tutte">— tutte le categorie —</option>
                            {WEAPON_CATS.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <input type="text" placeholder="cerca…" value={wpnSearch}
                            onChange={e => {setWpnSearch(e.target.value); setWpnSel("");}} style={{width:90}}/>
                          <select value={wpnSel} onChange={e => setWpnSel(e.target.value)} style={{minWidth:150,flex:1}}>
                            <option value="">— scegli arma ({pool.length}) —</option>
                            {WEAPON_CATS.map(function(c){
                              const inCat = pool.filter(function(d){ return d.category === c; });
                              if (!inCat.length) return null;
                              return (
                                <optgroup key={c} label={c}>
                                  {inCat.map(d => <option key={d.id} value={d.id}>{d.name} ({d.dmg} {d.dmgType}){d.optional?" ⚙":""}</option>)}
                                </optgroup>
                              );
                            })}
                          </select>
                          <button className="btn bs" onClick={addWeapon} disabled={!wpnSel}>+ Aggiungi</button>
                          <button className="btn bs" onClick={() => setPasteOpen(!pasteOpen)} title="Incolla un codice arma condiviso">📥 Incolla codice</button>
                          <label className="wpn-ff" title="Mostra pistole, moschetti e simili nel selettore">
                            <input type="checkbox" checked={showFirearms} onChange={e => setShowFirearms(e.target.checked)}/> da fuoco
                          </label>
                        </div>
                      )}
                      {pasteOpen && !disW && (
                        <div className="wpn-paste">
                          <textarea rows={2} placeholder={"Incolla qui un codice arma (" + ARMA_CODE_PREFIX + "…)"} value={pasteTxt} onChange={e => setPasteTxt(e.target.value)}/>
                          <div className="wpn-paste-btns">
                            <button className="btn bs" onClick={doPaste} disabled={!pasteTxt.trim()}>Aggiungi arma dal codice</button>
                            <button className="btn bs" onClick={() => {setPasteOpen(false); setPasteTxt("");}}>Annulla</button>
                          </div>
                        </div>
                      )}
                      {weapons.length > 0 ? (
                        <table className="eq-tbl wpn-tbl">
                          <thead><tr><th style={{minWidth:110}}>Arma</th><th className="hide-mobile">Categoria</th><th>Danno</th><th className="hide-mobile">Tipo</th><th>Q.tà</th><th title="Speciale/magica">✨</th><th>Equip.</th><th></th></tr></thead>
                          <tbody>
                            {weapons.map(function(we, i){
                              const def = WEAPONS_DB.find(function(d){ return d.id === we.id; });
                              if (!def) return (
                                <tr key={i}><td colSpan={8} style={{color:"var(--rd)"}}>Arma sconosciuta ({we.id}){!disW && <button className="btn bs" style={{marginLeft:6,borderColor:"var(--rd)",color:"var(--rd)"}} onClick={() => setWeapons(weapons.filter((_,j)=>j!==i))}>✕</button>}</td></tr>
                              );
                              const rk = (function(){
                                const idx = SD.findIndex(function(s){ return s.n === def.category; });
                                return idx >= 0 ? ((ch.skills[idx]||{}).rank || 0) : 0;
                              })();
                              const sp = we.special;
                              const isSpecial = !!sp;
                              const effDmg = specialDmg(def, sp);
                              const dmgChanged = effDmg !== def.dmg;
                              const enh = (sp && sp.enhancement) || 0;
                              const customName = we.name || (sp && sp.name) || "";
                              const dispName = customName || def.name;
                              const extraStr = (sp && sp.extraDamage || []).map(function(ed){
                                return "+" + ed.dice + " " + ed.damageType + (ed.condition==="vsType"?" vs "+(ed.creatureType||"?"):ed.condition==="onCrit"?" (crit)":ed.condition==="onNat20"?" (20)":"");
                              }).join(", ");
                              const rarityObj = isSpecial ? (RARITIES.find(function(r){return r.id===(sp.rarity||rarityFromScore(calcWeaponScore(sp)));})||null) : null;
                              const setName = function(nm){
                                const a=[...weapons];
                                const upd={...a[i], name:nm};
                                if(upd.special)upd.special={...upd.special, name:nm}; // tieni allineato per il codice
                                a[i]=upd; setWeapons(a);
                              };
                              return (
                                <tr key={i} style={we.equipped ? {background:"rgba(201,168,76,0.1)"} : {}}>
                                  <td style={{textAlign:"left"}}>
                                    {!disW ? (
                                      <input type="text" className="wpn-name-in" value={customName}
                                        placeholder={def.name}
                                        style={{color:isSpecial?(rarityObj?rarityObj.color:"var(--gb)"):"var(--tb)",fontWeight:we.equipped||isSpecial?700:400}}
                                        onChange={e => setName(e.target.value)}/>
                                    ) : (
                                      <span style={{color:isSpecial?(rarityObj?rarityObj.color:"var(--gb)"):"var(--tb)",fontWeight:we.equipped||isSpecial?700:400}} title={def.props || ""}>{dispName}</span>
                                    )}
                                    {enh?<span style={{color:isSpecial?(rarityObj?rarityObj.color:"var(--gb)"):"var(--gd)",fontWeight:700,marginLeft:4}}>+{enh}</span>:null}
                                    {customName && customName !== def.name ? <span style={{fontSize:".72em",color:"var(--td)"}}> ({def.name})</span> : null}
                                    {extraStr ? <div className="wpn-props" style={{color:"var(--gd)"}}>{extraStr}</div> : null}
                                    {!isSpecial && def.props ? <div className="wpn-props">{def.props}</div> : null}
                                    {isSpecial && sp.notes ? <div className="wpn-props">{sp.notes}</div> : null}
                                  </td>
                                  <td className="hide-mobile" style={{fontSize:".78em",color:"var(--td)"}} title={"Rank competenza: " + rk}>{def.category}{def.family==="marziale"?" (M)":""}</td>
                                  <td style={{fontWeight:600,color:dmgChanged?"var(--gd)":"var(--tb)"}} title={dmgChanged?"Base: "+def.dmg:(def.dmg!==def.dmg5e?"Standard 5e: "+def.dmg5e:"")}>{effDmg}{!isSpecial&&def.dmg!==def.dmg5e?"↑":""}{dmgChanged?"✦":""}</td>
                                  <td className="hide-mobile" style={{fontSize:".78em"}}>{def.dmgType}{def.range ? " · " + def.range + "m" : ""}</td>
                                  <td><input type="number" min={1} value={we.qty||1} disabled={disW} style={{width:42}}
                                    onChange={e => {const a=[...weapons];a[i]={...a[i],qty:Math.max(1,+e.target.value||1)};setWeapons(a);}}/></td>
                                  <td style={{textAlign:"center"}}>
                                    <input type="checkbox" checked={isSpecial} disabled={disW} title="Rendi speciale/magica"
                                      onChange={e => {const a=[...weapons]; a[i]={...a[i], special: e.target.checked ? (a[i].special||{isMagic:true}) : null}; setWeapons(a);}}/>
                                  </td>
                                  <td><input type="checkbox" checked={we.equipped||false} disabled={disW}
                                    onChange={() => {const a=[...weapons];a[i]={...a[i],equipped:!a[i].equipped};setWeapons(a);}}/></td>
                                  <td style={{whiteSpace:"nowrap"}}>
                                    {isSpecial && !disW ? <button className="btn bs" title="Modifica proprietà" onClick={() => setWpnEdit(i)}>⚙</button> : null}
                                    {isSpecial ? <button className="btn bs" title="Copia codice arma" onClick={() => copyCode(we, i)}>{copiedIdx===i?"✓":"📋"}</button> : null}
                                    {!disW && <button className="btn bs" style={{borderColor:"var(--rd)",color:"var(--rd)"}} onClick={() => setWeapons(weapons.filter((_,j)=>j!==i))}>✕</button>}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      ) : <div style={{fontSize:".8em",color:"var(--td)",padding:"4px 2px"}}>Nessun'arma. {disW ? "" : "Scegli dal selettore, o incolla un codice arma."}</div>}

                      {/* Editor proprietà arma speciale */}
                      {wpnEdit !== null && weapons[wpnEdit] && weapons[wpnEdit].special ? (
                        <WeaponPropsEditor
                          baseDef={WEAPONS_DB.find(function(d){ return d.id === weapons[wpnEdit].id; })}
                          special={weapons[wpnEdit].special}
                          weaponName={weapons[wpnEdit].special.name || ""}
                          onChange={function(next){ const a=[...weapons]; a[wpnEdit]={...a[wpnEdit], special:next}; setWeapons(a); }}
                          onName={function(nm){ const a=[...weapons]; a[wpnEdit]={...a[wpnEdit], special:{...a[wpnEdit].special, name:nm}}; setWeapons(a); }}
                          onClose={function(){ setWpnEdit(null); }}
                        />
                      ) : null}
                    </div>
                  );
                })()}

                {/* Capacità di carico */}
                <div className="st">Capacità di Carico</div>
                <div className="eq-carry">
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <span><span style={{fontWeight:600,color:pctRaw>100?"var(--rd)":"var(--tb)"}}>{tw} kg</span> / {cap} kg (FOR {forScore} × 7.5)</span>
                    <span style={{color:barCol}}>{pct}%</span>
                  </div>
                  <div className="eq-carry-bar"><div className="eq-carry-fill" style={{width:pct+"%",background:barCol}}/></div>
                  {pctRaw > 100 && <div style={{color:"var(--rd)",fontSize:".72em",marginTop:2}}>Sovraccarico! Velocità dimezzata, svantaggio a prove fisiche.</div>}
                </div>

                {/* Inventario */}
                <div className="st">Inventario</div>
                <table className="eq-tbl inv-tbl">
                  <thead><tr><th style={{minWidth:120}}>Oggetto</th><th className="hide-mobile" style={{minWidth:100}}>Descrizione</th><th>Peso (kg)</th><th>Valore (MO)</th><th className="hide-mobile">Note</th><th>Bonus</th><th></th></tr></thead>
                  <tbody>
                    {items.map((it, i) => (
                      <tr key={i}>
                        <td><input type="text" value={it.name||""} disabled={dis} onChange={e => {const a=[...items];a[i]={...a[i],name:e.target.value};setEq({items:a});}}/></td>
                        <td className="hide-mobile"><input type="text" value={it.desc||""} disabled={dis} onChange={e => {const a=[...items];a[i]={...a[i],desc:e.target.value};setEq({items:a});}}/></td>
                        <td><input type="number" min={0} step={0.1} value={it.weight||0} disabled={dis} onChange={e => {const a=[...items];a[i]={...a[i],weight:+e.target.value};setEq({items:a});}}/></td>
                        <td><input type="number" min={0} step={0.1} value={it.value||0} disabled={dis} onChange={e => {const a=[...items];a[i]={...a[i],value:+e.target.value};setEq({items:a});}}/></td>
                        <td className="hide-mobile"><input type="text" value={it.notes||""} disabled={dis} onChange={e => {const a=[...items];a[i]={...a[i],notes:e.target.value};setEq({items:a});}} style={{width:60}}/></td>
                        <td>
                          {(function(){
                            const hasB = (it.statMods && Object.keys(it.statMods).some(k=>it.statMods[k])) || (it.skillMods && Object.keys(it.skillMods).some(k=>it.skillMods[k]));
                            const active = it.equipped && (!it.requiresAttunement || it.attuned);
                            return (
                              <span style={{display:"inline-flex",alignItems:"center",gap:4,whiteSpace:"nowrap"}}>
                                <input type="checkbox" checked={!!it.equipped} disabled={dis} title="Equipaggiato" onChange={e => {const a=[...items];a[i]={...a[i],equipped:e.target.checked};setEq({items:a});}}/>
                                {hasB ? <span title={active?"Bonus attivi":(it.equipped?"In sintonia richiesta":"Non equipaggiato")} style={{fontSize:".9em",color:active?"var(--gn)":"var(--td)"}}>✦</span> : null}
                                {!dis && <button className="btn bs" style={{padding:"1px 5px"}} title="Bonus a caratteristiche/competenze" onClick={() => setItemEdit(i)}>⚙</button>}
                              </span>
                            );
                          })()}
                        </td>
                        <td>{!dis && <button className="btn bs" style={{borderColor:"var(--rd)",color:"var(--rd)"}} onClick={() => setEq({items:items.filter((_,j)=>j!==i)})}>✕</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!dis && <button className="btn bs" style={{marginTop:4}} onClick={() => setEq({items:[...items,{name:"",desc:"",weight:0,value:0,notes:""}]})}>+ Oggetto</button>}

                {/* Monete */}
                <div className="st">Monete</div>
                <div className="eq-coins">
                  {["mp","mo","ma","mr"].map(k => (
                    <div key={k} className="coin">
                      <label>{COIN_NAMES[k]}</label>
                      <input type="number" min={0} value={coins[k]||0} disabled={dis} onChange={e => setEq({coins:{...coins,[k]:+e.target.value}})}/>
                    </div>
                  ))}
                  <div style={{display:"flex",alignItems:"center",gap:4,fontSize:".78em",color:"var(--gm)"}}>
                    Totale: <span style={{color:"var(--gb)",fontWeight:600}}>{Math.round(coinTotal*100)/100} MO</span>
                  </div>
                </div>

                {/* Gemme e Gioielli */}
                <div className="st">Gemme e Gioielli</div>
                <table className="eq-tbl">
                  <thead><tr><th style={{minWidth:100}}>Nome</th><th>Qtà</th><th>Val. unit. (MO)</th><th>Totale</th><th></th></tr></thead>
                  <tbody>
                    {gems.map((g, i) => (
                      <tr key={i}>
                        <td><input type="text" value={g.name||""} disabled={dis} onChange={e => {const a=[...gems];a[i]={...a[i],name:e.target.value};setEq({gems:a});}}/></td>
                        <td><input type="number" min={0} value={g.qty||0} disabled={dis} onChange={e => {const a=[...gems];a[i]={...a[i],qty:+e.target.value};setEq({gems:a});}}/></td>
                        <td><input type="number" min={0} step={0.1} value={g.unitValue||0} disabled={dis} onChange={e => {const a=[...gems];a[i]={...a[i],unitValue:+e.target.value};setEq({gems:a});}}/></td>
                        <td style={{color:"var(--gb)",fontWeight:600}}>{Math.round((Number(g.qty)||0)*(Number(g.unitValue)||0)*100)/100}</td>
                        <td>{!dis && <button className="btn bs" style={{borderColor:"var(--rd)",color:"var(--rd)"}} onClick={() => setEq({gems:gems.filter((_,j)=>j!==i)})}>✕</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!dis && <button className="btn bs" style={{marginTop:4}} onClick={() => setEq({gems:[...gems,{name:"",qty:0,unitValue:0}]})}>+ Gemma</button>}
                {gems.length > 0 && <div style={{textAlign:"right",fontSize:".78em",color:"var(--gm)",marginTop:4}}>Totale gemme: <span style={{color:"var(--gb)",fontWeight:600}}>{Math.round(gemsTotal*100)/100} MO</span></div>}

                {/* Totale patrimonio */}
                <div style={{textAlign:"right",fontSize:".85em",color:"var(--gm)",marginTop:8,borderTop:"1px solid var(--bl)",paddingTop:6}}>
                  Patrimonio totale: <span style={{color:"var(--gb)",fontWeight:700,fontSize:"1.1em"}}>{Math.round((coinTotal + gemsTotal + items.reduce((s,it) => s + (Number(it.value)||0), 0))*100)/100} MO</span>
                </div>
              </div>
            );
          })()}

          {/* ═══ COMPATTA ═══ */}
          {tab === "competenze" && skillViewEff === "compatta" && (
            <div>
              <div className="st">{ch.name||"Personaggio"} — Vista Compatta (Lv {tl})</div>
              <input type="text" placeholder="🔍 Cerca..." value={flt} onChange={e => setFlt(e.target.value)}
                style={{width:"100%",padding:"3px 6px",background:"var(--ip)",border:"1px solid var(--bd)",color:"var(--tb)",borderRadius:3,marginBottom:4,fontSize:".82em"}}/>
              <div className="compact">
                {cats.map(cat => {
                  const fitems = flt ? cat.items.filter(s => (s.name||"").toLowerCase().includes(fl2)) : cat.items;
                  if (!fitems.length) return null;
                  const isC = coll["c_"+cat.name] && !flt;
                  return (
                    <div key={cat.name} className="ccat">
                      <h4 style={{cursor:"pointer",display:"flex",justifyContent:"space-between"}}
                        onClick={() => setColl({...coll, ["c_"+cat.name]: !coll["c_"+cat.name]})}>
                        <span>{cat.name} ({fitems.length})</span>
                        <span style={{color:"var(--gm)",fontSize:".9em"}}>{isC?"▸":"▾"}</span>
                      </h4>
                      {!isC && fitems.map(sk => (
                        <div key={sk.gi} className="crow">
                          <span style={{color:"var(--tb)"}}>{affMap[sk.gi] ? <span title={"Affine: " + affMap[sk.gi].sub} style={{color:affMap[sk.gi].color,marginRight:2,cursor:"help"}}>●</span> : null}{sk.name||"?"}</span>
                          <span style={{display:"flex",alignItems:"center",gap:5}}>
                            <span style={{fontWeight:600}} className={sk.tot>0?"vp":sk.tot<0?"vn":"vz"}>{sk.tot>0?"+"+sk.tot:sk.tot}</span>
                            {onRoll ? <span className="droll" onClick={() => onRoll(sk.name||"?", sk.tot||0)} title={"Tira d20 " + (sk.tot>=0?"+":"") + (sk.tot||0)}>🎲</span> : null}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ COMBAT ═══ */}
          {tab === "combat" && <CombatTab ch={ch} setCh={setCh} comp={comp} statMods={statMods} pmInfo={pmInfo} tl={tl} onRoll={onRoll} onRollDamage={onRollDamage} hpMax={hpMax} />}

          {/* ═══ INCANTESIMI ═══ */}
          {tab === "spells" && <SpellsTab ch={ch} setCh={setCh} autoGA={autoGA} pmInfo={pmInfo} isMobile={isMobile} setDescSp={setDescSp} />}
          {tab === "dadi" && <DiceTab comp={comp} onRoll={onRoll} />}

          {/* ═══ VISTA STAMPA ═══ */}
          {tab === "print" && (() => {
            const eq = ch.equipment || {};
            const arm = eq.armor || {};
            const shi = eq.shield || {};
            const coins = eq.coins || {};
            const gems = eq.gems || [];
            const items = eq.items || [];
            const totalCA = calcCA(eq, dexCA);
            const coinTotal = Object.entries(coins).reduce(function(s,kv){return s+(Number(kv[1])||0)*(COIN_MO[kv[0]]||0);},0);
            const gemsTotal = gems.reduce(function(s,g){return s+(Number(g.qty)||0)*(Number(g.unitValue)||0);},0);
            const itemsVal = items.reduce(function(s,it){return s+(Number(it.value)||0);},0);
            const armLabels = {light:"Leggera",medium:"Media",heavy:"Pesante"};
            const shLabels = {small:"Piccolo",medium:"Medio",large:"Grande"};
            const equippedArm = ["light","medium","heavy"].find(function(k){return (arm[k]||{}).equipped;});
            const equippedSh = ["small","medium","large"].find(function(k){return (shi[k]||{}).equipped;});

            return (
              <div className="pv">
                <h2>Scheda Personaggio</h2>
                <div className="pv-sub">{ch.name || "Personaggio"} — {ch.classes.filter(function(c){return c.name;}).map(function(c){return c.name+" Lv"+c.level;}).join(" / ")}</div>

                {/* Dati */}
                <div className="pv-sec">Dati del Personaggio</div>
                <div className="pv-row"><span className="pv-l">Nome:</span><span className="pv-v">{ch.name}</span><span className="pv-l" style={{marginLeft:16}}>Giocatore:</span><span className="pv-v">{ch.pn}</span><span className="pv-l" style={{marginLeft:16}}>F/M:</span><span className="pv-v">{ch.gender}</span></div>
                <div className="pv-row"><span className="pv-l">Razza:</span><span className="pv-v">{race.name}</span><span className="pv-l" style={{marginLeft:16}}>Allineamento:</span><span className="pv-v">{ch.align||"—"}</span><span className="pv-l" style={{marginLeft:16}}>Divinità:</span><span className="pv-v">{ch.deity||"—"}</span></div>
                <div className="pv-row"><span className="pv-l">Altezza:</span><span className="pv-v">{ch.height} cm</span><span className="pv-l" style={{marginLeft:16}}>Peso:</span><span className="pv-v">{ch.weight} kg</span><span className="pv-l" style={{marginLeft:16}}>Età:</span><span className="pv-v">{ch.age}</span><span className="pv-l" style={{marginLeft:16}}>Occhi:</span><span className="pv-v">{ch.eyes||"—"}</span><span className="pv-l" style={{marginLeft:16}}>Capelli:</span><span className="pv-v">{ch.hair||"—"}</span></div>

                {/* Caratteristiche */}
                <div className="pv-sec">Caratteristiche</div>
                <div className="pv-stats">
                  {STATS.map(function(st) {
                    var val = (ch.stats||{})[st]||8;
                    var mod = statMods[st]||0;
                    return (
                      <div key={st} className="pv-stat">
                        <div className="pv-sn">{SS[st]}</div>
                        <div className="pv-sm" style={{color:mod>0?"#2a7a2a":mod<0?"#b03030":"#444"}}>{mod>0?"+":""}{mod}</div>
                        <div className="pv-sb">({val})</div>
                      </div>
                    );
                  })}
                </div>

                {/* Riepilogo */}
                <div className="pv-info">
                  <div className="pv-box"><div className="pv-bl">CA</div><div className="pv-bv">{totalCA}</div></div>
                  <div className="pv-box"><div className="pv-bl">PF</div><div className="pv-bv" style={{color:hpPct<=25?"#b03030":hpPct<=50?"#b08a00":"#2a7a2a"}}>{hpCur}/{hpMax}</div></div>
                  <div className="pv-box"><div className="pv-bl">Velocità</div><div className="pv-bv">{velFinal} m</div></div>
                  <div className="pv-box"><div className="pv-bl">Iniziativa</div><div className="pv-bv">{(statMods.Destrezza||0)>0?"+":""}{statMods.Destrezza||0}</div></div>
                  {equippedArm && <div className="pv-box"><div className="pv-bl">Armatura</div><div className="pv-bv" style={{fontSize:".85em"}}>{armLabels[equippedArm]} (CA+{(arm[equippedArm]||{}).caBase||0})</div></div>}
                  {equippedSh && <div className="pv-box"><div className="pv-bl">Scudo</div><div className="pv-bv" style={{fontSize:".85em"}}>{shLabels[equippedSh]} (+{(shi[equippedSh]||{}).caBonus||0})</div></div>}
                </div>

                {/* Competenze */}
                <div className="pv-sec">Competenze</div>
                <div className="pv-skills">
                  {cats.map(function(cat) {
                    return (
                      <div key={cat.name} className="pv-scat">
                        <h5>{cat.name}</h5>
                        {cat.items.map(function(sk) {
                          var cls2 = sk.tot > 0 ? "pv-pos" : sk.tot < 0 ? "pv-neg" : "pv-zer";
                          return (
                            <div key={sk.gi} className="pv-sr">
                              <span>{sk.name||"?"}</span>
                              <span className={cls2} style={{fontWeight:600}}>{sk.tot>0?"+":""}{sk.tot}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>

                {/* Equipaggiamento */}
                {items.length > 0 && (
                  <div>
                    <div className="pv-sec">Inventario</div>
                    <table className="pv-tbl">
                      <thead><tr><th>Oggetto</th><th>Descrizione</th><th>Peso</th><th>Valore</th></tr></thead>
                      <tbody>
                        {items.map(function(it,i) {
                          return <tr key={i}><td>{it.name||""}</td><td>{it.desc||""}</td><td>{it.weight||0} kg</td><td>{it.value||0} MO</td></tr>;
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Monete */}
                <div className="pv-sec">Valori</div>
                <div className="pv-row">
                  {["mp","mo","ma","mr"].map(function(k) { return <span key={k}><span className="pv-l">{COIN_NAMES[k]}:</span> <span className="pv-v">{coins[k]||0}</span></span>; })}
                  <span style={{marginLeft:8}}><span className="pv-l">Totale:</span> <span className="pv-v">{Math.round(coinTotal*100)/100} MO</span></span>
                </div>
                {gems.length > 0 && <div className="pv-row">{gems.map(function(g,i) { return <span key={i}>{g.name||"Gemma"} ×{g.qty||0} ({Math.round((g.qty||0)*(g.unitValue||0)*100)/100} MO)</span>; })}</div>}
                <div className="pv-row" style={{marginTop:4,fontWeight:700,fontSize:".95em"}}><span>Patrimonio totale: {Math.round((coinTotal+gemsTotal+itemsVal)*100)/100} MO</span></div>

                {/* Incantesimi */}
                {(ch.spells||[]).length > 0 && (
                  <div>
                    <div className="pv-sec">Incantesimi (Car.: {autoGA})</div>
                    <table className="pv-tbl">
                      <thead><tr><th>Lv</th><th>Nome</th><th>Scuola</th><th>Lancio</th><th>Effetti</th></tr></thead>
                      <tbody>
                        {(ch.spells||[]).map(function(sp,i) {
                          return <tr key={i}><td>{sp.level||1}</td><td>{sp.name||""}</td><td>{sp.school||""}</td><td>{sp.castTime||""}</td><td style={{textAlign:"left",fontSize:".8em"}}>{sp.effects||""}</td></tr>;
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                <div style={{textAlign:"center",color:"#aaa",fontSize:".7em",marginTop:12,borderTop:"1px solid #ddd",paddingTop:4}}>La Gemma di San Batacchio — Scheda generata dall'app</div>
              </div>
            );
          })()}

        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   DASHBOARD v2 — multi-PG con persistenza JSON-first
   ─────────────────────────────────────────────────────────────────
   Persistenza primaria: cartella su disco via File System Access API
   (un file <nome>.json per ogni PG). Persistenza secondaria:
   localStorage come shadow-backup. La dirHandle si salva in IndexedDB
   per re-aprire la cartella nelle sessioni successive.
   ═══════════════════════════════════════════════════════════════ */

const STORAGE_KEY        = "characterDashboard_v2";
const LEGACY_ROSTER_KEY  = "masterDashboardRoster_v1";
const LEGACY_SINGLE_KEY  = "schedaCharacter";
const IDB_NAME           = "characterDashboard";
const IDB_STORE          = "meta";

/* ─── IndexedDB minimo (per FileSystemDirectoryHandle) ─── */
function idbReq(req){
  return new Promise(function(res, rej){
    req.onsuccess = function(){ res(req.result); };
    req.onerror   = function(){ rej(req.error); };
  });
}
function idbOpen(){
  return new Promise(function(res, rej){
    const r = indexedDB.open(IDB_NAME, 1);
    r.onupgradeneeded = function(e){
      const db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
    };
    r.onsuccess = function(){ res(r.result); };
    r.onerror   = function(){ rej(r.error); };
  });
}
async function idbGet(key){
  const db = await idbOpen();
  return idbReq(db.transaction(IDB_STORE,"readonly").objectStore(IDB_STORE).get(key));
}
async function idbSet(key, value){
  const db = await idbOpen();
  return idbReq(db.transaction(IDB_STORE,"readwrite").objectStore(IDB_STORE).put(value, key));
}
async function idbDel(key){
  const db = await idbOpen();
  return idbReq(db.transaction(IDB_STORE,"readwrite").objectStore(IDB_STORE).delete(key));
}

/* ─── Lettura dei dati vecchi: dadi per la modale, migrazione al caricamento ─── */
function spellDescDice(dmg, lvl) {
  try {
    const t = dmg && dmg.table;
    if (!t) return "";
    if (typeof t === "string") return t;
    const k = Object.keys(t).map(Number).sort(function(a, b) {
      return a - b;
    });
    if (!k.length) return "";
    const base = t[String(lvl)] != null ? t[String(lvl)] : t[String(k[0])];
    return base || "";
  } catch (e) {
    return "";
  }
}
function migrateCh(d) {
  if (!d) return d;
  let out = d;
  if (Array.isArray(d.classes) && d.classes.some(function(c) {
    return c && c.name === "Invocatore";
  })) {
    out = { ...out, classes: d.classes.map(function(c) {
      return c && c.name === "Invocatore" ? { ...c, name: "Warlock" } : c;
    }) };
  }
  const DMG_REN = { Taglio: "Tagliente", Perforazione: "Perforante", Impatto: "Contundente", Radiante: "Radioso" };
  const needs = function(o) {
    return !!o && (!!DMG_REN[o.grantsResistance] || Array.isArray(o.extraDamage) && o.extraDamage.some(function(x) {
      return x && DMG_REN[x.damageType];
    }));
  };
  const fix = function(o) {
    if (!needs(o)) return o;
    let o2 = o;
    if (DMG_REN[o.grantsResistance]) o2 = { ...o2, grantsResistance: DMG_REN[o.grantsResistance] };
    if (Array.isArray(o.extraDamage)) o2 = { ...o2, extraDamage: o.extraDamage.map(function(x) {
      return x && DMG_REN[x.damageType] ? { ...x, damageType: DMG_REN[x.damageType] } : x;
    }) };
    return o2;
  };
  const eqO = out.equipment;
  if (eqO && Array.isArray(eqO.weapons) && eqO.weapons.some(function(w) {
    return w && (needs(w) || needs(w.special));
  })) {
    out = { ...out, equipment: { ...eqO, weapons: eqO.weapons.map(function(w) {
      if (!w) return w;
      let w2 = fix(w);
      if (needs(w2.special)) w2 = { ...w2, special: fix(w2.special) };
      return w2;
    }) } };
  }
  return out;
}


/* ─── Capability detection ─── */
function hasFSA(){
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}

/* ─── Utility ─── */
function genId(){
  return "pg_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2,7);
}

function sanitizeFilename(name){
  const s = (name || "senza_nome").toString()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  return s || "senza_nome";
}

function uniqueFilename(base, takenSet){
  const baseName = sanitizeFilename(base);
  let cand = baseName + ".json";
  if (!takenSet.has(cand)) return cand;
  let i = 2;
  while (takenSet.has(baseName + "_" + i + ".json")) i++;
  return baseName + "_" + i + ".json";
}

// AAMMDD locale (es. 240523)
function todayStamp(){
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return yy + mm + dd;
}

// Nome del backup giornaliero: da "talen.json" → "talen_240523bk.json"
function backupFileName(mainFilename, stamp){
  const baseNoExt = mainFilename.replace(/\.json$/i, "");
  return baseNoExt + "_" + stamp + "bk.json";
}

// Riconosce i file di backup: "..._AAMMDDbk.json"
const BACKUP_RE = /_\d{6}bk\.json$/i;
function isBackupFile(filename){
  return BACKUP_RE.test(filename);
}

function summarize(ch){
  if (!ch) return "(vuoto)";
  const nome = ((ch.name || "") + "").trim() || "(senza nome)";
  const cls = (ch.classes || []).filter(function(c){ return c && c.name; })
    .map(function(c){ return c.name + " Lv" + (c.level || 0); }).join(" / ");
  return cls ? nome + " — " + cls : nome;
}

/* ─── Permission helper ─── */
async function ensurePermission(handle, mode){
  if (!handle) return false;
  try {
    const opts = { mode: mode || "readwrite" };
    if ((await handle.queryPermission(opts)) === "granted") return true;
    if ((await handle.requestPermission(opts)) === "granted") return true;
    return false;
  } catch (e) {
    console.warn("Permission check fallita:", e);
    return false;
  }
}

/* ─── FS operations ─── */
async function listCharFiles(dirHandle){
  const out = [];
  for await (const entry of dirHandle.values()) {
    if (entry.kind === "file" && entry.name.toLowerCase().endsWith(".json") && !isBackupFile(entry.name)) {
      try {
        const file = await entry.getFile();
        const text = await file.text();
        const data = JSON.parse(text);
        if (data && typeof data === "object" && (data.stats || data.classes || data.name !== undefined)) {
          out.push({ filename: entry.name, data: data });
        }
      } catch (e) {
        console.warn("Skip", entry.name, ":", e.message);
      }
    }
  }
  return out;
}

async function writeCharFile(dirHandle, filename, data){
  const fh = await dirHandle.getFileHandle(filename, { create: true });
  const w = await fh.createWritable();
  await w.write(JSON.stringify(data, null, 2));
  await w.close();
}

// Crea (una sola volta al giorno) il backup del file esistente PRIMA di sovrascriverlo.
// Legge il contenuto attuale su disco e lo copia in "<base>_AAMMDDbk.json".
// Se il backup di oggi esiste già, non fa nulla. Ritorna il nome del backup creato, o null.
async function backupIfNeeded(dirHandle, mainFilename){
  const stamp = todayStamp();
  const bkName = backupFileName(mainFilename, stamp);
  // Backup di oggi già presente?
  try {
    await dirHandle.getFileHandle(bkName, { create: false });
    return null; // esiste → niente da fare
  } catch (e) {
    // NotFoundError → procediamo a crearlo
  }
  // Leggi il file principale esistente (se non c'è ancora, è una nuova scheda: niente backup)
  let oldContent;
  try {
    const fh = await dirHandle.getFileHandle(mainFilename, { create: false });
    const file = await fh.getFile();
    oldContent = await file.text();
  } catch (e) {
    return null; // il file principale non esiste ancora
  }
  if (!oldContent || !oldContent.trim()) return null;
  // Scrivi il backup col contenuto precedente
  try {
    const bfh = await dirHandle.getFileHandle(bkName, { create: true });
    const w = await bfh.createWritable();
    await w.write(oldContent);
    await w.close();
    return bkName;
  } catch (e) {
    console.warn("Backup fallito per", mainFilename, e);
    return null;
  }
}

async function deleteCharFile(dirHandle, filename){
  try { await dirHandle.removeEntry(filename); }
  catch (e) { if (e.name !== "NotFoundError") console.warn("Delete fallita:", filename, e); }
}

/* ─── Campagne: sottocartelle della cartella root ─── */

// Nome cartella sicuro per il filesystem
function sanitizeFolderName(name){
  const s = (name || "campagna").toString()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return s || "campagna";
}

// Elenca le sottocartelle (= campagne) della cartella root
async function listCampaignFolders(rootHandle){
  const out = [];
  for await (const entry of rootHandle.values()) {
    if (entry.kind === "directory") out.push(entry.name);
  }
  return out.sort(function(a,b){ return a.localeCompare(b); });
}

// Elenca i .json di livello root (PG "senza campagna", candidati alla migrazione)
async function listRootCharFiles(rootHandle){
  const out = [];
  for await (const entry of rootHandle.values()) {
    if (entry.kind === "file" && entry.name.toLowerCase().endsWith(".json") && !isBackupFile(entry.name)) {
      try {
        const file = await entry.getFile();
        const text = await file.text();
        const data = JSON.parse(text);
        if (data && typeof data === "object" && (data.stats || data.classes || data.name !== undefined)) {
          out.push({ filename: entry.name, data: data });
        }
      } catch (e) { /* skip */ }
    }
  }
  return out;
}

// Sposta tutti i .json di root (e i loro backup) in una sottocartella esistente o nuova
async function migrateRootToCampaign(rootHandle, campaignFolderName){
  const camp = await rootHandle.getDirectoryHandle(campaignFolderName, { create: true });
  let moved = 0;
  // Raccogli prima i nomi (non si può iterare e modificare contemporaneamente)
  const filesToMove = [];
  for await (const entry of rootHandle.values()) {
    if (entry.kind === "file" && entry.name.toLowerCase().endsWith(".json")) {
      filesToMove.push(entry.name);
    }
  }
  for (const fname of filesToMove) {
    try {
      // Leggi il contenuto dal file root
      const srcFh = await rootHandle.getFileHandle(fname, { create: false });
      const srcFile = await srcFh.getFile();
      const text = await srcFile.text();
      // Scrivi nella sottocartella campagna
      const dstFh = await camp.getFileHandle(fname, { create: true });
      const w = await dstFh.createWritable();
      await w.write(text);
      await w.close();
      // Cancella l'originale
      await rootHandle.removeEntry(fname);
      moved++;
    } catch (e) {
      console.warn("Migrazione fallita per", fname, e);
    }
  }
  return { campaignFolderName: campaignFolderName, moved: moved };
}

/* ═══════════════════════════════════════════════════════════════
   COMPONENTE Dashboard
   ═══════════════════════════════════════════════════════════════ */
function Dashboard(){
  const [roster, setRoster]       = useState({});
  const [order, setOrder]         = useState([]);
  const [fileMap, setFileMap]     = useState({});      // id → filename su disco
  const [activeId, setActiveId]   = useState(null);
  const [dirHandle, setDirHandle] = useState(null);
  // Campagne
  // campaigns: [{ folderName: string }]  — il folderName fa anche da id ed è ciò che vedi
  const [campaigns, setCampaigns] = useState([]);
  const [activeCampaign, setActiveCampaign] = useState(null); // string folderName | null
  // Dati di tutte le campagne caricate in memoria
  // rostersByCamp: { [folderName]: { [pgId]: char } }
  // ordersByCamp:  { [folderName]: [pgId, ...] }
  // fileMapsByCamp:{ [folderName]: { [pgId]: filename } }
  const [rostersByCamp, setRostersByCamp]   = useState({});
  const [ordersByCamp, setOrdersByCamp]     = useState({});
  const [fileMapsByCamp, setFileMapsByCamp] = useState({});
  // Migration prompt
  const [migrationPrompt, setMigrationPrompt] = useState(null);  // {files: [...]}

  const [bootDone, setBootDone]   = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle|pending|saving|saved|error|lsonly
  const [errorMsg, setErrorMsg]   = useState(null);
  const [infoMsg, setInfoMsg]     = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  // Contatori per forzare il re-render dei bottoni undo/redo (la storia vive in un ref)
  const [histTick, setHistTick]   = useState(0);
  // ─── Dadi ───
  const [rollMode, setRollMode]   = useState("norm");   // "adv" | "norm" | "dis"
  const [rolls, setRolls]         = useState([]);        // storico tiri, più recente in testa
  // Interruttore «Nuova interfaccia» (pacchetto 0): ricordato su questo dispositivo
  // Dalla 10.4 l'interfaccia è una sola (la nuova, con i tre temi). Il vecchio editor si apre solo per creazione,
  // level-up e modifiche che la nuova non fa ancora, e si chiude con «Torna alla scheda». Non si ricorda tra le sessioni.
  // Dalla 10.5 la vecchia interfaccia non si apre più dalla scheda: resta solo con #editor nell'indirizzo, per lo script di ARBITRO,
  // finché i test non leggono direttamente le regole (Pacchetto 1). Si cancella con il refactoring della 11.0.
  const [editorCompleto, setEditorCompleto] = useState(function(){ try { return location.hash === "#editor"; } catch(e){ return false; } });
  let nuovaUI = !editorCompleto;
  const toggleNuovaUI = function(on){ setEditorCompleto(!on); };
  const aspDash = useAspettoCondiviso();   // tema della nuova grafica anche per barra, tab dei PG e pagina iniziale
  const [diceOpen, setDiceOpen]   = useState(false);     // pannello espanso
  const [rollFlash, setRollFlash] = useState(0);         // per animare la pillola a ogni tiro

  const fsaSupported = useMemo(function(){ return hasFSA(); }, []);

  const fileMapRef  = useRef({});
  const isSavingRef = useRef(false);
  const postBoot    = useRef(false);
  const saveTimer   = useRef(null);
  const fileInputRef= useRef(null);
  // Cache delle sottocartelle aperte: { [folderName]: FileSystemDirectoryHandle }
  const campaignHandlesRef = useRef({});

  // Storia undo/redo per-PG: { [id]: { past: [snapshot...], future: [snapshot...] } }
  // Gli snapshot sono copie JSON della scheda. Limite di profondità per non gonfiare la RAM.
  const HISTORY_LIMIT = 50;
  const historyRef = useRef({});
  const applyingHistRef = useRef(false); // true mentre applichiamo un undo/redo (non registrare)

  // Mantieni fileMapRef sempre allineato
  useEffect(function(){ fileMapRef.current = fileMap; }, [fileMap]);

  /* ─── BOOT ─── */
  useEffect(function(){
    let cancelled = false;
    (async function(){
      try {
        let loadedFromFS = false;
        let handle = null;

        // 1. Tenta IDB → handle cartella
        if (fsaSupported) {
          try { handle = await idbGet("dirHandle"); }
          catch (e) { console.warn("IDB get fallito:", e); }
        }

        // Recupera la campagna attiva ricordata (se c'è)
        let rememberedCampaign = null;
        try {
          const lastCamp = localStorage.getItem("activeCampaign_v4");
          if (lastCamp) rememberedCampaign = lastCamp;
        } catch(e){}

        // 2. Se ho handle, prova a caricare da disco — multi-campagna
        if (handle) {
          const ok = await ensurePermission(handle, "readwrite");
          if (cancelled) return;
          if (ok) {
            try {
              // Enumera sottocartelle (= campagne) e file JSON di root (= candidati migrazione)
              const folderNames = await listCampaignFolders(handle);
              const rootFiles = await listRootCharFiles(handle);
              if (cancelled) return;

              const rByC = {}; const oByC = {}; const fmByC = {};
              const camps = [];
              for (const folderName of folderNames) {
                try {
                  const sub = await handle.getDirectoryHandle(folderName, { create: false });
                  campaignHandlesRef.current[folderName] = sub;
                  const files = await listCharFiles(sub);
                  const r = {}, o = [], fm = {};
                  files.forEach(function(f){
                    const id = (f.data && f.data._dashboardId) || genId();
                    const cleaned = Object.assign({}, f.data);
                    delete cleaned._dashboardId;
                    r[id] = cleaned; o.push(id); fm[id] = f.filename;
                  });
                  rByC[folderName] = r;
                  oByC[folderName] = o;
                  fmByC[folderName] = fm;
                  camps.push({ folderName: folderName });
                } catch (e) {
                  console.warn("Sottocartella", folderName, "non leggibile:", e);
                }
              }

              setCampaigns(camps);
              setRostersByCamp(rByC);
              setOrdersByCamp(oByC);
              setFileMapsByCamp(fmByC);
              setDirHandle(handle);

              // Scegli campagna attiva
              let chosen = null;
              if (rememberedCampaign && camps.find(function(c){return c.folderName===rememberedCampaign;})) {
                chosen = rememberedCampaign;
              } else if (camps.length > 0) {
                chosen = camps[0].folderName;
              }

              if (chosen) {
                setActiveCampaign(chosen);
                setRoster(rByC[chosen] || {});
                setOrder(oByC[chosen] || []);
                setFileMap(fmByC[chosen] || {});
                const ord = oByC[chosen] || [];
                if (ord.length > 0) setActiveId(ord[0]);
              }

              // Se ci sono .json di root → proponi migrazione
              if (rootFiles.length > 0) {
                setMigrationPrompt({
                  files: rootFiles.map(function(f){ return f.filename; }),
                  rootFiles: rootFiles
                });
              }

              loadedFromFS = true;
              setSaveStatus("saved");
            } catch (e) {
              console.warn("Caricamento dalla cartella fallito:", e);
              setErrorMsg("Errore caricando la cartella: " + e.message);
            }
          } else {
            // Handle valida ma permesso non concesso ora
            setDirHandle(handle);
            setErrorMsg("Permesso cartella non concesso. Apri ⚙ Impostazioni e riautorizza.");
          }
        }

        // 3. Fallback: localStorage — supporta formato v4 (multi-campagna), v2, v1, single
        if (!loadedFromFS) {
          try {
            const raw = localStorage.getItem(STORAGE_KEY);
            let restored = false;
            if (raw) {
              const p = JSON.parse(raw);
              // Formato v4
              if (p && p.version === 4 && p.campaigns && p.rostersByCamp) {
                setCampaigns(p.campaigns || []);
                setRostersByCamp(p.rostersByCamp || {});
                setOrdersByCamp(p.ordersByCamp || {});
                setFileMapsByCamp(p.fileMapsByCamp || {});
                let chosen = (p.activeCampaign && p.rostersByCamp[p.activeCampaign]) ? p.activeCampaign : (p.campaigns[0] && p.campaigns[0].folderName);
                if (chosen) {
                  setActiveCampaign(chosen);
                  setRoster(p.rostersByCamp[chosen] || {});
                  setOrder(p.ordersByCamp[chosen] || []);
                  setFileMap(p.fileMapsByCamp[chosen] || {});
                  const ord = p.ordersByCamp[chosen] || [];
                  const aid = (p.activeId && (p.rostersByCamp[chosen] || {})[p.activeId]) ? p.activeId : (ord[0] || null);
                  if (aid) setActiveId(aid);
                }
                restored = true;
              }
              // Formato v2 / v3 (single roster) → migra a "Default"
              if (!restored && p && p.roster && p.order) {
                const camp = "Default";
                setCampaigns([{ folderName: camp }]);
                setRostersByCamp({ [camp]: p.roster });
                setOrdersByCamp({ [camp]: p.order });
                setFileMapsByCamp({ [camp]: p.fileMap || {} });
                setActiveCampaign(camp);
                setRoster(p.roster); setOrder(p.order); setFileMap(p.fileMap || {});
                const aid = p.activeId && p.roster[p.activeId] ? p.activeId : (p.order[0] || null);
                if (aid) setActiveId(aid);
                restored = true;
              }
            }
            if (!restored) {
              const legacyV1 = localStorage.getItem(LEGACY_ROSTER_KEY);
              if (legacyV1) {
                const p = JSON.parse(legacyV1);
                if (p && p.roster) {
                  const camp = "Default";
                  const ord = p.order || Object.keys(p.roster);
                  setCampaigns([{ folderName: camp }]);
                  setRostersByCamp({ [camp]: p.roster });
                  setOrdersByCamp({ [camp]: ord });
                  setFileMapsByCamp({ [camp]: {} });
                  setActiveCampaign(camp);
                  setRoster(p.roster); setOrder(ord); setFileMap({});
                  setActiveId(p.activeId || ord[0] || null);
                  setInfoMsg("Schede migrate dalla dashboard v1.");
                  restored = true;
                }
              }
            }
            if (!restored) {
              const legacy = localStorage.getItem(LEGACY_SINGLE_KEY);
              if (legacy) {
                const ch = JSON.parse(legacy);
                const id = genId();
                const camp = "Default";
                setCampaigns([{ folderName: camp }]);
                setRostersByCamp({ [camp]: { [id]: ch } });
                setOrdersByCamp({ [camp]: [id] });
                setFileMapsByCamp({ [camp]: {} });
                setActiveCampaign(camp);
                setRoster({ [id]: ch }); setOrder([id]); setFileMap({});
                setActiveId(id);
                setInfoMsg("Scheda singola v5.x migrata.");
              }
            }
            if (!handle) setSaveStatus(fsaSupported ? "idle" : "lsonly");
          } catch (e) {
            console.warn("LS restore fallito:", e);
          }
        }
      } finally {
        if (!cancelled) setBootDone(true);
      }
    })();
    return function(){ cancelled = true; };
  }, []);

  /* ─── Auto-save su disco (debounce 600ms) ─── */
  useEffect(function(){
    if (!bootDone) return;
    // Skip il primo run dopo boot (evita di riscrivere ciò che è appena stato letto)
    if (!postBoot.current) { postBoot.current = true; return; }
    if (!dirHandle || !activeCampaign) {
      setSaveStatus(fsaSupported ? "idle" : "lsonly");
      return;
    }
    // Sincronizza lo stato della campagna attiva nelle mappe per-campagna
    setRostersByCamp(function(prev){
      const next = Object.assign({}, prev);
      next[activeCampaign] = roster;
      return next;
    });
    setOrdersByCamp(function(prev){
      const next = Object.assign({}, prev);
      next[activeCampaign] = order;
      return next;
    });

    const campHandle = campaignHandlesRef.current[activeCampaign];
    if (!campHandle) {
      // Sottocartella non in cache: la save effect verrà rifatta quando l'handle è pronto
      return;
    }

    setSaveStatus("pending");

    const tryRun = async function(){
      if (isSavingRef.current) {
        // Un altro save è in corso — riprova tra poco
        saveTimer.current = setTimeout(tryRun, 300);
        return;
      }
      isSavingRef.current = true;
      setSaveStatus("saving");
      try {
        const taken = new Set();
        const fmCur = fileMapRef.current;
        const fmNew = {};

        // Scrivi/rinomina ogni PG presente in order
        for (let i = 0; i < order.length; i++) {
          const id = order[i];
          const ch = roster[id];
          if (!ch) continue;
          const desired = sanitizeFilename(ch.name || "senza_nome") + ".json";
          let target;
          if (fmCur[id] === desired && !taken.has(desired)) {
            target = desired;
          } else {
            target = uniqueFilename(ch.name || "senza_nome", taken);
            if (fmCur[id] && fmCur[id] !== target) {
              await deleteCharFile(campHandle, fmCur[id]);
            }
          }
          taken.add(target);
          fmNew[id] = target;
          const payload = Object.assign({}, ch, { _dashboardId: id });
          // Backup giornaliero: solo se stiamo sovrascrivendo un file già esistente su disco
          if (fmCur[id]) {
            try { await backupIfNeeded(campHandle, target); }
            catch (e) { console.warn("backupIfNeeded errore:", e); }
          }
          await writeCharFile(campHandle, target, payload);
        }

        // PG rimossi → cancella i loro file
        for (const oldId in fmCur) {
          if (!fmNew[oldId]) {
            await deleteCharFile(campHandle, fmCur[oldId]);
          }
        }

        setFileMap(fmNew);
        // Sincronizza anche fileMapsByCamp
        setFileMapsByCamp(function(prev){
          const next = Object.assign({}, prev);
          next[activeCampaign] = fmNew;
          return next;
        });
        setSaveStatus("saved");
      } catch (e) {
        console.error("Save fallito:", e);
        setSaveStatus("error");
        setErrorMsg("Errore salvataggio cartella: " + e.message);
      } finally {
        isSavingRef.current = false;
      }
    };

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(tryRun, 600);

    return function(){};
  }, [roster, order, dirHandle, activeCampaign, bootDone]);

  /* ─── Backup localStorage (sempre, anche se c'è la cartella) ─── */
  useEffect(function(){
    if (!bootDone) return;
    try {
      // Aggiorna gli oggetti per-campagna con lo stato attivo
      const rByC = Object.assign({}, rostersByCamp);
      const oByC = Object.assign({}, ordersByCamp);
      const fmByC = Object.assign({}, fileMapsByCamp);
      if (activeCampaign) {
        rByC[activeCampaign] = roster;
        oByC[activeCampaign] = order;
        fmByC[activeCampaign] = fileMap;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: 4,
        campaigns: campaigns,
        activeCampaign: activeCampaign,
        rostersByCamp: rByC, ordersByCamp: oByC, fileMapsByCamp: fmByC,
        activeId: activeId
      }));
      // Memorizza separatamente la campagna attiva per il prossimo boot
      if (activeCampaign) localStorage.setItem("activeCampaign_v4", activeCampaign);
    } catch (e) { /* quota o privacy mode */ }
  }, [roster, order, fileMap, activeId, activeCampaign, campaigns,
      rostersByCamp, ordersByCamp, fileMapsByCamp, bootDone]);

  /* ─── ch + setCh che editano il PG attivo ─── */
  // Normalizza con INIT: schede caricate da file/roster o vecchie possono mancare di campi
  // (es. 'skills'), che altrimenti farebbero crashare i calcoli derivati (calcDexCap, computeAll...).
  const ch = activeId ? {...INIT, ...migrateCh(roster[activeId])} : null;
  if (!ch) nuovaUI = true;   // senza personaggi c'è solo la pagina iniziale nuova

  function getHist(id){
    if (!historyRef.current[id]) historyRef.current[id] = { past: [], future: [] };
    return historyRef.current[id];
  }

  function setCh(next){
    if (!activeId) return;
    setRoster(function(r){
      const cur = r[activeId];
      const nv = (typeof next === "function") ? next(cur) : next;
      // Registra nello stack undo, a meno che non stiamo applicando un undo/redo
      if (!applyingHistRef.current && cur !== undefined) {
        const h = getHist(activeId);
        // Evita di registrare no-op (oggetto identico per riferimento)
        if (cur !== nv) {
          h.past.push(JSON.parse(JSON.stringify(cur)));
          if (h.past.length > HISTORY_LIMIT) h.past.shift();
          h.future = []; // nuova modifica → il "redo" decade
          setHistTick(function(t){ return t + 1; });
        }
      }
      return Object.assign({}, r, { [activeId]: nv });
    });
  }

  function doUndo(){
    if (!activeId) return;
    const h = getHist(activeId);
    if (h.past.length === 0) return;
    setRoster(function(r){
      const cur = r[activeId];
      const prev = h.past.pop();
      h.future.push(JSON.parse(JSON.stringify(cur)));
      if (h.future.length > HISTORY_LIMIT) h.future.shift();
      return Object.assign({}, r, { [activeId]: prev });
    });
    setHistTick(function(t){ return t + 1; });
  }

  function doRedo(){
    if (!activeId) return;
    const h = getHist(activeId);
    if (h.future.length === 0) return;
    setRoster(function(r){
      const cur = r[activeId];
      const nxt = h.future.pop();
      h.past.push(JSON.parse(JSON.stringify(cur)));
      if (h.past.length > HISTORY_LIMIT) h.past.shift();
      return Object.assign({}, r, { [activeId]: nxt });
    });
    setHistTick(function(t){ return t + 1; });
  }

  // Scorciatoie tastiera Ctrl/Cmd+Z (undo) e Ctrl/Cmd+Y o Ctrl/Cmd+Shift+Z (redo)
  useEffect(function(){
    function onKey(e){
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      // Non intercettare se l'utente sta scrivendo in un campo di testo
      const tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : "";
      const editing = tag === "input" || tag === "textarea" || (e.target && e.target.isContentEditable);
      if (editing) return;
      if (k === "z" && !e.shiftKey) { e.preventDefault(); doUndo(); }
      else if (k === "y" || (k === "z" && e.shiftKey)) { e.preventDefault(); doRedo(); }
    }
    window.addEventListener("keydown", onKey);
    return function(){ window.removeEventListener("keydown", onKey); };
  }, [activeId]);

  const canUndo = activeId && historyRef.current[activeId] && historyRef.current[activeId].past.length > 0;
  const canRedo = activeId && historyRef.current[activeId] && historyRef.current[activeId].future.length > 0;

  /* ─── Dadi: tiro, storico, persistenza ─── */

  // Restore storico tiri al boot
  useEffect(function(){
    try {
      const raw = localStorage.getItem("diceRolls_v5");
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) setRolls(arr.slice(0, 100));
      }
    } catch(e){}
  }, []);

  // Persisti storico a ogni tiro
  useEffect(function(){
    if (rolls.length === 0) return;
    try { localStorage.setItem("diceRolls_v5", JSON.stringify(rolls.slice(0, 100))); }
    catch(e){}
  }, [rolls]);

  function d20(){ return 1 + Math.floor(Math.random() * 20); }

  // label: nome competenza/iniziativa; mod: modificatore intero
  function doRoll(label, mod){
    const d1 = d20();
    const useTwo = rollMode !== "norm";
    const d2 = useTwo ? d20() : null;
    let chosen = d1;
    if (rollMode === "adv") chosen = Math.max(d1, d2);
    else if (rollMode === "dis") chosen = Math.min(d1, d2);
    const entry = {
      t: Date.now(),
      pg: (ch && ch.name) || "?",
      label: label,
      mod: mod,
      d1: d1, d2: d2,
      chosen: chosen,
      total: chosen + mod,
      mode: rollMode
    };
    setRolls(function(prev){ return [entry].concat(prev).slice(0, 100); });
    setRollFlash(function(f){ return f + 1; });
    return entry;   // usato dal lancio automatico del sovra-lancio (CombatTab)
  }

  // Tira dadi di danno. groups: [{dice:"1d10", type:"Perforazione", flat:0}], bonus piatto opzionale per gruppo.
  // crit: se true, raddoppia il numero di dadi di ciascun gruppo (danni critici).
  function rollDice(spec){
    // spec es. "2d6" -> {n:2,f:6}; "1d10" -> {n:1,f:10}; numero puro -> fisso
    const m = /^(\d+)d(\d+)$/.exec((spec||"").trim());
    if (!m) { const v = parseInt(spec,10); return { rolls:[], fixed: isNaN(v)?0:v }; }
    const n = parseInt(m[1],10), f = parseInt(m[2],10);
    const rs = [];
    for (let i=0;i<n;i++) rs.push(1 + Math.floor(Math.random()*f));
    return { rolls: rs, fixed: 0, n:n, f:f };
  }
  function doRollDamage(label, groups, crit){
    const parts = groups.map(function(g){
      let r = rollDice(g.dice);
      let rs = r.rolls.slice();
      if (crit && r.n) { for (let i=0;i<r.n;i++) rs.push(1 + Math.floor(Math.random()*r.f)); } // raddoppia i dadi
      const sub = rs.reduce(function(s,x){return s+x;}, 0) + (r.fixed||0) + (g.flat||0);
      return { type: g.type||"", dice: g.dice, flat: g.flat||0, rolls: rs, sub: sub };
    });
    const total = parts.reduce(function(s,p){return s+p.sub;}, 0);
    const entry = {
      t: Date.now(),
      pg: (ch && ch.name) || "?",
      label: label + (crit ? " — CRITICO" : ""),
      isDamage: true,
      crit: !!crit,
      parts: parts,
      total: total
    };
    setRolls(function(prev){ return [entry].concat(prev).slice(0, 100); });
    setRollFlash(function(f){ return f + 1; });
  }

  // 10.7: svuota lo storico di un solo personaggio (nuova interfaccia, C.act.clearRolls); la conferma la chiede l'interfaccia
  function clearRollsOf(pg){ setRolls(function(prev){ return prev.filter(function(r){ return r.pg && r.pg !== pg; }); }); }
  function clearRolls(){
    if (rolls.length === 0) return;
    if (!window.confirm("Azzerare lo storico dei tiri?")) return;
    setRolls([]);
    try { localStorage.removeItem("diceRolls_v5"); } catch(e){}
  }

  function fmtTime(t){
    const d = new Date(t);
    return String(d.getHours()).padStart(2,"0") + ":" + String(d.getMinutes()).padStart(2,"0");
  }

  /* ─── Folder picker ─── */
  /* ─── Gestione campagne ─── */

  // Cambia campagna: salva lo stato della campagna in uscita e carica quella in entrata
  function switchCampaign(folderName){
    if (folderName === activeCampaign) return;
    if (!folderName) return;
    if (!rostersByCamp[folderName]) {
      setErrorMsg("Campagna sconosciuta: " + folderName);
      return;
    }
    // Salva lo stato corrente prima di switchare
    setRostersByCamp(function(prev){ return Object.assign({}, prev, { [activeCampaign]: roster }); });
    setOrdersByCamp(function(prev){ return Object.assign({}, prev, { [activeCampaign]: order }); });
    setFileMapsByCamp(function(prev){ return Object.assign({}, prev, { [activeCampaign]: fileMap }); });
    // Carica la nuova
    setActiveCampaign(folderName);
    const newR = rostersByCamp[folderName] || {};
    const newO = ordersByCamp[folderName] || [];
    const newFm = fileMapsByCamp[folderName] || {};
    setRoster(newR); setOrder(newO); setFileMap(newFm);
    setActiveId(newO[0] || null);
  }

  async function createCampaign(){
    const name = window.prompt("Nome della nuova campagna:", "");
    if (!name) return;
    const folderName = sanitizeFolderName(name);
    if (campaigns.find(function(c){ return c.folderName === folderName; })) {
      setErrorMsg("Esiste già una campagna con questo nome.");
      return;
    }
    // Su disco: crea la sottocartella se abbiamo la cartella root
    if (dirHandle) {
      try {
        const sub = await dirHandle.getDirectoryHandle(folderName, { create: true });
        campaignHandlesRef.current[folderName] = sub;
      } catch (e) {
        setErrorMsg("Errore creando la sottocartella: " + e.message);
        return;
      }
    }
    // Aggiorna lo stato
    setCampaigns(function(prev){ return prev.concat([{ folderName: folderName }]); });
    setRostersByCamp(function(prev){ return Object.assign({}, prev, { [folderName]: {} }); });
    setOrdersByCamp(function(prev){ return Object.assign({}, prev, { [folderName]: [] }); });
    setFileMapsByCamp(function(prev){ return Object.assign({}, prev, { [folderName]: {} }); });
    // Salva stato corrente, poi switcha
    if (activeCampaign) {
      setRostersByCamp(function(prev){ return Object.assign({}, prev, { [activeCampaign]: roster }); });
      setOrdersByCamp(function(prev){ return Object.assign({}, prev, { [activeCampaign]: order }); });
      setFileMapsByCamp(function(prev){ return Object.assign({}, prev, { [activeCampaign]: fileMap }); });
    }
    setActiveCampaign(folderName);
    setRoster({}); setOrder([]); setFileMap({}); setActiveId(null);
    setInfoMsg("Campagna \"" + folderName + "\" creata.");
    setTimeout(function(){ setInfoMsg(null); }, 3000);
  }

  async function renameActiveCampaign(){
    if (!activeCampaign) return;
    const newName = window.prompt("Nuovo nome per la campagna:", activeCampaign);
    if (!newName) return;
    const newFolder = sanitizeFolderName(newName);
    if (newFolder === activeCampaign) return;
    if (campaigns.find(function(c){ return c.folderName === newFolder; })) {
      setErrorMsg("Esiste già una campagna con questo nome.");
      return;
    }
    const oldFolder = activeCampaign;
    // Sul disco: crea la nuova sottocartella, sposta i file, cancella la vecchia
    if (dirHandle) {
      try {
        const oldHandle = campaignHandlesRef.current[oldFolder];
        const newHandle = await dirHandle.getDirectoryHandle(newFolder, { create: true });
        if (oldHandle) {
          // Sposta tutti i file (incluso i backup)
          const filesToMove = [];
          for await (const entry of oldHandle.values()) {
            if (entry.kind === "file") filesToMove.push(entry.name);
          }
          for (const fname of filesToMove) {
            const srcFh = await oldHandle.getFileHandle(fname, { create: false });
            const txt = await (await srcFh.getFile()).text();
            const dstFh = await newHandle.getFileHandle(fname, { create: true });
            const w = await dstFh.createWritable();
            await w.write(txt); await w.close();
            await oldHandle.removeEntry(fname);
          }
          // Rimuovi la vecchia sottocartella
          try { await dirHandle.removeEntry(oldFolder); } catch(e){}
        }
        campaignHandlesRef.current[newFolder] = newHandle;
        delete campaignHandlesRef.current[oldFolder];
      } catch (e) {
        setErrorMsg("Errore rinominando: " + e.message);
        return;
      }
    }
    // Aggiorna lo stato
    setCampaigns(function(prev){
      return prev.map(function(c){ return c.folderName === oldFolder ? { folderName: newFolder } : c; });
    });
    setRostersByCamp(function(prev){
      const next = Object.assign({}, prev);
      next[newFolder] = next[oldFolder] || roster; delete next[oldFolder]; return next;
    });
    setOrdersByCamp(function(prev){
      const next = Object.assign({}, prev);
      next[newFolder] = next[oldFolder] || order; delete next[oldFolder]; return next;
    });
    setFileMapsByCamp(function(prev){
      const next = Object.assign({}, prev);
      next[newFolder] = next[oldFolder] || fileMap; delete next[oldFolder]; return next;
    });
    setActiveCampaign(newFolder);
    setInfoMsg("Campagna rinominata in \"" + newFolder + "\".");
    setTimeout(function(){ setInfoMsg(null); }, 3000);
  }

  async function deleteActiveCampaign(){
    if (!activeCampaign) return;
    if (campaigns.length <= 1) {
      setErrorMsg("Non puoi eliminare l'unica campagna esistente.");
      return;
    }
    const pgCount = (ordersByCamp[activeCampaign] || []).length;
    const msg = "Eliminare la campagna \"" + activeCampaign + "\"?\n\n" +
      (pgCount > 0 ? "Contiene " + pgCount + " PG. " : "") +
      (dirHandle ? "La sottocartella e i file dentro verranno cancellati." : "I dati nel browser verranno persi.");
    if (!window.confirm(msg)) return;
    // Cancella su disco
    if (dirHandle) {
      try {
        await dirHandle.removeEntry(activeCampaign, { recursive: true });
      } catch (e) {
        setErrorMsg("Errore cancellando la cartella: " + e.message);
        return;
      }
      delete campaignHandlesRef.current[activeCampaign];
    }
    const removed = activeCampaign;
    const remaining = campaigns.filter(function(c){ return c.folderName !== removed; });
    setCampaigns(remaining);
    setRostersByCamp(function(prev){ const n = Object.assign({}, prev); delete n[removed]; return n; });
    setOrdersByCamp(function(prev){ const n = Object.assign({}, prev); delete n[removed]; return n; });
    setFileMapsByCamp(function(prev){ const n = Object.assign({}, prev); delete n[removed]; return n; });
    // Switch alla prima rimasta
    if (remaining.length > 0) {
      const next = remaining[0].folderName;
      setActiveCampaign(next);
      const nr = rostersByCamp[next] || {};
      const no = ordersByCamp[next] || [];
      const nfm = fileMapsByCamp[next] || {};
      setRoster(nr); setOrder(no); setFileMap(nfm);
      setActiveId(no[0] || null);
    } else {
      setActiveCampaign(null);
      setRoster({}); setOrder([]); setFileMap({}); setActiveId(null);
    }
  }

  // Esegue la migrazione dei .json di root in una sottocartella scelta
  async function doMigration(targetCampaignName){
    if (!migrationPrompt || !dirHandle) return;
    const folderName = sanitizeFolderName(targetCampaignName || "Default");
    try {
      const result = await migrateRootToCampaign(dirHandle, folderName);
      // Ricarica la sottocartella di destinazione
      const sub = await dirHandle.getDirectoryHandle(folderName, { create: false });
      campaignHandlesRef.current[folderName] = sub;
      const files = await listCharFiles(sub);
      const r = {}, o = [], fm = {};
      files.forEach(function(f){
        const id = (f.data && f.data._dashboardId) || genId();
        const cleaned = Object.assign({}, f.data);
        delete cleaned._dashboardId;
        r[id] = cleaned; o.push(id); fm[id] = f.filename;
      });
      // Se la campagna esiste già, sovrascrivila con i dati dal disco (più affidabile)
      const exists = campaigns.find(function(c){ return c.folderName === folderName; });
      if (!exists) {
        setCampaigns(function(prev){ return prev.concat([{ folderName: folderName }]); });
      }
      setRostersByCamp(function(prev){ return Object.assign({}, prev, { [folderName]: r }); });
      setOrdersByCamp(function(prev){ return Object.assign({}, prev, { [folderName]: o }); });
      setFileMapsByCamp(function(prev){ return Object.assign({}, prev, { [folderName]: fm }); });
      // Switcha sulla campagna migrata
      setActiveCampaign(folderName);
      setRoster(r); setOrder(o); setFileMap(fm);
      if (o.length > 0) setActiveId(o[0]);
      setMigrationPrompt(null);
      setInfoMsg(result.moved + " schede migrate in \"" + folderName + "\".");
      setTimeout(function(){ setInfoMsg(null); }, 4000);
    } catch (e) {
      setErrorMsg("Migrazione fallita: " + e.message);
    }
  }

  async function pickFolder(){
    if (!fsaSupported) {
      setErrorMsg("Questo browser non supporta la scelta cartella. Usa Chrome o Edge desktop.");
      return;
    }
    let handle;
    try {
      handle = await window.showDirectoryPicker({ mode: "readwrite" });
    } catch (e) {
      if (e.name !== "AbortError") setErrorMsg("Errore: " + e.message);
      return;
    }
    const ok = await ensurePermission(handle, "readwrite");
    if (!ok) { setErrorMsg("Permesso negato."); return; }

    // 10.7.9 (27/11): copia di sicurezza di quello che c'è nel browser prima di collegare una cartella
    try { const prima = localStorage.getItem(STORAGE_KEY); if (prima) localStorage.setItem(STORAGE_KEY + "_prima_della_cartella", prima); } catch (e) {}

    // Enumera contenuto della root: campagne = sottocartelle che contengono schede, .json di root = candidati migrazione.
    // 10.7.9: le sottocartelle senza schede non diventano campagne (prima, scegliendo per errore Documenti, ogni sua sottocartella diventava una campagna)
    let folderNames = [], rootFiles = [];
    const filesByFolder = {};
    try {
      const tutte = await listCampaignFolders(handle);
      for (const folderName of tutte) {
        try {
          const sub = await handle.getDirectoryHandle(folderName, { create: false });
          const files = await listCharFiles(sub);
          if (files.length > 0) { folderNames.push(folderName); filesByFolder[folderName] = { sub: sub, files: files }; }
        } catch (e) { console.warn("Sottocartella non leggibile:", folderName, e); }
      }
      rootFiles = await listRootCharFiles(handle);
    } catch (e) {
      setErrorMsg("Errore lettura cartella: " + e.message);
      return;
    }

    const haveLocalData = Object.keys(roster || {}).length > 0 || Object.keys(rostersByCamp || {}).some(function(k){ return Object.keys(rostersByCamp[k] || {}).length > 0; });
    const folderHasData = (folderNames.length > 0 || rootFiles.length > 0);

    // 10.7.9: cartella senza schede → i personaggi del browser restano e vengono salvati lì dentro
    if (!folderHasData) {
      try { await idbSet("dirHandle", handle); } catch (e) { console.warn("IDB set fallito:", e); }
      const camps0 = (campaigns && campaigns.length) ? campaigns : [{ folderName: activeCampaign || "Default" }];
      for (const c of camps0) {
        try { campaignHandlesRef.current[c.folderName] = await handle.getDirectoryHandle(c.folderName, { create: true }); }
        catch (e) { setErrorMsg("Errore creando la sottocartella " + c.folderName + ": " + e.message); return; }
      }
      const fm0 = {}; camps0.forEach(function(c){ fm0[c.folderName] = {}; });
      fileMapRef.current = {};
      setFileMapsByCamp(fm0); setFileMap({});
      if (!campaigns || !campaigns.length) { setCampaigns(camps0); setActiveCampaign(camps0[0].folderName); }
      setDirHandle(handle);
      setInfoMsg(haveLocalData ? "Cartella collegata: i personaggi del browser vengono salvati lì." : "Cartella collegata.");
      setTimeout(function(){ setInfoMsg(null); }, 4000);
      return;
    }

    if (haveLocalData) {
      const txt = "La cartella «" + handle.name + "» contiene già delle schede" +
        " (" + folderNames.length + " campagn" + (folderNames.length===1?"a":"e") +
        (rootFiles.length > 0 ? ", " + rootFiles.length + " file sciolti" : "") + ")." +
        "\n\nOK = la scheda usa i personaggi di quella cartella al posto di quelli del browser (questi restano in una copia di sicurezza)." +
        "\nAnnulla = non collegare la cartella.";
      if (!window.confirm(txt)) return;
    }

    // Persisti handle
    try { await idbSet("dirHandle", handle); }
    catch (e) { console.warn("IDB set fallito:", e); }

    // Carica le campagne dalla cartella
    const rByC = {}, oByC = {}, fmByC = {};
    const camps = [];
    for (const folderName of folderNames) {
      const sub = filesByFolder[folderName].sub, files = filesByFolder[folderName].files;
      campaignHandlesRef.current[folderName] = sub;
      const r = {}, o = [], fm = {};
      files.forEach(function(f){
        const id = (f.data && f.data._dashboardId) || genId();
        const cleaned = Object.assign({}, f.data);
        delete cleaned._dashboardId;
        r[id] = cleaned; o.push(id); fm[id] = f.filename;
      });
      rByC[folderName] = r; oByC[folderName] = o; fmByC[folderName] = fm;
      camps.push({ folderName: folderName });
    }

    setDirHandle(handle);
    setCampaigns(camps);
    setRostersByCamp(rByC);
    setOrdersByCamp(oByC);
    setFileMapsByCamp(fmByC);

    if (camps.length > 0) {
      const chosen = camps[0].folderName;
      setActiveCampaign(chosen);
      setRoster(rByC[chosen] || {});
      setOrder(oByC[chosen] || []);
      setFileMap(fmByC[chosen] || {});
      setActiveId((oByC[chosen] || [])[0] || null);
    } else {
      setActiveCampaign(null);
      setRoster({}); setOrder([]); setFileMap({}); setActiveId(null);
    }

    // Prompt migrazione se ci sono .json di root
    if (rootFiles.length > 0) {
      setMigrationPrompt({
        files: rootFiles.map(function(f){ return f.filename; }),
        rootFiles: rootFiles
      });
    }

    setInfoMsg(camps.length + " campagn" + (camps.length===1?"a":"e") + " caricate" +
      (rootFiles.length > 0 ? " (" + rootFiles.length + " schede da migrare)" : "") + ".");
    setTimeout(function(){ setInfoMsg(null); }, 4000);
  }

  async function reauthorize(){
    if (!dirHandle) return;
    const ok = await ensurePermission(dirHandle, "readwrite");
    if (!ok) { setErrorMsg("Permesso ancora negato."); return; }
    setErrorMsg(null);
    try {
      const folderNames = await listCampaignFolders(dirHandle);
      const rByC = {}, oByC = {}, fmByC = {};
      const camps = [];
      for (const folderName of folderNames) {
        const sub = await dirHandle.getDirectoryHandle(folderName, { create: false });
        campaignHandlesRef.current[folderName] = sub;
        const files = await listCharFiles(sub);
        const r = {}, o = [], fm = {};
        files.forEach(function(f){
          const id = (f.data && f.data._dashboardId) || genId();
          const cleaned = Object.assign({}, f.data);
          delete cleaned._dashboardId;
          r[id] = cleaned; o.push(id); fm[id] = f.filename;
        });
        rByC[folderName] = r; oByC[folderName] = o; fmByC[folderName] = fm;
        camps.push({ folderName: folderName });
      }
      setCampaigns(camps);
      setRostersByCamp(rByC);
      setOrdersByCamp(oByC);
      setFileMapsByCamp(fmByC);
      const chosen = activeCampaign && rByC[activeCampaign] ? activeCampaign : (camps[0] && camps[0].folderName);
      if (chosen) {
        setActiveCampaign(chosen);
        setRoster(rByC[chosen]); setOrder(oByC[chosen]); setFileMap(fmByC[chosen]);
        const ord = oByC[chosen];
        if (ord.length > 0 && !rByC[chosen][activeId]) setActiveId(ord[0]);
      }
      setSaveStatus("saved");
      setInfoMsg("Cartella ricollegata.");
      setTimeout(function(){ setInfoMsg(null); }, 3000);
    } catch (e) {
      setErrorMsg("Errore caricando: " + e.message);
    }
  }

  async function disconnectFolder(){
    if (!window.confirm("Smettere di salvare nella cartella?\n\nLe schede restano nel browser e i file su disco non vengono toccati. Potrai re-impostare la cartella in qualsiasi momento.")) return;
    setDirHandle(null);
    campaignHandlesRef.current = {};
    try { await idbDel("dirHandle"); } catch(e){}
    setSaveStatus(fsaSupported ? "idle" : "lsonly");
    setShowSettings(false);
  }

  /* ─── Import / Add / Remove ─── */
  function triggerImport(){ fileInputRef.current && fileInputRef.current.click(); }

  async function onFiles(e){
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    await ensureActiveCampaign();
    let aggiunti = 0, falliti = 0, lastId = null, pending = files.length;
    const newRoster = Object.assign({}, roster);
    const newOrder = order.slice();
    files.forEach(function(file){
      const reader = new FileReader();
      reader.onload = function(ev){
        try {
          const obj = JSON.parse(ev.target.result);
          if (!obj || typeof obj !== "object" || (obj.stats === undefined && obj.classes === undefined && obj.name === undefined)) {
            throw new Error("non sembra una scheda PG");
          }
          const id = obj._dashboardId || genId();
          const cleaned = Object.assign({}, obj);
          delete cleaned._dashboardId;
          newRoster[id] = cleaned;
          if (newOrder.indexOf(id) < 0) newOrder.push(id);
          lastId = id;
          aggiunti++;
        } catch (err) { falliti++; console.warn("Skip", file.name, err); }
        pending--;
        if (pending === 0) {
          setRoster(newRoster);
          setOrder(newOrder);
          if (lastId) setActiveId(lastId);
          setInfoMsg((aggiunti === 1 ? "Importata 1 scheda" : "Importate " + aggiunti + " schede") + (falliti ? " (" + falliti + (falliti === 1 ? " ignorata)" : " ignorate)") : "") + ".");
          setTimeout(function(){ setInfoMsg(null); }, 4000);
        }
      };
      reader.onerror = function(){ falliti++; pending--; };
      reader.readAsText(file);
    });
    e.target.value = "";
  }

  // Garantisce che esista almeno una campagna attiva. Crea "Default" se non c'è.
  async function ensureActiveCampaign(){
    if (activeCampaign && rostersByCamp[activeCampaign] !== undefined) return activeCampaign;
    const folderName = "Default";
    if (dirHandle) {
      try {
        const sub = await dirHandle.getDirectoryHandle(folderName, { create: true });
        campaignHandlesRef.current[folderName] = sub;
      } catch (e) {
        setErrorMsg("Errore creando sottocartella Default: " + e.message);
        return null;
      }
    }
    setCampaigns(function(prev){
      if (prev.find(function(c){ return c.folderName === folderName; })) return prev;
      return prev.concat([{ folderName: folderName }]);
    });
    setRostersByCamp(function(prev){ return Object.assign({}, prev, { [folderName]: {} }); });
    setOrdersByCamp(function(prev){ return Object.assign({}, prev, { [folderName]: [] }); });
    setFileMapsByCamp(function(prev){ return Object.assign({}, prev, { [folderName]: {} }); });
    setActiveCampaign(folderName);
    setRoster({}); setOrder([]); setFileMap({});
    return folderName;
  }

  async function addBlank(){
    await ensureActiveCampaign();
    const id = genId();
    const blank = Object.assign({}, INIT, { name: "Nuovo PG" });
    setRoster(function(r){ return Object.assign({}, r, { [id]: blank }); });
    setOrder(function(o){ return o.concat([id]); });
    setActiveId(id);
  }

  function removeActive(){
    if (!activeId) return;
    const nome = (ch && ch.name) || "questa scheda";
    const note = dirHandle
      ? "Il file JSON principale verrà eliminato. Gli eventuali backup giornalieri (…bk.json) restano nella cartella."
      : "La scheda verrà rimossa dal browser. Se vuoi conservarla, esportala prima dalla scheda.";
    if (!window.confirm("Rimuovere \"" + nome + "\"?\n\n" + note)) return;
    const nr = Object.assign({}, roster); delete nr[activeId];
    const no = order.filter(function(id){ return id !== activeId; });
    if (historyRef.current[activeId]) delete historyRef.current[activeId];
    setRoster(nr); setOrder(no);
    setActiveId(no[0] || null);
  }

  /* ─── Render ─── */
  const empty = order.length === 0;

  let statusLabel = null, statusColor = "#8a7e6a";
  if (saveStatus === "saving")  { statusLabel = "💾 Salvataggio…"; statusColor = "#d4a020"; }
  else if (saveStatus === "pending") { statusLabel = "✏ Modificato";   statusColor = "#d4a020"; }
  else if (saveStatus === "saved")   { statusLabel = "✓ Salvato";       statusColor = "#6a9a6a"; }
  else if (saveStatus === "error")   { statusLabel = "⚠ Errore";        statusColor = "#a83232"; }
  else if (saveStatus === "lsonly")  { statusLabel = "🌐 Solo browser"; statusColor = "#8aa"; }
  else if (saveStatus === "idle" && fsaSupported) { statusLabel = "📁 Imposta cartella"; statusColor = "#8a7e6a"; }

  return (
    <div className={nuovaUI ? "gx-dash" : undefined} data-theme={nuovaUI ? aspDash.theme : undefined} data-var={nuovaUI ? aspDash.eff : undefined}>
      {nuovaUI ? <style>{GX_DASH_VARS + GX_DASH_CSS}</style> : null}
      <style>{`
        .dash-bar{background:#1f1b16;border-bottom:2px solid #8a7235;padding:7px 10px;display:flex;align-items:center;gap:7px;flex-wrap:wrap;font-family:'Crimson Text',serif;color:#d4c5a9;position:sticky;top:0;z-index:100}
        .dash-bar .lbl{font-family:'Cinzel',serif;color:#c9a84c;font-size:.74em;letter-spacing:2px;font-weight:600}
        .dash-bar select.camp{background:#2a2520;border:1px solid #8a7235;color:#d4c5a9;padding:5px 10px;font-family:'Cinzel',serif;font-size:.8em;letter-spacing:1px;border-radius:3px;min-width:180px;cursor:pointer}
        .dash-bar select.camp:hover{background:#332e25;border-color:#c9a84c;color:#e8c45a}
        .dash-bar select.camp:disabled{opacity:.45;cursor:not-allowed}
        .dash-bar .dbtn{padding:5px 10px;background:#2e2922;border:1px solid #8a7235;color:#c9a84c;cursor:pointer;font-family:'Cinzel',serif;font-size:.68em;letter-spacing:1px;border-radius:3px}
        .dash-bar .dbtn:hover{background:#332e25;color:#e8c45a}
        .dash-bar .dbtn.danger{border-color:#a83232;color:#d47070}
        .dash-bar .dbtn.danger:hover{background:#3a1f1f}
        .dash-bar .dbtn:disabled{opacity:.4;cursor:not-allowed}
        .dash-bar .spacer{flex:1;min-width:0}
        .dash-bar .status{font-size:.72em;font-weight:600;padding:4px 9px;border-radius:3px;background:#2e2922;border:1px solid;cursor:pointer;white-space:nowrap;font-family:'Crimson Text',serif}
        .dash-bar .status:hover{filter:brightness(1.2)}

        /* Striscia tab PG, multilinea con wrap stile Pannello di Controllo */
        .pg-tabs{background:#262119;border-bottom:1px solid #3d3529;padding:6px 8px 0 8px;display:flex;flex-wrap:wrap;gap:0;align-items:flex-end;font-family:'Crimson Text',serif}
        .pg-tab{background:#1f1b16;border:1px solid #3d3529;border-bottom:none;color:#a89a7a;padding:5px 10px 4px 10px;margin:0 2px -1px 0;cursor:pointer;border-top-left-radius:5px;border-top-right-radius:5px;font-size:.85em;line-height:1.1;display:flex;flex-direction:column;align-items:flex-start;min-width:0;max-width:200px;transition:all .15s ease}
        .pg-tab .pg-name{font-weight:600;color:#c9a84c;letter-spacing:.3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px}
        .pg-tab .pg-sub{font-size:.7em;color:#7a6e58;letter-spacing:.5px;font-family:'Cinzel',serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px;text-transform:uppercase}
        .pg-tab:hover{background:#2e2922;color:#d4c5a9}
        .pg-tab:hover .pg-name{color:#e8c45a}
        .pg-tab.act{background:#1a1714;border-color:#c9a84c;border-bottom:2px solid #1a1714;position:relative;z-index:2;padding-bottom:5px}
        .pg-tab.act .pg-name{color:#e8c45a}
        .pg-tab.act .pg-sub{color:#a09478}
        .pg-tab.add{background:#222018;border-color:#3d3529;color:#7a8f7a;font-family:'Cinzel',serif;font-size:.7em;letter-spacing:1px;padding:7px 12px;align-self:center;justify-content:center}
        .pg-tab.add:hover{background:#2b2820;color:#9cb89c;border-color:#5a7a5a}
        .pg-tab.del{background:#221818;border-color:#3d2929;color:#a87a7a;font-family:'Cinzel',serif;font-size:.7em;letter-spacing:1px;padding:7px 12px;align-self:center;justify-content:center}
        .pg-tab.del:hover{background:#2b1f1f;color:#d47070;border-color:#6a3030}

        /* Prompt migrazione */
        .dash-migrate{background:#252e1f;border:1px solid #5a7a3a;color:#d4dfba;padding:14px 18px;margin:8px;border-radius:5px;font-family:'Crimson Text',serif}
        .dash-migrate strong{font-family:'Cinzel',serif;color:#c9e07a;font-size:.95em;letter-spacing:1px}
        .dash-migrate p{margin:8px 0;line-height:1.4}
        .dash-migrate ul{margin:6px 0 6px 24px;font-size:.88em;color:#a8b89a}
        .dash-migrate .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}
        .dash-migrate .dbtn{padding:7px 14px;background:#2e3922;border:1px solid #5a7a3a;color:#c9e07a;cursor:pointer;font-family:'Cinzel',serif;font-size:.72em;letter-spacing:1px;border-radius:3px}
        .dash-migrate .dbtn:hover{background:#3a4a2a;color:#dff09a}
        .dash-migrate .dbtn.primary{background:#3a5226;border-color:#7a9a4a;color:#dff09a;font-weight:700}
        .dash-migrate .dbtn.primary:hover{background:#4a6630}

        .dash-empty{max-width:580px;margin:50px auto;padding:28px;background:#252119;border:1px solid #3d3529;border-radius:8px;text-align:center;color:#d4c5a9;font-family:'Crimson Text',serif}
        .dash-empty h2{font-family:'Cinzel',serif;color:#c9a84c;font-size:1.2em;letter-spacing:2px;margin-bottom:14px}
        .dash-empty p{margin-bottom:14px;line-height:1.5}
        .dash-empty .row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin:14px 0}
        .dash-empty .dbtn{padding:9px 18px;background:#2e2922;border:1px solid #8a7235;color:#c9a84c;cursor:pointer;font-family:'Cinzel',serif;font-size:.78em;letter-spacing:1.5px;border-radius:3px}
        .dash-empty .dbtn:hover{background:#332e25;color:#e8c45a}
        .dash-empty .dbtn.primary{border-color:#c9a84c;background:#3a3220;color:#e8c45a;font-weight:700}
        .dash-empty .dbtn.primary:hover{background:#453a26}
        .dash-empty .hint{font-size:.78em;color:#8a7e6a;margin-top:14px;padding-top:12px;border-top:1px solid #3d3529;line-height:1.5}
        .dash-msg{padding:6px 14px;font-size:.85em;text-align:center;font-family:'Crimson Text',serif}
        .dash-msg.ok{background:#1a2a1a;color:#9c9;border-bottom:1px solid #3a7a3a}
        .dash-msg.warn{background:#2a2518;color:#d4a020;border-bottom:1px solid #8a7235}
        .dash-msg.info{background:#1f2530;color:#9bc;border-bottom:1px solid #4a6080}
        .dash-msg.err{background:#2a1818;color:#e88;border-bottom:1px solid #a83232}
        .dash-msg .x{cursor:pointer;margin-left:10px;opacity:.6;font-weight:bold}
        .dash-msg .x:hover{opacity:1}
        .dash-settings{position:fixed;top:54px;right:10px;background:#252119;border:1px solid #c9a84c;border-radius:6px;padding:14px 16px;color:#d4c5a9;font-family:'Crimson Text',serif;font-size:.88em;z-index:200;min-width:300px;max-width:380px;box-shadow:0 6px 24px rgba(0,0,0,.6)}
        .dash-settings h3{font-family:'Cinzel',serif;color:#c9a84c;font-size:.92em;letter-spacing:1.5px;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #3d3529}
        .dash-settings p{margin:8px 0;line-height:1.5}
        .dash-settings .info{color:#a09e8a;font-size:.85em;margin:6px 0;line-height:1.5}
        .dash-settings .ok-line{color:#9c9}
        .dash-settings .warn-line{color:#d4a020}
        .dash-settings .err-line{color:#e88}
        .dash-settings .row{display:flex;flex-direction:column;gap:6px;margin-top:10px}
        .dash-settings .dbtn{padding:7px 12px;background:#2e2922;border:1px solid #8a7235;color:#c9a84c;cursor:pointer;font-family:'Cinzel',serif;font-size:.74em;letter-spacing:1.2px;border-radius:3px;text-align:left}
        .dash-settings .dbtn:hover{background:#332e25;color:#e8c45a}
        .dash-settings .dbtn.primary{border-color:#c9a84c;color:#e8c45a;background:#3a3220}
        .dash-settings .dbtn.primary:hover{background:#453a26}
        .dash-settings .dbtn.danger{border-color:#a83232;color:#d47070}
        .dash-settings .dbtn.danger:hover{background:#3a1f1f}
        @media (max-width:768px){
          .dash-bar select.camp{min-width:0;flex:1;font-size:.74em;padding:5px 8px}
          .dash-bar .lbl{display:none}
          .dash-bar .status{font-size:.65em;padding:3px 6px}
          .pg-tab{font-size:.78em;padding:4px 8px 3px 8px;max-width:140px}
          .pg-tab .pg-name{max-width:120px}
          .pg-tab .pg-sub{max-width:120px}
          .dash-settings{left:10px;right:10px;min-width:0;max-width:none}
        }
        @media print {
          .dash-bar,.pg-tabs,.dash-msg,.dash-settings,.dash-migrate,.dice-dock{display:none !important}
        }

        /* ═══ Dock dadi ═══ */
        @media (min-width:769px){ .app{padding-bottom:96px} }
        .dice-dock{position:fixed;right:14px;bottom:14px;z-index:300;display:flex;flex-direction:column;align-items:flex-end;gap:8px;font-family:'Crimson Text',serif}
        .dice-pill{display:flex;align-items:center;gap:8px;background:#221d16;border:1px solid #8a7235;border-radius:24px;padding:6px 12px;box-shadow:0 4px 16px rgba(0,0,0,.5)}
        .dice-modes{display:flex;gap:2px;background:#1a1610;border-radius:14px;padding:2px}
        .dice-modes .dm{width:25px;height:25px;display:flex;align-items:center;justify-content:center;font-family:'Cinzel',serif;font-size:.72em;font-weight:700;color:#a89878;cursor:pointer;border-radius:12px;transition:all .12s}
        .dice-modes .dm:hover{color:#c9a84c}
        .dice-modes .dm.act{background:#3a3220;color:#e8c45a}
        .dice-modes .dm.adv.act{background:#27381f;color:#9adf7a}
        .dice-modes .dm.dis.act{background:#3a1f1f;color:#df8a7a}
        .dice-summary{cursor:pointer;color:#d4c5a9;font-size:1em;min-width:96px;text-align:right;white-space:nowrap}
        .dice-summary:hover{color:#e8c45a}
        .dice-summary b{font-size:1.15em;color:#e8c45a}
        .dice-summary b.nat20{color:#7adf6a}
        .dice-summary b.nat1{color:#df6a5a}
        .dice-flash{animation:diceFlash .4s ease}
        @keyframes diceFlash{0%{opacity:0;transform:translateY(4px) scale(1.15)}100%{opacity:1;transform:none}}
        .dice-hist{background:#221d16;border:1px solid #8a7235;border-radius:8px;width:320px;max-height:50vh;display:flex;flex-direction:column;box-shadow:0 8px 28px rgba(0,0,0,.6);overflow:hidden}
        .dice-hist-head{display:flex;justify-content:space-between;align-items:center;padding:8px 12px;background:#1c1812;border-bottom:1px solid #3d3529;font-family:'Cinzel',serif;font-size:.78em;letter-spacing:1px;color:#c9a84c}
        .dice-hist-actions{display:flex;gap:8px}
        .dh-btn{cursor:pointer;opacity:.7;font-size:1.05em}
        .dh-btn:hover{opacity:1}
        .dice-last{padding:10px 12px;border-bottom:1px solid #3d3529;animation:diceFlash .4s ease}
        .dl-who{font-size:.94em;color:#c3b596;margin-bottom:6px}
        .dl-who .dl-mod{color:#a89a7a}
        .dl-dice{display:flex;align-items:center;gap:8px}
        .dl-die{width:36px;height:36px;display:flex;align-items:center;justify-content:center;border:2px solid #8a7235;border-radius:7px;font-family:'Cinzel',serif;font-weight:700;font-size:1.1em;color:#e8c45a;background:#2a2418}
        .dl-die.lose{opacity:.35;text-decoration:line-through;border-color:#5a4f3a}
        .dl-die.nat20{border-color:#5adf4a;color:#7adf6a}
        .dl-die.nat1{border-color:#df5a4a;color:#df8a7a}
        .dl-eq{color:#a89a7a;font-size:1.2em}
        .dl-tot{font-family:'Cinzel',serif;font-weight:800;font-size:1.6em;color:#e8c45a}
        .dl-mode{margin-top:4px;font-size:.82em;color:#8fb37f;font-style:italic}
        .dice-empty{padding:14px;font-size:.9em;color:#a89a7a;text-align:center}
        .dice-rows{overflow-y:auto;flex:1}
        .dice-row{display:flex;align-items:baseline;gap:8px;padding:6px 12px;font-size:.86em;border-bottom:1px solid #2a251d}
        .dice-row:hover{background:#262119}
        .dr-time{color:#ab9d80;font-size:.88em;min-width:36px}
        .dr-txt{flex:1;color:#c3b596;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
        .dr-tot{font-weight:700;color:#d4c5a9;font-family:'Cinzel',serif;font-size:1.05em}
        .dr-tot.nat20{color:#7adf6a}
        .dr-tot.nat1{color:#df8a7a}
        .dl-dmg{display:flex;flex-direction:column;gap:3px;margin:4px 0}
        .dl-dmg-part{display:flex;align-items:center;gap:6px;font-size:.82em}
        .dl-dmg-type{color:#c9a84c;min-width:70px;font-size:.92em}
        .dl-dmg-rolls{color:#b0a488;flex:1;font-family:monospace;font-size:.92em}
        .dl-dmg-sub{color:#efe0c3;font-weight:700;min-width:24px;text-align:right}
        .dl-dmg-tot{font-size:1.05em;color:#efe0c3;margin-top:4px;border-top:1px solid #3d3529;padding-top:4px}
        .dl-dmg-tot b{color:#e8c45a;font-size:1.15em}
        @media (max-width:768px){
          .dice-dock{right:0;bottom:0;left:0;align-items:stretch}
          .dice-pill{border-radius:0;border-left:none;border-right:none;border-bottom:none;padding:10px 14px;justify-content:space-between}
          .dice-hist{width:auto;border-radius:0;border-left:none;border-right:none;max-height:45vh}
          .dice-summary{flex:1;font-size:1.05em}
          body{padding-bottom:58px}
        }
        .ui-switch{border-color:#d4a020;color:#d4a020}
        .dash-bar .dash-ver{flex:none;font-family:'Cinzel',serif;font-size:.72em;letter-spacing:1px;color:#d4a020;border:1px solid #8a7235;border-radius:10px;padding:1px 7px;margin-right:6px;white-space:nowrap}
        .ui-switch.on{background:#d4a020;color:#1a1612}
        body:has(.gx-host) .bugrep-fab{left:auto;right:14px;bottom:14px;opacity:.75}
        @media (max-width:767px){ body:has(.gx-host) .bugrep-fab{right:8px;bottom:170px} }
      `}</style>

      <div className="dash-bar">
        <span className="dash-ver" title="Versione della scheda">v{APP_VERSION}</span>
        {/* 10.7.9 (27/11, Alessandro): niente più gestione delle campagne (nuova, rinomina, elimina).
            Chi ha già più campagne vede ancora il menu per passare dall'una all'altra, così non perde i personaggi. */}
        {campaigns.length > 1 ? <span className="lbl">CAMPAGNA:</span> : null}
        {campaigns.length > 1 ? <select className="camp"
          value={activeCampaign || ""}
          onChange={function(e){ switchCampaign(e.target.value); }}
          title="Campagna">
          {campaigns.map(function(c){
            return <option key={c.folderName} value={c.folderName}>{c.folderName}</option>;
          })}
        </select> : null}

        <button className="dbtn" onClick={doUndo} disabled={!canUndo}
          title="Annulla (Ctrl+Z)">↶</button>
        <button className="dbtn" onClick={doRedo} disabled={!canRedo}
          title="Ripristina (Ctrl+Y)">↷</button>
        {!nuovaUI ? <button className="dbtn ui-switch" onClick={function(){ toggleNuovaUI(true); }}
          title="Chiude l'editor completo e torna alla scheda">✦ Torna alla scheda</button> : null}

        <div className="spacer"/>

        {statusLabel ? (
          <span className="status"
            style={{color:statusColor, borderColor:statusColor}}
            onClick={function(){ setShowSettings(function(s){ return !s; }); }}
            title="Impostazioni salvataggio">
            {statusLabel}
          </span>
        ) : null}

        <button className="dbtn dash-gear" onClick={function(){ setShowSettings(function(s){ return !s; }); }} title="Impostazioni">⚙</button>
      </div>

      {/* Tab PG — wrap multilinea stile Pannello di Controllo */}
      {activeCampaign ? (
        <div className="pg-tabs">
          {order.map(function(id){
            const isActive = id === activeId;
            return (
              <div key={id}
                   className={"pg-tab" + (isActive ? " act" : "")}
                   onClick={function(){ setActiveId(id); }}
                   title={summarize(roster[id])}>
                <span className="pg-name">{(roster[id] && roster[id].name) || "(senza nome)"}</span>
                <span className="pg-sub">{
                  (function(){
                    const cls = ((roster[id] && roster[id].classes) || []).filter(function(c){return c && c.name;});
                    if (cls.length === 0) return "—";
                    return cls.map(function(c){ return c.name.slice(0,4) + " " + (c.level||0); }).join("/");
                  })()
                }</span>
              </div>
            );
          })}
          <div className="pg-tab add" onClick={triggerImport} title="Importa schede JSON">＋ Importa</div>
          <div className="pg-tab add" onClick={addBlank} title="Crea scheda vuota">＋ Vuota</div>
          {activeId ? (
            <div className="pg-tab del" onClick={removeActive} title="Rimuovi PG corrente">✕ {(roster[activeId] && roster[activeId].name) || "PG"}</div>
          ) : null}
          <input ref={fileInputRef} type="file" accept="application/json,.json" multiple
            style={{display:"none"}} onChange={onFiles}/>
        </div>
      ) : (
        <input ref={fileInputRef} type="file" accept="application/json,.json" multiple
          style={{display:"none"}} onChange={onFiles}/>
      )}

      {migrationPrompt ? (
        <div className="dash-migrate">
          <strong>📦 Schede senza campagna trovate.</strong>
          <p>Nella cartella ho trovato <b>{migrationPrompt.files.length}</b> file JSON che non appartengono a una campagna:</p>
          <ul>{migrationPrompt.files.slice(0,5).map(function(f){ return <li key={f}>{f}</li>; })}
            {migrationPrompt.files.length > 5 ? <li>... e altri {migrationPrompt.files.length - 5}</li> : null}
          </ul>
          <p>Posso spostarli in una sottocartella-campagna:</p>
          <div className="row">
            <button className="dbtn primary" onClick={function(){ doMigration("Default"); }}>📁 Sposta in "Default"</button>
            <button className="dbtn" onClick={function(){
              const n = window.prompt("Nome della campagna:", "Default");
              if (n) doMigration(n);
            }}>📁 Sposta in… (scegli nome)</button>
            <button className="dbtn" onClick={function(){ setMigrationPrompt(null); }}>Più tardi</button>
          </div>
        </div>
      ) : null}

      {errorMsg ? <div className="dash-msg err">{errorMsg} <span className="x" onClick={function(){ setErrorMsg(null); }}>✕</span></div> : null}
      {infoMsg  ? <div className="dash-msg ok">{infoMsg} <span className="x" onClick={function(){ setInfoMsg(null); }}>✕</span></div> : null}

      {showSettings ? (
        <div className="dash-settings">
          <h3>📁 Salvataggio</h3>
          {!fsaSupported ? (
            <div>
              <p className="warn-line">Questo browser non supporta il salvataggio automatico su file.</p>
              <p className="info">Per attivarlo serve <strong>Chrome</strong> o <strong>Edge</strong> su desktop. Firefox, Safari e iOS non implementano l'API.</p>
              <p className="info">Per ora i dati sono salvati nel browser. Esporta regolarmente con il bottone <strong>⬇ Esporta</strong> dentro la scheda per avere file JSON di backup.</p>
            </div>
          ) : !dirHandle ? (
            <div>
              <p>Nessuna cartella configurata.</p>
              <p className="info">I dati sono salvati nel browser ma <strong>conviene impostare una cartella</strong>: ogni PG diventa un file JSON, modificabile o trasferibile.</p>
              <div className="row">
                <button className="dbtn primary" onClick={pickFolder}>📁 Scegli cartella</button>
              </div>
            </div>
          ) : (
            <div>
              <p>Cartella attiva: <strong style={{color:"#e8c45a"}}>{dirHandle.name}</strong></p>
              <p className="info">{order.length} schede, salvataggio automatico ad ogni modifica.</p>
              {saveStatus === "error" ? (
                <p className="err-line">⚠ L'ultimo salvataggio è fallito. Prova a riautorizzare.</p>
              ) : null}
              <div className="row">
                {saveStatus === "error" ? <button className="dbtn primary" onClick={reauthorize}>🔓 Riautorizza</button> : null}
                <button className="dbtn danger" onClick={disconnectFolder}>✕ Scollega cartella</button>
              </div>
            </div>
          )}
          <div style={{marginTop:12, paddingTop:8, borderTop:"1px solid #3d3529"}}>
            <button className="dbtn" onClick={function(){ setShowSettings(false); }} style={{width:"100%", textAlign:"center"}}>Chiudi</button>
          </div>
        </div>
      ) : null}

      {ch ? (
        nuovaUI ? (
          <NuovaUIHost key={activeId} ch={ch} setCh={setCh} onClassica={null}
            env={{ roll: doRoll, rollDamage: doRollDamage, rolls: rolls, mode: rollMode, setMode: setRollMode, clearRolls: clearRollsOf,
                   undo: doUndo, redo: doRedo, canUndo: !!canUndo, canRedo: !!canRedo }}/>
        ) : (
          <App key={activeId} ch={ch} setCh={setCh} onRoll={doRoll} onRollDamage={doRollDamage}/>
        )
      ) : null}

      {/* ═══ Pannello dadi flottante ═══ */}
      {ch && !nuovaUI ? (function(){
        const last = rolls[0] || null;
        const modeLabel = { adv: "V", norm: "N", dis: "S" };
        return (
          <div className={"dice-dock" + (diceOpen ? " open" : "")} key={"dock"}>
            {diceOpen ? (
              <div className="dice-hist">
                <div className="dice-hist-head">
                  <span>🎲 Storico tiri</span>
                  <span className="dice-hist-actions">
                    <span className="dh-btn" onClick={clearRolls} title="Azzera storico">🗑</span>
                    <span className="dh-btn" onClick={function(){ setDiceOpen(false); }} title="Chiudi">✕</span>
                  </span>
                </div>
                {last ? (
                  last.isDamage ? (
                    <div className="dice-last" key={rollFlash}>
                      <div className="dl-who">{last.pg} — {last.label}</div>
                      <div className="dl-dmg">
                        {last.parts.map(function(p, pi){
                          return (
                            <div className="dl-dmg-part" key={pi}>
                              <span className="dl-dmg-type">{p.type || "danno"}</span>
                              <span className="dl-dmg-rolls">{p.dice}{p.flat?(p.flat>=0?"+"+p.flat:""+p.flat):""}: [{p.rolls.join(", ")}]</span>
                              <span className="dl-dmg-sub">{p.sub}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="dl-dmg-tot">Totale: <b className={last.crit?"nat20":""}>{last.total}</b>{last.crit?" 💥":""}</div>
                    </div>
                  ) : (
                  <div className="dice-last" key={rollFlash}>
                    <div className="dl-who">{last.pg} — {last.label} <span className="dl-mod">({fmtMod(last.mod)})</span></div>
                    <div className="dl-dice">
                      <span className={"dl-die" + (last.d1 === last.chosen ? " win" : " lose") + (last.d1 === 20 ? " nat20" : last.d1 === 1 ? " nat1" : "")}>{last.d1}</span>
                      {last.d2 !== null ? (
                        <span className={"dl-die" + (last.d2 === last.chosen ? " win" : " lose") + (last.d2 === 20 ? " nat20" : last.d2 === 1 ? " nat1" : "")}>{last.d2}</span>
                      ) : null}
                      <span className="dl-eq">→</span>
                      <span className="dl-tot">{last.total}</span>
                    </div>
                    {last.mode !== "norm" ? <div className="dl-mode">{last.mode === "adv" ? "vantaggio" : "svantaggio"}</div> : null}
                  </div>
                  )
                ) : <div className="dice-empty">Nessun tiro ancora. Clicca un 🎲 accanto a una competenza.</div>}
                <div className="dice-rows">
                  {rolls.slice(1).map(function(r, i){
                    if (r.isDamage) {
                      return (
                        <div className="dice-row" key={r.t + "_" + i}>
                          <span className="dr-time">{fmtTime(r.t)}</span>
                          <span className="dr-txt">{r.pg} · {r.label} · {r.parts.map(function(p){ return p.type+" "+p.sub; }).join(" + ")}</span>
                          <span className={"dr-tot" + (r.crit?" nat20":"")}>{r.total}</span>
                        </div>
                      );
                    }
                    return (
                      <div className="dice-row" key={r.t + "_" + i}>
                        <span className="dr-time">{fmtTime(r.t)}</span>
                        <span className="dr-txt">
                          {r.pg} · {r.label} ({fmtMod(r.mod)}) · d20: {r.d1}{r.d2 !== null ? "/" + r.d2 : ""}
                          {r.mode === "adv" ? " V" : r.mode === "dis" ? " S" : ""}
                        </span>
                        <span className={"dr-tot" + (r.chosen === 20 ? " nat20" : r.chosen === 1 ? " nat1" : "")}>{r.total}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
            <div className="dice-pill">
              <span className="dice-modes">
                {["adv","norm","dis"].map(function(m){
                  return (
                    <span key={m}
                      className={"dm" + (rollMode === m ? " act" : "") + (m === "adv" ? " adv" : m === "dis" ? " dis" : "")}
                      onClick={function(){ setRollMode(m); }}
                      title={m === "adv" ? "Vantaggio (2d20, il migliore)" : m === "dis" ? "Svantaggio (2d20, il peggiore)" : "Tiro normale"}>
                      {modeLabel[m]}
                    </span>
                  );
                })}
              </span>
              <span className="dice-summary" onClick={function(){ setDiceOpen(function(o){ return !o; }); }} title="Apri/chiudi storico">
                {last ? (
                  <span key={rollFlash} className="dice-flash">
                    {last.isDamage
                      ? <span>{last.label} → <b className={last.crit?"nat20":""}>{last.total}</b></span>
                      : <span>{last.label} {fmtMod(last.mod)} → <b className={last.chosen === 20 ? "nat20" : last.chosen === 1 ? "nat1" : ""}>{last.total}</b></span>}
                  </span>
                ) : <span style={{opacity:.7}}>🎲 tiri</span>}
              </span>
            </div>
          </div>
        );
      })() : null}

      {!ch ? (
        <NuovaUIInizio fsa={fsaSupported} onCartella={pickFolder} onImporta={triggerImport} onVuota={addBlank}
          onBug={function(){ try { BUG.ctx = { tab: "pagina iniziale", char: "—", classes: "—" }; if (BUG.openPanel) BUG.openPanel(); } catch(e){} }}/>
      ) : null}
      {false ? (
        <div className="dash-empty">
          <h2>Inizia</h2>
          {fsaSupported ? (
            <div>
              <p>Imposta una <strong>cartella di lavoro</strong> per salvare in automatico le schede come file JSON. Ogni personaggio diventa un file separato che puoi backuppare, condividere o aprire in un editor di testo.</p>
              <div className="row">
                <button className="dbtn primary" onClick={pickFolder}>📁 Scegli cartella</button>
                <button className="dbtn" onClick={triggerImport}>＋ Importa schede</button>
                <button className="dbtn" onClick={addBlank}>＋ Crea vuota</button>
              </div>
              <div className="hint">Senza cartella i dati restano nel browser come fallback, ma <strong>la cartella è la via principale</strong>: file su disco sono più affidabili e portabili.</div>
            </div>
          ) : (
            <div>
              <p>Carica le schede JSON dei tuoi personaggi per gestirle insieme.</p>
              <div className="row">
                <button className="dbtn primary" onClick={triggerImport}>＋ Importa schede</button>
                <button className="dbtn" onClick={addBlank}>＋ Crea vuota</button>
              </div>
              <div className="hint">⚠ Questo browser non supporta il salvataggio automatico su file (serve Chrome/Edge desktop). Le schede saranno solo nel browser; ricordati di esportarle regolarmente.</div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}



/* ═══════════ BUG REPORTER — UI ═══════════ */
class ErrorBoundary extends React.Component {
  constructor(p){ super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err){ return { err: err }; }
  componentDidCatch(err, info){
    bugPush({ kind:"React (crash)", msg:(err && err.message) || String(err),
      stack: err && err.stack, componentStack: info && info.componentStack });
  }
  render(){
    if (this.state.err) {
      return (
        <div style={{padding:24,margin:20,fontFamily:"system-ui,sans-serif",color:"#7a1f1f",background:"#fff5f5",border:"1px solid #f0bcbc",borderRadius:8}}>
          <h2 style={{margin:"0 0 8px"}}>💥 La scheda ha avuto un crash</h2>
          <p style={{margin:"0 0 6px"}}>L'errore è stato catturato. Apri il pannello <strong>🐞</strong> in basso a destra, copia il report e incollalo nella chat.</p>
          <p style={{margin:"0 0 12px",fontFamily:"monospace",fontSize:13}}>{(this.state.err && this.state.err.message) || String(this.state.err)}</p>
          <button onClick={function(){ try { location.reload(); } catch(e){} }}
            style={{padding:"6px 14px",cursor:"pointer",border:"1px solid #c99",borderRadius:4,background:"#fff"}}>Ricarica la scheda</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function BugReporter(){
  const [open, setOpen] = useState(false);
  useEffect(function(){ BUG.openPanel = function(){ setOpen(true); }; return function(){ BUG.openPanel = null; }; }, []);
  useEffect(function(){   // Esc chiude il pannello, come gli altri pannelli della nuova interfaccia
    if (!open) return undefined;
    const k = function(e){ if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", k);
    return function(){ document.removeEventListener("keydown", k); };
  }, [open]);   // il Menu della nuova interfaccia lo apre
  const [, tick] = useState(0);
  const [note, setNote] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(function(){
    const fn = function(){ tick(function(t){ return t + 1; }); };
    BUG.listeners.push(fn);
    return function(){ const i = BUG.listeners.indexOf(fn); if (i >= 0) BUG.listeners.splice(i, 1); };
  }, []);
  const n = BUG.list.length;
  function buildReport(){
    const ctx = BUG.ctx || {};
    var L = [];
    L.push("=== BUG REPORT — La Gemma di San Batacchio ===");
    L.push("Versione " + (BUG.version || "?") + " · " + new Date().toLocaleString());
    L.push("Tab: " + (ctx.tab || "?") + " · Personaggio: " + (ctx.char || "?") + " · Classi: " + (ctx.classes || "?"));
    L.push("UA: " + navigator.userAgent);
    if (note.trim()) { L.push(""); L.push("NOTA UTENTE: " + note.trim()); }
    L.push("");
    if (n === 0) { L.push("(nessun errore catturato automaticamente — se è un bug di comportamento, descrivilo nella nota sopra)"); }
    BUG.list.forEach(function(b, i){
      L.push("--- [" + (i + 1) + "] " + b.kind + " · " + (b.time || "") + " ---");
      L.push(b.msg || "(senza messaggio)");
      if (b.src) L.push("@ " + b.src);
      if (b.stack) L.push(String(b.stack).split("\n").slice(0, 6).join("\n"));
      if (b.componentStack) L.push("Componenti:" + String(b.componentStack).split("\n").slice(0, 6).join("\n"));
      L.push("");
    });
    return L.join("\n");
  }
  const report = buildReport();
  function doCopy(){
    var done = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(report).then(function(){ setCopied(true); setTimeout(function(){ setCopied(false); }, 1500); }, function(){});
        done = true;
      }
    } catch(e){}
    if (!done) {
      var ta = document.getElementById("bug-report-ta");
      if (ta) { ta.focus(); ta.select(); try { document.execCommand("copy"); setCopied(true); setTimeout(function(){ setCopied(false); }, 1500); } catch(e){} }
    }
  }
  function clearAll(){ BUG.list.length = 0; bugNotify(); }
  const style = <style>{`
      .bugrep-fab{position:fixed;left:14px;bottom:14px;z-index:9000}
      .bugrep-panel{position:fixed;left:14px;bottom:68px;z-index:99999}
      @media (max-width:768px){
        .bugrep-fab{left:10px;bottom:60px}
        .bugrep-panel{left:10px;right:10px;bottom:104px}
      }
    `}</style>;
  if (!open) {
    return (
      <React.Fragment>{style}<div className="bugrep-fab" style={{fontFamily:"system-ui,sans-serif"}}>
        <button onClick={function(){ setOpen(true); }} title="Bug report"
          style={{width:46,height:46,borderRadius:23,border:"none",cursor:"pointer",background:n>0?"#c0392b":"#444",color:"#fff",fontSize:20,boxShadow:"0 2px 8px rgba(0,0,0,.3)",position:"relative"}}>
          🐞
          {n > 0 && <span style={{position:"absolute",top:-4,right:-4,background:"#fff",color:"#c0392b",borderRadius:10,fontSize:11,fontWeight:700,minWidth:18,height:18,lineHeight:"18px",padding:"0 4px"}}>{n}</span>}
        </button>
      </div></React.Fragment>
    );
  }
  return (
    <React.Fragment>{style}<div className="bugrep-panel" style={{fontFamily:"system-ui,sans-serif"}}>
      <div style={{width:390,maxWidth:"92vw",background:"#1e1e1e",color:"#eee",border:"1px solid #555",borderRadius:8,boxShadow:"0 4px 20px rgba(0,0,0,.5)",overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 10px",background:"#2a2a2a"}}>
          <strong>🐞 Bug report{n > 0 ? " (" + n + ")" : ""}</strong>
          <button onClick={function(){ setOpen(false); }} style={{background:"none",border:"none",color:"#aaa",fontSize:20,cursor:"pointer",lineHeight:1}}>×</button>
        </div>
        <div style={{padding:10}}>
          <input value={note} onChange={function(e){ setNote(e.target.value); }} placeholder="Cosa stavi facendo? (facoltativo)"
            style={{width:"100%",boxSizing:"border-box",marginBottom:6,padding:"6px 8px",background:"#111",color:"#eee",border:"1px solid #555",borderRadius:4}} />
          <textarea id="bug-report-ta" readOnly value={report} onFocus={function(e){ e.target.select(); }}
            style={{width:"100%",height:160,boxSizing:"border-box",fontFamily:"monospace",fontSize:11,background:"#111",color:"#bfe6bf",border:"1px solid #555",borderRadius:4,whiteSpace:"pre",overflow:"auto"}} />
          <div style={{display:"flex",gap:6,marginTop:6}}>
            <button onClick={doCopy} style={{flex:1,padding:"7px",background:copied?"#2a8a55":"#3a6ea5",color:"#fff",border:"none",borderRadius:4,cursor:"pointer",fontWeight:600}}>{copied ? "✓ Copiato" : "📋 Copia report"}</button>
            <button onClick={clearAll} style={{padding:"7px 12px",background:"#555",color:"#fff",border:"none",borderRadius:4,cursor:"pointer"}}>Pulisci</button>
          </div>
          <div style={{fontSize:10,color:"#999",marginTop:6}}>Se "Copia" non funziona (file://), clicca nel riquadro, poi Ctrl+A e Ctrl+C.</div>
        </div>
      </div>
    </div></React.Fragment>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<React.Fragment><ErrorBoundary><Dashboard /></ErrorBoundary><BugReporter /></React.Fragment>);
