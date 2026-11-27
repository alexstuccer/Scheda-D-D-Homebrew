const path = require("path"); const { chromium } = require("playwright");
const URL = "file://" + path.resolve(process.argv[2]);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox"] }); const errs = [];
  const ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });
  const pg = await ctx.newPage(); pg.on("pageerror", (e) => errs.push(e.message));
  await pg.goto(URL); await pg.waitForSelector(".gx-inizio");
  await pg.locator(".gx-opt", { hasText: "Pergamena" }).click(); await pg.waitForTimeout(200);
  console.log("tema pagina iniziale:", await pg.locator(".gx").first().getAttribute("data-theme"), "· tema barra:", await pg.locator(".gx-dash").getAttribute("data-theme"));
  await pg.screenshot({ path: "/tmp/nui/v104_perg.png" });
  await pg.getByRole("button", { name: "Crea vuota" }).click(); await pg.waitForTimeout(300);
  await pg.getByRole("button", { name: /editor completo/ }).first().click(); await pg.waitForTimeout(300);
  console.log("editor completo aperto:", (await pg.locator(".app").count()) > 0, "· pulsante Torna:", await pg.locator(".ui-switch").innerText());
  await pg.locator(".ui-switch").click(); await pg.waitForTimeout(300);
  console.log("di nuovo nella scheda nuova:", (await pg.locator(".gx-dash").count()) > 0 && (await pg.locator(".app").count()) === 0);
  console.log(errs.length ? "Errori: " + errs.join(" | ") : "Nessun errore JavaScript"); await b.close();
})();
