/* ═══ Privilegi di classe, di archetipo e talenti (10.7, REGIA) ═══
   I dati non stanno più qui: arrivano da src/data/privilegi.json (ARCHETIPI) e src/data/talenti.json (TALENTI),
   che build.py inserisce come DATA_PRIVILEGI e DATA_TALENTI. Formato comune deciso il 16/11 (tab Talenti proposti → Per REGIA · scheda).
   Questo file li normalizza e dà le funzioni pure che servono a useCharacter (character.jsx) e all'interfaccia (editor.jsx):
   segnaposti delle scelte, prerequisiti, prezzo dei talenti (P-103), elenchi delle opzioni.

   Un privilegio sulla scheda (ch.privilegi) salva solo: uid, pid (id del record), scelte {chiave: valore o [valori]},
   risolto (P-104: per ogni «potenzia» se è diventato +1 permanente o rank 1 + costo −1), accesi (modificatori sospesi accesi),
   e per i talenti comprati al level-up: acquisto, prezzo, classe, livelloPreso, approvato. Gli effetti si ricalcolano ogni volta
   dai dati: se ARCHETIPI o TALENTI correggono un record, le schede salvate si aggiornano da sole.
   Gli id dei record non si rinominano mai: le schede salvate li usano. */

/* Dati di riserva: se build.py non trova i file, la scheda resta usabile con gli Stili di combattimento della 10.6 */
const PRIV_RISERVA = [
  { id: "guerriero-stile-tiro", tipo: "classe", classe: "Guerriero", livello: 1, gruppo: "stile-combattimento", nome: "Stile di combattimento: Tiro",
    effetti: { mod: [{ bersagli: ["sk:Archi", "sk:Balestre", "sk:Altre Armi da tiro", "sk:Armi da lancio"], valore: 2 }] }, nota: "+2 ai tiri per colpire con armi da tiro e da lancio, mai in mischia (P-98).", fonte: "PHB 2014; P-98", stato: "pronto" },
  { id: "ranger-stile-tiro", tipo: "classe", classe: "Ranger", livello: 2, gruppo: "stile-combattimento", nome: "Stile di combattimento: Tiro",
    effetti: { mod: [{ bersagli: ["sk:Archi", "sk:Balestre", "sk:Altre Armi da tiro", "sk:Armi da lancio"], valore: 2 }] }, nota: "+2 ai tiri per colpire con armi da tiro e da lancio, mai in mischia (P-98).", fonte: "PHB 2014; P-98", stato: "pronto" }
];
const PRIV_FONTE_DATI = {
  privilegi: (typeof DATA_PRIVILEGI !== "undefined" && DATA_PRIVILEGI) ? (DATA_PRIVILEGI.versione || "?") : null,
  talenti: (typeof DATA_TALENTI !== "undefined" && DATA_TALENTI) ? (DATA_TALENTI.versione || "?") : null
};
const PRIV_TUTTI = [].concat(
  (typeof DATA_PRIVILEGI !== "undefined" && DATA_PRIVILEGI && DATA_PRIVILEGI.privilegi) || PRIV_RISERVA,
  (typeof DATA_TALENTI !== "undefined" && DATA_TALENTI && DATA_TALENTI.talenti) || []
).map(function(r){
  const scelte = (r.scelte || []).slice();
  /* Una lingua negli effetti senza scelta di lingua (es. Nemico prescelto): la scelta si aggiunge qui */
  if (r.effetti && r.effetti.lingua && !scelte.some(function(s){ return s.tipo === "lingua"; }))
    scelte.push({ chiave: "lingue", tipo: "lingua", numero: r.effetti.lingua.numero || 1 });
  return Object.assign({}, r, {
    tipo: r.tipo || "classe", effetti: r.effetti || {}, scelte: scelte, prerequisiti: r.prerequisiti || [],
    prezzo: r.prezzo || r.costo || null   // TALENTI rinomina costo → prezzo (20/11); finché non arriva si legge costo
  });
});
/* Nella scheda entrano solo i record pronti; gli esclusi restano consultabili nei dati */
const PRIVILEGI = PRIV_TUTTI.filter(function(r){ return r.stato === "pronto"; });
const PRIV_BY_ID = {};
PRIVILEGI.forEach(function(r){ PRIV_BY_ID[r.id] = r; });

