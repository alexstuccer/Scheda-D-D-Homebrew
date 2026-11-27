// Verifica automatica ARBITRO (pacchetto 0).
// Uso: node arbitro_p0.js <scheda.html> [casi_arbitro.json] [--esporta-pg <cartella>]
// Richiede Playwright; Chrome da CHROME (percorso) o il Chromium di Playwright.
// Esito: una riga per caso (OK / ATTESO NON TORNA / REGRESSIONE / NUOVO: TORNA) e un totale.
// Codice di uscita: 0 senza regressioni, 1 con almeno una REGRESSIONE, 2 se la pagina o i dati non si caricano.
const fs = require("fs"), path = require("path");
let chromium;
try { chromium = require("playwright").chromium; } catch (e) { chromium = require(process.env.PW || "playwright").chromium; }

const args = process.argv.slice(2);
const html = path.resolve(args[0] || "");
const casiPath = args[1] && !args[1].startsWith("--") ? args[1] : path.join(__dirname, "casi_arbitro.json");
const espIdx = args.indexOf("--esporta-pg");
const espDir = espIdx >= 0 ? args[espIdx + 1] : null;
if (!args[0] || !fs.existsSync(html)) { console.error("File HTML non trovato: " + args[0]); process.exit(2); }
const DATI = JSON.parse(fs.readFileSync(casiPath, "utf8"));
const URL = "file://" + html + "#editor";

// Funzioni eseguite nella pagina: usano solo i nomi globali della scheda.
function paginaSetup() {
  const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
  const merge = (a, b) => { const o = Array.isArray(a) ? a.slice() : { ...a }; Object.keys(b).forEach((k) => { o[k] = isObj(a && a[k]) && isObj(b[k]) ? merge(a[k], b[k]) : b[k]; }); return o; };
  const skillIndex = (key) => {
    const [cat, nome] = key.includes("/") ? key.split("/") : [null, key];
    const hits = SD.map((s, i) => ({ s, i })).filter((x) => x.s.n === nome && (!cat || x.s.c === cat));
    if (hits.length !== 1) throw new Error("abilità «" + key + "»: " + hits.length + " voci in SD");
    return hits[0].i;
  };
  // ch completo come lo salva la scheda: INIT + differenze, abilità per nome
  const buildCh = (pg) => {
    const base = JSON.parse(JSON.stringify(INIT));
    const { skills, ...rest } = pg || {};
    const ch = merge(base, rest);
    if (skills) Object.keys(skills).forEach((k) => {
      const v = skills[k], i = skillIndex(k);
      ch.skills[i] = { ...ch.skills[i], ...(typeof v === "number" ? { rank: v } : v) };
    });
    return ch;
  };
  // modificatori come nel corpo della scheda (razza umana senza scelte: bonus razziale 0)
  const mods = (ch) => { const m = {}; STATS.forEach((st) => { m[st] = gm(ch.stats[st] || 8) + ((ch.bm || {})[st] || 0); }); return m; };
  const magicAttr = (ch) => { const c = (ch.classes || []).find((c2) => MS[c2.name]); return c ? MS[c.name] : ch.ga; };
  const get = (o, p) => p.split(".").reduce((x, k) => (x == null ? undefined : x[k]), o);
  const calcoli = {
    overcastCD: (ch, k) => overcastCD(k.livello, pmSoglia(ch.classes).soglia, k.aSecco),
    overcastDamage: (ch, k) => overcastDamage(k.livello, k.esito),
    pmSoglia: (ch) => { const r = pmSoglia(ch.classes); return [r.pm, r.soglia]; },
    pmRiserve: (ch) => { const r = pmSoglia(ch.classes); const p = r.pact || r.patto || null; return [p ? (r.pmOrd != null ? r.pmOrd : r.pm) : r.pm, p ? (p.max != null ? p.max : p.pm) : null]; },
    calcDexCap: (ch) => calcDexCap(ch.equipment, ch.skills),
    tot: (ch, k) => computeAll(ch.skills, mods(ch), ch.ma, magicAttr(ch))[skillIndex(k.abilita)].tot,
    attr: (ch, k) => SD[skillIndex(k.abilita)].a,
    costi: (ch, k) => { const i = skillIndex(k.abilita); return ["Artefice", "Bardo", "Barbaro", "Chierico", "Druido", "Guerriero", "Warlock", "Ladro", "Mago", "Monaco", "Paladino", "Ranger", "Stregone"].map((c) => getSkillCost({}, SD[i], c)); },
    costante: (ch, k) => (0, eval)(k.espr),
    incantesimo: (ch, k) => { const d = SPELLS_BY_ID[k.id]; if (!d) throw new Error("incantesimo " + k.id + " assente"); const v = get(d, k.campo); return v === undefined ? null : v; },
    pesiPHB: (ch, k) => WEAPONS_DB.filter((w) => w.source === "PHB" && w.nameEn !== "Dart" && k.libbre[w.nameEn] !== undefined && Math.abs(k.libbre[w.nameEn] * 0.5 - w.weight) > 1e-9).map((w) => w.id),
    equipWeight: (ch) => equipWeight(ch.equipment),
    migrateCh: (ch, k) => { const v = get({ ...INIT, ...migrateCh(JSON.parse(JSON.stringify(ch))) }, k.percorso); return v === undefined ? null : v; },
  };
  window.__ARB = { buildCh, calcoli, run: (c, pg) => calcoli[c.calcolo.f](buildCh(pg), c.calcolo) };
}

