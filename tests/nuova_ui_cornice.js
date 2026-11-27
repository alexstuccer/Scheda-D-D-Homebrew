const path = require("path");
const { chromium } = require("playwright");
const URL = "file://" + path.resolve(process.argv[2]); const out = process.argv[3] || "/tmp/nui";
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox"] });
  const errs = [];
  for (const [w, h] of [[390, 844], [1280, 860]]) {
    // 1. pagina vuota
    let ctx = await browser.newContext({ viewport: { width: w, height: h } });
    await ctx.addInitScript(() => { localStorage.setItem("gemma_nuovaUI", "1"); });
    let pg = await ctx.newPage(); pg.on("pageerror", (e) => errs.push(w + " vuota: " + e.message));
    await pg.goto(URL); await pg.waitForSelector(".gx-inizio", { timeout: 8000 }); await pg.waitForTimeout(300);
    await pg.screenshot({ path: out + "/cornice_vuota_" + w + ".png" });
    // Crea vuota → schermata «crea con la classica»
    await pg.getByRole("button", { name: "Crea vuota" }).click(); await pg.waitForTimeout(400);
    await pg.screenshot({ path: out + "/cornice_creata_" + w + ".png" });
    await ctx.close();
    // 2. due personaggi, tema Pergamena chiaro
    ctx = await browser.newContext({ viewport: { width: w, height: h } });
    const p0 = await ctx.newPage(); await p0.goto(URL); await p0.waitForFunction(() => typeof INIT !== "undefined");
    const mk = await p0.evaluate(() => { const a = JSON.parse(JSON.stringify(INIT)); a.name = "Eliandra"; a.classes = [{ name: "Bardo", level: 4 }]; a.creationDone = true; a.locked = true;
      const b = JSON.parse(JSON.stringify(a)); b.name = "Thorin"; b.classes = [{ name: "Guerriero", level: 5 }]; return { roster: { a, b }, order: ["a", "b"], activeId: "a" }; });
    await p0.close();
    await ctx.addInitScript((d) => { localStorage.setItem("characterDashboard_v2", JSON.stringify(d)); localStorage.setItem("gemma_nuovaUI", "1"); localStorage.setItem("ui_aspetto_v1", JSON.stringify({ theme: "per", v: "light" })); }, mk);
    pg = await ctx.newPage(); pg.on("pageerror", (e) => errs.push(w + " pg: " + e.message));
    await pg.goto(URL); await pg.waitForSelector(".gx .gx-scroll, .gxd", { timeout: 8000 }); await pg.waitForTimeout(300);
    await pg.screenshot({ path: out + "/cornice_pg_" + w + ".png" });
    await pg.locator(".pg-tab", { hasText: "Thorin" }).click(); await pg.waitForTimeout(300);
    const nome = await pg.locator(".gx").first().innerText();
    console.log(w + "px: tab PG visibili " + (await pg.locator(".pg-tab").count()) + ", dopo il clic su Thorin: " + /Thorin/.test(nome));
    await ctx.close();
  }
  console.log(errs.length ? "Errori: " + errs.join(" | ") : "Nessun errore JavaScript");
  await browser.close();
})().catch((e) => { console.error(e); process.exit(2); });