/* Livelli con aumento di caratteristica (PHB 2014), per classe: lì si può comprare un talento (P-102) */
const ASI_LIVELLI = { Guerriero: [4, 6, 8, 12, 14, 16, 19], Ladro: [4, 8, 10, 12, 16, 19] };
function asiLivelli(cls) { return ASI_LIVELLI[cls] || [4, 8, 12, 16, 19]; }

/* ── competenze: "sk:<nome SD>" → indice ── */
const SD_BY_NAME = {};
SD.forEach(function(s, i){ if (SD_BY_NAME[s.n] == null) SD_BY_NAME[s.n] = i; });
function skIdx(x) {
  if (x == null) return -1;
  const n = String(x).indexOf("sk:") === 0 ? String(x).slice(3) : String(x);
  const i = SD_BY_NAME[n];
  return i == null ? -1 : i;
}
const SK_LINGUE = SD.map(function(s, i){ return s.c === "Comunicazione" && s.e === 1 ? i : -1; }).filter(function(i){ return i >= 0; });
const SK_ARMI_CAT = ["Armi da mischia a 1 mano", "Armi con Asta", "Armi da mischia a 2 mani", "Armi da Lancio", "Armi da tiro", "Combattimento senza armi"];

/* ── segnaposti: "{chiave}" negli effetti prende il valore scelto; con più valori la voce si moltiplica ── */
function privValori(scelte, k) {
  const v = scelte ? scelte[k] : null;
  return v == null ? [] : Array.isArray(v) ? v : [v];
}
function privEspandi(str, scelte) {
  if (typeof str !== "string" || str.indexOf("{") < 0) return [str];
  const m = str.match(/\{([^}]+)\}/);
  if (!m) return [str];
  const vals = privValori(scelte, m[1]);
  if (!vals.length) return [];
  return vals.reduce(function(acc, v){ return acc.concat(privEspandi(str.replace(m[0], v), scelte)); }, []);
}
/* Voce con un campo da espandere (sk, car, id): una voce per ogni valore */
function privEspandiVoce(voce, campo, scelte) {
  if (!voce || voce[campo] == null) return [voce];
  return privEspandi(voce[campo], scelte).map(function(v){ const o = Object.assign({}, voce); o[campo] = v; return o; });
}
/* Gli incantesimi scritti come «‹trucchetto da chierico 1›» prendono i valori della scelta di incantesimi, in ordine */
function privIncantesimi(r, scelte) {
  const lista = (r.effetti.incantesimi || []);
  const scInc = r.scelte.filter(function(s){ return s.tipo === "incantesimo"; });
  const pool = scInc.length ? privValori(scelte, scInc[0].chiave) : [];
  let k = 0;
  return lista.reduce(function(acc, e){
    if (typeof e.id === "string" && e.id.charAt(0) === "‹") { const v = pool[k++]; return v ? acc.concat([Object.assign({}, e, { id: v })]) : acc; }
    return acc.concat(privEspandiVoce(e, "id", scelte));
  }, []);
}

/* ── scelte ──
   car: tra; opzione: tra (lista) o una fonte ("ARCHETIPI:stili"; le altre fonti si scrivono a mano); lingua: numero (e tra);
   competenza: tra (nomi) | filtro ("cat:X", lista di "cat:X"/nomi, "rank:1") | stessaCategoria (chiave), con minRank, escludiGiaGratis;
   ripiego: seGiaPosseduta + sostituisce, compare solo se la competenza data è già regalata o scontata da un'altra fonte (P-100);
   incantesimo: filtro {classi, livello, scuole, rituale, attacco} oppure lista + livello. */
