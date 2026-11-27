// 10.7.9 · cartella dei salvataggi: niente «Cambia cartella», niente gestione campagne, una cartella vuota non cancella i personaggi
// Simula la File System Access API in memoria. Uso: CHROME=/percorso/chrome node cartella.js scheda.html
const path = require("path"); const { chromium } = require("playwright");
const URL = "file://" + path.resolve(process.argv[2]);
const FINTA = () => {
  const mkFile = (name, text) => ({ kind: "file", name, _t: text,
    async getFile(){ const t = this._t; return { text: async () => t }; },
    async createWritable(){ const f = this; let buf = ""; return { async write(x){ buf += x; }, async close(){ f._t = buf; } }; } });
  const mkDir = (name) => ({ kind: "directory", name, _c: {},
    async *values(){ for (const k of Object.keys(this._c)) yield this._c[k]; },
    async getDirectoryHandle(n, o){ if (!this._c[n]) { if (!(o && o.create)) throw new DOMException("no", "NotFoundError"); this._c[n] = mkDir(n); } return this._c[n]; },
    async getFileHandle(n, o){ if (!this._c[n]) { if (!(o && o.create)) throw new DOMException("no", "NotFoundError"); this._c[n] = mkFile(n, ""); } return this._c[n]; },
    async removeEntry(n){ delete this._c[n]; },
    async queryPermission(){ return "granted"; }, async requestPermission(){ return "granted"; } });
  window.__fs = { mkDir, mkFile, prossima: null };
  window.showDirectoryPicker = async () => window.__fs.prossima;
};
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox"] });
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 } });
  const errs = []; pg.on("pageerror", e => errs.push(e.message));
  pg.on("dialog", d => d.accept());
  await pg.addInitScript(FINTA);
  const R = []; const ok = (n, c, x) => R.push([c ? "OK  " : "KO  ", n, x === undefined ? "" : " · " + JSON.stringify(x)]);
  await pg.goto(URL); await pg.waitForFunction(() => typeof INIT !== "undefined");
  // un personaggio solo nel browser
  await pg.evaluate(() => {
    const a = JSON.parse(JSON.stringify(INIT)); a.name = "Brunilde"; a.classes = [{ name: "Guerriero", level: 3 }]; a.creationDone = true; a.locked = true;
    localStorage.setItem("characterDashboard_v2", JSON.stringify({ version: 4, campaigns: [{ folderName: "Default" }], activeCampaign: "Default",
      rostersByCamp: { Default: { p1: a } }, ordersByCamp: { Default: ["p1"] }, fileMapsByCamp: { Default: {} }, activeId: "p1" }));
  });
  await pg.reload(); await pg.waitForTimeout(1200);
  const testo = async () => (await pg.textContent("body")) || "";
  ok("il personaggio del browser si vede", /Brunilde/.test(await testo()));
  ok("barra: niente ＋ ✎ 🗑 delle campagne", await pg.locator('button[title="Nuova campagna"], button[title="Rinomina campagna"], button[title="Elimina campagna"]').count() === 0);
  ok("barra: con una campagna sola niente menu", await pg.locator("select.camp").count() === 0);
  // collega una cartella vuota
  await pg.evaluate(() => { window.__fs.prossima = window.__fs.mkDir("Vuota"); window.__vuota = window.__fs.prossima; });
  await pg.click(".dash-gear"); await pg.click("text=Scegli cartella"); await pg.waitForTimeout(1500);
  ok("cartella vuota: il personaggio resta", /Brunilde/.test(await testo()));
  const su = await pg.evaluate(() => { const d = window.__vuota._c.Default; return d ? Object.keys(d._c) : null; });
  ok("cartella vuota: il personaggio viene scritto in Default/", su && su.some(n => /brunilde/i.test(n)), su);
  const ls = await pg.evaluate(() => JSON.parse(localStorage.getItem("characterDashboard_v2")));
  ok("cartella vuota: la copia nel browser ha ancora il personaggio", JSON.stringify(ls).indexOf("Brunilde") >= 0);
  ok("copia di sicurezza fatta", await pg.evaluate(() => !!localStorage.getItem("characterDashboard_v2_prima_della_cartella")));
  // impostazioni con cartella collegata: niente «Cambia cartella»
  await pg.click(".dash-gear").catch(() => {}); await pg.waitForTimeout(300);
  if (!(await pg.locator(".dash-settings").count())) { await pg.click(".dash-gear"); await pg.waitForTimeout(300); }
  ok("impostazioni: c'è la cartella attiva", /Cartella attiva/.test(await pg.textContent(".dash-settings")));
  ok("impostazioni: niente «Cambia cartella»", await pg.locator("text=Cambia cartella").count() === 0);
  // seconda pagina pulita: una cartella tipo «Documenti» con sottocartelle qualsiasi e una sola con schede
  const p2 = await b.newPage({ viewport: { width: 1280, height: 900 } }); p2.on("pageerror", e => errs.push(e.message)); p2.on("dialog", d => d.accept());
  await p2.addInitScript(FINTA); await p2.goto(URL); await p2.waitForFunction(() => typeof INIT !== "undefined");
  await p2.evaluate(() => localStorage.clear()); await p2.reload(); await p2.waitForTimeout(1000);
  await p2.evaluate(() => {
    const F = window.__fs, doc = F.mkDir("Documenti");
    ["Lavoro", "Foto", "Bollette"].forEach(n => { doc._c[n] = F.mkDir(n); doc._c[n]._c["nota.txt"] = F.mkFile("nota.txt", "x"); });
    const g = F.mkDir("Gemma"); const a = JSON.parse(JSON.stringify(INIT)); a.name = "Ortensia"; a.classes = [{ name: "Mago", level: 2 }]; a.creationDone = true;
    g._c["Ortensia.json"] = F.mkFile("Ortensia.json", JSON.stringify(a)); doc._c.Gemma = g; F.prossima = doc;
  });
  await p2.click(".dash-gear"); await p2.click("text=Scegli cartella"); await p2.waitForTimeout(1500);
  ok("Documenti: carica il personaggio della sottocartella con le schede", /Ortensia/.test((await p2.textContent("body")) || ""));
  ok("Documenti: le sottocartelle senza schede non diventano campagne (niente menu)", await p2.locator("select.camp").count() === 0);
  let ko = 0; R.forEach(r => { if (r[0].trim() === "KO") ko++; console.log(r.join(" ")); });
  if (errs.length) { console.log("errori pagina:", errs.slice(0, 3)); ko++; }
  console.log(ko ? ko + " KO" : "tutto OK"); await b.close(); process.exit(ko ? 1 : 0);
})();