// Letture dalla scheda disegnata (casi "ui")
async function leggiUI(page, campo) {
  const tab = async (t) => { await page.locator(".tab", { hasText: t }).first().click(); };
  const riga = async (lab) => {
    const t = await page.locator(".ir", { hasText: lab }).first().locator(".iv").innerText();
    return t.trim();
  };
  const num = (s) => Number(String(s).replace(/[^\d.+-]/g, ""));
  if (campo === "caPersonaggio") { await tab("Personaggio"); return num(await riga("Classe Armatura")); }
  if (campo === "velocita") { await tab("Personaggio"); return num(await riga("Velocit")); }
  if (campo === "iniziativa") { await tab("Caratteristiche"); return (await riga("Iniziativa")).split(/\s/)[0]; }
  if (campo === "caEquip") { await tab("Equipaggiamento"); return num(await page.locator(".ca-val").first().innerText()); }
  if (campo === "caDettaglio") { await tab("Equipaggiamento"); return (await page.locator(".ca-det").first().innerText()).trim(); }
  if (campo === "capacita") { await tab("Equipaggiamento"); return (await page.locator(".eq-carry").first().innerText()).trim(); }
  throw new Error("campo UI sconosciuto: " + campo);
}

function confronta(c, got) {
  if (c.confronto === "contiene") return typeof got === "string" && got.indexOf(c.atteso) >= 0;
  if (c.confronto === "maggiore") return typeof got === "number" && got > c.atteso;
  return JSON.stringify(got) === JSON.stringify(c.atteso);
}

(async () => {
  const exe = process.env.CHROME || undefined;
  const browser = await chromium.launch({ executablePath: exe, args: ["--no-sandbox"] });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const errori = [];
  page.on("pageerror", (e) => errori.push(e.message));
  await page.goto(URL);
  await page.waitForFunction(() => typeof INIT !== "undefined" && typeof SD !== "undefined");
  await page.evaluate(paginaSetup);
  const ver = await page.evaluate(() => (typeof APP_VERSION !== "undefined" ? APP_VERSION : "?"));
  console.log("Scheda " + ver + " · casi " + DATI.casi.length + " (riferimento " + DATI.riferimento.versione + ")");

  if (espDir) {
    fs.mkdirSync(espDir, { recursive: true });
    for (const k of Object.keys(DATI.pg)) {
      const ch = await page.evaluate((pg) => window.__ARB.buildCh(pg), DATI.pg[k]);
      fs.writeFileSync(path.join(espDir, k + ".json"), JSON.stringify(ch, null, 2));
    }
    console.log("PG completi scritti in " + espDir);
  }

  const conta = { ok: 0, atteso: 0, regr: 0, nuovo: 0 };
  for (const c of DATI.casi) {
    const pg = c.pg ? DATI.pg[c.pg] : null;
    let got, err = null;
    try {
      if (c.calcolo.f === "ui") {
        const ch = await page.evaluate((p) => window.__ARB.buildCh(p), pg);
        const ctx2 = await browser.newContext();
        await ctx2.addInitScript((d) => { try { localStorage.setItem("characterDashboard_v2", JSON.stringify(d)); } catch (e) {} }, { roster: { arb: ch }, order: ["arb"], activeId: "arb" });
        const p2 = await ctx2.newPage();
        await p2.goto(URL);
        await p2.locator(".tab", { hasText: "Personaggio" }).first().waitFor({ timeout: 10000 });
        got = await leggiUI(p2, c.calcolo.campo);
        await ctx2.close();
      } else {
        got = await page.evaluate(([cc, p]) => window.__ARB.run(cc, p), [c, pg]);
      }
    } catch (e) { err = e.message.split("\n")[0]; }
    const torna = !err && confronta(c, got);
    const daFare = c.stato_10_1_1 === "da fare";
    let esito;
    if (torna && !daFare) { esito = "OK"; conta.ok++; }
    else if (torna && daFare) { esito = "NUOVO: TORNA (" + c.da_fare + ", aggiornare lo stato)"; conta.nuovo++; }
    else if (daFare) { esito = "ATTESO NON TORNA (" + c.da_fare + ")"; conta.atteso++; }
    else { esito = "REGRESSIONE"; conta.regr++; }
    const det = err ? "errore: " + err : "ottenuto " + JSON.stringify(got) + ", atteso " + (c.confronto ? c.confronto + " " : "") + JSON.stringify(c.atteso);
    console.log(c.id + "  " + esito + "  [" + c.rif + "] " + c.caso + " — " + det);
  }
  console.log("\nTotale: " + conta.ok + " OK, " + conta.atteso + " attesi non tornano, " + conta.regr + " regressioni" + (conta.nuovo ? ", " + conta.nuovo + " nuovi che tornano" : ""));
  if (errori.length) console.log("Errori JavaScript della pagina: " + errori.join(" | "));
  await browser.close();
  process.exit(conta.regr > 0 ? 1 : 0);
})().catch((e) => { console.error("Errore: " + e.message); process.exit(2); });