function privStiliOpzioni() {
  const visti = {};
  return PRIVILEGI.filter(function(r){ return r.gruppo === "stile-combattimento" && r.classe === "Guerriero"; })
    .filter(function(r){ const n = r.nome; if (visti[n]) return false; visti[n] = true; return true; })
    .map(function(r){ return { v: r.id, t: r.nome.replace(/^Stile di combattimento: /, "") }; });
}
/* Le opzioni di una scelta. ctx: { rankEff(i), gratisAltri(i), scelte } */
function privOpzioni(sc, ctx) {
  const scelte = ctx.scelte || {};
  if (sc.tipo === "car") return (sc.tra || STATS).map(function(c){ return { v: c, t: c }; });
  if (sc.tipo === "opzione") {
    if (Array.isArray(sc.tra)) return sc.tra.map(function(c){ return { v: c, t: c }; });
    if (sc.tra === "ARCHETIPI:stili") return privStiliOpzioni();
    return null;   // testo libero
  }
  if (sc.tipo === "lingua") {
    const base = SK_LINGUE.map(function(i){ return { v: SD[i].n, t: ctx.nomeSk ? ctx.nomeSk(i) : SD[i].n, i: i }; });
    return base.filter(function(o){ return !(ctx.rankEff && ctx.rankEff(o.i) >= 8); });
  }
  if (sc.tipo === "incantesimo") {
    const f = sc.filtro || { classi: sc.lista ? [sc.lista] : null, livello: sc.livello };
    const classi = (f.classi || []).reduce(function(a, c){ return a.concat(privEspandi(c, scelte)); }, []);
    const out = [];
    Object.keys(SPELLS_BY_ID).forEach(function(id){
      const s = SPELLS_BY_ID[id];
      if (!s || s.id !== id) return;
      if (f.livello != null && (s.level || 0) !== f.livello) return;
      if (classi.length && !(s.classesHb || []).some(function(c){ return classi.indexOf(c) >= 0; })) return;
      if (f.scuole && f.scuole.indexOf(s.school) < 0) return;
      if (f.rituale && !s.ritual) return;
      if (f.attacco && !s.attack) return;
      out.push({ v: s.id, t: s.name + " (" + (s.level ? s.level + "°" : "trucchetto") + ", " + s.school + ")" });
    });
    return out.sort(function(a, b){ return a.t < b.t ? -1 : 1; });
  }
  if (sc.tipo === "competenza") {
    let idx = [];
    if (sc.tra) idx = sc.tra.map(skIdx).filter(function(i){ return i >= 0; });
    else if (sc.stessaCategoria) {
      const base = privValori(scelte, sc.stessaCategoria).map(skIdx).filter(function(i){ return i >= 0; });
      const cats = base.map(function(i){ return SD[i].c; });
      idx = SD.map(function(s, i){ return cats.indexOf(s.c) >= 0 && base.indexOf(i) < 0 ? i : -1; }).filter(function(i){ return i >= 0; });
    } else if (sc.filtro) {
      const fs = Array.isArray(sc.filtro) ? sc.filtro : [sc.filtro];
      SD.forEach(function(s, i){
        const ok = fs.some(function(f){
          if (f.indexOf("cat:") === 0) return s.c === f.slice(4);
          if (f.indexOf("rank:") === 0) return ctx.rankEff && ctx.rankEff(i) >= +f.slice(5);
          return s.n === f;
        });
        if (ok) idx.push(i);
      });
    } else idx = SD.map(function(s, i){ return i; });
    if (sc.minRank) idx = idx.filter(function(i){ return ctx.rankEff && ctx.rankEff(i) >= sc.minRank; });
    if (sc.escludiGiaGratis) idx = idx.filter(function(i){ return !(ctx.gratisAltri && ctx.gratisAltri(i)); });
    if (sc.sostituisce) {
      const sost = privEspandi(sc.sostituisce, scelte).concat(privValori(scelte, sc.sostituisce)).map(skIdx);
      idx = idx.filter(function(i){ return sost.indexOf(i) < 0 && !(ctx.gratisAltri && ctx.gratisAltri(i)); });
    }
    return idx.map(function(i){ return { v: SD[i].n, t: (ctx.nomeSk ? ctx.nomeSk(i) : SD[i].n) + " · " + SD[i].c, i: i }; });
  }
  return null;
}
/* La competenza che una scelta di ripiego sostituirebbe (indice), se la scelta va mostrata */
function privRipiegoBersaglio(sc, scelte) {
  if (!sc.seGiaPosseduta || !sc.sostituisce) return -1;
  const v = privEspandi(sc.sostituisce, scelte);
  const viaChiave = privValori(scelte, sc.sostituisce);
  const nome = (viaChiave.length ? viaChiave[0] : v[0]);
  return skIdx(nome);
}
/* Le scelte da chiedere ora: le scelte di ripiego solo se servono (ctx.gratisAltri sulla competenza data) */
function privScelteDaFare(r, scelte, ctx) {
  return r.scelte.filter(function(sc){
    if (!sc.seGiaPosseduta) return true;
    const i = privRipiegoBersaglio(sc, scelte);
    return i >= 0 && ctx.gratisAltri && ctx.gratisAltri(i);
  });
}
function privSceltaCompleta(sc, scelte) {
  const n = sc.numero || 1;
  return privValori(scelte, sc.chiave).filter(function(x){ return x !== "" && x != null; }).length >= n;
}

