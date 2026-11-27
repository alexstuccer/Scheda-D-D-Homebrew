const path = require("path"); const { chromium } = require("playwright");
const URL = "file://" + path.resolve(process.argv[2]);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox"] }); const errs = [];
  for (const [w, f] of [[1280, "tel"], [1280, "auto"], [390, "pc"]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: 860 } });
    const p0 = await ctx.newPage(); await p0.goto(URL); await p0.waitForFunction(() => typeof INIT !== "undefined");
    const d = await p0.evaluate(() => { const a = JSON.parse(JSON.stringify(INIT)); a.name = "Eliandra"; a.classes = [{ name: "Bardo", level: 4 }]; a.creationDone = true; a.locked = true; return { roster: { a }, order: ["a"], activeId: "a" }; });
    await p0.close();
    await ctx.addInitScript(([d, f]) => { localStorage.setItem("characterDashboard_v2", JSON.stringify(d)); localStorage.setItem("gemma_nuovaUI", "1"); localStorage.setItem("ui_aspetto_v1", JSON.stringify({ theme: "str", v: "dark", f })); }, [d, f]);
    const pg = await ctx.newPage(); pg.on("pageerror", (e) => errs.push(e.message));
    await pg.goto(URL); await pg.waitForSelector(".gx[data-form]"); await pg.waitForTimeout(300);
    console.log(w + "px " + f + ": cornice desktop " + (await pg.locator(".gxd").count() > 0) + ", barra in basso " + (await pg.locator(".gx-scroll").count() > 0));
    await pg.screenshot({ path: "/tmp/nui/formato_" + w + "_" + f + ".png" });
    await ctx.close();
  }
  console.log(errs.length ? "Errori: " + errs.join(" | ") : "Nessun errore JavaScript"); await b.close();
})();
