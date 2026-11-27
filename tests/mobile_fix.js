const path = require("path"); const { chromium } = require("playwright");
const URL = "file://" + path.resolve(process.argv[2]);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox"] }); const errs = [];
  for (const w of [390, 1280]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 844 } });
    const p0 = await ctx.newPage(); await p0.goto(URL); await p0.waitForFunction(() => typeof INIT !== "undefined");
    const d = await p0.evaluate(() => { const a = JSON.parse(JSON.stringify(INIT)); a.name = "Eliandra"; a.classes = [{ name: "Bardo", level: 4 }]; a.creationDone = true; a.locked = true;
      a.equipment = { ...a.equipment, weapons: [{ id: "stocco", name: "Stocco", qty: 1, equipped: true }] }; a.spells = [{ name: "Parola Guaritrice", dbId: "healing-word", prepared: true }]; return { roster: { a }, order: ["a"], activeId: "a" }; });
    await p0.close();
    await ctx.addInitScript((d) => { localStorage.setItem("characterDashboard_v2", JSON.stringify(d)); localStorage.setItem("gemma_nuovaUI", "1"); localStorage.setItem("ui_aspetto_v1", JSON.stringify({ theme: "str", v: "dark" })); }, d);
    const pg = await ctx.newPage(); pg.on("pageerror", (e) => errs.push(w + ": " + e.message));
    await pg.goto(URL); await pg.waitForSelector(".gx"); await pg.waitForTimeout(300);
    const fab = await pg.locator(".bugrep-fab").isVisible().catch(() => false);
    const barH = await pg.locator(".dash-bar").evaluate((e) => e.offsetHeight);
    const breve = await pg.getByRole("button", { name: "Riposo breve" }).first().isDisabled();
    const C = await pg.evaluate(() => null);
    console.log(w + "px: 🐞 flottante visibile " + fab + " · barra " + barH + " px · Riposo breve spento " + breve);
    await pg.screenshot({ path: "/tmp/nui/fix_" + w + ".png" });
    // Menu → Segnala un problema
    await pg.locator("button[aria-label*='enu'], .gx-menu, button:has-text('Aspetto'), button:has-text('⋯')").first().click().catch(() => {});
    const seg = pg.getByRole("button", { name: /Segnala un problema/ });
    if (await seg.count()) { await seg.click(); await pg.waitForTimeout(200); console.log("  pannello bug aperto dal Menu: " + (await pg.locator(".bugrep-panel").count() > 0)); }
    else console.log("  voce Segnala non trovata");
    await ctx.close();
  }
  console.log(errs.length ? "Errori: " + errs.join(" | ") : "Nessun errore JavaScript"); await b.close();
})();
