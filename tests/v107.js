// 10.7 · interfaccia di privilegi e talenti: archivio con scelte, modificatori dai privilegi, talento al level-up, CA in dettaglio
// Uso: CHROME=... node v107.js scheda.html 390|1280
const path = require("path"); const { chromium } = require("playwright");
const URL = "file://" + path.resolve(process.argv[2]);
const W = +(process.argv[3] || 390);
let ko = 0; const ok = (n, c, x) => { if (!c) ko++; console.log((c ? "OK  " : "KO  ") + W + "px " + n + (x !== undefined ? " · " + x : "")); };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox"] }); const errs = [];
  const ctx = await b.newContext({ viewport: { width: W, height: 900 } });
  const p0 = await ctx.newPage(); await p0.goto(URL); await p0.waitForFunction(() => typeof INIT !== "undefined");
  const d = await p0.evaluate(() => { const a = JSON.parse(JSON.stringify(INIT)); a.name = "Gunnar"; a.classes = [{ name: "Guerriero", level: 3 }]; a.creationDone = true; a.locked = true;
    a.stats = { Forza: 15, Destrezza: 14, Costituzione: 13, Intelligenza: 10, Saggezza: 12, Carisma: 8 }; a.savedPoints = 100;
    const am = SD.findIndex(s => s.n === "Armature Medie"); a.skills[am] = Object.assign({}, a.skills[am], { rank: 2 });
    a.equipment = Object.assign({}, a.equipment, { armor: Object.assign({}, (a.equipment || {}).armor, { medium: { caBase: 4, bonusSpec: 0, equipped: true } }) });
    return { roster: { a }, order: ["a"], activeId: "a" }; });
  await p0.close();
  await ctx.addInitScript((d) => { if (!sessionStorage.getItem("seed")) { localStorage.setItem("characterDashboard_v2", JSON.stringify(d)); sessionStorage.setItem("seed", "1"); }
    localStorage.setItem("ui_aspetto_v1", JSON.stringify({ theme: "str", v: "dark" })); }, d);
  const pg = await ctx.newPage(); pg.setDefaultTimeout(6000); pg.on("pageerror", e => errs.push(e.message));
  await pg.goto(URL); await pg.waitForSelector(".gx");
  const vai = async (n) => { if (W < 768) await pg.locator(".gx-bnav button, nav button", { hasText: n }).first().click(); else await pg.locator(".gxd-tabs button", { hasText: n }).first().click().catch(async () => pg.locator("nav button", { hasText: n }).first().click()); await pg.waitForTimeout(150); };
  const testo = () => pg.locator(".gx").first().innerText();
  try {
    // CA in dettaglio (N-01)
    await vai("Scheda"); await pg.getByRole("button", { name: "Equipaggiamento", exact: true }).click().catch(() => {});
    const t0 = await testo(); const m = t0.match(/CA (\d+) = ([^\n]+)/);
    ok("CA in dettaglio sotto «Armatura e scudo»", !!m && /armatura media/.test(m[2]) && /Destrezza/.test(m[2]), m && m[0]);
    const ca0 = m ? +m[1] : 0;
    // archivio: stile Difesa (sospeso) → acceso → CA +1
    await pg.getByRole("button", { name: "Modificatori", exact: true }).click();
    await pg.getByRole("button", { name: "+ Aggiungi privilegio o talento" }).click();
    const nTuoi = await pg.locator(".gx-row", { hasText: "Guerriero" }).filter({ has: pg.getByRole("button", { name: /Aggiungi|Scegli/ }) }).count();
    ok("archivio «Delle tue classi»: privilegi del Guerriero fino al 3°", nTuoi >= 5, nTuoi);
    await pg.locator(".gx-row", { hasText: "Stile di combattimento: Difesa" }).first().getByRole("button", { name: "Aggiungi" }).click();
    await pg.waitForTimeout(150);
    const rigaD = pg.locator(".gx-row", { hasText: "Stile di combattimento: Difesa" }).filter({ hasText: "situazionale" }).first();
    ok("Difesa: modificatore sospeso in Modificatori fissi", (await rigaD.count()) === 1);
    await rigaD.locator(".gx-tog").click(); await pg.waitForTimeout(100);
    await pg.getByRole("button", { name: "Equipaggiamento", exact: true }).click().catch(() => {});
    const m2 = (await testo()).match(/CA (\d+) = /);
    ok("Difesa accesa: CA +1", m2 && +m2[1] === ca0 + 1, m2 && m2[1] + " (prima " + ca0 + ")");
    // Talenti fuori dal level-up: solo il master
    await pg.getByRole("button", { name: "Modificatori", exact: true }).click();
    await pg.getByRole("button", { name: "+ Aggiungi privilegio o talento" }).click();
    await pg.getByRole("button", { name: "Talenti", exact: true }).click();
    ok("Talenti fuori dal level-up: messaggio P-102, nessun pulsante", /si comprano nel passaggio di livello/.test(await testo()));
    // level-up 3 → 4: talento
    await vai("Scheda"); await pg.getByRole("button", { name: "Level-up" }).click(); await pg.waitForTimeout(250);
    const lv = await pg.locator(".gx-full").innerText().catch(() => testo());
    ok("level-up: sezione Talento all'aumento di caratteristica", /TALENTO/i.test(lv) && /aumento di caratteristica a questo livello/i.test(lv), lv.slice(lv.search(/TALENTO/i), lv.search(/TALENTO/i) + 80).replace(/\s+/g, " "));
    ok("level-up al 4°: sezione «Aumento di caratteristica» visibile", /AUMENTO DI CARATTERISTICA/i.test(lv));
    await pg.locator("[aria-label='Punteggio di Forza'] button[aria-label='Più']").click(); await pg.waitForTimeout(100);
    ok("aumento: +1 su +2", /\+1 su \+2/i.test(await pg.locator(".gx-full").innerText()));
    await pg.getByRole("button", { name: "Scegli un talento" }).click();
    await pg.locator(".gx-search input").last().fill("Resiliente"); await pg.waitForTimeout(150);
    const rr = pg.locator(".gx-row", { hasText: "Resiliente" }).filter({ has: pg.getByRole("button", { name: "Scegli" }) }).first();
    ok("Resiliente con il prezzo per il Guerriero", /punti/.test(await rr.innerText()), (await rr.innerText()).replace(/\s+/g, " "));
    await rr.getByRole("button", { name: "Scegli" }).click(); await pg.waitForTimeout(150);
    const compra = pg.getByRole("button", { name: /^Compra/ });
    ok("senza scelte né accordo: «Compra» disattivato", await compra.isDisabled());
    await pg.locator("select[aria-label='Caratteristica']").selectOption("Costituzione"); await pg.waitForTimeout(100);
    ok("scelta fatta, manca l'accordo del master: ancora disattivato", await compra.isDisabled());
    await pg.getByRole("button", { name: "Il master è d'accordo" }).click(); await pg.waitForTimeout(100);
    const lab = await compra.innerText();
    ok("con l'accordo: «Compra per N punti»", !(await compra.isDisabled()) && /Compra per \d+ punti/.test(lab), lab);
    if (process.env.SHOT) await pg.screenshot({ path: process.env.SHOT + "_form_" + W + ".png", fullPage: false });
    await compra.click(); await pg.waitForTimeout(200);
    const lv2 = await pg.locator(".gx-full").innerText().catch(() => testo());
    ok("talento comprato: vale dal 5° livello", /Resiliente/.test(lv2) && /vale dal 5° livello/.test(lv2));
    await pg.getByRole("button", { name: "Applica" }).click(); await pg.waitForTimeout(250);
    await vai("Scheda"); await pg.getByRole("button", { name: "Modificatori", exact: true }).click();
    if (process.env.SHOT) await pg.screenshot({ path: process.env.SHOT + "_lista_" + W + ".png", fullPage: true });
    ok("dopo il level-up: Resiliente in addestramento", /in addestramento: vale dal 5° livello/.test(await testo()));
  } catch (e) { ko++; console.log("FALLITO " + e.message.split("\n")[0]); }
  if (errs.length) { ko++; console.log("ERRORI PAGINA: " + errs.join(" | ")); }
  console.log(ko ? ko + " KO" : "Nessun errore JavaScript, tutto OK");
  await b.close(); process.exit(ko ? 1 : 0);
})();
