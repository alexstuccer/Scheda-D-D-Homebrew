// 10.7.5 · creazione: lingue madrelingua (numero, famiglia, nome, famiglia nuova)
const path = require("path"); const { chromium } = require("playwright");
const URL = "file://" + path.resolve(process.argv[2]); const W = +(process.argv[3] || 390);
let ko = 0; const ok = (n, c, x) => { if (!c) ko++; console.log((c ? "OK  " : "KO  ") + W + "px " + n + (x !== undefined ? " · " + x : "")); };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox"] }); const errs = [];
  const ctx = await b.newContext({ viewport: { width: W, height: 900 } });
  const p0 = await ctx.newPage(); await p0.goto(URL); await p0.waitForFunction(() => typeof INIT !== "undefined");
  const d = await p0.evaluate(() => { const a = JSON.parse(JSON.stringify(INIT)); a.name = "Nuovo"; a.classes = [{ name: "Guerriero", level: 1 }]; a.creationDone = false; a.locked = false; a.raceId = RACES.filter(r => !r.choose && STATS.reduce((x, st) => x + ((r.bonuses || {})[st] || 0), 0) < 3)[0].id; return { roster: { a }, order: ["a"], activeId: "a" }; });
  await p0.close();
  await ctx.addInitScript((d) => { if (!sessionStorage.getItem("s")) { localStorage.setItem("characterDashboard_v2", JSON.stringify(d)); sessionStorage.setItem("s", "1"); } }, d);
  const pg = await ctx.newPage(); pg.setDefaultTimeout(5000); pg.on("pageerror", e => errs.push(e.message)); await pg.goto(URL); await pg.waitForSelector(".gx");
  try {
    await pg.locator(".gx-chip, button", { hasText: "4 Competenze" }).first().click(); await pg.waitForTimeout(200);
    ok("card delle madrelingue nel passo Competenze", (await pg.getByText("Lingue madrelingua").count()) >= 1);
    const piu = pg.getByRole("group", { name: "Numero di lingue madrelingua" }).getByRole("button", { name: "Più" });
    await piu.click(); await piu.click(); await pg.waitForTimeout(150);
    ok("tre madrelingue", (await pg.locator("select[aria-label^='Madrelingua']").count()) === 3);
    await pg.getByRole("button", { name: "+ Famiglia" }).click(); await pg.waitForTimeout(150);
    await pg.locator("select[aria-label='Madrelingua 3']").selectOption("4"); await pg.waitForTimeout(150);
    await pg.getByRole("textbox", { name: "Nome della madrelingua 1" }).fill("Italiano");
    await pg.getByRole("textbox", { name: "Nome della madrelingua 3" }).fill("Cinese"); await pg.waitForTimeout(150);
    const txt = await pg.locator(".gx-full").innerText();
    ok("punti spesi 0 con tre madrelingue", /spesi 0 su/.test(txt));
    ok("Italiano e Cinese nell'elenco a rank 8", /Italiano/.test(txt) && /Cinese/.test(txt));
    ok("talenti del bilancio razziale nel passo Competenze", /TALENTI DEL BILANCIO RAZZIALE/i.test(await pg.locator(".gx-full").innerText()));
    await pg.locator(".gx-row", { hasText: "La razza ha un bilancio" }).getByRole("button", { name: "Scegli" }).click();
    await pg.locator(".gx-search input").last().fill("Allerta"); await pg.waitForTimeout(150);
    await pg.locator(".gx-row", { hasText: "Allerta" }).getByRole("button", { name: "Aggiungi" }).first().click(); await pg.waitForTimeout(200);
    ok("talento razziale scelto: 1 su 2", /1 su 2 gratuiti/i.test(await pg.locator(".gx-full").innerText()));
    if (process.env.SHOT) await pg.screenshot({ path: process.env.SHOT + "_" + W + ".png" });
  } catch (e) { ko++; console.log("FALLITO " + e.message.split("\n")[0]); }
  if (errs.length) { ko++; console.log("ERRORI " + errs.join(" | ")); }
  console.log(ko ? ko + " KO" : "Nessun errore JavaScript, tutto OK"); await b.close(); process.exit(ko ? 1 : 0);
})();
