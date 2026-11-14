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

function useCharacter(ch, setCh, env) {
  const eq = ch.equipment || {};
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
  const itemStats = {}, itemSkills = {};
  (eq.items || []).forEach(function(it){
    const active = it.equipped && (!it.requiresAttunement || it.attuned);
    if (!active) return;
    if (it.statMods) Object.keys(it.statMods).forEach(function(k){ if (it.statMods[k]) itemStats[k] = (itemStats[k] || 0) + it.statMods[k]; });
    if (it.skillMods) Object.keys(it.skillMods).forEach(function(k){ if (it.skillMods[k]) itemSkills[k] = (itemSkills[k] || 0) + it.skillMods[k]; });
  });
  const bm = ch.bm || {};
  const statMods = {}, stats = {};
  STATS.forEach(function(st){
    const score = (ch.stats && ch.stats[st]) || 8;
    statMods[st] = gm(score) + (rb[st] || 0) + (bm[st] || 0) + (itemStats[st] || 0);
    stats[st] = { score: score, mod: statMods[st], base: score, racial: rb[st] || 0, bonus: bm[st] || 0, item: itemStats[st] || 0 };
  });
  const autoGA = (function(){ const c = ch.classes.find(function(c2){ return MS[c2.name]; }); return c ? MS[c.name] : ch.ga; })();

  /* ── difesa e movimento (P-09, P-78, P-79, P-80) ── */
  const eqDexCap = calcDexCap(eq, ch.skills);
  const eqShPen = shieldDexPen(eq);
  const dexCA = Math.min(statMods.Destrezza || 0, eqDexCap) + eqShPen;
  const caTotal = calcCA(eq, dexCA);
  const velBase = calcVel(race.speed || 9, ch.height || 170, dexCA, statMods.Forza || 0) + (race.speedAdd || 0);
  const loadTot = equipWeight(eq);
  const loadMax = ((ch.stats && ch.stats.Forza) || 8) * 7.5;
  const velOverload = loadTot > loadMax;
  const velFinal = velOverload ? Math.floor(velBase) / 2 : velBase;

  /* ── punti ferita ── */
  const hpMax = calcHP(ch.classes, statMods.Costituzione, ch.hpBonus || 0);
  const hpDmg = ch.hpDmg || 0;
  const hpCur = hpMax - hpDmg;

  /* ── competenze ── */
  const comp0 = computeAll(ch.skills, statMods, ch.ma, autoGA);
  const comp = Object.keys(itemSkills).length ? comp0.map(function(s, i){
    const add = itemSkills[i] || itemSkills[String(i)] || 0;
    return add ? Object.assign({}, s, { tot: s.tot + add, im: add }) : s;
  }) : comp0;
  const pinned = ch.pinned || [];
  const skills = [], cats = [];
  let curCat = null;
  comp.forEach(function(sk, i){
    if (!sk || !sk.name || sk.name === "?") return;
    const cost = getSkillCost(ch.skills[i], SD[i], ac);
    skills.push({ i: i, name: sk.name, cat: sk.cat, attr: SS[sk.attr] || sk.attr || "", rank: sk.rank || 0, tot: sk.tot,
      bonus: (ch.skills[i] && ch.skills[i].bonus) || 0, cost: cost, sep: sk.aff === "sep", aff: sk.aff, pinned: pinned.indexOf(i) >= 0,
      luMin: sk.rank || 0, luMax: 24 });
    if (!curCat || curCat.name !== sk.cat) { curCat = { name: sk.cat, items: [] }; cats.push(curCat); }
    curCat.items.push(i);
  });
  const statSum = STATS.reduce(function(s, st){ return s + ((ch.stats && ch.stats[st]) || 8); }, 0);
  const skPts = Math.ceil(statSum * (isL1 ? 1.5 : 1));
  const mcCost = Math.max(0, ch.classes.filter(function(c){ return c.name && c.level > 0; }).length - 1) * 48;
  let creationSpent = 0;
  comp0.forEach(function(sk, i){ creationSpent += calcCost(getSkillCost(ch.skills[i], SD[i], ac), 0, sk.rank, isL1); });

  /* ── magia ── */
  const pmInfo = pmSoglia(ch.classes);
  const pmUsed = ch.pmUsed || 0;
  const pmRem = Math.max(0, pmInfo.pm - pmUsed);
  const soglia = pmInfo.soglia;
  const schoolMod = {};
  SD.forEach(function(sd, i){ if (sd.c === "Incantesimi" && comp[i]) schoolMod[sd.n] = comp[i].tot; });
  const overAt = function(lv){
    if (!lv) return null;
    const dry = pmRem < lv;
    if (!(lv > soglia || dry)) return null;
    return { cd: overcastCD(lv, soglia, dry), dry: dry,
      toll: { ok: overcastDamage(lv, "ok"), fail: overcastDamage(lv, "fail"), nat1: overcastDamage(lv, "nat1") } };
  };
  const spells = [];
  (ch.spells || []).forEach(function(sp, idx){
    const db = resolveSpellDb(sp);
    const level = db ? (db.level || 0) : (sp.level || 0);
    const school = (db && db.school) || sp.school || "";
    const m = schoolMod[school];
    const levels = [];
    if (level > 0) for (let lv = level; lv <= 9; lv++) levels.push({ lv: lv, pmCost: lv, over: overAt(lv) });
    const dice = db && db.damage ? spellDiceAt(db.damage, level, tl) : null;
    spells.push({
      key: String(idx), id: db ? db.id : null, name: sp.name || (db && db.name) || "?", level: level, school: school,
      source: "classe", srcClass: null, prepared: !!sp.prepared, auto: false,
      ritual: !!(db && db.ritual), conc: !!((db && db.concentration) || sp.concentration), castTime: String(sp.castTime || (db && db.castTime) || "").toLowerCase(),
      pmCost: level, over: overAt(level), levels: levels,
      attack: db && db.attack ? (m != null ? m : 0) : null,
      dc: db && db.dc ? { ability: db.dc.ability || "", value: m != null ? 8 + m : null, success: ESITO_TS[db.dc.success] || db.dc.success || "" } : null,
      dmg: dice ? { dice: dice, type: db.damage.type || "" } : null,
      effects: sp.effects || (db && db.effects) || ""
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
    if (SD[i] && SD[i].c === "Manovre di Combattimento" && (sk.rank || 0) > 0) maneuvers.push({ name: sk.name, tot: sk.tot, die: null, dc: null });
  });

  /* ── equipaggiamento in sola lettura ── */
  const rankOf = function(name){ const k = SD.findIndex(function(s){ return s.n === name; }); return k >= 0 && ch.skills[k] ? ch.skills[k].rank || 0 : 0; };
  const armNames = { light: "Armature Leggere", medium: "Armature Medie", heavy: "Armature Pesanti" };
  const shNames = { small: "Scudi Piccoli", medium: "Scudi Medi", large: "Scudi Grandi" };
  const armor = {}, shield = {};
  Object.keys(armNames).forEach(function(k){ armor[k] = Object.assign({ caBase: 0, bonusSpec: 0, equipped: false }, (eq.armor || {})[k], { rank: rankOf(armNames[k]) }); });
  Object.keys(shNames).forEach(function(k){ shield[k] = Object.assign({ caBonus: 0, bonusSpec: 0, equipped: false }, (eq.shield || {})[k], { rank: rankOf(shNames[k]) }); });
  const equip = {
    armor: armor, shield: shield, dualWield: dualWield, coins: eq.coins || {},
    weapons: (eq.weapons || []).map(function(w, i){
      const def = WEAPONS_DB.find(function(d){ return d.id === w.id; });
      return { i: i, id: w.id, name: w.name || (def && def.name) || w.id, qty: w.qty || 1, equipped: !!w.equipped, offHand: !!w.offHand };
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
      const e = { t: r.t, label: r.label, dice: dice.length ? dice : null, total: r.total };
      if (flat) e.mod = flat;
      return e;
    }
    return { t: r.t, label: r.label, dice: r.d2 != null ? [r.d1, r.d2] : [r.d1], mod: r.mod, total: r.total };
  });

  /* ── azioni ── */
  const up = function(patch){ setCh(Object.assign({}, ch, patch)); };
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
    undo: function(){ if (env.undo) env.undo(); },
    redo: function(){ if (env.redo) env.redo(); },
    setSpell: function(){},
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
    setRank: function(){}, setLURank: function(){},
    startLU: function(){ if (env.toClassic) env.toClassic(); },
    applyLU: function(){}, cancelLU: function(){}
  };

  return {
    ch: ch, tl: tl, version: APP_VERSION, portrait: ch.portrait || null, miniature: ch.miniature || null,
    classes: ch.classes.filter(function(c){ return c && c.name; }).map(function(c){ return { name: c.name, level: c.level || 0, sub: c.sub || null, hd: HD[c.name] || 8 }; }),
    race: race, locked: !!ch.locked, inLU: false, creationDone: !!ch.creationDone,
    stats: stats, mods: statMods,
    ca: { total: caTotal, dexCA: dexCA, dexCap: eqDexCap, shieldPen: eqShPen, parts: [] },
    init: statMods.Destrezza || 0,
    speed: { base: velBase, final: velFinal, overload: velOverload },
    hp: { max: hpMax, cur: hpCur, temp: ch.hpTemp || 0, pct: hpMax > 0 ? Math.round(hpCur / hpMax * 100) : 100, dmg: hpDmg },
    skills: skills, cats: cats,
    points: { creationAvail: skPts - mcCost, creationSpent: creationSpent, creationRem: skPts - mcCost - creationSpent, luAvail: 0, luSpent: 0, luRem: 0 },
    pm: { max: pmInfo.pm, rem: pmRem, soglia: soglia, perClass: pmInfo.per.filter(function(p){ return p.pm > 0; }).map(function(p){ return { cls: p.name, pm: p.pm, soglia: p.soglia }; }), pact: null },
    spells: spells, weapons: weapons, maneuvers: maneuvers, features: [],
    equip: equip, condList: CONDIZIONI_SRD,
    conc: conc, conds: ch.conds || [], exhaustion: ch.exhaustion || 0, pinned: pinned, uses: ch.uses || {},
    noHeal: ch.noHeal || null,
    roll: { mode: MODO_A_UI[env.mode] || "normale", history: history },
    can: { rank: false, bonus: false, equip: true, identity: false, undo: !!env.canUndo, redo: !!env.canRedo, shortRest: false },
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
        {" Il personaggio nuovo si crea nell'editor completo; poi «Torna alla scheda» riporta qui."}</p>
      {onBug ? <button className="gx-lab" style={{ textAlign: "left", textTransform: "none", textDecoration: "underline" }} onClick={onBug}>{"\ud83d\udc1e"} Segnala un problema</button> : null}
    </div>
    <div className="gx-card">
      <h2>Aspetto</h2>
      <SceltaAspetto aspetto={asp} />
    </div></div>
  </div></div>;
}
