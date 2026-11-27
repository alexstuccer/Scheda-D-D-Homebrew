// Pacchetto 0, passo 4: confronta i numeri di useCharacter (C) con quelli che mostra l'interfaccia classica,
// poi apre la nuova interfaccia a 390 e 1280 px e prova le azioni principali.
// Uso: node nuova_ui.js <scheda.html> casi_arbitro.json <cartella_screenshot>
const fs = require("fs"), path = require("path");
const { chromium } = require("playwright");
const html = path.resolve(process.argv[2]), DATI = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const out = process.argv[4] || "/tmp/nui"; fs.mkdirSync(out, { recursive: true });
const URL = "file://" + html + "#editor";
const num = (s) => Number(String(s).replace(",", ".").replace(/[^\d.+-]/g, ""));

function buildChInPage(pg) {
  const isObj = (v) => v && typeof v === "object" && !Array.isArray(v);
  const merge = (a, b) => { const o = Array.isArray(a) ? a.slice() : { ...a }; Object.keys(b).forEach((k) => { o[k] = isObj(a && a[k]) && isObj(b[k]) ? merge(a[k], b[k]) : b[k]; }); return o; };
  const base = JSON.parse(JSON.stringify(INIT));
  const { skills, ...rest } = pg || {};
  const ch = merge(base, rest);
  if (skills) Object.keys(skills).forEach((k) => {
    const [cat, nome] = k.includes("/") ? k.split("/") : [null, k];
    const i = SD.findIndex((s) => s.n === nome && (!cat || s.c === cat));
    const v = skills[k]; ch.skills[i] = { ...ch.skills[i], ...(typeof v === "number" ? { rank: v } : v) };
  });
  return ch;
}

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox"] });
  const p0 = await (await browser.newContext()).newPage();
  await p0.goto(URL); await p0.waitForFunction(() => typeof INIT !== "undefined");
  let ok = 0, ko = 0; const errs = [];
  const check = (id, what, a, b) => { const t = JSON.stringify(a) === JSON.stringify(b); t ? ok++ : ko++; if (!t) console.log("DIVERSO " + id + " " + what + ": classica " + JSON.stringify(a) + " · C " + JSON.stringify(b)); };
  for (const id of Object.keys(DATI.pg)) {
    const ch = await p0.evaluate(buildChInPage, DATI.pg[id]);
    ch.name = "PG " + id; ch.creationDone = true; ch.locked = true;
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await ctx.addInitScript((d) => { localStorage.setItem("characterDashboard_v2", JSON.stringify(d)); localStorage.setItem("gemma_nuovaUI", "0"); },
      { roster: { t: ch }, order: ["t"], activeId: "t" });
    const pg = await ctx.newPage(); pg.on("pageerror", (e) => errs.push(id + ": " + e.message));
    await pg.goto(URL);
    await pg.locator(".tab", { hasText: "Personaggio" }).first().click();
    const riga = async (lab) => (await pg.locator(".ir", { hasText: lab }).first().locator(".iv").innerText()).trim();
    const caUI = num(await riga("Classe Armatura")), velUI = num(await riga("Velocit")), pfUI = await riga("Punti Ferita");
    // C calcolato dalla stessa pagina sul ch salvato (dopo migrateCh)
    const C = await pg.evaluate((ch) => {
      const c = useCharacter({ ...INIT, ...migrateCh(JSON.parse(JSON.stringify(ch))) }, () => {}, {});
      return { ca: c.ca.total, vel: c.speed.final, hp: c.hp.max + "", hpcur: c.hp.cur, pm: [c.pm.max, c.pm.soglia], nw: c.weapons.length, ns: c.spells.length, nsk: c.skills.length };
    }, ch);
    check(id, "CA", caUI, C.ca); check(id, "velocità", velUI, C.vel);
    check(id, "PF max", num(pfUI.split("/")[1] || pfUI), Number(C.hp));
    // Combat: per colpire delle armi equipaggiate
    await pg.locator(".tab", { hasText: "Combat" }).first().click();
    const toHitUI = await pg.$$eval(".cmb-tohit .cmb-bonus", (els) => els.map((e) => e.textContent.trim()));
    const toHitC = await pg.evaluate((ch) =>
      useCharacter({ ...INIT, ...migrateCh(JSON.parse(JSON.stringify(ch))) }, () => {}, {}).weapons.filter((w) => w.role !== "none").map((w) => fmtMod(w.toHit)), ch);
    if (toHitUI.length) check(id, "per colpire", toHitUI, toHitC);
    await ctx.close();
  }
  console.log("Confronto classica ↔ C: " + ok + " uguali, " + ko + " diversi");

  // Nuova interfaccia: apertura, azioni, schermate
  for (const w of [390, 1280]) {
    const ch = await p0.evaluate(buildChInPage, DATI.pg.ranger9_warlock3);
    ch.name = "Prova nuova UI"; ch.creationDone = true; ch.locked = true;
    ch.spells = [{ name: "Palla di Fuoco", dbId: "fireball", prepared: true }, { name: "Dardo di Fuoco", dbId: "fire-bolt", prepared: true }, { name: "Cura Ferite", dbId: "cure-wounds", prepared: true }];
    ch.equipment = { ...ch.equipment, weapons: [{ id: "spada_lunga", name: "Spada lunga", qty: 1, equipped: true }, { id: "pugnale", name: "Pugnale", qty: 1 }] };
    const ctx = await browser.newContext({ viewport: { width: w, height: w < 768 ? 844 : 860 } });
    await ctx.addInitScript((d) => { localStorage.setItem("characterDashboard_v2", JSON.stringify(d)); localStorage.setItem("gemma_nuovaUI", "1"); localStorage.setItem("ui_aspetto_v1", JSON.stringify({ theme: "str", v: "dark" })); },
      { roster: { t: ch }, order: ["t"], activeId: "t" });
    const pg = await ctx.newPage(); pg.on("pageerror", (e) => errs.push(w + "px: " + e.message));
    await pg.goto(URL.replace("#editor", "")); await pg.waitForSelector(".gx", { timeout: 10000 });
    await pg.waitForTimeout(400);
    // chiude l'eventuale pannello Aspetto del primo accesso
    const chiudi = pg.locator(".gx-sheet button[aria-label^='Chiudi'], .gx-sheet .gx-x").first();
    if (await chiudi.count()) await chiudi.click().catch(() => {});
    await pg.screenshot({ path: path.join(out, "nui_" + w + "_sessione.png") });
    const txt = await pg.locator(".gx").innerText();
    console.log(w + "px · versione visibile: " + /10\.3/.test(txt) + " · pulsante classica assente: " + ((await pg.locator(".ui-switch").count()) === 0));
    fs.writeFileSync(path.join(out, "nui_" + w + ".txt"), txt);
    await ctx.close();
  }
  console.log(errs.length ? "Errori JS: " + errs.join(" | ") : "Nessun errore JavaScript");
  await browser.close();
})().catch((e) => { console.error(e); process.exit(2); });
