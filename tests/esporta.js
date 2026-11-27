// 10.7.11 · «⬇ Esporta» accanto a «＋ Importa» scarica il JSON del PG corrente (390 e 1280). Uso: CHROME=… node esporta.js scheda.html
const path = require("path"); const fs = require("fs"); const { chromium } = require("playwright");
const URL = "file://" + path.resolve(process.argv[2]);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox"] }); let ko = 0;
  for (const w of [390, 1280]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 900 }, acceptDownloads: true }); const pg = await ctx.newPage();
    const errs = []; pg.on("pageerror", e => errs.push(e.message));
    await pg.goto(URL); await pg.waitForFunction(() => typeof INIT !== "undefined");
    await pg.evaluate(() => { localStorage.clear(); const a = JSON.parse(JSON.stringify(INIT)); a.name = "Brunilde"; a.classes = [{ name: "Guerriero", level: 3 }]; a.creationDone = true; a.locked = true;
      localStorage.setItem("characterDashboard_v2", JSON.stringify({ version: 4, campaigns: [{ folderName: "Default" }], activeCampaign: "Default", rostersByCamp: { Default: { p1: a } }, ordersByCamp: { Default: ["p1"] }, fileMapsByCamp: { Default: {} }, activeId: "p1" })); });
    await pg.reload(); await pg.waitForTimeout(1200);
    const btn = pg.locator(".pg-tab:has-text('Esporta')"); const vis = await btn.isVisible();
    let nome = null, dentro = null;
    if (vis) { const [dl] = await Promise.all([pg.waitForEvent("download", { timeout: 5000 }), btn.click()]); nome = dl.suggestedFilename(); const p = await dl.path(); dentro = JSON.parse(fs.readFileSync(p, "utf8")).name; }
    const ok = vis && nome === "Brunilde.json" && dentro === "Brunilde" && !errs.length; if (!ok) ko++;
    console.log(w, ok ? "OK  " : "KO  ", "«⬇ Esporta» in vista e scarica la scheda", JSON.stringify({ vis, nome, dentro, errs }));
    await pg.screenshot({ path: "/tmp/esporta_" + w + ".png" }); await ctx.close();
  }
  console.log(ko ? ko + " KO" : "tutto OK"); await b.close(); process.exit(ko ? 1 : 0);
})();
