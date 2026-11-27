// 10.7.3 · creazione, passo Competenze: punti, modo e ricerca restano fermi mentre l'elenco scorre
const path = require("path"); const { chromium } = require("playwright");
const URL = "file://" + path.resolve(process.argv[2]); const W = +(process.argv[3] || 390);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox"] }); const errs = [];
  const ctx = await b.newContext({ viewport: { width: W, height: 800 } });
  const p0 = await ctx.newPage(); await p0.goto(URL); await p0.waitForFunction(() => typeof INIT !== "undefined");
  const d = await p0.evaluate(() => { const a = JSON.parse(JSON.stringify(INIT)); a.name = "Nuovo"; a.classes = [{ name: "Guerriero", level: 1 }]; a.creationDone = false; a.locked = false; return { roster: { a }, order: ["a"], activeId: "a" }; });
  await p0.close();
  await ctx.addInitScript((d) => { if (!sessionStorage.getItem("s")) { localStorage.setItem("characterDashboard_v2", JSON.stringify(d)); sessionStorage.setItem("s", "1"); } }, d);
  const pg = await ctx.newPage(); pg.on("pageerror", e => errs.push(e.message)); await pg.goto(URL); await pg.waitForSelector(".gx");
  await pg.locator(".gx-chip, button", { hasText: "4 Competenze" }).first().click(); await pg.waitForTimeout(200);
  const top = async () => (await pg.locator(".gx-fermo").boundingBox()).y;
  const y0 = await top();
  await pg.locator(".gx-full .gx-scroll").evaluate(e => e.scrollTop = 1500); await pg.waitForTimeout(150);
  const y1 = await top(); const vis = await pg.locator(".gx-fermo input").isVisible();
  console.log(W + "px · riquadro fermo prima " + Math.round(y0) + ", dopo lo scorrimento " + Math.round(y1) + " · ricerca visibile " + vis + " · testo: " + (await pg.locator(".gx-fermo .gx-pool").innerText()).replace(/\s+/g, " "));
  await pg.screenshot({ path: "/tmp/fermo_" + W + ".png" });
  console.log(errs.length ? "ERRORI " + errs.join(" | ") : (Math.abs(y0 - y1) < 12 && vis ? "OK" : "KO"));
  await b.close();
})();
