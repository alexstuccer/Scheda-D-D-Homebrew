/* ══════════════════════════════════════════════════════════════════════════
 * character.jsx — calcoli del personaggio per la nuova interfaccia (pacchetto 0)
 * useCharacter(ch, setCh, env) restituisce l'oggetto C del contratto (tab REGIA — Pacchetto 0, v2.1).
 * Usa SOLO le funzioni globali della scheda (computeAll, calcCA, calcHP, pmSoglia, overcastCD…):
 * stessi numeri dell'interfaccia classica. env arriva da Dashboard: dadi, storico, annulla/ripeti.
 * ══════════════════════════════════════════════════════════════════════════ */

const CONDIZIONI_SRD = ["Accecato", "Affascinato", "Afferrato", "Assordato", "Avvelenato", "Incapacitato", "Invisibile",
  "Paralizzato", "Pietrificato", "Privo di sensi", "Prono", "Spaventato", "Stordito", "Trattenuto"];
const MODO_DA_UI = { vantaggio: "adv", normale: "norm", svantaggio: "dis" };
const MODO_A_UI = { adv: "vantaggio", norm: "normale", dis: "svantaggio" };
const ESITO_TS = { half: "metà danni", none: "nessun effetto", other: "vedi descrizione" };

/* Sintesi di combattimento di un'arma (era dentro CombatTab). role: "normale" | "main" | "off". */
function weaponCombatOf(we, role, ctx) {
  const comp = ctx.comp, statMods = ctx.statMods, eq = ctx.eq || {};
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
  let dwNote = "";
  if (role === "main" || role === "off") {
    const dualSkillIdx = SD.findIndex(function(s){ return s.n === "Combattimento a 2 armi"; });
    const dualSkill = dualSkillIdx >= 0 ? comp[dualSkillIdx] : null;
    const hasDualSkill = !!(dualSkill && (dualSkill.rank || 0) > 0);
    const dualCap = skScore(dualSkill, statMods);
    if (hasDualSkill && dualCap != null) {
      if (toHit > dualCap) { toHit = dualCap; dwNote = "cap 2 armi " + fmtMod(dualCap); }
      else dwNote = "sotto il cap (" + fmtMod(dualCap) + ")";
    } else {
      toHit = toHit - 3;
      dwNote = (role === "main" ? "−3 principale" : "−3 secondaria") + " (no competenza)";
    }
    const fm = role === "main" ? (eq.dwMainMod || 0) : (eq.dwOffMod || 0);
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
}

/* "2d6" → "4d6": dadi raddoppiati del critico */
function doppiDadi(dice) {
  return String(dice || "").replace(/(\d+)d(\d+)/g, function(m, n, f){ return (2 * +n) + "d" + f; });
}

/* Esito del sovra-lancio dal tiro: R4.13 (20 naturale riesce, 1 naturale è critico) */
function esitoSovra(entry, cd) {
  return entry.chosen === 20 ? "ok" : entry.chosen === 1 ? "nat1" : entry.total >= cd ? "ok" : "fail";
}

/* Modificatori fissi (10.5): talenti, privilegi, archetipi, oggetti, situazioni. Ognuno ha un nome, una fonte, un valore,
   uno o più bersagli e una nota: la scheda li somma e mostra da dove vengono.
   Bersagli: "init", "hp" (PF massimi), "ca", "vel" (metri), "car:<Caratteristica>" (modificatore), "sk:<indice competenza>". */
const MOD_FONTI = ["Talento", "Privilegio di classe", "Archetipo", "Razza", "Oggetto", "Altro"];
const MOD_BASE = [["init", "Iniziativa"], ["hp", "PF massimi"], ["ca", "Classe Armatura"], ["vel", "Velocità (m)"]];
function modBersaglioNome(t) {
  const b = MOD_BASE.filter(function(x){ return x[0] === t; })[0];
  if (b) return b[1];
  if (t.indexOf("car:") === 0) return "Mod. " + t.slice(4);
  if (t.indexOf("sk:") === 0) { const d = SD[+t.slice(3)]; return d ? d.n : "?"; }
  return t;
}
/* 10.7: i «pacchetti pronti» (MOD_PRONTI) sono finiti; privilegi e talenti arrivano dai dati (privilegi.jsx). */
function privFonte(r) { return r.tipo === "talento" ? "Talento" : r.archetipo ? "Archetipo" : "Privilegio di classe"; }
/* Massimo degli usi (P-101): numero, tabella per livello {liv: n}, "livello", "rankMax" (bonus del rank più alto),
   "rank:sk:<nome>" (bonus del rank di quella competenza), "mod:<Caratteristica>"; poi moltiplica, aggiungi, minimo. 99 = illimitato. */
function privUsiMax(u, lv, statMods, rankEff, rankMax) {
  const m = u.massimo;
  let v = 0;
  if (typeof m === "number") v = m;
  else if (m && typeof m === "object") { const best = Object.keys(m).filter(function(x){ return +x <= lv; }).sort(function(a, b){ return b - a; })[0]; v = best != null ? m[best] : 0; }
  else if (typeof m === "string") {
    if (/^\d+$/.test(m)) v = +m;
    else if (m === "livello") v = lv;
    else if (m === "rankMax") v = bonusLvl(rankMax);
    else if (m.indexOf("rank:") === 0) v = bonusLvl(rankEff(skIdx(m.slice(5))));
    else if (m.indexOf("mod:") === 0) v = statMods[m.slice(4)] || 0;
  }
  if (v >= 99) return 99;
  if (u.moltiplica) v *= u.moltiplica;
  if (u.aggiungi) v += u.aggiungi;
  if (u.minimo != null) v = Math.max(u.minimo, v);
  return Math.max(0, v);
}
function useCharacter(ch, setCh, env) {
  /* Competenze del personaggio: quelle del Ruleset (SD) più quelle aggiunte dal master (ch.skExtra, 10.7.4).
     Le aggiunte stanno in coda: gli indici delle competenze del Ruleset non cambiano. Una aggiunta tolta resta con via: true. */
  const SDX = (ch.skExtra && ch.skExtra.length) ? SD.concat(ch.skExtra) : SD;
  const eq = ch.equipment || {};
  /* ── privilegi e talenti (10.7): gli effetti si ricalcolano dai dati a ogni giro (privilegi.jsx) ──
     Un talento comprato al level-up resta «in addestramento» fino al livello dopo (P-102): lì non dà niente. */
  const tl0 = ch.classes.reduce(function(s, c){ return s + (c.level || 0); }, 0);
  const privAttivi = [], privAttesa = [];
  (ch.privilegi || []).forEach(function(p){
    const r = PRIV_BY_ID[p.pid]; if (!r) return;
    const x = { p: p, r: r, e: privEffettiRisolti(r, p) };
    if (p.acquisto && p.livelloPreso && tl0 < p.livelloPreso + 1) privAttesa.push(x); else privAttivi.push(x);
  });
  const privNoto = function(uid){ return (ch.privilegi || []).some(function(p){ return p.uid === uid && PRIV_BY_ID[p.pid]; }); };
  /* rank gratis (P-100: non si sommano, vale il più alto), sconto di costo (non si somma), +1 permanenti e Maestria (si sommano) */
  const pvRg = {}, pvCd = {}, pvRgDa = {};
  privAttivi.forEach(function(x){
    x.e.rank.forEach(function(k){ const i = skIdx(k.sk); if (i < 0) return; if ((k.rank || 1) > (pvRg[i] || 0)) { pvRg[i] = k.rank || 1; pvRgDa[i] = x.r.nome; } });
    x.e.costo.forEach(function(k){ const i = skIdx(k.sk); if (i < 0) return; const d = k.delta || -1; if (!pvCd[i] || d < pvCd[i].delta) pvCd[i] = { delta: d, minimo: k.minimo || 1 }; });
  });
  /* ── lingue madrelingua (P-113): da 1 a 3, ognuna in una famiglia; partono da rank 8 senza spesa ──
     Ogni madrelingua occupa un posto di lingua (Lingua F.n) della sua famiglia; il nome si scrive a mano (P-112).
     Alla creazione, se non è ancora stata scelta, ce n'è una in Famiglia 1 (Lingua 1.1). */
  const LINGUA_RE = /^Lingua (\d+)\.(\d+)$/;
  const lingueSlot = SDX.map(function(x, i){ const m = x && !x.via && x.c === "Comunicazione" && LINGUA_RE.exec(x.n); return m ? { i: i, fam: +m[1], n: +m[2] } : null; }).filter(Boolean);
  const famiglieLingue = lingueSlot.reduce(function(a, x){ if (a.indexOf(x.fam) < 0) a.push(x.fam); return a; }, []).sort(function(a, b){ return a - b; });
  const madre = (ch.madrelingue || (!ch.creationDone ? [{ fam: 1, i: (lingueSlot.filter(function(x){ return x.fam === 1; })[0] || {}).i }] : []))
    .filter(function(m){ return m && m.i != null && SDX[m.i] && !SDX[m.i].via; });
  madre.forEach(function(m){ if ((pvRg[m.i] || 0) < 8) { pvRg[m.i] = 8; pvRgDa[m.i] = "madrelingua"; } });
  /* modificatori che vengono dai privilegi: valori fissi, per livello, da caratteristica (mod:<Car>), sospesi se hanno una condizione */
  const pvMods = [];
  privAttivi.forEach(function(x){
    const acc = x.p.accesi || {};
    const base = { nome: x.r.nome, fonte: privFonte(x.r), priv: x.p.uid, derivato: true };
    x.e.mod.forEach(function(m, k){
      const b = (m.bersagli || []).map(function(t){
        if (MOD_BASE.some(function(y){ return y[0] === t; })) return t;
        if (String(t).indexOf("car:") === 0) return STATS.indexOf(t.slice(4)) >= 0 ? t : null;
        const i = skIdx(t); return i >= 0 ? "sk:" + i : null;
      }).filter(Boolean);
      pvMods.push(Object.assign({}, base, { id: "pv:" + x.p.uid + ":m" + k, valore: m.valore, minimo: m.minimo, bersagli: b,
        perLivello: m.perLivello === "tot" ? "tot" : m.perLivello === "classe" && x.r.classe ? "cls:" + x.r.classe : undefined,
        condizione: m.condizione || "", note: m.condizione || x.r.condizione || "", attivo: m.condizione ? !!acc["m" + k] : true }));
    });
    x.e.piuUno.forEach(function(k, j){ const i = skIdx(k.sk); if (i >= 0) pvMods.push(Object.assign({}, base, { id: "pv:" + x.p.uid + ":p" + j, valore: 1, bersagli: ["sk:" + i], note: "+1 permanente (P-104)", attivo: true })); });
    x.e.maestria.forEach(function(k, j){ const i = skIdx(k.sk); if (i >= 0) pvMods.push(Object.assign({}, base, { id: "pv:" + x.p.uid + ":a" + j, valore: 1, bersagli: ["sk:" + i], note: "Maestria: +1 permanente e vantaggio sempre (R3.20.1)", attivo: true, maestria: true })); });
  });
  const modList = (ch.modificatori || []).filter(function(m){ return m && m.attivo !== false && !(m.priv && privNoto(m.priv)); })
    .concat(pvMods.filter(function(m){ return m.attivo; }));
  let statModsRef = null;   // i valori "mod:<Car>" si leggono solo dopo il calcolo delle caratteristiche
  /* perLivello: "tot" moltiplica per il livello del personaggio, "cls:<Classe>" per il livello in quella classe (es. Robusto, PF per livello) */
  const modVal = function(m){
    let v;
    if (typeof m.valore === "string" && m.valore.indexOf("mod:") === 0) v = statModsRef ? (statModsRef[m.valore.slice(4)] || 0) : 0;
    else v = Number(m.valore) || 0;   // N-02: la velocità va a passi di 1,5 m
    if (m.minimo != null) v = Math.max(m.minimo, v);
    if (m.perLivello === "tot") v *= tl;
    else if (m.perLivello && m.perLivello.indexOf("cls:") === 0) { const c = ch.classes.find(function(x){ return x && x.name === m.perLivello.slice(4); }); v *= c ? (c.level || 0) : 0; }
    return v;
  };
  const modSum = function(t){ let s = 0; modList.forEach(function(m){ if ((m.bersagli || []).indexOf(t) >= 0) s += modVal(m); }); return s; };
  const tl = ch.classes.reduce(function(s, c){ return s + (c.level || 0); }, 0);
  const lastCls = ch.classes.length > 0 ? ch.classes[ch.classes.length - 1] : { name: "" };
  const ac = lastCls.name || "";
  const isL1 = tl <= 1;
  const race = RACES.find(function(r){ return r.id === ch.raceId; }) || RACES[0];

  /* ── caratteristiche (come App) ── */
  const rb = {};
  STATS.forEach(function(st){ rb[st] = 0; });
  if (race.bonuses) Object.keys(race.bonuses).forEach(function(k){ rb[k] = (rb[k] || 0) + race.bonuses[k]; });
  (ch.raceChoices || []).forEach(function(st){ if (st) rb[st] = (rb[st] || 0) + 1; });
  /* Bilancio razziale (R1.6, P-02, P-19): somma dei bonus e malus razziali di razza e sottorazza; sotto 3 due talenti gratuiti, sotto 6 uno */
  const bilancio = STATS.reduce(function(a, st){ return a + (rb[st] || 0); }, 0);
  const talRazziali = ch.raceId ? (bilancio < 3 ? 2 : bilancio < 6 ? 1 : 0) : 0;
  const itemStats = {}, itemSkills = {};
  (eq.items || []).forEach(function(it){
    const active = it.equipped && (!it.requiresAttunement || it.attuned);
    if (!active) return;
    if (it.statMods) Object.keys(it.statMods).forEach(function(k){ if (it.statMods[k]) itemStats[k] = (itemStats[k] || 0) + it.statMods[k]; });
    if (it.skillMods) Object.keys(it.skillMods).forEach(function(k){ if (it.skillMods[k]) itemSkills[k] = (itemSkills[k] || 0) + it.skillMods[k]; });
  });
  const bm = ch.bm || {};
  const statMods = {}, stats = {};
  /* punteggi dai talenti e privilegi: +n al punteggio, massimo 20 (24 per Campione primordiale) */
  const pvPunti = {};
  privAttivi.forEach(function(x){ x.e.punteggio.forEach(function(q){ if (STATS.indexOf(q.car) >= 0) pvPunti[q.car] = (pvPunti[q.car] || 0) + (q.valore || 0); }); });
  const tetto = privAttivi.some(function(x){ return x.r.id === "barbaro-campione-primordiale"; }) ? 24 : 20;
  const scoreOf = function(st){ const s0 = (ch.stats && ch.stats[st]) || 8, a = pvPunti[st] || 0; return a ? Math.max(s0, Math.min(tetto, s0 + a)) : s0; };
  STATS.forEach(function(st){
    const score = scoreOf(st);
    statMods[st] = gm(score) + (rb[st] || 0) + (bm[st] || 0) + (itemStats[st] || 0) + modSum("car:" + st);
    stats[st] = { score: score, mod: statMods[st], base: (ch.stats && ch.stats[st]) || 8, talento: score - ((ch.stats && ch.stats[st]) || 8), racial: rb[st] || 0, bonus: bm[st] || 0, item: itemStats[st] || 0, tal: modSum("car:" + st) };
  });
  statModsRef = statMods;
  const autoGA = (function(){ const c = ch.classes.find(function(c2){ return MS[c2.name]; }); return c ? MS[c.name] : ch.ga; })();

  /* ── difesa e movimento (P-09, P-78, P-79, P-80) ── */
  /* rank effettivi = comprati + gratis dai privilegi: valgono per armature, scudi, armi e prerequisiti */
  const skRg = ch.skills.map(function(sk, i){ return pvRg[i] ? Object.assign({}, sk, { rank: ((sk && sk.rank) || 0) + pvRg[i] }) : sk; });
  const eqDexCap = calcDexCap(eq, skRg);
  const eqShPen = shieldDexPen(eq);
  const dexCA = Math.min(statMods.Destrezza || 0, eqDexCap) + eqShPen;
  const caTotal = calcCA(eq, dexCA) + modSum("ca");
  /* N-01: da dove viene la CA (come il dettaglio dell'editor completo, 10.1.1): base, armatura, Destrezza col limite, scudo, modificatori */
  const caParts = (function(){
    const out = [{ t: "base", v: 10 }];
    const arm = eq.armor || {}, sh = eq.shield || {};
    const an = { light: "armatura leggera", medium: "armatura media", heavy: "armatura pesante" }, sn = { small: "scudo piccolo", medium: "scudo medio", large: "scudo grande" };
    Object.keys(an).forEach(function(k){ if (arm[k] && arm[k].equipped) out.push({ t: an[k], v: (arm[k].caBase || 0) + (arm[k].bonusSpec || 0) }); });
    const dexRaw = statMods.Destrezza || 0;
    out.push({ t: "Destrezza" + (eqDexCap < 999 && eqDexCap < dexRaw ? " (limite " + fm(eqDexCap) + " dall'armatura)" : ""), v: Math.min(dexRaw, eqDexCap), des: true });
    Object.keys(sn).forEach(function(k){ if (sh[k] && sh[k].equipped) out.push({ t: sn[k], v: (sh[k].caBonus || 0) + (sh[k].bonusSpec || 0) }); });
    if (eqShPen) out.push({ t: "penalità dello scudo grande alla Destrezza", v: eqShPen, des: true });
    const mc = modSum("ca"); if (mc) out.push({ t: "modificatori", v: mc });
    return out;
  })();
  const velBase = calcVel(VEL_BASE, ch.height || 170, dexCA, statMods.Forza || 0) + (race.speedAdd || 0) + modSum("vel");   // P-110: base 9 per tutti
  const loadTot = equipWeight(eq);
  const loadMax = ((ch.stats && ch.stats.Forza) || 8) * 7.5;
  const velOverload = loadTot > loadMax;
  const velFinal = velOverload ? Math.floor(velBase) / 2 : velBase;

  /* ── punti ferita ── */
  const hpMax = calcHP(ch.classes, statMods.Costituzione, ch.hpBonus || 0) + modSum("hp");
  const hpDmg = ch.hpDmg || 0;
  const hpCur = hpMax - hpDmg;

  /* ── competenze (durante il level-up i rank sono quelli attuali + i nuovi, come nell'editor completo) ── */
  const lu = ch.lvlUp && Array.isArray(ch.lvlUp.nr) ? ch.lvlUp : null;
  const luCls = lu ? (lu.cls || ac) : ac;
  const baseRank = function(i){ return ch.skills[i] ? ch.skills[i].rank || 0 : 0; };
  const skillsEff = ch.skills.map(function(sk, i){
    const add = (lu ? (lu.nr[i] || 0) : 0) + (pvRg[i] || 0);
    return add ? Object.assign({}, sk, { rank: baseRank(i) + add }) : sk;
  });
  const rankEff = function(i){ return i >= 0 && skillsEff[i] ? skillsEff[i].rank || 0 : 0; };
  const rankMax = skillsEff.reduce(function(m, sk){ return Math.max(m, (sk && sk.rank) || 0); }, 0);
  /* costo di una competenza per una classe: override del master, altrimenti costo di classe con lo sconto dei privilegi (minimo 1) */
  const costOf = function(i, cls){
    const sk = ch.skills[i];
    if (sk && Number.isInteger(sk.costOverride) && sk.costOverride >= 1) return sk.costOverride;
    const b = getSkillCost(sk, SDX[i], cls);
    return pvCd[i] ? Math.max(pvCd[i].minimo, b + pvCd[i].delta) : b;
  };
  /* Rank massimo raggiungibile in questo passaggio (R2.3, P-74): primo rank 1; poi +2 a livello fino al 14°, da lì +1; tetto 24.
     Le eccezioni (lingue di razza, studio annuale, Mente sfuggente, Anima adamantina) si fanno nell'editor completo. */
  const luMaxOf = function(r){ return r === 0 ? 1 : r < 14 ? Math.min(14, r + 2) : Math.min(24, r + 1); };
  /* I modificatori sulle competenze entrano nel campo ms (somma nel totale e nel per colpire delle armi); non si salvano. */
  const skillsCalc = skillsEff.map(function(sk, i){ const t = modSum("sk:" + i); return (t || sk.ms) ? Object.assign({}, sk, { ms: t }) : sk; });
  const comp0 = computeAll(skillsCalc, statMods, ch.ma, autoGA, SDX);
  const comp = Object.keys(itemSkills).length ? comp0.map(function(s, i){
    const add = itemSkills[i] || itemSkills[String(i)] || 0;
    return add ? Object.assign({}, s, { tot: s.tot + add, im: add }) : s;
  }) : comp0;
  const pinned = ch.pinned || [];
  const skills = [], cats = [];
  let curCat = null;
  const ordine = [];
  SD.forEach(function(sd, i){
    ordine.push(i);
    if (!SD[i + 1] || SD[i + 1].c !== sd.c) SDX.forEach(function(x, j){ if (j >= SD.length && x.c === sd.c && !x.via) ordine.push(j); });
  });
  SDX.forEach(function(x, j){ if (j >= SD.length && !x.via && !SD.some(function(y){ return y.c === x.c; })) ordine.push(j); });
  ordine.forEach(function(i){
    const sk = comp[i];
    if (!sk || !sk.name || sk.name === "?") return;
    const cost = costOf(i, luCls), g = pvRg[i] || 0;
    skills.push({ i: i, name: sk.name, cat: sk.cat, attr: SS[sk.attr] || sk.attr || "", rank: sk.rank || 0, tot: sk.tot,
      bonus: (ch.skills[i] && ch.skills[i].bs) || 0, costOverride: (ch.skills[i] && Number.isInteger(ch.skills[i].costOverride)) ? ch.skills[i].costOverride : null,
      classCost: SDX[i] && SDX[i].k ? (SDX[i].k[luCls] || 2) : 2, extra: i >= SD.length, slot: !!(SDX[i] && /^(Lingua|Strumento) \d/.test(SDX[i].n)), nomeBase: SDX[i] ? SDX[i].n : "", cn: (ch.skills[i] && ch.skills[i].cn) || "", bl: sk.bl, maxAff: sk.maxAff, sm2: sk.sm2, tal: sk.ms || 0, cost: cost, sep: sk.aff === "sep", aff: sk.aff, pinned: pinned.indexOf(i) >= 0,
      gratis: g, gratisDa: g ? pvRgDa[i] : null, sconto: pvCd[i] ? pvCd[i].delta : 0,
      luMin: baseRank(i) + g, luMax: lu ? luMaxOf(baseRank(i) + g) : 24 });
    if (!curCat || curCat.name !== sk.cat) { curCat = { name: sk.cat, items: [] }; cats.push(curCat); }
    curCat.items.push(i);
  });
  const statSum = STATS.reduce(function(s, st){ return s + scoreOf(st); }, 0);   // i +1 dei talenti contano come gli aumenti di caratteristica
  const skPts = Math.ceil(statSum * (isL1 ? 1.5 : 1));
  const mcCost = Math.max(0, ch.classes.filter(function(c){ return c.name && c.level > 0; }).length - 1) * 48;
  let creationSpent = 0;
  ch.skills.forEach(function(sk, i){ creationSpent += calcCost(costOf(i, ac), 0, baseRank(i), isL1); });
  let luAvail = 0, luSpent = 0;
  if (lu) {
    luAvail = statSum + (ch.savedPoints || 0) - (lu.isNew ? 48 : 0);
    lu.nr.forEach(function(n, i){
      if (!(n > 0)) return;
      const c = costOf(i, luCls);
      /* si paga dal rank effettivo: con il rank gratis niente maestro, e la fascia di costo è quella del rank reale (R2.4: una madrelingua a 8 sale al 9 al doppio) */
      luSpent += calcCost(c, baseRank(i) + (pvRg[i] || 0), n, false);
    });
    /* talento comprato in questo passaggio (P-102, P-103) */
    (ch.privilegi || []).forEach(function(p){ if (p.acquisto && p.livelloPreso === tl + 1) luSpent += p.prezzo || 0; });
  }

  /* ── magia ── */
  const pmInfo = pmSoglia(ch.classes);
  const pmUsed = ch.pmUsed || 0;
  const pmRem = Math.max(0, pmInfo.pm - pmUsed);
  const soglia = pmInfo.soglia;
  const schoolMod = {};
  SDX.forEach(function(sd, i){ if (sd.c === "Incantesimi" && comp[i]) schoolMod[sd.n] = comp[i].tot; });
  const overAt = function(lv){
    if (!lv) return null;
    const dry = pmRem < lv;
    if (!(lv > soglia || dry)) return null;
    return { cd: overcastCD(lv, soglia, dry), dry: dry,
      toll: { ok: overcastDamage(lv, "ok"), fail: overcastDamage(lv, "fail"), nat1: overcastDamage(lv, "nat1") } };
  };
  const spells = [];
  const pushSpell = function(sp, key, extra){
    const db = resolveSpellDb(sp);
    const level = db ? (db.level || 0) : (sp.level || 0);
    const school = (db && db.school) || sp.school || "";
    const m = schoolMod[school];
    const levels = [];
    if (level > 0) for (let lv = level; lv <= 9; lv++) levels.push({ lv: lv, pmCost: lv, over: overAt(lv) });
    const dice = db && db.damage ? spellDiceAt(db.damage, level, tl) : null;
    spells.push(Object.assign({
      key: key, id: db ? db.id : null, name: sp.name || (db && db.name) || "?", level: level, school: school,
      source: "classe", srcClass: null, prepared: !!sp.prepared, available: sp.available !== false, custom: !db, auto: false,
      range: db ? db.range || "" : "", duration: db ? db.duration || "" : "", components: db ? db.components || "" : "",
      desc: db ? (db.desc || db.descEn || "") : "", descLang: db ? (db.desc ? "it" : "en") : "it",
      ritual: !!(db && db.ritual), conc: !!((db && db.concentration) || sp.concentration), castTime: String(sp.castTime || (db && db.castTime) || "").toLowerCase(),
      pmCost: level, over: overAt(level), levels: levels,
      attack: db && db.attack ? (m != null ? m : 0) : null,
      dc: db && db.dc ? { ability: db.dc.ability || "", value: m != null ? 8 + m : null, success: ESITO_TS[db.dc.success] || db.dc.success || "" } : null,
      dmg: dice ? { dice: dice, type: db.damage.type || "" } : null,
      effects: sp.effects || (db && db.effects) || ""
    }, extra || {}, { key: key }));
  };
  (ch.spells || []).forEach(function(sp, idx){ pushSpell(sp, String(idx)); });
  /* incantesimi dati da privilegi e talenti: sempre pronti, con la loro frequenza; «1 per riposo» ha un uso gratuito nei contatori */
  privAttivi.forEach(function(x){
    x.e.incantesimi.forEach(function(e, k){
      const db = SPELLS_BY_ID[e.id]; if (!db) return;
      pushSpell({ dbId: db.id, prepared: true }, "pv:" + x.p.uid + ":s" + k,
        { source: x.r.tipo === "talento" ? "talento" : "privilegio", srcClass: x.r.nome, prepared: true, auto: true, freq: e.frequenza || "", anchePM: !!e.ancheConPM });
    });
  });

  /* ── armi ── */
  const dualWield = !!eq.dualWield;
  const weapons = [];
  (eq.weapons || []).forEach(function(we, i){
    const role = we.equipped ? (we.offHand && dualWield ? "off" : "main") : "none";
    // stesso ruolo di calcolo dell'interfaccia classica (CombatTab): principale solo se «in uso»
    const calcRole = (we.inUse && dualWield) ? "main" : (we.offHand && dualWield) ? "off" : "normale";
    const wc = weaponCombatOf(we, calcRole, { comp: comp, statMods: statMods, eq: eq });
    if (!wc) return;
    const dmg = wc.dmgGroups.map(function(g){ return { dice: g.dice, flat: g.flat || 0, type: String(g.type || "").toLowerCase() }; });   // P-83: tipi in minuscolo
    weapons.push({ key: String(i), i: i, name: we.name || wc.def.name, role: role, toHit: wc.toHit, dmg: dmg,
      crit: { range: wc.critRange < 20 ? wc.critRange + "–20" : "20", dmg: dmg.map(function(g){ return Object.assign({}, g, { dice: doppiDadi(g.dice) }); }) },
      props: String(wc.def.props || "").split(",").map(function(x){ return x.trim(); }).filter(Boolean),
      notes: [wc.skName ? wc.skName + " " + fmtMod(wc.profBonus) : null, wc.dwNote || null].filter(Boolean) });
  });
  const maneuvers = [];
  comp.forEach(function(sk, i){
    if (SDX[i] && SDX[i].c === "Manovre di Combattimento" && (sk.rank || 0) > 0) maneuvers.push({ name: sk.name, tot: sk.tot, die: null, dc: null });
  });

  /* ── usi dei privilegi e dei talenti (contatori): chiave "pv:<uid>:<n>", si azzerano col riposo indicato ── */
  const features = [], usiBrevi = [];
  privAttivi.forEach(function(x){
    const lvC = x.r.tipo === "talento" ? tl : (ch.classes.find(function(c){ return c && c.name === x.r.classe; }) || { level: 0 }).level || 0;
    const add = function(key, nome, max, recupero, extra){
      const breve = /breve/.test(recupero || "");
      if (breve) usiBrevi.push(key);
      features.push(Object.assign({ key: key, name: nome, cls: x.r.tipo === "talento" ? "Talento" : x.r.classe, lv: x.r.livello || "",
        uses: max >= 99 ? null : { max: max, spent: Math.min(max, (ch.uses || {})[key] || 0), rest: breve ? "breve" : "lungo" },
        illimitato: max >= 99, recupero: recupero || "", priv: x.p.uid, fonte: x.r.nome, dc: null }, extra || {}));
    };
    x.e.usi.forEach(function(u, k){
      add("pv:" + x.p.uid + ":" + k, u.nome, privUsiMax(u, lvC, statMods, rankEff, rankMax), u.recupero,
        u.solo ? { solo: String(u.solo).replace(/^sk:/, "") } : null);
    });
    x.e.incantesimi.forEach(function(e, k){
      const m = /^1 per (riposo (breve|lungo))/.exec(e.frequenza || "");
      const db = SPELLS_BY_ID[e.id];
      if (m && db) add("pv:" + x.p.uid + ":s" + k, db.name + " (senza PM)", 1, m[1], { spell: db.id });
    });
  });

  /* ── equipaggiamento in sola lettura ── */
  const rankOf = function(name){ const k = SD.findIndex(function(s){ return s.n === name; }); return k >= 0 && skRg[k] ? skRg[k].rank || 0 : 0; };
  const armNames = { light: "Armature Leggere", medium: "Armature Medie", heavy: "Armature Pesanti" };
  const shNames = { small: "Scudi Piccoli", medium: "Scudi Medi", large: "Scudi Grandi" };
  const armor = {}, shield = {};
  Object.keys(armNames).forEach(function(k){ armor[k] = Object.assign({ caBase: 0, bonusSpec: 0, equipped: false }, (eq.armor || {})[k], { rank: rankOf(armNames[k]) }); });
  Object.keys(shNames).forEach(function(k){ shield[k] = Object.assign({ caBonus: 0, bonusSpec: 0, equipped: false }, (eq.shield || {})[k], { rank: rankOf(shNames[k]) }); });
  const equip = {
    armor: armor, shield: shield, dualWield: dualWield, coins: eq.coins || {},
    weapons: (eq.weapons || []).map(function(w, i){
      const def = WEAPONS_DB.find(function(d){ return d.id === w.id; });
      return { i: i, id: w.id, name: w.name || (def && def.name) || w.id, qty: w.qty || 1, equipped: !!w.equipped, offHand: !!w.offHand,
        special: w.special || null, base: def ? { name: def.name, dmg: def.dmg, dmgType: def.dmgType, category: def.category, props: def.props || "" } : null };
    }),
    items: (eq.items || []).map(function(x, i){ return Object.assign({ i: i }, x); }),
    load: { tot: Math.round(loadTot * 10) / 10, max: loadMax, over: velOverload }
  };

  /* ── stato al tavolo ── */
  const conc = ch.conc ? { id: ch.conc, name: (spells.filter(function(s){ return s.key === ch.conc || s.id === ch.conc; })[0] || { name: ch.conc }).name } : null;
  const myName = ch.name || "?";
  const history = (env.rolls || []).filter(function(r){ return !r.pg || r.pg === myName; }).map(function(r){
    if (r.isDamage) {
      const dice = []; (r.parts || []).forEach(function(p){ (p.rolls || []).forEach(function(x){ dice.push(x); }); });
      const flat = (r.parts || []).reduce(function(s, p){ return s + (p.flat || 0); }, 0);
      const e = { t: r.t, label: r.label, dice: dice.length ? dice : null, total: r.total, crit: !!r.crit,
        parts: (r.parts || []).map(function(p){ return { type: String(p.type || "").toLowerCase(), dice: p.dice, rolls: (p.rolls || []).slice(), flat: p.flat || 0 }; }) };
      if (flat) e.mod = flat;
      return e;
    }
    /* 10.7 (MOBILE): modo, dado tenuto e d20 per lo storico dei tiri */
    return { t: r.t, label: r.label, dice: r.d2 != null ? [r.d1, r.d2] : [r.d1], mod: r.mod, total: r.total,
      mode: MODO_A_UI[r.mode] || "normale", chosen: r.chosen != null ? r.chosen : r.d1, crit: r.chosen === 20 || (r.chosen == null && r.d1 === 20), die: 20 };
  });

  /* ── stati della scheda: creazione, gioco (bloccata), Master (sbloccata dopo la creazione), level-up ── */
  const inCreation = !ch.creationDone;
  const inMaster = !!ch.creationDone && !ch.locked && !lu;
  const pbSpent = STATS.reduce(function(a, st){ return a + pointBuyCost((ch.stats && ch.stats[st]) || 8); }, 0);
  const creationErrors = [];
  if (inCreation) {
    if (!ac) creationErrors.push("Scegli la classe.");
    if ((race.cc || 0) > 0 && (ch.raceChoices || []).filter(Boolean).length < race.cc) creationErrors.push("Scegli " + race.cc + (race.cc > 1 ? " caratteristiche" : " caratteristica") + " per il bonus di razza.");
    if (pbSpent > 27) creationErrors.push("Point buy oltre 27 (" + pbSpent + ").");
    if (skPts - mcCost - creationSpent < 0) creationErrors.push("Punti competenza in negativo (" + (skPts - mcCost - creationSpent) + ").");
    if (!String(ch.name || "").trim()) creationErrors.push("Dai un nome al personaggio.");
  }
  /* Rank massimo alla creazione: 4 (P-111, che sostituisce P-41); le lingue (Comunicazione) fino a 8 (R1.8, P-14).
     Il rank gratis di razza, talento o privilegio conta dentro il limite (P-88). */
  const CREAZIONE_MAX = 4;
  const creationBuyMax = function(i){ return Math.max(0, (SDX[i] && SDX[i].c === "Comunicazione" ? 8 : CREAZIONE_MAX) - (pvRg[i] || 0)); };
  const creationMax = function(i){ return (pvRg[i] || 0) + creationBuyMax(i); };

  /* Un posto libero per una madrelingua nella famiglia fam: il primo senza rank comprati e non già madrelingua; se non c'è, se ne aggiunge uno */
  const postoLingua = function(fam, occupati, extra, skills){
    const usati = occupati.map(function(m){ return m.i; });
    const libero = lingueSlot.filter(function(x){ return x.fam === fam && usati.indexOf(x.i) < 0 && !((ch.skills[x.i] || {}).rank > 0); })[0];
    if (libero) return { i: libero.i, extra: extra, skills: skills };
    const n = lingueSlot.filter(function(x){ return x.fam === fam; }).length + extra.slice((ch.skExtra || []).length).filter(function(x){ return x.s === "Famiglia " + fam; }).length + 1;
    const base = SDX[(lingueSlot[0] || {}).i] || {};
    const nuova = { n: "Lingua " + fam + "." + n, c: "Comunicazione", s: "Famiglia " + fam, f: "affine", a: "Intelligenza", k: Object.assign({}, base.k || {}), nuova: true };
    return { i: SD.length + extra.length, extra: extra.concat([nuova]), skills: skills.concat([{ rank: 0, bs: 0, ms: 0 }]) };
  };

  /* ── controlli di privilegi e talenti: scelte, prerequisiti, doppioni, alternative, acquisto ── */
  const nomeSk = function(i){ return (ch.skills[i] && ch.skills[i].cn) || (SDX[i] ? SDX[i].n : "?"); };
  const gratisAltri = function(i){
    if (i < 0) return false;
    const sk = ch.skills[i];
    return !!(pvRg[i] || pvCd[i] || (sk && Number.isInteger(sk.costOverride) && SDX[i] && SDX[i].k && sk.costOverride < (SDX[i].k[ac] || 2)));
  };
  const privCtxBase = { rankEff: rankEff, gratisAltri: gratisAltri, nomeSk: nomeSk };
  const prereqCtx = { score: scoreOf, rankEff: rankEff, raceId: ch.raceId, livello: tl + (lu ? 1 : 0),
    haTalento: function(id){ return (ch.privilegi || []).some(function(p){ return p.pid === id; }); },
    incantatore: pmInfo.pm > 0 };
  const applicati = (ch.privilegi || []).map(function(p){ return { p: p, r: PRIV_BY_ID[p.pid] }; }).filter(function(x){ return x.r; });
  /* talenti ai livelli con aumento di caratteristica (P-102): uno per aumento, uno per passaggio di livello; l'occasione resta aperta */
  const luNuovoLiv = lu ? ((ch.classes.find(function(c){ return c && c.name === luCls; }) || { level: 0 }).level || 0) + 1 : 0;
  const asiFatti = ch.classes.reduce(function(n, c){ return n + (c && c.name ? asiLivelli(c.name).filter(function(l){ return l <= (c.level || 0); }).length : 0); }, 0);
  const asiQui = lu && asiLivelli(luCls).indexOf(luNuovoLiv) >= 0;
  const talComprati = (ch.privilegi || []).filter(function(p){ return p.acquisto; });
  const talOra = talComprati.filter(function(p){ return p.livelloPreso === tl + 1; })[0] || null;
  const talAperte = asiFatti + (asiQui ? 1 : 0) - talComprati.length + (talOra ? 1 : 0);
  const privControllo = function(r, sc, o){
    o = o || {};
    const ctx = Object.assign({}, privCtxBase, { scelte: sc });
    const daFare = privScelteDaFare(r, sc, ctx);
    const incomplete = daFare.filter(function(x){ return !privSceltaCompleta(x, sc); });
    if (incomplete.length) return { errore: "Mancano delle scelte.", scelte: incomplete.map(function(x){ return x.chiave; }) };
    const mancanti = privPrerequisitiMancanti(r, prereqCtx, sc);
    if (mancanti.length && !o.forza) return { errore: "Requisiti mancanti: " + mancanti.join("; ") + ".", mancanti: mancanti };
    if (r.tipo !== "talento" && applicati.some(function(x){ return x.r.id === r.id; })) return { errore: "È già sulla scheda." };
    if (r.tipo === "talento" && applicati.some(function(x){ return x.r.id === r.id && (JSON.stringify(x.p.scelte || {}) === JSON.stringify(sc) || !/ripetibile/.test(r.scelteTesto || "")); }))
      return { errore: "Questo talento è già sulla scheda." };
    if (r.gruppo) {
      const g = applicati.filter(function(x){ return x.r.gruppo === r.gruppo && x.r.classe === r.classe; })[0];
      if (g) return { errore: "Hai già scelto per " + (r.classe || "questo gruppo") + ": " + g.r.nome + ". Per cambiare, togli quella scelta." };
      if (applicati.some(function(x){ return x.r.gruppo === r.gruppo && x.r.nome === r.nome; })) return { errore: "Questo stile ce l'hai già." };
    }
    const alt = applicati.filter(function(x){ return x.r.id === r.alternativaDi || x.r.alternativaDi === r.id; })[0];
    if (alt) return { errore: "Si tiene uno solo dei due: c'è già " + alt.r.nome + "." };
    if (o.razziale) {
      if (r.tipo !== "talento") return { errore: "Solo i talenti contano nel bilancio razziale." };
      if (!canEdit) return { errore: "I talenti del bilancio razziale si scelgono alla creazione o in Modifica scheda." };
      if ((ch.privilegi || []).filter(function(p){ return p.razziale; }).length >= talRazziali) return { errore: "Il bilancio razziale dà " + talRazziali + (talRazziali === 1 ? " talento" : " talenti") + ": sono già scelti." };
    }
    let prezzo = null;
    if (o.acquisto) {
      if (!lu) return { errore: "Un talento si compra solo nel passaggio di livello." };
      if (talOra) return { errore: "In questo passaggio di livello hai già comprato un talento." };
      if (talAperte <= 0) return { errore: "Non hai un aumento di caratteristica libero: il talento si compra ai livelli con aumento (P-102)." };
      if (!o.approvato) return { errore: "Serve l'accordo del master (P-102)." };
      prezzo = privPrezzo(r, luCls, sc);
      if (typeof prezzo !== "number") return { errore: "Prezzo non disponibile per " + luCls + "." };
      if (luAvail - luSpent < prezzo) return { errore: "Mancano " + (prezzo - (luAvail - luSpent)) + " punti: l'occasione resta aperta per un prossimo livello." };
    }
    const risolto = {};
    const e = privEffettiRisolti(r, { scelte: sc });
    e.potenzia.forEach(function(x){
      if (e.piuUno.some(function(y){ return y.sk === x.sk; })) return;
      risolto[x.sk] = rankEff(skIdx(x.sk)) >= 1 ? "piuUno" : "rank";   // P-104
    });
    return { mancanti: mancanti, prezzo: prezzo, risolto: risolto };
  };

  /* ── azioni ── */
  const up = function(patch){ setCh(Object.assign({}, ch, patch)); };
  /* I punti competenza non scendono sotto zero (27/11, Alessandro). Alla creazione e nel passaggio di livello ogni modifica
     che toccherebbe il totale (caratteristica abbassata, classe, costo forzato, talento tolto…) si prova prima sulla scheda
     risultante: se i punti restanti andrebbero sotto zero, la modifica non passa. Una scheda vecchia già in negativo
     accetta solo modifiche che non peggiorano. */
  const remOra = lu ? luAvail - luSpent : skPts - mcCost - creationSpent;
  const remDi = function(c2){
    try { const X = useCharacter(c2, function(){}, env); return X.inLU ? X.points.luRem : X.points.creationRem; } catch (e) { return -Infinity; }
  };
  const nelBudget = function(patch){
    if (!inCreation && !lu) return true;
    const r2 = remDi(Object.assign({}, ch, patch));
    return !(r2 < 0 && r2 < remOra);
  };
  const upPunti = function(patch){
    if (!nelBudget(patch)) return { errore: "I punti competenza andrebbero sotto zero: togli prima qualche rank." };
    up(patch); return true;
  };
  const setSk = function(i, patch){ up({ skills: ch.skills.map(function(sk, j){ return j === i ? Object.assign({}, sk, patch) : sk; }) }); };
  const canEdit = inCreation || inMaster;
  const upEq = function(patch){ up({ equipment: Object.assign({}, eq, patch) }); };
  const act = {
    roll: function(label, mod, opts){
      const o = opts || {}, die = o.die || 20;
      if (die !== 20 || (o.count || 1) > 1) return env.rollDamage ? env.rollDamage(label, [{ dice: (o.count || 1) + "d" + die, type: "", flat: mod || 0 }], false) : null;
      return env.roll ? env.roll(label, mod || 0) : null;
    },
    rollDamage: function(label, groups, crit){
      // "8d6 + 4" o "4d6 + 4d6" (incantesimi) → gruppi semplici che il tiratore della scheda sa leggere
      const flat = [];
      (groups || []).forEach(function(g){
        if (/^\s*\d+d\d+\s*$/.test(g.dice) || /^\s*\d+\s*$/.test(g.dice)) { flat.push(g); return; }
        const parts = parseDmgExpr(g.dice, g.type);
        if (parts.length) parts[0].flat += (g.flat || 0);
        parts.forEach(function(p){ flat.push(p); });
      });
      return env.rollDamage ? env.rollDamage(label, flat, !!crit) : null;
    },
    setMode: function(m){ if (env.setMode) env.setMode(MODO_DA_UI[m] || "norm"); },
    damage: function(n){
      n = Math.max(0, n | 0); const temp = ch.hpTemp || 0, t = Math.min(temp, n);
      up({ hpTemp: temp - t, hpDmg: Math.min(hpMax, hpDmg + n - t) });
    },
    heal: function(n){ if (ch.noHeal) return; up({ hpDmg: Math.max(0, hpDmg - Math.max(0, n | 0)) }); },
    setTemp: function(n){ up({ hpTemp: Math.max(0, n | 0) }); },
    rest: function(kind){
      if (kind === "lungo") { const c2 = Object.assign({}, ch, { hpDmg: 0, pmUsed: 0, hpTemp: 0, uses: {} }); delete c2.noHeal; setCh(c2); }
      else if (kind === "breve") { const u = Object.assign({}, ch.uses || {}); usiBrevi.forEach(function(k){ delete u[k]; }); up({ uses: u }); }
    },
    setConc: function(id){ up({ conc: id || null }); },
    toggleCond: function(c){ const l = ch.conds || []; up({ conds: l.indexOf(c) >= 0 ? l.filter(function(x){ return x !== c; }) : l.concat([c]) }); },
    setExhaustion: function(n){ up({ exhaustion: Math.max(0, Math.min(6, n | 0)) }); },
    pin: function(i){ up({ pinned: pinned.indexOf(i) >= 0 ? pinned.filter(function(x){ return x !== i; }) : pinned.concat([i]) }); },
    use: function(key, delta){ const u = Object.assign({}, ch.uses || {}); u[key] = Math.max(0, (u[key] || 0) + delta); up({ uses: u }); },
    usePM: function(delta){ up({ pmUsed: Math.max(0, Math.min(pmInfo.pm, pmUsed + delta)) }); },
    setEquip: function(patch){
      const p = {};
      ["armor", "shield", "coins"].forEach(function(k){ if (patch && patch[k] !== undefined) p[k] = patch[k]; });
      if (p.armor) Object.keys(p.armor).forEach(function(k){ const a = Object.assign({}, p.armor[k]); delete a.rank; p.armor[k] = a; });
      if (p.shield) Object.keys(p.shield).forEach(function(k){ const a = Object.assign({}, p.shield[k]); delete a.rank; p.shield[k] = a; });
      upEq(p);
    },
    setWeapon: function(i, p){
      // in dual-wield la principale è l'arma «in uso» (una sola), la secondaria l'off-hand (una sola), come in CombatTab
      const main = dualWield && p.equipped && !p.offHand, off = dualWield && p.equipped && !!p.offHand;
      upEq({ weapons: (eq.weapons || []).map(function(w, j){
        if (j === i) return Object.assign({}, w, { equipped: !!p.equipped, offHand: off, inUse: main });
        const o = Object.assign({}, w);
        if (main) o.inUse = false;
        if (off) o.offHand = false;
        return o;
      }) });
    },
    setDualWield: function(on){
      upEq({ dualWield: !!on, weapons: (eq.weapons || []).map(function(w){ return on ? w : Object.assign({}, w, { offHand: false }); }) });
    },
    addItem: function(it){ upEq({ items: (eq.items || []).concat([Object.assign({ name: "", desc: "", weight: 0, value: 0, notes: "" }, it)]) }); },
    setItem: function(i, p){ upEq({ items: (eq.items || []).map(function(x, j){ if (j !== i) return x; const n = Object.assign({}, x, p); delete n.i; return n; }) }); },
    removeItem: function(i){ upEq({ items: (eq.items || []).filter(function(x, j){ return j !== i; }) }); },
    endNoHeal: function(){ const c2 = Object.assign({}, ch); delete c2.noHeal; setCh(c2); },
    setNotes: function(t){ up({ notes: String(t || "") }); },
    addModifier: function(m){
      const id = "m" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
      up({ modificatori: (ch.modificatori || []).concat([Object.assign({ id: id, nome: "", fonte: "Talento", valore: 1, bersagli: [], note: "", attivo: true }, m || {}, { id: id })]) });
      return id;
    },
    setModifier: function(id, p){
      /* i modificatori dei privilegi non si modificano: si accendono e spengono solo quelli con una condizione */
      if (String(id).indexOf("pv:") === 0) {
        const parts = String(id).split(":"), uid = parts[1], k = parts[2];
        if (!p || p.attivo === undefined) return;
        up({ privilegi: (ch.privilegi || []).map(function(q){
          if (q.uid !== uid) return q;
          const a = Object.assign({}, q.accesi || {}); if (p.attivo) a[k] = true; else delete a[k];
          return Object.assign({}, q, { accesi: a });
        }) });
        return;
      }
      up({ modificatori: (ch.modificatori || []).map(function(m){ return m.id === id ? Object.assign({}, m, p) : m; }) });
    },
    removeModifier: function(id){ up({ modificatori: (ch.modificatori || []).filter(function(m){ return m.id !== id; }) }); },
    /* Un privilegio o talento dall'archivio, con le sue scelte. Si salvano solo id, scelte e decisioni: gli effetti si ricalcolano.
       opts.acquisto: talento comprato al level-up (prezzo P-103, in addestramento fino al livello dopo, approvato dal master, P-102).
       opts.forza: il master accetta un prerequisito che manca. Restituisce { uid } oppure { errore }. */
    addPrivilegio: function(pid, scelte, opts){
      const r = PRIV_BY_ID[pid]; if (!r) return { errore: "Privilegio sconosciuto." };
      const o = opts || {}, sc = scelte || {};
      const chk = privControllo(r, sc, o);
      if (chk.errore) return chk;
      const uid = "p" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
      const nuovo = { uid: uid, pid: r.id, nome: r.nome, fonte: privFonte(r), classe: r.classe || null, archetipo: r.archetipo || null,
        livello: r.livello || null, gruppo: r.gruppo || null, scelte: sc, risolto: chk.risolto };
      if (chk.mancanti.length) nuovo.forzato = chk.mancanti;
      if (o.acquisto) Object.assign(nuovo, { acquisto: true, prezzo: chk.prezzo, classePrezzo: luCls, livelloPreso: tl + 1, approvato: true });
      if (o.razziale) nuovo.razziale = true;
      up({ privilegi: (ch.privilegi || []).concat([nuovo]) });
      return { uid: uid };
    },
    removePrivilegio: function(uid){
      const u = Object.assign({}, ch.uses || {});
      Object.keys(u).forEach(function(k){ if (k.indexOf("pv:" + uid + ":") === 0) delete u[k]; });
      return upPunti({ privilegi: (ch.privilegi || []).filter(function(p){ return p.uid !== uid; }),
        modificatori: (ch.modificatori || []).filter(function(m){ return m.priv !== uid; }), uses: u });
    },
    clearRolls: function(){ if (env.clearRolls) env.clearRolls(ch.name || "?"); },
    undo: function(){ if (env.undo) env.undo(); },
    redo: function(){ if (env.redo) env.redo(); },
    /* Incantesimi: stessi campi dell'editor completo (level, name, school, castTime, effects, concentration, available, prepared, dbId) */
    addSpell: function(dbId){
      const d = SPELLS_DB.find(function(x){ return x.id === dbId; }); if (!d) return;
      up({ spells: (ch.spells || []).concat([{ level: Number(d.level) || 0, name: d.name, school: d.school, castTime: d.castTime, effects: d.effects || "",
        concentration: !!d.concentration && d.concentration !== "False", available: true, prepared: false, dbId: d.id }]) });
    },
    addCustomSpell: function(o){
      up({ spells: (ch.spells || []).concat([Object.assign({ level: 1, name: "", school: "", castTime: "", effects: "", concentration: false, available: true, prepared: false }, o || {})]) });
    },
    removeSpell: function(key){ const i = +key; up({ spells: (ch.spells || []).filter(function(x, j){ return j !== i; }), conc: ch.conc === String(key) ? null : ch.conc }); },
    setSpell: function(key, p){ const i = +key; up({ spells: (ch.spells || []).map(function(x, j){ return j === i ? Object.assign({}, x, p) : x; }) }); },
    castSpell: function(key, o){
      const s = spells.filter(function(x){ return x.key === key; })[0];
      if (!s) return null;
      const lv = (o && o.level) || s.level;
      const patch = {};
      if (s.conc) patch.conc = s.key;
      if (!lv) { if (s.conc) up(patch); return { outcome: null, toll: 0, pmPaid: 0 }; }
      const paid = Math.min(lv, pmRem);
      const over = overAt(lv);
      if (!over) { patch.pmUsed = pmUsed + paid; up(patch); return { outcome: null, toll: 0, pmPaid: paid }; }
      const mod = schoolMod[s.school] != null ? schoolMod[s.school] : 0;
      const e = env.roll ? env.roll("✦ Sovra-lancio " + s.name + " L" + lv + " (CD " + over.cd + ")", mod) : null;
      if (!e) return null;
      const outcome = esitoSovra(e, over.cd);
      const toll = overcastDamage(lv, outcome);
      const excess = toll - Math.max(0, hpCur);
      patch.pmUsed = pmUsed + paid;
      patch.hpDmg = Math.min(hpMax, hpDmg + toll);
      patch.noHeal = { rounds: lv, spell: s.name, t: Date.now() };
      if (outcome !== "ok") delete patch.conc;   // cilecca: l'incantesimo non parte
      up(patch);
      const what = outcome === "ok" ? (e.chosen === 20 ? "riuscito, 20 nat." : "riuscito") : outcome === "nat1" ? "1 naturale, fa cilecca" : "fallito, fa cilecca";
      const tail = excess >= hpMax ? " — danno in eccesso " + excess + " ≥ PF massimi: morte istantanea" : excess > 0 ? " — a 0 PF" : "";
      if (env.rollDamage) env.rollDamage("☠ Pedaggio " + s.name + " L" + lv + " (" + what + ", −" + paid + " PM, niente cure per " + lv + " round)" + tail, [{ dice: String(toll), type: "Pedaggio", flat: 0 }], false);
      return { outcome: outcome, toll: toll, pmPaid: paid };
    },
    /* Creazione e level-up restano nell'editor completo (la vecchia interfaccia) in questa versione */
    /* Creazione e Master: stessi permessi dell'editor completo (rank solo in creazione; B/M sempre). */
    setRank: function(i, n){
      if (!inCreation) return;
      let v = Math.max(0, Math.min(creationBuyMax(i), (n | 0) - (pvRg[i] || 0)));
      /* la spesa non va in negativo (21/11, Alessandro): si sale solo finché i punti bastano */
      const old = baseRank(i), c = costOf(i, ac), rem = skPts - mcCost - creationSpent;
      while (v > old && calcCost(c, 0, v, isL1) - calcCost(c, 0, old, isL1) > rem) v--;
      setSk(i, { rank: v });
    },
    setSkillBM: function(i, n){ setSk(i, { bs: Math.max(-20, Math.min(20, n | 0)) }); },
    /* nome a mano di una lingua o di uno strumento (o di una competenza aggiunta): alla creazione e in Modifica scheda */
    setSkillName: function(i, t){ if (!canEdit) return; setSk(i, { cn: String(t || "").slice(0, 40) || undefined }); },
    /* caratteristica forzata (ao), solo master */
    setSkillAttr: function(i, a){ if (!canEdit) return; setSk(i, { ao: STATS.indexOf(a) >= 0 ? a : undefined }); },
    /* competenza nuova in una categoria, decisa dal master: nome, categoria, gruppo di affinità (s) o indipendente, caratteristica, costi per classe */
    addSkill: function(d){
      if (!canEdit || !d || !String(d.n || "").trim() || !d.c) return { errore: "Servono nome e categoria." };
      const n = String(d.n).trim();
      if (SDX.some(function(x){ return !x.via && x.n.toLowerCase() === n.toLowerCase(); })) return { errore: "C'è già una competenza con questo nome." };
      const nuova = { n: n, c: d.c, s: d.f === "affine" ? (d.s || "x") : "", f: d.f === "affine" ? "affine" : "sep", a: d.a || "Destrezza", k: Object.assign({}, d.k || {}), nuova: true };
      up({ skExtra: (ch.skExtra || []).concat([nuova]), skills: ch.skills.concat([{ rank: 0, bs: 0, ms: 0 }]) });
      return { i: SDX.length };
    },
    /* madrelingue (P-113): numero da 1 a 3, famiglia di ognuna, famiglie nuove (3 posti ciascuna) */
    setMadreNum: function(n){
      if (!canEdit) return;
      n = Math.max(1, Math.min(3, n | 0));
      let lista = madre.map(function(m){ return { fam: m.fam, i: m.i }; });
      let extra = (ch.skExtra || []).slice(), skills = ch.skills.slice();
      while (lista.length > n) lista.pop();
      while (lista.length < n) { const r = postoLingua(1, lista, extra, skills); extra = r.extra; skills = r.skills; lista.push({ fam: 1, i: r.i }); }
      up({ madrelingue: lista, skExtra: extra, skills: skills });
    },
    setMadreFam: function(k, fam){
      if (!canEdit) return;
      const lista = madre.map(function(m){ return { fam: m.fam, i: m.i }; });
      if (!lista[k]) return;
      const altri = lista.filter(function(x, j){ return j !== k; });
      const r = postoLingua(fam | 0, altri, (ch.skExtra || []).slice(), ch.skills.slice());
      lista[k] = { fam: fam | 0, i: r.i };
      up({ madrelingue: lista, skExtra: r.extra, skills: r.skills });
    },
    addFamigliaLingue: function(){
      if (!canEdit) return;
      const f = (famiglieLingue.length ? Math.max.apply(null, famiglieLingue) : 0) + 1;
      const base = SDX[(lingueSlot[0] || {}).i] || {};
      const nuove = [1, 2, 3].map(function(n){ return { n: "Lingua " + f + "." + n, c: "Comunicazione", s: "Famiglia " + f, f: "affine", a: "Intelligenza", k: Object.assign({}, base.k || {}), nuova: true }; });
      up({ skExtra: (ch.skExtra || []).concat(nuove), skills: ch.skills.concat(nuove.map(function(){ return { rank: 0, bs: 0, ms: 0 }; })) });
      return f;
    },
    removeSkill: function(i){
      if (!canEdit || i < SD.length || !ch.skExtra) return;
      const j = i - SD.length;
      up({ skExtra: ch.skExtra.map(function(x, k){ return k === j ? Object.assign({}, x, { via: true }) : x; }),
        skills: ch.skills.map(function(sk, k){ return k === i ? { rank: 0, bs: 0, ms: 0 } : sk; }) });
    },
    setCostOverride: function(i, v){ if (!canEdit) return; const n = parseInt(v, 10);
      return upPunti({ skills: ch.skills.map(function(sk, j){ return j === i ? Object.assign({}, sk, { costOverride: Number.isInteger(n) && n >= 1 ? Math.min(9, n) : null }) : sk; }) }); },
    setIdentity: function(p){
      if (!canEdit) return;
      const ok = {}; ["name", "pn", "align", "gender", "deity", "age", "height", "weight", "eyes", "hair"].forEach(function(k){ if (p[k] !== undefined) ok[k] = p[k]; });
      up(ok);
    },
    setPortrait: function(url){ up({ portrait: url || null }); },
    setMiniature: function(url){ up({ miniature: url || null }); },
    setRace: function(id){ if (!inCreation) return; const r2 = RACES.find(function(x){ return x.id === id; }) || RACES[0]; return upPunti({ raceId: r2.id, raceChoices: new Array(r2.cc || 0).fill("") }); },
    setRaceChoice: function(i, st){ if (!inCreation) return; const c2 = (ch.raceChoices || []).slice(); c2[i] = st || ""; return upPunti({ raceChoices: c2 }); },
    setClass: function(name){ if (!inCreation) return; return upPunti({ classes: [{ name: name || "", level: name ? 1 : 0 }] }); },
    setStat: function(st, v){
      if (!canEdit) return;
      const ora = (ch.stats && ch.stats[st]) || 8;
      let n = inCreation ? Math.max(8, Math.min(15, v | 0)) : Math.max(1, Math.min(30, v | 0));
      const con = function(x){ const s2 = Object.assign({}, ch.stats); s2[st] = x; return { stats: s2 }; };
      /* abbassando, si scende solo finché i punti già spesi restano coperti */
      while (n < ora && !nelBudget(con(n))) n++;
      if (n !== ora) up(con(n));
      return n;
    },
    setAttr: function(p){ if (!canEdit) return; const o = {}; if (p.ma) o.ma = p.ma; if (p.ga) o.ga = p.ga; up(o); },
    confirmCreation: function(){
      if (!inCreation || creationErrors.length) return false;
      const cl = ch.classes.slice(); cl[0] = Object.assign({}, cl[0], { level: 1 });
      up({ classes: cl, locked: true, creationDone: true, savedPoints: Math.max(0, skPts - mcCost - creationSpent) });
      return true;
    },
    /* Modalità Master: sblocca la scheda creata; alla chiusura resta una riga di traccia in ch.masterLog. */
    setMaster: function(on){
      if (!ch.creationDone || lu) return;
      const log = (ch.masterLog || []).slice(-49);
      log.push({ t: Date.now(), azione: on ? "aperta" : "chiusa" });
      up({ locked: !on, masterLog: log });
    },
    /* Armi: catalogo, proprietà speciali, codice da condividere (ARMA1§…) */
    addWeapon: function(id){ if (!WEAPONS_DB.find(function(d){ return d.id === id; })) return; upEq({ weapons: (eq.weapons || []).concat([{ id: id, qty: 1, equipped: false }]) }); },
    removeWeapon: function(i){ upEq({ weapons: (eq.weapons || []).filter(function(w, j){ return j !== i; }) }); },
    setWeaponProps: function(i, p){
      upEq({ weapons: (eq.weapons || []).map(function(w, j){
        if (j !== i) return w;
        const n = Object.assign({}, w);
        if (p.special !== undefined) n.special = p.special;
        if (p.name !== undefined) n.name = p.name;
        if (p.qty !== undefined) n.qty = Math.max(1, p.qty | 0);
        return n;
      }) });
    },
    pasteWeaponCode: function(txt){ const w = decodeWeaponCode(txt); if (!w) return false; upEq({ weapons: (eq.weapons || []).concat([w]) }); return true; },
    setArmor: function(kind, p){ const a = Object.assign({}, eq.armor || {}); a[kind] = Object.assign({}, a[kind], p); upEq({ armor: a }); },
    setShield: function(kind, p){ const a = Object.assign({}, eq.shield || {}); a[kind] = Object.assign({}, a[kind], p); upEq({ shield: a }); },
    addGem: function(g){ upEq({ gems: (eq.gems || []).concat([Object.assign({ name: "", qty: 1, unitValue: 0 }, g || {})]) }); },
    setGem: function(i, p){ upEq({ gems: (eq.gems || []).map(function(g, j){ return j === i ? Object.assign({}, g, p) : g; }) }); },
    removeGem: function(i){ upEq({ gems: (eq.gems || []).filter(function(g, j){ return j !== i; }) }); },
    exportJSON: function(){
      const json = JSON.stringify(ch, null, 2);
      try {
        const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
        const a = document.createElement("a"); a.href = url; a.download = (ch.name || "scheda") + ".json";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        setTimeout(function(){ URL.revokeObjectURL(url); }, 100);
        return true;
      } catch (e) { return false; }
    },
    /* Passaggio di livello nella nuova interfaccia: stessi dati dell'editor completo (ch.lvlUp {cls, isNew, nr}) */
    /* All'inizio si fotografano punteggi, bonus e PF bonus: «Annulla» li riporta com'erano (l'editor completo non lo faceva). */
    startLU: function(){ up({ locked: false, lvlUp: { cls: ac, isNew: false, nr: SDX.map(function(){ return 0; }),
      snap: { stats: Object.assign({}, ch.stats), bm: Object.assign({}, ch.bm || {}), hpBonus: ch.hpBonus || 0,
        bs: ch.skills.map(function(sk){ return (sk && sk.bs) || 0; }),
        modificatori: (ch.modificatori || []).slice(), privilegi: (ch.privilegi || []).slice() } } }); },
    /* Nel passaggio di livello, come nell'editor completo: aumenti di caratteristica sul punteggio, bonus e malus al modificatore,
       PF bonus (talenti), bonus fissi alle competenze (per esempio Stile di combattimento: Tiro, +2 alle armi da tiro). */
    /* Aumento di caratteristica (PHB 2014, P-01): solo ai livelli con aumento della classe che sale (asiLivelli),
       +2 in tutto (+2 a una o +1 a due), punteggio massimo 20. v è il punteggio mostrato, che comprende i +1 dei talenti. */
    setLUStat: function(st, v){
      if (!lu) return;
      const snap = (lu.snap && lu.snap.stats) || {};
      const min = snap[st] || (ch.stats && ch.stats[st]) || 8;
      const tal = scoreOf(st) - ((ch.stats && ch.stats[st]) || 8);
      let base = (v | 0) - tal;
      const altri = STATS.reduce(function(a, x){ return x === st ? a : a + Math.max(0, ((ch.stats && ch.stats[x]) || 8) - (snap[x] || (ch.stats && ch.stats[x]) || 8)); }, 0);
      const tetto = asiQui ? 2 - altri : 0;
      base = Math.max(min, Math.min(min + Math.max(0, tetto), Math.max(min, Math.min(20, base))));
      const ora = (ch.stats && ch.stats[st]) || 8;
      const con = function(x){ const s2 = Object.assign({}, ch.stats); s2[st] = x; return { stats: s2 }; };
      while (base < ora && !nelBudget(con(base))) base++;
      if (base !== ora) up(con(base));
    },
    setStatBonus: function(st, n){ if (!lu && !canEdit) return; const b = Object.assign({}, ch.bm || {}); b[st] = Math.max(-10, Math.min(10, n | 0)); up({ bm: b }); },
    setHpBonus: function(n){ if (!lu && !canEdit) return; up({ hpBonus: Math.max(-99, Math.min(999, n | 0)) }); },
    setSkillBonus: function(i, n){
      if (!lu) return;
      up({ skills: ch.skills.map(function(sk, j){ return j === i ? Object.assign({}, sk, { bs: Math.max(-10, Math.min(10, n | 0)) }) : sk; }) });
    },
    setLUClass: function(cls){ if (!lu) return; return upPunti({ lvlUp: Object.assign({}, lu, { cls: cls, isNew: !ch.classes.some(function(c){ return c.name === cls; }) }) }); },
    setLURank: function(i, v){
      if (!lu) return;
      const b = baseRank(i), nr = lu.nr.slice();
      const g = pvRg[i] || 0;
      let n = Math.max(0, Math.min(luMaxOf(b + g) - g, (v | 0) - g) - b);
      /* la spesa non va in negativo: si sale solo finché i punti del livello bastano */
      const c = costOf(i, luCls), prima = lu.nr[i] || 0, rem = luAvail - luSpent;
      while (n > prima && calcCost(c, b + g, n, false) - calcCost(c, b + g, prima, false) > rem) n--;
      nr[i] = n;
      up({ lvlUp: Object.assign({}, lu, { nr: nr }) });
    },
    applyLU: function(){
      if (!lu || luAvail - luSpent < 0) return;
      const newCl = ch.classes.slice();
      const ei = newCl.findIndex(function(c){ return c.name === luCls; });
      if (ei >= 0) newCl[ei] = Object.assign({}, newCl[ei], { level: (newCl[ei].level || 0) + 1 });
      else newCl.push({ name: luCls, level: 1 });
      up({ skills: ch.skills.map(function(sk, i){ const n = lu.nr[i] || 0; return n ? Object.assign({}, sk, { rank: baseRank(i) + n }) : sk; }), classes: newCl, savedPoints: luAvail - luSpent, lvlUp: null, locked: true, creationDone: true });
    },
    cancelLU: function(){
      const sn = lu && lu.snap;
      if (!sn) { up({ lvlUp: null, locked: true }); return; }
      const rip = { lvlUp: null, locked: true, stats: sn.stats, bm: sn.bm, hpBonus: sn.hpBonus,
        skills: ch.skills.map(function(sk, j){ return Object.assign({}, sk, { bs: sn.bs[j] || 0 }); }) };
      if (sn.modificatori) { rip.modificatori = sn.modificatori; rip.privilegi = sn.privilegi || []; }
      up(rip);
    }
  };

  return {
    ch: ch, tl: tl, version: APP_VERSION, portrait: ch.portrait || null, miniature: ch.miniature || null,
    classes: ch.classes.filter(function(c){ return c && c.name; }).map(function(c){ return { name: c.name, level: c.level || 0, sub: c.sub || null, hd: HD[c.name] || 8 }; }),
    race: race, locked: !!ch.locked, inLU: !!lu, creationDone: !!ch.creationDone,
    lu: lu ? { cls: luCls, isNew: !!lu.isNew, statMin: (lu.snap && lu.snap.stats) || null, hpBonus: ch.hpBonus || 0, options: ch.classes.filter(function(c){ return c && c.name; }).map(function(c){ return { name: c.name, level: c.level || 0, isNew: false }; })
      .concat(CLASSES.filter(function(n){ return !ch.classes.some(function(c){ return c.name === n; }); }).map(function(n){ return { name: n, level: 0, isNew: true }; })) } : null,
    stats: stats, mods: statMods,
    ca: { total: caTotal, dexCA: dexCA, dexCap: eqDexCap, shieldPen: eqShPen, parts: caParts,
      testo: caParts.map(function(x){ return (x.v < 0 ? "− " + (-x.v) : "+ " + x.v) + " " + x.t; }).join(" ").replace(/^\+ /, "") },
    init: (statMods.Destrezza || 0) + modSum("init"),
    speed: { base: velBase, final: velFinal, overload: velOverload },
    hp: { max: hpMax, cur: hpCur, temp: ch.hpTemp || 0, pct: hpMax > 0 ? Math.round(hpCur / hpMax * 100) : 100, dmg: hpDmg },
    skills: skills, cats: cats,
    lingue: { madre: madre.map(function(m, k){ const sk = ch.skills[m.i] || {}; return { k: k, fam: m.fam, i: m.i, base: SDX[m.i].n, nome: sk.cn || "" }; }),
      famiglie: famiglieLingue, modificabile: canEdit },
    /* per il modulo «Nuova competenza»: gruppi di affinità e competenze della categoria (da cui copiare i costi) */
    skCategoria: function(c){
      const xs = SDX.map(function(x, i){ return { i: i, n: (ch.skills[i] && ch.skills[i].cn) || x.n, s: x.s, f: x.f, a: x.a, k: x.k, via: x.via }; }).filter(function(x){ return !x.via && SDX[x.i].c === c; });
      const gruppi = [];
      xs.forEach(function(x){ if (x.f === "affine" && !gruppi.some(function(g){ return g.s === x.s; })) gruppi.push({ s: x.s, esempio: xs.filter(function(y){ return y.s === x.s && y.f === "affine"; }).map(function(y){ return y.n; }).slice(0, 3).join(", ") }); });
      return { competenze: xs, gruppi: gruppi };
    },
    points: { creationAvail: skPts - mcCost, creationSpent: creationSpent, creationRem: skPts - mcCost - creationSpent, luAvail: luAvail, luSpent: luSpent, luRem: luAvail - luSpent },
    pm: { max: pmInfo.pm, rem: pmRem, soglia: soglia, perClass: pmInfo.per.filter(function(p){ return p.pm > 0; }).map(function(p){ return { cls: p.name, pm: p.pm, soglia: p.soglia }; }), pact: null },
    spells: spells, weapons: weapons, maneuvers: maneuvers, features: features,
    equip: equip, condList: CONDIZIONI_SRD,
    conc: conc, conds: ch.conds || [], exhaustion: ch.exhaustion || 0, pinned: pinned, uses: ch.uses || {},
    noHeal: ch.noHeal || null, notes: ch.notes || "",
    inCreation: inCreation, master: inMaster,
    privilegi: (ch.privilegi || []).map(function(p){
      const r = PRIV_BY_ID[p.pid];
      const att = privAttesa.some(function(x){ return x.p.uid === p.uid; });
      const sc = p.scelte || {};
      const scelteTesto = r ? r.scelte.map(function(x){
        const v = privValori(sc, x.chiave); if (!v.length) return null;
        return v.map(function(y){ const db = SPELLS_BY_ID[y]; const st = PRIV_BY_ID[y]; return db ? db.name : st ? st.nome.replace(/^Stile di combattimento: /, "") : String(y); }).join(", ");
      }).filter(Boolean).join(" · ") : "";
      return Object.assign({}, p, { nome: r ? r.nome : p.nome, noto: !!r, tipo: r ? r.tipo : null,
        effetti: r ? privEffettiTesto(r) : "", condizione: r ? r.condizione || "" : p.condizione || "", nota: r ? r.nota || "" : p.note || "",
        scelteTesto: scelteTesto, inAddestramento: att, attivoDal: att ? p.livelloPreso + 1 : null, cf: r ? r.cf || null : null,
        mods: pvMods.filter(function(m){ return m.priv === p.uid; }).length + (ch.modificatori || []).filter(function(m){ return m.priv === p.uid && !privNoto(p.uid); }).length,
        usi: features.filter(function(f){ return f.priv === p.uid; }).length });
    }),
    privCatalogo: PRIVILEGI.map(function(r){
      const cl = r.classe ? ch.classes.find(function(c){ return c && c.name === r.classe; }) : null;
      const pz = r.tipo === "talento" ? privPrezzo(r, lu ? luCls : ac, {}) : null;
      return { id: r.id, nome: r.nome, classe: r.classe || null, archetipo: r.archetipo || null, livello: r.livello || null, tipo: r.tipo,
        gruppo: r.gruppo || null, fonte: privFonte(r), rif: r.fonte || "", url: r.url || "", stato: r.stato || "", condizione: r.condizione || "", nota: r.nota || "",
        effetti: privEffettiTesto(r), requisiti: r.requisiti && r.requisiti !== "—" ? r.requisiti : "", scelteTesto: r.scelteTesto && r.scelteTesto !== "—" ? r.scelteTesto : "",
        haScelte: r.scelte.length > 0, alternativaDi: r.alternativaDi || null, cf: r.cf || null,
        prezzo: typeof pz === "number" ? pz : null, prezzoDa: pz && typeof pz === "object" ? pz : null,
        mancanti: privPrerequisitiMancanti(r, prereqCtx, {}),
        applicato: applicati.some(function(x){ return x.r.id === r.id || (r.gruppo && x.r.gruppo === r.gruppo && x.r.classe === r.classe && x.r.nome === r.nome); }),
        tuo: r.tipo === "talento" ? true : !!(cl && (cl.level || 0) >= (r.livello || 1) && (!r.archetipo || cl.sub === r.archetipo)) };
    }),
    privLivello: lu ? (function(){
      const c = ch.classes.find(function(x){ return x && x.name === luCls; });
      const sub = c ? c.sub || null : null;
      return { classe: luCls, livello: luNuovoLiv, ids: PRIVILEGI.filter(function(r){ return r.tipo !== "talento" && r.classe === luCls && r.livello === luNuovoLiv && (!r.archetipo || r.archetipo === sub); }).map(function(r){ return r.id; }) };
    })() : null,
    /* scelte di un privilegio: le opzioni dipendono da quelle già fatte (es. la lista di Iniziato alla Magia) */
    privScelte: function(pid, sc){
      const r = PRIV_BY_ID[pid]; if (!r) return [];
      const ctx = Object.assign({}, privCtxBase, { scelte: sc || {} });
      return privScelteDaFare(r, sc || {}, ctx).map(function(x){
        return { chiave: x.chiave, tipo: x.tipo, numero: x.numero || 1, ripiego: !!x.seGiaPosseduta, opzioni: privOpzioni(x, ctx), completa: privSceltaCompleta(x, sc || {}),
          etichetta: x.seGiaPosseduta ? "Ce l'hai già regalata o scontata: scegli un'altra competenza" : x.tipo === "car" ? "Caratteristica" : x.tipo === "lingua" ? "Lingua" : x.tipo === "incantesimo" ? "Incantesimo" : x.tipo === "competenza" ? "Competenza" : "Opzione" };
      });
    },
    privVerifica: function(pid, sc, o){ const r = PRIV_BY_ID[pid]; return r ? privControllo(r, sc || {}, o) : { errore: "Privilegio sconosciuto." }; },
    privPrezzo: function(pid, sc){ const r = PRIV_BY_ID[pid]; return r ? privPrezzo(r, lu ? luCls : ac, sc || {}) : null; },
    bilancio: { valore: bilancio, talenti: talRazziali, presi: (ch.privilegi || []).filter(function(p){ return p.razziale; }).length, modificabile: canEdit },
    luAumento: lu ? { possibile: !!asiQui, usati: STATS.reduce(function(a, x){ const sn = (lu.snap && lu.snap.stats) || {}; return a + Math.max(0, ((ch.stats && ch.stats[x]) || 8) - (sn[x] || (ch.stats && ch.stats[x]) || 8)); }, 0), max: 2, livello: luNuovoLiv, classe: luCls } : null,
    talenti: { aperte: talAperte, possibile: !!lu && !talOra && talAperte > 0, qui: !!asiQui, compratoOra: talOra ? talOra.uid : null, livelli: asiLivelli(lu ? luCls : ac) },
    privDati: PRIV_FONTE_DATI,
    privErrori: PRIV_ERRORI.slice(),
    modifiers: (ch.modificatori || []).filter(function(m){ return !(m.priv && privNoto(m.priv)); }).concat(pvMods).map(function(m){
      const vt = typeof m.valore === "string" ? "+" + m.valore.replace(/^mod:/, "") + (m.minimo != null ? " (min " + m.minimo + ")" : "") : null;
      return Object.assign({}, m, { bersagliNomi: (m.bersagli || []).map(modBersaglioNome), valoreTesto: vt, valoreCalc: modVal(m) });
    }),
    modTargets: MOD_BASE.concat(STATS.map(function(st){ return ["car:" + st, "Mod. " + st]; })), modSources: MOD_FONTI,
    pointBuy: { spent: pbSpent, max: 27, rem: 27 - pbSpent, cost: pointBuyCost },
    creation: inCreation ? { errors: creationErrors, ok: !creationErrors.length, maxRank: creationMax } : null,
    races: RACES, classList: CLASSES, statNames: STATS, magicStat: MS[ac] || null, ma: ch.ma || "Forza", ga: ch.ga || "Carisma",
    weaponCatalog: WEAPONS_DB, spellCatalog: SPELLS_DB, weaponCode: function(i){ return encodeWeaponCode((eq.weapons || [])[i] || {}); },
    gems: (eq.gems || []).map(function(g, i){ return Object.assign({ i: i }, g); }),
    roll: { mode: MODO_A_UI[env.mode] || "normale", history: history },
    can: { rank: inCreation, identity: inCreation || inMaster, stats: inCreation || inMaster, race: inCreation, classes: inCreation, costOverride: inCreation || inMaster, bm: true, bonus: !!lu, equip: true, undo: !!env.canUndo, redo: !!env.canRedo, shortRest: usiBrevi.length > 0 },
    act: act
  };
}

/* Monta la nuova interfaccia per il personaggio attivo (chiamato da Dashboard dietro l'interruttore). */
function NuovaUIHost({ ch, setCh, env, onClassica }) {
  const C = useCharacter(ch, setCh, Object.assign({}, env, { toClassic: onClassica }));
  const onBug = function(info){
    try {
      const B = window.__BUG__; if (!B) return;
      B.ctx = { tab: "nuova interfaccia · " + ((info && info.schermata) || "?"), char: ch.name || "(senza nome)",
        classes: C.classes.map(function(c){ return c.name + " " + c.level; }).join(", ") || "—" };
      if (B.openPanel) B.openPanel();
    } catch (e) {}
  };
  return <div className="gx-host"><NuovaUI C={C} onClassica={onClassica} onBug={onBug} /></div>;
}

/* ══════════════════════════════════════════════════════════════════════════
 * Cornice della nuova grafica attorno alla scheda (barra campagna, tab dei PG, pagina iniziale)
 * Il tema è quello scelto nel Menu della nuova interfaccia (ui_aspetto_v1): i token di colore e
 * carattere si prendono da GX_CSS di MOBILE e si riscrivono sulla radice .gx-dash, così restano allineati.
 * ══════════════════════════════════════════════════════════════════════════ */
const GX_DASH_VARS = (function(){
  try {
    const css = String(GX_CSS).replace(/\/\*[\s\S]*?\*\//g, "");
    const out = [], re = /([^{}]+)\{([^{}]*)\}/g;
    let m;
    while ((m = re.exec(css))) {
      const sel = m[1].trim();
      if (!/^\.gx(\[[^\]]*\])*$/.test(sel)) continue;
      const decl = m[2].split(";").map(function(d){ return d.trim(); }).filter(function(d){ return /^(--|color-scheme)/.test(d); });
      if (decl.length) out.push(".gx-dash" + sel.slice(3) + "{" + decl.join(";") + "}");
    }
    return out.join("\n");
  } catch (e) { return ""; }
})();

const GX_DASH_CSS = `
.gx-dash{height:100vh;height:100dvh;display:flex;flex-direction:column;overflow:hidden;background:var(--bg);color:var(--ink);font-family:var(--font-ui)}
.gx-dash > *{flex:none}
.gx-dash > .gx-host{flex:1 1 auto;min-height:0;position:relative;overflow:hidden}
.gx-dash > .gx-host > .gx{height:100%}
body:has(.gx-dash){padding-bottom:0 !important;background:var(--bg)}
.gx-dash .dash-bar{position:relative;background:var(--s1);border-bottom:1px solid var(--line);color:var(--ink);font-family:var(--font-ui);padding:8px 12px;gap:8px}
.gx-dash .dash-bar .lbl{font-family:var(--font-label);color:var(--muted);letter-spacing:var(--label-ls);text-transform:var(--label-tt);font-size:12px;font-weight:600}
.gx-dash .dash-bar .dash-ver{font-family:var(--font-label);color:var(--acc);border-color:var(--acc);font-size:12px;letter-spacing:.5px}
.gx-dash .dash-bar select.camp{height:34px;background:var(--s2);border:1px solid var(--line);color:var(--ink);font-family:var(--font-ui);font-size:14px;letter-spacing:0;border-radius:calc(var(--radius) - 2px)}
.gx-dash .dash-bar select.camp:hover{border-color:var(--acc);color:var(--ink);background:var(--s2)}
.gx-dash .dash-bar .dbtn{height:34px;min-width:34px;padding:0 10px;background:transparent;border:1px solid var(--line);color:var(--ink);font-family:var(--font-ui);font-size:13px;letter-spacing:0;border-radius:calc(var(--radius) - 2px)}
.gx-dash .dash-bar .dbtn:hover{background:var(--s2);color:var(--ink)}
.gx-dash .dash-bar .dbtn.danger{border-color:var(--line);color:var(--bad)}
.gx-dash .dash-bar .dbtn.danger:hover{background:var(--s2)}
.gx-dash .dash-bar .ui-switch{border-color:var(--acc);color:var(--acc);font-weight:600}
.gx-dash .dash-bar .ui-switch.on{background:transparent;color:var(--acc)}
.gx-dash .dash-bar .status{background:var(--s2);font-family:var(--font-ui);font-size:12px;border-radius:calc(var(--radius) - 2px)}
.gx-dash .pg-tabs{background:var(--bg);border-bottom:1px solid var(--line);padding:8px 12px;gap:6px;align-items:center;flex-wrap:nowrap;overflow-x:auto;font-family:var(--font-ui);scrollbar-width:none}
.gx-dash .pg-tabs::-webkit-scrollbar{display:none}
.gx-dash .pg-tab{flex:none;margin:0;padding:6px 12px;border:1px solid var(--line);border-radius:calc(var(--radius) + 8px);background:var(--s1);color:var(--ink);font-size:13px}
.gx-dash .pg-tab .pg-name{color:var(--ink);font-weight:600;letter-spacing:0;font-style:var(--name-style)}
.gx-dash .pg-tab .pg-sub{color:var(--muted);font-family:var(--font-label);letter-spacing:var(--label-ls);font-size:10px}
.gx-dash .pg-tab:hover{background:var(--s2);color:var(--ink)}
.gx-dash .pg-tab:hover .pg-name{color:var(--ink)}
.gx-dash .pg-tab.act{background:var(--acc);border-color:var(--acc);border-bottom:1px solid var(--acc);padding-bottom:6px}
.gx-dash .pg-tab.act .pg-name,.gx-dash .pg-tab.act .pg-sub{color:var(--on-acc)}
.gx-dash .pg-tab.add,.gx-dash .pg-tab.del{background:transparent;font-family:var(--font-ui);font-size:13px;letter-spacing:0;padding:6px 12px;align-self:auto}
.gx-dash .pg-tab.add{color:var(--acc);border-style:dashed}
.gx-dash .pg-tab.add:hover{background:var(--s2);color:var(--acc);border-color:var(--acc)}
.gx-dash .pg-tab.del{color:var(--bad)}
.gx-dash .pg-tab.del:hover{background:var(--s2);color:var(--bad);border-color:var(--bad)}
.gx-dash .dash-msg{font-family:var(--font-ui);background:var(--s1);color:var(--ink);border-bottom:1px solid var(--line)}
.gx-dash .dash-msg.ok{color:var(--good)} .gx-dash .dash-msg.warn{color:var(--acc)} .gx-dash .dash-msg.info{color:var(--mana)} .gx-dash .dash-msg.err{color:var(--bad)}
.gx-dash .dash-settings,.gx-dash .dash-migrate{background:var(--s1);border:1px solid var(--line);color:var(--ink);font-family:var(--font-ui);border-radius:var(--radius)}
.gx-dash .dash-settings h3,.gx-dash .dash-migrate strong{font-family:var(--font-label);color:var(--acc);border-color:var(--line)}
.gx-dash .dash-settings .info,.gx-dash .dash-migrate ul{color:var(--muted)}
.gx-dash .dash-settings .dbtn,.gx-dash .dash-migrate .dbtn{background:transparent;border:1px solid var(--line);color:var(--ink);font-family:var(--font-ui);font-size:13px;letter-spacing:0;border-radius:calc(var(--radius) - 2px)}
.gx-dash .dash-settings .dbtn.primary,.gx-dash .dash-migrate .dbtn.primary{background:var(--acc);border-color:var(--acc);color:var(--on-acc)}
.gx-dash .dash-settings .dbtn.danger{color:var(--bad)}
.gx-inizio{flex:1;overflow-y:auto;display:flex;flex-direction:column;align-items:center;gap:16px;padding:32px 16px}
.gx-inizio .gx-card{max-width:560px;width:100%;padding:24px;display:flex;flex-direction:column;gap:14px}
.gx-inizio h2{margin:0;font-family:var(--font-label);letter-spacing:var(--label-ls);text-transform:var(--label-tt);color:var(--acc);font-size:20px}
.gx-inizio p{margin:0;line-height:1.5}
.gx-inizio .gx-nota{color:var(--muted);font-size:13px;line-height:1.5;border-top:1px solid var(--line);padding-top:12px}
.gx-inizio .gx-azioni{display:flex;flex-direction:column;gap:8px}
@media (min-width:600px){ .gx-inizio .gx-azioni{flex-direction:row} .gx-inizio .gx-azioni .gx-btn{flex:1} }
.gx-host > .gx[data-form=tel]{max-width:440px;margin:0 auto;border-left:1px solid var(--line);border-right:1px solid var(--line)}
body:has(.gx-host .gx-scroll) .bugrep-fab{display:none}
@media (max-width:767px){
  body:has(.gx-inizio) .bugrep-fab{display:none}
  .gx-dash .pg-tab.del{display:none}
  .gx-dash .pg-tabs{padding:6px 8px}
  .gx-dash .pg-tab{padding:4px 10px}
  .gx-dash .dash-bar{flex-wrap:nowrap;padding:6px 8px;gap:6px}
  .gx-dash .dash-bar .dash-ver,.gx-dash .dash-bar .lbl,.gx-dash .dash-bar .dbtn:not(.ui-switch):not(.dash-gear),.gx-dash .dash-bar .status,.gx-dash .dash-bar .spacer{display:none}
  .gx-dash .dash-bar select.camp{flex:1;min-width:0}
}
@media print{ .gx-dash{height:auto!important;overflow:visible!important;display:block!important} .gx-dash .pg-tabs,.gx-dash .dash-msg{display:none!important} }
`;

/* Tema condiviso tra la cornice e NuovaUI: si rilegge quando il Menu lo cambia (evento gx-aspetto). */
function useAspettoCondiviso() {
  const leggi = function(){ try { const p = JSON.parse(localStorage.getItem("ui_aspetto_v1") || "null"); if (p && p.theme) return p; } catch (e) {} return { theme: "str", v: "dark" }; };
  const [a, setA] = useState(leggi);
  const light = useGxMedia("(prefers-color-scheme: light)");
  useEffect(function(){
    const f = function(){ setA(leggi()); };
    window.addEventListener("gx-aspetto", f); window.addEventListener("storage", f);
    return function(){ window.removeEventListener("gx-aspetto", f); window.removeEventListener("storage", f); };
  }, []);
  return { theme: a.theme, eff: a.v === "auto" ? (light ? "light" : "dark") : a.v };
}

/* Pagina iniziale senza personaggi: le azioni per caricare le schede e la scelta dell'aspetto. */
function NuovaUIInizio({ fsa, onCartella, onImporta, onVuota, onBug }) {
  const asp = useAspetto();
  return <div className="gx-host"><div className="gx" data-theme={asp.theme} data-var={asp.eff}>
    <style>{GX_CSS}</style>
    <div className="gx-inizio"><div className="gx-card">
      <h2>Inizia</h2>
      {fsa
        ? <p>Scegli una <b>cartella di lavoro</b>: la scheda salva da sola ogni personaggio come file JSON, che puoi copiare, condividere o aprire con un editor di testo.</p>
        : <p>Carica i file JSON dei tuoi personaggi, oppure creane uno nuovo.</p>}
      <div className="gx-azioni">
        {fsa ? <Btn kind="pri" onClick={onCartella}>Scegli cartella</Btn> : null}
        <Btn kind={fsa ? "q" : "pri"} onClick={onImporta}>Importa schede</Btn>
        <Btn kind="q" onClick={onVuota}>Crea vuota</Btn>
      </div>
      <p className="gx-nota">{fsa
        ? "Senza cartella i dati restano solo in questo browser. La cartella è la strada sicura: i file su disco non si perdono se svuoti il browser."
        : "Questo browser non salva da solo su file (serve Chrome o Edge su computer): le schede restano nel browser, ricordati di esportarle ogni tanto."}
        {" Con «Crea vuota» si apre la creazione guidata in 6 passi."}</p>
      {onBug ? <button className="gx-lab" style={{ textAlign: "left", textTransform: "none", textDecoration: "underline" }} onClick={onBug}>{"\ud83d\udc1e"} Segnala un problema</button> : null}
    </div>
    <div className="gx-card">
      <h2>Aspetto</h2>
      <SceltaAspetto aspetto={asp} />
    </div></div>
  </div></div>;
}
