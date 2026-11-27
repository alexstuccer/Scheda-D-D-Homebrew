const path = require("path"); const { chromium } = require("playwright");
const URL = "file://" + path.resolve(process.argv[2]);
const W = +(process.argv[3] || 390);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox"] }); const errs = [];
  const ctx = await b.newContext({ viewport: { width: W, height: 844 } });
  await ctx.addInitScript(() => { localStorage.setItem("ui_aspetto_v1", JSON.stringify({ theme: "str", v: "dark" })); });
  const pg = await ctx.newPage(); pg.on("pageerror", (e) => errs.push(e.message));
  const log = (...a) => console.log(W + "px", ...a);
  await pg.goto(URL); await pg.waitForSelector(".gx-inizio");
  await pg.getByRole("button", { name: "Crea vuota" }).click(); await pg.waitForTimeout(300);
  log("creazione nuova:", await pg.locator(".gx-full h2").first().innerText(), "· vecchio editor:", await pg.locator(".app").count());
  // Razza: Umano con 2 scelte
  await pg.locator(".gx-full .gx-row", { hasText: "Umano" }).first().click();
  const sel = pg.locator(".gx-full select");
  await sel.nth(0).selectOption("Forza"); await sel.nth(1).selectOption("Costituzione");
  await pg.getByRole("button", { name: "Avanti" }).click();
  await pg.locator(".gx-full .gx-chip", { hasText: "Guerriero" }).click();
  await pg.getByRole("button", { name: "Avanti" }).click();
  // Caratteristiche: For 15, Des 14, Cos 14
  const piu = (lab, n) => pg.locator(`[aria-label='${lab}'] button[aria-label='Più']`).click({ clickCount: 1 }).then(async () => { for (let k = 1; k < n; k++) await pg.locator(`[aria-label='${lab}'] button[aria-label='Più']`).click(); });
  await piu("Punteggio di Forza", 7); await piu("Punteggio di Destrezza", 6); await piu("Punteggio di Costituzione", 6);
  log("point buy rimasti:", await pg.locator(".gx-full .gx-pool b").first().innerText());
  await pg.getByRole("button", { name: "Avanti" }).click();
  await pg.locator(".gx-full .gx-search input").fill("archi");
  await pg.locator(".gx-full [aria-label='Rank di Archi'] button[aria-label='Più']").click();
  log("rank Archi max 1 alla creazione:", await pg.locator(".gx-full [aria-label='Rank di Archi'] button[aria-label='Più']").isDisabled());
  log("punti competenza:", await pg.locator(".gx-full .gx-pool b").first().innerText());
  await pg.getByRole("button", { name: "Avanti" }).click();
  await pg.locator(".gx-full input[aria-label='Nome']").fill("Brann");
  await pg.getByRole("button", { name: "Avanti" }).click();
  const crea = pg.getByRole("button", { name: "Crea il personaggio" });
  log("conferma abilitata:", await crea.isEnabled());
  await crea.click(); await pg.waitForTimeout(300);
  log("dopo la creazione: wizard chiuso", (await pg.locator(".gx-full").count()) === 0, "· vecchio editor:", await pg.locator(".app").count());
  // Equipaggiamento: arco lungo dal catalogo
  const vai = async (nome) => { if (W < 768) await pg.locator(".gx-bnav button, nav button", { hasText: nome }).first().click(); else await pg.locator(".gxd-tabs button", { hasText: nome }).first().click(); await pg.waitForTimeout(150); };
  await vai("Scheda");
  await pg.getByRole("button", { name: "Equipaggiamento", exact: true }).click();
  await pg.getByRole("button", { name: /Arma dal catalogo/ }).click();
  await pg.locator(".gx-sheet .gx-search input").fill("arco lungo");
  await pg.locator(".gx-sheet .gx-row", { hasText: "Arco lungo" }).first().getByRole("button", { name: "Aggiungi" }).click();
  await pg.keyboard.press("Escape");
  await pg.getByRole("switch", { name: /Impugna Arco/ }).or(pg.locator("[aria-label^='Impugna Arco']")).first().click();
  const hit = async () => { await vai("Attacchi"); const t = await pg.locator(".gx-scroll, .gxd").first().innerText(); return (t.match(/Per colpire\s*([+−-]\d+)/) || [])[1]; };
  log("per colpire arco:", await hit());
  await vai("Scheda"); await pg.getByRole("button", { name: "Equipaggiamento", exact: true }).click();
  await pg.locator("[aria-label^='Proprietà di Arco']").click();
  await pg.locator(".gx-sheet [aria-label='Incantamento'] button[aria-label='Più']").click();
  await pg.keyboard.press("Escape");
  log("con +1 di incantamento:", await hit());
  // Modificatori: Archery
  await vai("Scheda"); await pg.getByRole("button", { name: "Modificatori", exact: true }).click();
  await pg.getByRole("button", { name: "+ Aggiungi privilegio o talento" }).click();   // 10.6: Archery è nell'archivio dei privilegi
  await pg.locator(".gx-row", { hasText: "Stile di combattimento: Tiro" }).first().getByRole("button", { name: "Aggiungi" }).click();   // 10.7: nome dai dati di ARCHETIPI
  log("con Archery:", await hit());
  // Iniziativa +5 con un modificatore nuovo
  await vai("Scheda"); await pg.getByRole("button", { name: "Modificatori", exact: true }).click();
  await pg.getByRole("button", { name: "+ Nuovo modificatore" }).click();
  await pg.locator("input[aria-label='Nome']").last().fill("Allerta");
  for (let k = 0; k < 4; k++) await pg.locator("[aria-label='Valore'] button[aria-label='Più']").click();
  await pg.locator(".gx-chip", { hasText: "Iniziativa" }).click();
  await pg.getByRole("button", { name: "Aggiungi il modificatore" }).click();
  const C = await pg.evaluate(() => null);
  const txt = await pg.locator(".gx").first().innerText();
  log("iniziativa visibile:", (txt.match(/Inizi[^\n]*\n?\s*([+−-]\d+)/) || [])[1]);
  // Magia: catalogo
  await vai("Magia");
  await pg.getByRole("button", { name: "+ Dal catalogo" }).click();
  await pg.locator(".gx-sheet select").first().selectOption("__tutte__");
  await pg.locator(".gx-sheet .gx-search input").fill("dardo incantato");
  await pg.locator(".gx-sheet .gx-row", { hasText: "Dardo Incantato" }).first().getByRole("button", { name: "Aggiungi" }).click();
  await pg.keyboard.press("Escape");
  log("repertorio:", (await pg.locator(".gx-row", { hasText: "Dardo Incantato" }).count()) > 0);
  // Master
  await pg.locator("button[aria-label*='enu']").first().click().catch(() => {});
  await pg.getByRole("button", { name: /Modifica scheda/ }).click(); await pg.waitForTimeout(200);
  log("Master aperto:", await pg.locator(".gx-full h2").first().innerText());
  await pg.locator(".gx-full input[aria-label='Nome']").fill("Brann il Saldo");
  await pg.getByRole("button", { name: /Fine · blocca/ }).click(); await pg.waitForTimeout(200);
  log("nome dopo Master:", /Brann il Saldo/.test(await pg.locator(".gx").first().innerText()), "· vecchio editor:", await pg.locator(".app").count());
  await pg.screenshot({ path: "/tmp/nui/v105_" + W + ".png" });
  console.log(errs.length ? "Errori: " + errs.join(" | ") : "Nessun errore JavaScript"); await b.close();
})().catch(e => { console.error("FALLITO", e.message.split("\n")[0]); process.exit(2); });