/* ── effetti risolti con le scelte: le voci con segnaposti diventano voci concrete ── */
function privEffettiRisolti(r, p) {
  const sc = (p && p.scelte) || {};
  const e = r.effetti || {};
  const ripieghi = {};   // indice della competenza data → nome della competenza di ripiego
  r.scelte.forEach(function(s){
    if (!s.seGiaPosseduta) return;
    const v = privValori(sc, s.chiave)[0];
    const i = privRipiegoBersaglio(s, sc);
    if (v && i >= 0) ripieghi[i] = v;
  });
  const conRipiego = function(skName){ const i = skIdx(skName); return ripieghi[i] != null ? "sk:" + ripieghi[i] : skName; };
  const lista = function(nome, campo){ return (e[nome] || []).reduce(function(a, x){ return a.concat(privEspandiVoce(x, campo, sc)); }, []); };
  const out = {
    punteggio: lista("punteggio", "car"),
    mod: (e.mod || []).map(function(m){
      const b = (m.bersagli || []).reduce(function(a, x){ return a.concat(privEspandi(x, sc)); }, []);
      return Object.assign({}, m, { bersagli: b });
    }),
    rank: lista("rank", "sk").map(function(x){ return Object.assign({}, x, { sk: conRipiego(x.sk) }); }),
    costo: lista("costo", "sk").map(function(x){ return Object.assign({}, x, { sk: conRipiego(x.sk) }); }),
    piuUno: lista("piuUno", "sk"), potenzia: lista("potenzia", "sk"), maestria: lista("maestria", "sk"),
    usi: (e.usi || []).map(function(u){ return u.solo ? Object.assign({}, u, { solo: privEspandi(u.solo, sc).map(function(x){ return String(x).replace(/^sk:/, ""); }).join(", ") }) : u; }),
    incantesimi: privIncantesimi(r, sc),
    lingua: e.lingua || null
  };
  /* Lingue: la scelta di tipo lingua (o una scelta implicita "lingue") dà rank 8 gratis (P-64, P-107) */
  if (out.lingua) {
    const scL = r.scelte.filter(function(s){ return s.tipo === "lingua"; })[0];
    const nomi = privValori(sc, scL ? scL.chiave : "lingue");
    nomi.forEach(function(n){ out.rank.push({ sk: "sk:" + n, rank: out.lingua.rank || 8, lingua: true }); });
  }
  /* P-104: «potenzia» senza piuUno sulla stessa manovra = +1 permanente se c'era già rank ≥ 1, altrimenti rank 1 + costo −1.
     La scelta si fa quando si aggiunge il privilegio e resta in p.risolto. */
  out.potenzia.forEach(function(x){
    if (out.piuUno.some(function(y){ return y.sk === x.sk; })) return;
    const how = p && p.risolto ? p.risolto[x.sk] : null;
    if (how === "rank") { out.rank.push({ sk: x.sk, rank: 1 }); out.costo.push({ sk: x.sk, delta: -1, minimo: 1 }); }
    else if (how === "piuUno") out.piuUno.push({ sk: x.sk });
  });
  /* Iniziato al combattimento: lo stile scelto porta i suoi effetti */
  r.scelte.forEach(function(s){
    if (s.tipo === "opzione" && s.tra === "ARCHETIPI:stili") privValori(sc, s.chiave).forEach(function(id){
      const st = PRIV_BY_ID[id]; if (!st) return;
      const se = privEffettiRisolti(st, { scelte: {} });
      Object.keys(se).forEach(function(k){ if (Array.isArray(se[k])) out[k] = out[k].concat(se[k]); });
    });
  });
  return out;
}

