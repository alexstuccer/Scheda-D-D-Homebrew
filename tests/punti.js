// 10.7.8 · i punti competenza non scendono sotto zero (creazione e passaggio di livello), prove su useCharacter
// Uso: CHROME=/percorso/chrome node punti.js scheda.html
const path = require("path"); const { chromium } = require("playwright");
const URL = "file://" + path.resolve(process.argv[2]);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox"] });
  const pg = await b.newPage(); const errs = []; pg.on("pageerror", e => errs.push(e.message));
  await pg.goto(URL); await pg.waitForFunction(() => typeof INIT !== "undefined" && typeof useCharacter === "function");
  const out = await pg.evaluate(() => {
    const R = []; const ok = (n, c, x) => R.push([c ? "OK  " : "KO  ", n, x === undefined ? "" : " · " + JSON.stringify(x)]);
    const env = { rolls: [], mode: "norm" };
    const run = (ch) => { let cur = ch; const set = (c) => { cur = c; }; const C = () => useCharacter(cur, set, env); return { C, get: () => cur }; };
    const sk = (n) => SD.findIndex(s => s.n === n);
    // creazione: Guerriero, caratteristiche 15/14/13/12/10/8
    const nuovo = () => { const a = JSON.parse(JSON.stringify(INIT)); a.name = "T"; a.creationDone = false; a.locked = false;
      a.classes = [{ name: "Guerriero", level: 1 }];
      a.stats = { Forza: 15, Destrezza: 14, Costituzione: 13, Intelligenza: 12, Saggezza: 10, Carisma: 8 }; return a; };
    let t = run(nuovo());
    const tutte = t.C().skills.filter(s => s.cat !== "Comunicazione").map(s => s.i);
    // spende tutto: rank 4 dove si può, poi rank 1 finché bastano
    for (const i of tutte) { if (t.C().points.creationRem <= 0) break; t.C().act.setRank(i, 4); }
    for (const i of tutte) { if (t.C().points.creationRem <= 0) break; const r = t.C().skills.filter(s => s.i === i)[0].rank; t.C().act.setRank(i, r + 1); }
    const p0 = t.C().points;
    ok("creazione: punti spesi fino in fondo, restanti ≥ 0", p0.creationRem >= 0 && p0.creationRem < 8, p0);
    // abbassare una caratteristica non manda in negativo
    const f0 = t.C().stats.Forza.score;
    for (let k = 0; k < 7; k++) t.C().act.setStat("Forza", t.C().stats.Forza.score - 1);
    ok("creazione: Forza non scende sotto il punto che tiene i punti ≥ 0", t.C().points.creationRem >= 0, [f0, t.C().stats.Forza.score, t.C().points.creationRem]);
    // salire resta libero
    t.C().act.setStat("Carisma", 9); ok("creazione: alzare una caratteristica funziona", t.C().stats.Carisma.score === 9);
    // ora c'è margine: si può riabbassare Carisma
    t.C().act.setStat("Carisma", 8); ok("creazione: riabbassare quanto appena alzato funziona", t.C().stats.Carisma.score === 8, t.C().points.creationRem);
    // cambio di classe che costerebbe di più: bloccato
    const cl0 = t.C().classes[0].name;
    const piùCara = ["Mago", "Stregone", "Warlock", "Chierico", "Druido", "Bardo"].find(c => { const x = useCharacter(Object.assign({}, t.get(), { classes: [{ name: c, level: 1 }] }), () => {}, env); return x.points.creationRem < 0; });
    if (piùCara) { const r = t.C().act.setClass(piùCara); ok("creazione: classe più cara bloccata (" + piùCara + ")", t.C().classes[0].name === cl0 && r && r.errore, r); }
    else ok("creazione: trovata una classe più cara per la prova", false);
    ok("creazione: restanti ≥ 0 dopo tutte le prove", t.C().points.creationRem >= 0, t.C().points);
    // costo forzato più alto su una competenza con rank: bloccato
    const conRank = t.C().skills.filter(s => s.rank >= 4)[0];
    t.C().act.setCostOverride(conRank.i, "9"); ok("creazione: costo forzato che sfora, bloccato", t.C().points.creationRem >= 0, [conRank.name, t.C().points.creationRem]);
    // scheda vecchia già in negativo: le modifiche che non peggiorano passano
    const neg = nuovo(); neg.skills = neg.skills.map((s, i) => tutte.indexOf(i) >= 0 ? Object.assign({}, s, { rank: 4 }) : s);
    t = run(neg); const rn = t.C().points.creationRem;
    t.C().act.setStat("Carisma", 9); ok("scheda già in negativo: alzare passa", t.C().stats.Carisma.score === 9 && rn < 0, [rn, t.C().points.creationRem]);
    t.C().act.setStat("Forza", 14); ok("scheda già in negativo: abbassare (peggiora) non passa", t.C().stats.Forza.score === 15);

    // passaggio di livello: Guerriero 3 → 4 con aumento, poi abbassamento dopo aver speso i punti in più
    const fatto = () => { const a = JSON.parse(JSON.stringify(INIT)); a.name = "L"; a.classes = [{ name: "Guerriero", level: 3 }]; a.creationDone = true; a.locked = true;
      a.stats = { Forza: 15, Destrezza: 14, Costituzione: 13, Intelligenza: 12, Saggezza: 10, Carisma: 8 }; a.savedPoints = 0; return a; };
    t = run(fatto()); t.C().act.startLU ? t.C().act.startLU() : null;
    if (!t.C().inLU) { const a = t.get(); a.lvlUp = { cls: "Guerriero", isNew: false, nr: a.skills.map(() => 0), snap: { stats: Object.assign({}, a.stats), bm: {}, hpBonus: 0, bs: a.skills.map(() => 0) } }; a.locked = false; }
    ok("level-up aperto", t.C().inLU);
    t.C().act.setLUStat("Forza", 17);
    const avail = t.C().points.luAvail;
    for (const i of tutte) { if (t.C().points.luRem <= 0) break; const s = t.C().skills.filter(x => x.i === i)[0]; t.C().act.setLURank(i, s.rank + 1); }
    ok("level-up: punti spesi fino in fondo", t.C().points.luRem >= 0 && t.C().points.luRem < 6, t.C().points);
    t.C().act.setLUStat("Forza", 15);
    ok("level-up: togliere l'aumento non manda in negativo", t.C().points.luRem >= 0, [t.C().stats.Forza.score, t.C().points]);
    // multiclasse (−48) dopo aver speso: bloccata
    t.C().act.setLUClass("Mago");
    ok("level-up: multiclasse che sfora, bloccata", t.C().points.luRem >= 0 && t.C().inLU, [t.get().lvlUp.cls, t.C().points.luRem]);
    return R;
  });
  let ko = 0; out.forEach(r => { if (r[0].trim() === "KO") ko++; console.log(r.join(" ")); });
  if (errs.length) { console.log("errori pagina:", errs.slice(0, 3)); ko++; }
  console.log(ko ? ko + " KO" : "tutto OK"); await b.close(); process.exit(ko ? 1 : 0);
})();
