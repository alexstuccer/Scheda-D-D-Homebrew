const path = require("path"); const { chromium } = require("playwright");
const URL = "file://" + path.resolve(process.argv[2]);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox"] }); let ko = 0;
  for (const w of [390, 1280]) {
    const pg = await b.newPage({ viewport: { width: w, height: 900 } }); const errs = []; pg.on("pageerror", e => errs.push(e.message));
    await pg.goto(URL); await pg.waitForFunction(() => typeof INIT !== "undefined");
    await pg.evaluate(() => { localStorage.clear(); const a = JSON.parse(JSON.stringify(INIT)); a.name = "Brunilde"; a.classes = [{ name: "Guerriero", level: 3 }]; a.creationDone = true; a.locked = true;
      localStorage.setItem("characterDashboard_v2", JSON.stringify({ version: 4, campaigns: [{ folderName: "Default" }], activeCampaign: "Default", rostersByCamp: { Default: { p1: a } }, ordersByCamp: { Default: ["p1"] }, fileMapsByCamp: { Default: {} }, activeId: "p1" })); });
    await pg.reload(); await pg.waitForTimeout(1200);
    await pg.locator("nav button:has-text('Scheda'), [role=tab]:has-text('Scheda')").first().click(); await pg.waitForTimeout(400);
    const n = () => pg.evaluate(() => (JSON.parse(localStorage.getItem("diceRolls_v5") || "[]")).length);
    const riga = pg.locator('button.gx-tira[aria-label="Prova di Contorsionismo"]');
    await riga.locator(".nm").click(); await pg.waitForTimeout(300); const a = await n();
    const ultimo = await pg.evaluate(() => (JSON.parse(localStorage.getItem("diceRolls_v5") || "[]"))[0]);
    await pg.locator('.gx-row:has(button[aria-label="Prova di Contorsionismo"]) .gx-chip').click(); await pg.waitForTimeout(300); const b2 = await n();
    const fissata = await pg.locator('.gx-row:has(button[aria-label="Prova di Contorsionismo"]) .gx-chip').textContent();
    const okA = a === 1 && /Contorsionismo/.test(JSON.stringify(ultimo)), okB = b2 === 1 && /Fissata/.test(fissata);
    console.log(w, okA ? "OK  " : "KO  ", "toccando il nome si tira", a, JSON.stringify(ultimo).slice(0, 80));
    console.log(w, okB ? "OK  " : "KO  ", "«Fissa» fissa e non tira", b2, fissata);
    if (!okA || !okB || errs.length) ko++; if (errs.length) console.log(errs);
    await pg.screenshot({ path: "/home/claude/lista2_" + w + ".png" });
  }
  console.log(ko ? "KO" : "tutto OK"); await b.close(); process.exit(ko ? 1 : 0);
})();