/* ── prerequisiti: restituisce l'elenco di quelli che mancano (testo) ── */
function privPrerequisitiMancanti(r, ctx, scelte) {
  const manca = [];
  const prova = function(q){
    if (q.tipo === "car") return (ctx.score(q.car) >= q.min) ? null : q.car + " " + q.min + "+";
    if (q.tipo === "rank") {
      if (q.cat) return SD.some(function(s, i){ return s.c === q.cat && ctx.rankEff(i) >= q.min; }) ? null : "rank ≥ " + q.min + " in " + q.cat;
      const nomi = privEspandi(q.sk, scelte || {});
      if (!nomi.length) return null;   // dipende da una scelta non ancora fatta: lo controlla la scelta (minRank)
      const no = nomi.filter(function(n){ return ctx.rankEff(skIdx(n)) < q.min; });
      return no.length ? "rank ≥ " + q.min + " in " + no.map(function(n){ return n.replace(/^sk:/, ""); }).join(", ") : null;
    }
    if (q.tipo === "razza") return q.tra.indexOf(ctx.raceId) >= 0 ? null : "razza: " + q.tra.join(", ");
    if (q.tipo === "livello") return ctx.livello >= q.min ? null : q.min + "° livello";
    if (q.tipo === "talento") return ctx.haTalento(q.id) ? null : "talento " + ((PRIV_BY_ID[q.id] || {}).nome || q.id);
    if (q.tipo === "progressione") return ctx.incantatore ? null : "progressione magica di classe";
    if (q.tipo === "armaMarziale") return SD.some(function(s, i){ return SK_ARMI_CAT.indexOf(s.c) >= 0 && ctx.rankEff(i) >= (q.min || 1); }) ? null : "rank ≥ 1 in un'arma";
    if (q.tipo === "master") return "decide il master: " + (q.testo || "");
    if (q.tipo === "oppure") { const parti = q.tra.map(prova); return parti.some(function(x){ return !x; }) ? null : parti.join(" oppure "); }
    return "requisito non riconosciuto";
  };
  (r.prerequisiti || []).forEach(function(q){ const m = prova(q); if (m) manca.push(m); });
  return manca;
}

/* ── prezzo di un talento per una classe (P-103): numero dai dati, o formula per i talenti a scelta ──
   formula: pari superiore di 0,75 × (fisso[classe] + Σ fattore × k(classe, competenza scelta) + B), minimo 4 */
function privPrezzo(r, cls, scelte) {
  const c = r.prezzo;
  if (!c) return null;
  if (typeof c === "number") return c;
  if (c.formula) {
    let somma = (c.fisso && c.fisso[cls]) || 0;
    let completo = true;
    (c.scelte || []).forEach(function(s){
      const nomi = privEspandi(s.sk, scelte || {});
      if (nomi.length < (s.numero || 1)) completo = false;
      nomi.forEach(function(n){ const i = skIdx(n); somma += (s.fattore || 2) * (i >= 0 && SD[i].k ? (SD[i].k[cls] || 2) : 2); });
    });
    if (!completo) { const iv = c.intervallo && c.intervallo[cls]; return iv ? { da: iv[0], a: iv[1] } : null; }
    const v = Math.ceil((c.percentuale || 0.75) * (somma + (c.B || 0)) / 2) * 2;
    return Math.max(c.minimo || 4, v);
  }
  return c[cls] != null ? c[cls] : null;
}

