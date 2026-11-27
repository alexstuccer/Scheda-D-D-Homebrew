const path = require("path"); const { chromium } = require("playwright");
const URL = "file://" + path.resolve(process.argv[2]);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox"] }); const errs = [];
  for (const w of [390, 1280]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 844 } });
    const p0 = await ctx.newPage(); await p0.goto(URL); await p0.waitForFunction(() => typeof INIT !== "undefined");
    const d = await p0.evaluate(() => { const a = JSON.parse(JSON.stringify(INIT)); a.name = "Eliandra"; a.classes = [{ name: "Bardo", level: 4 }]; a.creationDone = true; a.locked = true; delete a.notes; return { roster: { a }, order: ["a"], activeId: "a" }; });
    await p0.close();
    await ctx.addInitScript((d) => { if (!sessionStorage.getItem("seed")) { sessionStorage.setItem("seed", "1"); localStorage.setItem("characterDashboard_v2", JSON.stringify(d)); } localStorage.setItem("ui_aspetto_v1", JSON.stringify({ theme: "str", v: "dark" })); }, d);
    const pg = await ctx.newPage(); pg.on("pageerror", (e) => errs.push(e.message));
    await pg.goto(URL); await pg.waitForSelector(".gx");
    if (w < 768) await pg.locator(".gx-bnav button, nav button", { hasText: "Scheda" }).first().click();
    else await pg.locator(".gxd-tabs button", { hasText: "Scheda" }).first().click();
    await pg.getByRole("button", { name: "Note", exact: true }).first().click();
    await pg.locator("textarea[aria-label='Note del personaggio']").fill("Deve 20 mo a Brunhild.\nCercare il tempio di Inges.");
    // cambio schermata subito, prima del mezzo secondo
    await pg.getByRole("button", { name: "Competenze", exact: true }).first().click(); await pg.waitForTimeout(2500);
    console.log("  prima della ricarica, in memoria:", await pg.evaluate(() => { try { const d = JSON.parse(localStorage.getItem("characterDashboard_v2")); return JSON.stringify((d.roster[d.activeId] || {}).notes); } catch (e) { return "?" + e.message; } }));
    await pg.reload(); await pg.waitForSelector(".gx");
    if (w < 768) await pg.locator(".gx-bnav button, nav button", { hasText: "Scheda" }).first().click();
    else await pg.locator(".gxd-tabs button", { hasText: "Scheda" }).first().click();
    await pg.getByRole("button", { name: "Note", exact: true }).first().click();
    const v = await pg.locator("textarea[aria-label='Note del personaggio']").inputValue();
    console.log(w + "px: note dopo ricarica:", JSON.stringify(v));
    if (w === 390) await pg.screenshot({ path: "/tmp/nui/note.png" });
    await ctx.close();
  }
  console.log(errs.length ? "Errori: " + errs.join(" | ") : "Nessun errore JavaScript"); await b.close();
})();
