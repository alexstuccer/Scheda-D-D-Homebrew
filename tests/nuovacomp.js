// 10.7.4 · Modifica scheda: competenza nuova in una categoria; creazione: nome della lingua
const path = require("path"); const { chromium } = require("playwright");
const URL = "file://" + path.resolve(process.argv[2]); const W = +(process.argv[3] || 390);
let ko = 0; const ok = (n, c, x) => { if (!c) ko++; console.log((c ? "OK  " : "KO  ") + W + "px " + n + (x !== undefined ? " · " + x : "")); };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox"] }); const errs = [];
  const ctx = await b.newContext({ viewport: { width: W, height: 900 } });
  const p0 = await ctx.newPage(); await p0.goto(URL); await p0.waitForFunction(() => typeof INIT !== "undefined");
  const d = await p0.evaluate(() => { const a = JSON.parse(JSON.stringify(INIT)); a.name = "Bardo"; a.classes = [{ name: "Bardo", level: 3 }]; a.creationDone = true; a.locked = false;
    const b2 = JSON.parse(JSON.stringify(INIT)); b2.name = "Nuovo"; b2.classes = [{ name: "Bardo", level: 1 }]; b2.creationDone = false;
    return { roster: { a, b: b2 }, order: ["a", "b"], activeId: "a" }; });
  await p0.close();
  await ctx.addInitScript((d) => { if (!sessionStorage.getItem("s")) { localStorage.setItem("characterDashboard_v2", JSON.stringify(d)); sessionStorage.setItem("s", "1"); } }, d);
  const pg = await ctx.newPage(); pg.setDefaultTimeout(5000); pg.on("pageerror", e => errs.push(e.message)); await pg.goto(URL); await pg.waitForSelector(".gx");
  try {
    const nb = pg.getByRole("button", { name: "+ Nuova competenza in Arti musicali" });
    if (!(await nb.count())) { await pg.locator(".gx-segm button", { hasText: "Competenze" }).last().click().catch(() => {}); await pg.waitForTimeout(150); }
    ok("Modifica scheda: pulsante per la nuova competenza", (await nb.count()) === 1);
    await nb.click(); await pg.getByRole("textbox", { name: "Nome" }).fill("Zampogna");
    await pg.getByRole("button", { name: "Aggiungi la competenza" }).click(); await pg.waitForTimeout(200);
    const riga = pg.locator(".gx-row", { hasText: "aggiunta dal master" });
    ok("la competenza nuova compare nella categoria", (await riga.count()) >= 1, (await riga.first().innerText().catch(() => "")).replace(/\s+/g, " "));
    if (process.env.SHOT) await pg.screenshot({ path: process.env.SHOT + "_master_" + W + ".png", fullPage: false });
  } catch (e) { ko++; console.log("FALLITO " + e.message.split("\n")[0]); }
  if (errs.length) { ko++; console.log("ERRORI " + errs.join(" | ")); }
  console.log(ko ? ko + " KO" : "Nessun errore JavaScript, tutto OK"); await b.close(); process.exit(ko ? 1 : 0);
})();