/* ── testo breve degli effetti, per l'archivio ── */
function privEffettiTesto(r) {
  const e = r.effetti || {}, out = [];
  const nomeSk = function(x){ return String(x).replace(/^sk:/, "").replace(/\{[^}]+\}/, "a scelta"); };
  (e.punteggio || []).forEach(function(x){ out.push("+" + x.valore + " a " + String(x.car).replace(/\{.*\}/, "una caratteristica")); });
  (e.mod || []).forEach(function(m){
    const v = typeof m.valore === "number" ? fm(m.valore) : "+" + String(m.valore).replace(/^mod:/, "");
    out.push(v + (m.perLivello ? " per livello" : "") + " a " + (m.bersagli || []).map(function(b){
      const t = MOD_BASE_NOMI[b]; return t || nomeSk(b).replace(/^car:/, "mod. ");
    }).join(", ") + (m.condizione ? " (" + m.condizione + ")" : ""));
  });
  if ((e.rank || []).length) out.push("rank gratis: " + e.rank.map(function(x){ return nomeSk(x.sk); }).join(", "));
  if ((e.costo || []).length) out.push("costo −1");
  if ((e.piuUno || []).length) out.push("+1 permanente: " + e.piuUno.map(function(x){ return nomeSk(x.sk); }).join(", "));
  else if ((e.potenzia || []).length) out.push("potenzia " + e.potenzia.map(function(x){ return nomeSk(x.sk); }).join(", "));
  if ((e.maestria || []).length) out.push("Maestria");
  if (e.lingua) out.push((e.lingua.numero || 1) === 1 ? "1 lingua" : e.lingua.numero + " lingue");
  (e.usi || []).forEach(function(u){ out.push(u.nome + ": usi"); });
  if ((e.incantesimi || []).length) out.push((e.incantesimi.length === 1 ? "1 incantesimo" : e.incantesimi.length + " incantesimi"));
  return out.join(" · ");
}
const MOD_BASE_NOMI = { init: "Iniziativa", hp: "PF massimi", ca: "CA", vel: "Velocità" };

/* Controllo dei dati al caricamento: nomi di competenze o incantesimi che non esistono sono errori dei dati, non si applicano in silenzio */
const PRIV_ERRORI = [];
PRIVILEGI.forEach(function(r){
  const e = r.effetti;
  const skOk = function(s){ if (typeof s !== "string" || s.indexOf("{") >= 0) return; if (skIdx(s) < 0) PRIV_ERRORI.push(r.id + ": competenza sconosciuta «" + s + "»"); };
  (e.mod || []).forEach(function(m){ (m.bersagli || []).forEach(function(b){
    if (MOD_BASE_NOMI[b] || String(b).indexOf("{") >= 0) return;
    if (String(b).indexOf("car:") === 0) { if (STATS.indexOf(b.slice(4)) < 0) PRIV_ERRORI.push(r.id + ": caratteristica sconosciuta «" + b + "»"); return; }
    skOk(b);
  }); });
  ["rank", "costo", "piuUno", "potenzia", "maestria"].forEach(function(k){ (e[k] || []).forEach(function(x){ skOk(x.sk); }); });
  (e.incantesimi || []).forEach(function(x){ if (typeof x.id === "string" && x.id.indexOf("{") < 0 && x.id.charAt(0) !== "‹" && !SPELLS_BY_ID[x.id]) PRIV_ERRORI.push(r.id + ": incantesimo sconosciuto «" + x.id + "»"); });
  if (r.alternativaDi && !PRIV_BY_ID[r.alternativaDi]) PRIV_ERRORI.push(r.id + ": alternativaDi verso un id inesistente «" + r.alternativaDi + "»");
});
if (PRIV_ERRORI.length && typeof console !== "undefined") console.warn("[privilegi] " + PRIV_ERRORI.join("; "));
