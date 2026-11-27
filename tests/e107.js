// 10.7 · motore di privilegi e talenti: prove su useCharacter direttamente (senza interfaccia)
// Uso: node e107.js dashboard.html [dati]   dati = "fixture" (sottoinsieme di prova) oppure "veri" (src/data dei chat)
const path = require("path"); const { chromium } = require("playwright");
const URL = "file://" + path.resolve(process.argv[2]);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROME, args: ["--no-sandbox"] });
  const pg = await b.newPage(); const errs = []; pg.on("pageerror", e => errs.push(e.message));
  await pg.goto(URL); await pg.waitForFunction(() => typeof INIT !== "undefined" && typeof useCharacter === "function");
  const out = await pg.evaluate(() => {
    const R = []; const ok = (n, c, x) => R.push([c ? "OK  " : "KO  ", n, x === undefined ? "" : " · " + JSON.stringify(x)]);
    const env = { rolls: [], mode: "norm" };
    const mk = (cls, lv, stats, patch) => { const a = JSON.parse(JSON.stringify(INIT)); a.name = "T"; a.classes = [{ name: cls, level: lv }]; a.creationDone = true; a.locked = true;
      a.stats = Object.assign({ Forza: 14, Destrezza: 14, Costituzione: 14, Intelligenza: 10, Saggezza: 12, Carisma: 10 }, stats || {}); a.savedPoints = 0; return Object.assign(a, patch || {}); };
    const run = (ch) => { let cur = ch; const set = (c) => { cur = c; }; const C = () => useCharacter(cur, set, env); return { C, get: () => cur, set }; };
    const sk = (n) => SD.findIndex(s => s.n === n);
    const skill = (C, n) => C().skills.filter(s => s.i === sk(n))[0] || C().skills.filter(s => s.name === n)[0];
    ok("dati caricati senza errori", PRIV_ERRORI.length === 0, PRIV_ERRORI.slice(0, 5));
    ok("record pronti nel catalogo", PRIVILEGI.length > 0, PRIVILEGI.length + " · " + JSON.stringify(PRIV_FONTE_DATI));
    // 1 · Allerta: +5 iniziativa
    let t = run(mk("Guerriero", 4)); const i0 = t.C().init;
    let r = t.C().act.addPrivilegio("tal-allerta", {}); ok("Allerta si aggiunge (master/creazione non richiesti dal motore)", r && r.uid, r);
    ok("Allerta: iniziativa +5", t.C().init === i0 + 5, [i0, t.C().init]);
    ok("Allerta: non si prende due volte", !!t.C().act.addPrivilegio("tal-allerta", {}).errore);
    // 2 · Robusto: +2 PF per livello
    t = run(mk("Guerriero", 4)); const hp0 = t.C().hp.max; t.C().act.addPrivilegio("tal-robusto", {});
    ok("Robusto: +2 × 4 livelli = +8 PF", t.C().hp.max === hp0 + 8, [hp0, t.C().hp.max]);
    // 3 · Resiliente (Costituzione): +1 al punteggio, rank 1 gratis e costo −1 sul TS
    t = run(mk("Mago", 4, { Costituzione: 13 })); const tsC = sk("Costituzione");
    const m0 = t.C().mods.Costituzione, sum0 = t.C().points;
    r = t.C().act.addPrivilegio("tal-resiliente", {}); ok("Resiliente senza scelta: rifiutato", !!r.errore, r.errore);
    r = t.C().act.addPrivilegio("tal-resiliente", { car: "Costituzione" }); ok("Resiliente con la scelta: aggiunto", !!r.uid, r);
    ok("Resiliente: Costituzione 13 → 14 (mod +1)", t.C().stats.Costituzione.score === 14 && t.C().mods.Costituzione === m0 + 1, [t.C().stats.Costituzione.score, t.C().mods.Costituzione]);
    const ts = t.C().skills.filter(s => s.i === tsC)[0];
    ok("Resiliente: TS Costituzione rank 1 gratis", ts.rank === 1 && ts.gratis === 1, [ts.rank, ts.gratis]);
    ok("Resiliente: costo −1 (minimo 1)", ts.cost === Math.max(1, (SD[tsC].k.Mago || 2) - 1), [ts.cost, SD[tsC].k.Mago]);
    // 4 · Corazze Pesanti: prerequisito rank ≥ 1 in Armature Medie, poi rank gratis
    t = run(mk("Guerriero", 4));
    r = t.C().act.addPrivilegio("tal-corazzato-pesante", {}); ok("Corazze Pesanti senza Armature Medie: requisito mancante", !!r.errore && /Armature Medie/.test(r.errore), r.errore);
    r = t.C().act.addPrivilegio("tal-corazzato-pesante", {}, { forza: true }); ok("Corazze Pesanti: il master lo concede", !!r.uid);
    ok("Corazze Pesanti: segnato «forzato»", (t.get().privilegi[0].forzato || []).length === 1);
    ok("Corazze Pesanti: Armature Pesanti rank 1 gratis", skill(t.C, "Armature Pesanti").rank === 1);
    ok("Corazze Pesanti: Forza +1", t.C().stats.Forza.score === 15);
    // 5 · ripiego (P-100): Corazze Pesanti quando Armature Pesanti è già regalata → serve un'altra competenza della stessa categoria
    t = run(mk("Guerriero", 4)); const am = sk("Armature Medie"); t.get().skills[am] = Object.assign({}, t.get().skills[am], { rank: 2 });
    t.C().act.addPrivilegio("tal-corazzato-pesante", {});   // primo: rank gratis su Armature Pesanti
    const sc = t.C().privScelte("tal-resiliente", { car: "Forza" });
    ok("Resiliente (Forza): niente ripiego se il TS non è regalato", sc.filter(x => x.ripiego).length === 0, sc.map(x => x.chiave));
    // 6 · Abile: 3 competenze distinte, rank gratis su tutte
    t = run(mk("Guerriero", 4));
    const opz = t.C().privScelte("tal-abile", {})[0];
    const catAb = PRIV_BY_ID["tal-abile"].scelte[0].filtro.map(f => f.replace(/^cat:/, ""));
    ok("Abile: opzioni solo dalle categorie ammesse", opz.opzioni.every(o => catAb.indexOf(SD[o.i].c) >= 0) && opz.numero === 3, opz.opzioni.length);
    const tre = opz.opzioni.slice(0, 3).map(o => o.v);
    r = t.C().act.addPrivilegio("tal-abile", { competenze: tre }); ok("Abile con 3 scelte: aggiunto", !!r.uid, r);
    ok("Abile: 3 rank gratis", tre.every(n => skill(t.C, n).rank === 1), tre.map(n => skill(t.C, n).rank));
    ok("Abile: prezzo con la formula (Guerriero)", typeof t.C().privPrezzo("tal-abile", { competenze: tre }) === "number", t.C().privPrezzo("tal-abile", { competenze: tre }));
    // 7 · Linguista: 3 lingue a rank 8 gratis
    t = run(mk("Mago", 4)); const lng = t.C().privScelte("tal-linguista", {})[0];
    ok("Linguista: scelta di 3 lingue", lng.tipo === "lingua" && lng.numero === 3 && lng.opzioni.length >= 3, lng.opzioni.length);
    const l3 = lng.opzioni.slice(0, 3).map(o => o.v);
    t.C().act.addPrivilegio("tal-linguista", { lingue: l3 });
    ok("Linguista: lingue a rank 8 gratis", l3.every(n => skill(t.C, n).rank === 8), l3.map(n => skill(t.C, n).rank));
    // 8 · Adepto Marziale: due manovre con rank ≥ 1, +1 permanente e dado d6 a riposo breve
    t = run(mk("Guerriero", 4)); ["Parata", "Contrattacco"].forEach(n => { const k = sk(n); t.get().skills[k] = Object.assign({}, t.get().skills[k], { rank: 2 }); });
    const man = t.C().privScelte("tal-adepto-marziale", {})[0];
    ok("Adepto Marziale: opzioni = manovre con rank ≥ 1", man.opzioni.length === 2, man.opzioni.map(o => o.v));
    const p0 = skill(t.C, "Parata").tot;
    t.C().act.addPrivilegio("tal-adepto-marziale", { manovre: ["Parata", "Contrattacco"] });
    ok("Adepto Marziale: +1 permanente su Parata", skill(t.C, "Parata").tot === p0 + 1, [p0, skill(t.C, "Parata").tot]);
    const f = t.C().features.filter(x => /superiorità/.test(x.name));
    ok("Adepto Marziale: 1 dado, riposo breve", f.length === 1 && f[0].uses.max === 1 && f[0].uses.rest === "breve", f);
    t.C().act.use(f[0].key, 1); ok("uso speso", t.C().features.filter(x => x.key === f[0].key)[0].uses.spent === 1);
    t.C().act.rest("breve"); ok("riposo breve: il dado torna", t.C().features.filter(x => x.key === f[0].key)[0].uses.spent === 0);
    // 9 · Duellante Difensivo: Destrezza 13 e Parata ≥ 1
    t = run(mk("Guerriero", 4, { Destrezza: 12 }));
    r = t.C().act.addPrivilegio("tal-duellante-difensivo", {}); ok("Duellante Difensivo: requisiti mancanti elencati", r.errore && /Destrezza 13/.test(r.errore) && /Parata/.test(r.errore), r.errore);
    // 10 · Iniziato alla Magia: lista → trucchetti filtrati per classe e livello, incantesimi nel repertorio
    t = run(mk("Guerriero", 4));
    let sv = t.C().privScelte("tal-iniziato-magia", { lista: "Mago" });
    const tr = sv.filter(x => x.chiave === "trucchetti")[0], i1 = sv.filter(x => x.chiave === "inc1")[0];
    ok("Iniziato alla Magia: trucchetti da mago di livello 0", tr.opzioni.length > 5 && tr.opzioni.every(o => SPELLS_BY_ID[o.v].level === 0 && SPELLS_BY_ID[o.v].classesHb.indexOf("Mago") >= 0), tr.opzioni.length);
    r = t.C().act.addPrivilegio("tal-iniziato-magia", { lista: "Mago", trucchetti: [tr.opzioni[0].v, tr.opzioni[1].v], inc1: i1.opzioni[0].v });
    ok("Iniziato alla Magia: aggiunto", !!r.uid, r);
    const ss = t.C().spells.filter(s => s.source === "talento");
    ok("Iniziato alla Magia: 3 incantesimi dal talento", ss.length === 3, ss.map(s => s.name + " " + s.freq));
    ok("Iniziato alla Magia: 1° livello con un uso senza PM a riposo lungo", t.C().features.some(x => /senza PM/.test(x.name) && x.uses.rest === "lungo"));
    // 11 · stili: Tiro +2 alle armi da tiro, Difesa sospeso finché non lo accendi, un solo stile per classe
    t = run(mk("Guerriero", 1)); const a0 = skill(t.C, "Archi").tot, ca0 = t.C().ca.total;
    t.C().act.addPrivilegio("guerriero-stile-tiro", {});
    ok("Tiro: Archi +2", skill(t.C, "Archi").tot === a0 + 2, [a0, skill(t.C, "Archi").tot]);
    r = t.C().act.addPrivilegio("guerriero-stile-difesa", {}); ok("Difesa: rifiutato, uno stile per classe", !!r.errore, r.errore);
    t = run(mk("Guerriero", 1)); t.C().act.addPrivilegio("guerriero-stile-difesa", {});
    const md = t.C().modifiers.filter(m => m.derivato && m.bersagli.indexOf("ca") >= 0)[0];
    ok("Difesa: modificatore sospeso", md && md.attivo === false && t.C().ca.total === ca0, md);
    t.C().act.setModifier(md.id, { attivo: true }); ok("Difesa: acceso → CA +1", t.C().ca.total === ca0 + 1, [ca0, t.C().ca.total]);
    // 12 · Due armi (P-104): senza rank nella manovra = rank 1 + costo −1; con rank ≥ 1 = +1 permanente
    t = run(mk("Guerriero", 1)); t.C().act.addPrivilegio("guerriero-stile-due-armi", {});
    ok("Due armi senza rank: rank 1 gratis nella manovra", skill(t.C, "Combattimento a 2 armi").rank === 1, t.get().privilegi[0].risolto);
    t = run(mk("Guerriero", 1)); const k2 = sk("Combattimento a 2 armi"); t.get().skills[k2] = Object.assign({}, t.get().skills[k2], { rank: 1 });
    const d0 = skill(t.C, "Combattimento a 2 armi").tot; t.C().act.addPrivilegio("guerriero-stile-due-armi", {});
    ok("Due armi con rank 1: +1 permanente", skill(t.C, "Combattimento a 2 armi").tot === d0 + 1 && skill(t.C, "Combattimento a 2 armi").rank === 1, t.get().privilegi[0].risolto);
    // 13 · usi: Ira a tabella, Percezione del divino = 1 + Car, Imposizione delle mani = 5 × livello
    t = run(mk("Barbaro", 6)); t.C().act.addPrivilegio("barbaro-ira", {});
    ok("Ira al 6°: 4 usi a riposo lungo", t.C().features.filter(x => x.name === "Ira")[0].uses.max === 4);
    t = run(mk("Paladino", 3, { Carisma: 16 })); t.C().act.addPrivilegio("paladino-percezione-divino", {}); t.C().act.addPrivilegio("paladino-imposizione-mani", {});
    ok("Percezione del divino: 1 + Carisma = 4", t.C().features.filter(x => /divino/.test(x.name))[0].uses.max === 1 + t.C().mods.Carisma, t.C().mods.Carisma);
    ok("Imposizione delle mani al 3°: 15", t.C().features.filter(x => /Imposizione/.test(x.name))[0].uses.max === 15);
    // 14 · Aura di protezione: + Carisma (minimo 1) ai TS, sospesa (vale entro 3 m)
    t = run(mk("Paladino", 6, { Carisma: 8 })); t.C().act.addPrivilegio("paladino-aura-protezione", {});
    const au = t.C().modifiers.filter(m => m.derivato && /Aura/.test(m.nome))[0];
    ok("Aura: valore = Carisma con minimo 1", au && au.valoreCalc === 1 && au.attivo === false, au && [au.valoreTesto, au.valoreCalc]);
    // 15 · alternativaDi: Nemico favorito al posto di Nemico prescelto
    t = run(mk("Ranger", 1)); { const k = sk("Archi"); t.get().skills[k] = Object.assign({}, t.get().skills[k], { rank: 1 }); } t.C().act.addPrivilegio("ranger-nemico-favorito", {});
    r = t.C().act.addPrivilegio("ranger-nemico-prescelto-1", { lingue: SD[SK_LINGUE[0]].n });
    ok("alternativaDi: Nemico prescelto rifiutato dopo Nemico favorito", !!r.errore, r.errore);
    ok("Nemico favorito: usi = bonus del rank più alto (rank 1 → 1)", t.C().features.filter(x => x.name === "Nemico favorito")[0].uses.max === bonusLvl(1));
    // 16 · velocità +1,5 (N-02)
    t = run(mk("Ranger", 6)); const v0 = t.C().speed.base; t.C().act.addPrivilegio("ranger-esploratore-abile-6", {});
    ok("Girovago: velocità +1,5 m", Math.abs(t.C().speed.base - v0 - 1.5) < 1e-9, [v0, t.C().speed.base]);
    // 17 · acquisto al level-up (P-102, P-103): Guerriero 3 → 4
    t = run(mk("Guerriero", 3, null, { savedPoints: 100 }));
    t.C().act.startLU();
    ok("level-up 3 → 4 del Guerriero: c'è l'aumento, talento possibile", t.C().talenti.possibile && t.C().talenti.qui, t.C().talenti);
    const sp0 = t.C().points.luSpent;
    r = t.C().act.addPrivilegio("tal-allerta", {}, { acquisto: true }); ok("acquisto senza accordo del master: rifiutato", !!r.errore, r.errore);
    r = t.C().act.addPrivilegio("tal-allerta", {}, { acquisto: true, approvato: true }); ok("acquisto con accordo: fatto", !!r.uid, r);
    ok("acquisto: 14 punti spesi", t.C().points.luSpent === sp0 + 14, [sp0, t.C().points.luSpent]);
    const ini4 = t.C().init;
    r = t.C().act.addPrivilegio("tal-robusto", {}, { acquisto: true, approvato: true }); ok("secondo talento nello stesso livello: rifiutato", !!r.errore, r.errore);
    t.C().act.applyLU();
    ok("dopo il level-up: Allerta in addestramento, iniziativa invariata", t.C().init === ini4 && t.C().privilegi[0].inAddestramento, [ini4, t.C().init]);
    t.C().act.startLU(); t.C().act.applyLU();
    ok("al livello dopo: Allerta vale (+5)", t.C().init === ini4 + 5 && !t.C().privilegi[0].inAddestramento, t.C().init);
    // 18 · occasione aperta: livello 4 senza talento → al 5 si può ancora comprare
    t = run(mk("Guerriero", 4, null, { savedPoints: 100 }));
    t.C().act.startLU(); ok("Guerriero 4 → 5 senza talento al 4°: occasione aperta", t.C().talenti.possibile && !t.C().talenti.qui && t.C().talenti.aperte === 1, t.C().talenti);
    // 19 · punti insufficienti
    t = run(mk("Guerriero", 3, { Forza: 8, Destrezza: 8, Costituzione: 8, Intelligenza: 8, Saggezza: 8, Carisma: 8 }, { savedPoints: -40 }));
    t.C().act.startLU(); r = t.C().act.addPrivilegio("tal-robusto", {}, { acquisto: true, approvato: true });
    ok("punti insufficienti: rifiutato e occasione aperta", !!r.errore && /occasione resta aperta/.test(r.errore), r.errore);
    // 20 · Annulla del level-up toglie il talento comprato
    t = run(mk("Guerriero", 3, null, { savedPoints: 100 })); t.C().act.startLU(); t.C().act.addPrivilegio("tal-allerta", {}, { acquisto: true, approvato: true }); t.C().act.cancelLU();
    ok("Annulla: il talento comprato sparisce", (t.get().privilegi || []).length === 0);
    // 21 · Fortunato e Cuoco: usi da numero in stringa e da rank di competenza
    t = run(mk("Guerriero", 4)); t.C().act.addPrivilegio("tal-fortunato", {}); t.C().act.addPrivilegio("tal-cuoco", { car: "Costituzione" });
    ok("Fortunato: 3 punti", t.C().features.filter(x => x.name === "Punti fortuna")[0].uses.max === 3);
    ok("Cuoco: dolcetti = bonus del rank di Cucinare (rank 1 gratis → 1)", t.C().features.filter(x => x.name === "Dolcetti")[0].uses.max === bonusLvl(1));
    // 22 · Iniziato al combattimento: lo stile scelto porta i suoi effetti
    t = run(mk("Mago", 4)); const wk = sk("Archi"); t.get().skills[wk] = Object.assign({}, t.get().skills[wk], { rank: 1 });
    const a1 = skill(t.C, "Archi").tot; t.C().act.addPrivilegio("tal-iniziato-combattimento", { stile: "guerriero-stile-tiro" });
    ok("Iniziato al combattimento (Tiro): Archi +2", skill(t.C, "Archi").tot === a1 + 2, [a1, skill(t.C, "Archi").tot]);
    // 23 · scheda della 10.6 con modificatori materializzati: niente doppio conteggio
    t = run(mk("Guerriero", 1)); const a2 = skill(t.C, "Archi").tot;
    t.get().privilegi = [{ uid: "pold", pid: "guerriero-stile-tiro", nome: "Stile di combattimento: Tiro (Archery)" }];
    t.get().modificatori = [{ id: "poldm0", nome: "x", fonte: "Privilegio di classe", valore: 2, bersagli: ["sk:" + sk("Archi")], attivo: true, priv: "pold" }];
    ok("scheda 10.6: Tiro conta una volta sola", skill(t.C, "Archi").tot === a2 + 2, [a2, skill(t.C, "Archi").tot]);
    // 24 · rank gratis e level-up: il limite resta quello dei rank comprati, niente sovrapprezzo del primo rank
    t = run(mk("Guerriero", 3, null, { savedPoints: 100 })); t.C().act.addPrivilegio("guerriero-stile-due-armi", {});
    t.C().act.startLU(); const s2 = skill(t.C, "Combattimento a 2 armi");
    ok("level-up: Combattimento a 2 armi da 1 (gratis) a max 3: il gratis non conta nei 2 a livello", s2.luMin === 1 && s2.luMax === 3, [s2.luMin, s2.luMax]);
    const spB = t.C().points.luSpent; t.C().act.setLURank(sk("Combattimento a 2 armi"), 2);
    ok("level-up: comprare il primo rank sopra quello gratis costa il costo base", t.C().points.luSpent - spB === s2.cost, [t.C().points.luSpent - spB, s2.cost]);
    t.C().act.applyLU(); ok("level-up applicato: salvato 1 rank comprato (il gratis resta a parte)", t.get().skills[sk("Combattimento a 2 armi")].rank === 1 && skill(t.C, "Combattimento a 2 armi").rank === 2);
    // 25 · creazione (P-111): fino a rank 4, lingue fino a 8, il rank gratis conta dentro il 4
    { const a = mk("Guerriero", 1); a.creationDone = false; a.locked = false; t = run(a);
      const k = sk("Archi"); t.C().act.setRank(k, 6);
      ok("creazione: rank massimo 4", skill(t.C, "Archi").rank === 4 && t.C().creation.maxRank(k) === 4, skill(t.C, "Archi").rank);
      const kl = SK_LINGUE[0]; ok("creazione: lingue fino a 8", t.C().creation.maxRank(kl) === 8);
      t.C().act.addPrivilegio("guerriero-stile-due-armi", {}); const k2 = sk("Combattimento a 2 armi"); t.C().act.setRank(k2, 6);
      ok("creazione: con il rank gratis si arriva a 4 in tutto (3 comprati)", skill(t.C, "Combattimento a 2 armi").rank === 4 && t.get().skills[k2].rank === 3, [skill(t.C, "Combattimento a 2 armi").rank, t.get().skills[k2].rank]); }
    // 26 · nome a mano di lingue e strumenti (creazione), competenze aggiunte dal master (10.7.4)
    { const a = mk("Bardo", 1); a.creationDone = false; a.locked = false; t = run(a);
      const kl = SK_LINGUE[1]; t.C().act.setSkillName(kl, "Elfico");
      ok("creazione: la lingua prende il nome scritto", t.C().skills.filter(x => x.i === kl)[0].name === "Elfico" && t.C().skills.filter(x => x.i === kl)[0].slot);
      const ks = sk("Strumento 1"); t.C().act.setSkillName(ks, "Liuto"); ok("creazione: lo strumento prende il nome", skill(t.C, "Liuto") && skill(t.C, "Liuto").i === ks); }
    { const a = mk("Bardo", 3); a.locked = false; t = run(a);   // Modifica scheda (master)
      const info = t.C().skCategoria("Arti musicali");
      ok("categoria: gruppi di affinità e competenze", info.gruppi.length >= 1 && info.competenze.length >= 4, info.gruppi.map(g => g.s + ": " + g.esempio));
      const liuto = info.competenze.filter(x => x.n === "Cantare")[0];
      let r2 = t.C().act.addSkill({ n: "Zampogna", c: "Arti musicali", f: "affine", s: info.gruppi[0].s, a: "Destrezza", k: liuto.k });
      ok("master: competenza nuova aggiunta", r2 && r2.i === SD.length, r2);
      const z = skill(t.C, "Zampogna");
      ok("la competenza nuova sta nella sua categoria, dopo le altre", !!z && t.C().cats.filter(c => c.name === "Arti musicali")[0].items.slice(-1)[0] === SD.length, z && z.cat);
      ok("costo copiato (Bardo)", z.classCost === (liuto.k.Bardo || 2) && z.extra, [z.classCost, liuto.k.Bardo]);
      ok("doppione rifiutato", !!t.C().act.addSkill({ n: "zampogna", c: "Arti musicali", f: "sep", a: "Destrezza", k: {} }).errore);
      t.get().skills[sk("Cantare")] = Object.assign({}, t.get().skills[sk("Cantare")], { rank: 6 });
      ok("affine: senza rank prende metà del migliore del gruppo − 1 (non −3)", skill(t.C, "Zampogna").maxAff > -3, skill(t.C, "Zampogna").maxAff);
      t.get().locked = true; t.get().savedPoints = 100; t.C().act.startLU(); t.C().act.setLURank(SD.length, 1); t.C().act.applyLU();
      ok("level-up: rank comprato nella competenza nuova", t.get().skills[SD.length].rank === 1 && skill(t.C, "Zampogna").rank === 1);
      t.get().locked = false; t.C().act.removeSkill(SD.length); ok("con rank non si toglie dall'interfaccia, ma l'azione la segna tolta", !skill(t.C, "Zampogna") && t.get().skExtra[0].via === true);
      ok("dopo la rimozione la scheda si calcola senza errori", t.C().skills.length === SD.length, t.C().skills.length + " / " + SD.length); }
    // 27 · madrelingue (P-113)
    { const a = mk("Guerriero", 1); a.creationDone = false; a.locked = false; t = run(a);
      ok("creazione: una madrelingua di partenza in Famiglia 1", t.C().lingue.madre.length === 1 && t.C().lingue.madre[0].fam === 1);
      const i0 = t.C().lingue.madre[0].i; ok("madrelingua a rank 8 senza spesa", skill(t.C, SD[i0].n).rank === 8 && t.C().points.creationSpent === 0, [skill(t.C, SD[i0].n).rank, t.C().points.creationSpent]);
      t.C().act.setMadreNum(3); ok("tre madrelingue", t.C().lingue.madre.length === 3 && t.C().lingue.madre.every(m => skill(t.C, SD[m.i].n).rank === 8));
      t.C().act.setMadreFam(2, 2); ok("la terza in Famiglia 2", t.C().lingue.madre[2].fam === 2 && /^Lingua 2\./.test(t.C().lingue.madre[2].base), t.C().lingue.madre[2].base);
      t.C().act.setMadreNum(5); ok("massimo 3", t.C().lingue.madre.length === 3);
      t.C().act.setMadreNum(0); ok("minimo 1", t.C().lingue.madre.length === 1);
      const f = t.C().act.addFamigliaLingue(); ok("famiglia nuova: 4, con 3 posti", f === 4 && t.C().lingue.famiglie.indexOf(4) >= 0 && t.C().skills.filter(s => /^Lingua 4\./.test(s.nomeBase)).length === 3);
      t.C().act.setMadreNum(2); t.C().act.setMadreFam(1, 4); const m4 = t.C().lingue.madre[1];
      ok("madrelingua nella famiglia nuova, rank 8", m4.fam === 4 && t.C().skills.filter(s => s.i === m4.i)[0].rank === 8, m4.base);
      t.C().act.setMadreNum(3); t.C().act.setMadreFam(2, 1); t.C().act.setMadreNum(3);
      ok("Famiglia 1 con due madrelingue: posti diversi", t.C().lingue.madre[0].i !== t.C().lingue.madre[2].i);
      t.C().act.setSkillName(t.C().lingue.madre[0].i, "Italiano"); ok("nome della madrelingua", t.C().lingue.madre[0].nome === "Italiano" && !!skill(t.C, "Italiano")); }
    { const a = mk("Mago", 3); a.madrelingue = [{ fam: 1, i: SK_LINGUE[0] }]; a.savedPoints = 100; t = run(a);
      t.C().act.startLU(); const l = t.C().skills.filter(s => s.i === SK_LINGUE[0])[0];
      ok("level-up: madrelingua da 8 a max 10", l.luMin === 8 && l.luMax === 10, [l.luMin, l.luMax]);
      const sp = t.C().points.luSpent; t.C().act.setLURank(SK_LINGUE[0], 9);
      ok("level-up: il rank 9 costa il doppio (R2.4)", t.C().points.luSpent - sp === 2 * l.cost, [t.C().points.luSpent - sp, l.cost]); }
    // 28 · bilancio razziale (R1.6) e spesa che non va in negativo (21/11)
    { const somma = r => STATS.reduce((a, st) => a + ((r.bonuses || {})[st] || 0), 0);
      const r3 = RACES.filter(r => !r.choose && somma(r) >= 3 && somma(r) < 6)[0], r0 = RACES.filter(r => !r.choose && somma(r) < 3)[0];
      let a = mk("Guerriero", 1, null, { raceId: r0.id }); a.creationDone = false; a.locked = false; t = run(a);
      ok("bilancio sotto 3: 2 talenti gratuiti", t.C().bilancio.talenti === 2 && t.C().bilancio.valore === somma(r0), [r0.id, t.C().bilancio.valore]);
      let r1 = t.C().act.addPrivilegio("tal-allerta", {}, { razziale: true }), r2 = t.C().act.addPrivilegio("tal-robusto", {}, { razziale: true }), r4 = t.C().act.addPrivilegio("tal-fortunato", {}, { razziale: true });
      ok("due talenti razziali sì, il terzo no", !!r1.uid && !!r2.uid && !!r4.errore, r4.errore);
      ok("talento razziale attivo subito e gratis", t.C().privilegi.filter(p => p.razziale).length === 2 && !t.C().privilegi[0].inAddestramento && t.C().points.creationSpent === 0);
      a = mk("Guerriero", 1, null, { raceId: r3.id }); a.creationDone = false; a.locked = false; t = run(a);
      ok("bilancio tra 3 e 5: 1 talento", t.C().bilancio.talenti === 1, [r3.id, t.C().bilancio.valore]);
      a = mk("Guerriero", 1, { Forza: 8, Destrezza: 8, Costituzione: 8, Intelligenza: 8, Saggezza: 8, Carisma: 8 }); a.creationDone = false; a.locked = false; t = run(a);
      const disp = t.C().points.creationRem; let k = 0;
      SD.forEach((x, i) => { if (x.c !== "Comunicazione" && k < 40) { t.C().act.setRank(i, 4); k++; } });
      ok("creazione: la spesa non va sotto zero", t.C().points.creationRem >= 0 && t.C().points.creationSpent <= disp, [disp, t.C().points.creationRem]);
      a = mk("Guerriero", 3, { Forza: 8, Destrezza: 8, Costituzione: 8, Intelligenza: 8, Saggezza: 8, Carisma: 8 }, { savedPoints: 0 }); t = run(a); t.C().act.startLU(); k = 0;
      SD.forEach((x, i) => { if (k < 60) { t.C().act.setLURank(i, 1); k++; } });
      ok("level-up: la spesa non va sotto zero", t.C().points.luRem >= 0, [t.C().points.luAvail, t.C().points.luSpent]); }
    // 29 · aumento di caratteristica al level-up (10.7.7): solo ai livelli con aumento, +2 in tutto, massimo 20, i +1 dei talenti non si sommano al base
    { let a = mk("Guerriero", 3, { Forza: 15, Destrezza: 19, Costituzione: 14, Intelligenza: 10, Saggezza: 12, Carisma: 10 }, { savedPoints: 100 }); t = run(a);
      t.C().act.addPrivilegio("tal-resiliente", { car: "Intelligenza" });   // Intelligenza 10 → 11 mostrata
      t.C().act.startLU();
      ok("3 → 4: aumento possibile", t.C().luAumento.possibile && t.C().luAumento.max === 2);
      t.C().act.setLUStat("Forza", 16); ok("+1 a Forza", t.get().stats.Forza === 16);
      t.C().act.setLUStat("Intelligenza", t.C().stats.Intelligenza.score + 1);
      ok("+1 a Intelligenza sul base, non sul punteggio col talento", t.get().stats.Intelligenza === 11 && t.C().stats.Intelligenza.score === 12, [t.get().stats.Intelligenza, t.C().stats.Intelligenza.score]);
      t.C().act.setLUStat("Destrezza", 21); ok("terzo punto rifiutato (+2 già usati)", t.get().stats.Destrezza === 19);
      t.C().act.setLUStat("Forza", 15); t.C().act.setLUStat("Destrezza", 22); ok("massimo 20", t.get().stats.Destrezza === 20, t.get().stats.Destrezza);
      ok("usati +2", t.C().luAumento.usati === 2);
      t.C().act.cancelLU(); ok("Annulla: punteggi di prima", t.get().stats.Destrezza === 19 && t.get().stats.Intelligenza === 10);
      a = mk("Guerriero", 2, null, { savedPoints: 100 }); t = run(a); t.C().act.startLU(); const f0 = t.get().stats.Forza;
      t.C().act.setLUStat("Forza", f0 + 1); ok("2 → 3: niente aumento", !t.C().luAumento.possibile && t.get().stats.Forza === f0); }
    return R;
  });
  let ko = 0; out.forEach(r => { if (r[0][0] === "K") ko++; console.log(r.join(" ")); });
  if (errs.length) { console.log("ERRORI PAGINA: " + errs.join(" | ")); ko++; }
  console.log(ko ? ko + " KO" : "tutto OK"); await b.close(); process.exit(ko ? 1 : 0);
})();
