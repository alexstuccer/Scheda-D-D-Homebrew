/* ══════════════════════════════════════════════════════════════════════════
 * editor.jsx — REGIA, 10.5: tutto quello che prima si faceva solo nella vecchia interfaccia.
 * Creazione guidata, Modalità Master, B/M e costo forzato delle competenze, catalogo e proprietà delle armi,
 * codice arma, bonus degli oggetti, armature e scudi, gemme, catalogo e repertorio degli incantesimi, export.
 * Usa i componenti di MOBILE (Section, Card, Row, Btn, Chip, Stepper, Toggle, Sheet, SearchField) e solo C.
 * ══════════════════════════════════════════════════════════════════════════ */

const GXE_SEL = { height: 40, background: "var(--s2)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "0 8px", font: "inherit", minWidth: 0 };
const GXE_INP = { height: 40, background: "var(--s2)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "0 10px", font: "inherit", minWidth: 0, boxSizing: "border-box" };
const GXE_SCUOLE = ["Abiurazione", "Ammaliamento", "Divinazione", "Evocazione", "Illusione", "Invocazione", "Necromanzia", "Trasmutazione"];

/* Immagine scelta dal dispositivo → quadrato 200×200 JPEG (come la vecchia scheda) */
function gxeImmagine(file, cb) {
  if (!file) return;
  const r = new FileReader();
  r.onload = function(ev){
    const img = new Image();
    img.onload = function(){
      const s = Math.min(img.width, img.height);
      const cv = document.createElement("canvas"); cv.width = 200; cv.height = 200;
      cv.getContext("2d").drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 200, 200);
      cb(cv.toDataURL("image/jpeg", 0.85));
    };
    img.src = ev.target.result;
  };
  r.readAsDataURL(file);
}
function gxeNum(v) { const n = parseFloat(String(v).replace(",", ".")); return isNaN(n) ? 0 : n; }

function Campo({ label, value, onChange, type, disabled, placeholder, width }) {
  return <Row name={label}>
    <input className="gx-inp" style={Object.assign({}, GXE_INP, { width: width || 180, textAlign: type === "number" ? "right" : "left" })}
      type={type || "text"} inputMode={type === "number" ? "decimal" : undefined} value={value == null ? "" : value} placeholder={placeholder}
      disabled={disabled} aria-label={label} onChange={e => onChange(type === "number" ? gxeNum(e.target.value) : e.target.value)} />
  </Row>;
}
function Scelta({ label, value, options, onChange, disabled }) {
  return <Row name={label}>
    <select value={value} disabled={disabled} aria-label={label} onChange={e => onChange(e.target.value)} style={Object.assign({}, GXE_SEL, { width: 180 })}>
      {options.map(o => Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{o}</option>)}
    </select>
  </Row>;
}

/* ── Identità e ritratto ── */
function EditIdentita({ C }) {
  const ch = C.ch, dis = !C.can.identity;
  const ritratto = useRef(null), mini = useRef(null);
  const set = p => C.act.setIdentity(p);
  return <div>
    <Section label="Ritratto e miniatura" />
    <Card style={{ padding: 12, display: "flex", gap: 16, alignItems: "center" }}>
      {[["Ritratto", C.portrait, ritratto, u => C.act.setPortrait(u)], ["Miniatura vista dall'alto", C.miniature, mini, u => C.act.setMiniature(u)]].map(x =>
        <div key={x[0]} style={{ textAlign: "center" }}>
          <button aria-label={"Scegli " + x[0]} onClick={() => x[2].current && x[2].current.click()}
            style={{ width: 84, height: 84, borderRadius: x[0] === "Ritratto" ? "50%" : 12, border: "1px dashed var(--line)", background: "var(--s2)", overflow: "hidden", cursor: "pointer", color: "var(--muted)" }}>
            {x[1] ? <img src={x[1]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "＋"}</button>
          <div className="gx-lab" style={{ marginTop: 4, textTransform: "none" }}>{x[0]}</div>
          {x[1] ? <button className="gx-lab" style={{ textTransform: "none", textDecoration: "underline" }} onClick={() => x[3](null)}>togli</button> : null}
          <input ref={x[2]} type="file" accept="image/*" style={{ display: "none" }} onChange={e => { gxeImmagine(e.target.files && e.target.files[0], x[3]); e.target.value = ""; }} />
        </div>)}
    </Card>
    <Section label="Dati" />
    <Card>
      <Campo label="Nome" value={ch.name} disabled={dis} onChange={v => set({ name: v })} />
      <Campo label="Giocatore" value={ch.pn} disabled={dis} onChange={v => set({ pn: v })} />
      <Campo label="Allineamento" value={ch.align} disabled={dis} onChange={v => set({ align: v })} />
      <Scelta label="Sesso" value={ch.gender || "M"} disabled={dis} options={[["M", "Maschile"], ["F", "Femminile"], ["X", "Altro"]]} onChange={v => set({ gender: v })} />
      <Campo label="Divinità" value={ch.deity} disabled={dis} onChange={v => set({ deity: v })} />
      <Campo label="Età" type="number" value={ch.age} disabled={dis} onChange={v => set({ age: v })} width={96} />
      <Campo label="Altezza (cm)" type="number" value={ch.height} disabled={dis} onChange={v => set({ height: v })} width={96} />
      <Campo label="Peso (kg)" type="number" value={ch.weight} disabled={dis} onChange={v => set({ weight: v })} width={96} />
      <Campo label="Occhi" value={ch.eyes} disabled={dis} onChange={v => set({ eyes: v })} />
      <Campo label="Capelli" value={ch.hair} disabled={dis} onChange={v => set({ hair: v })} />
      <Row name={<small>L'altezza entra nel calcolo della velocità (P-79).</small>} />
    </Card>
  </div>;
}

/* ── Razza (solo creazione) ── */
function EditRazza({ C }) {
  const ch = C.ch, race = C.race;
  const scelte = ch.raceChoices || [];
  return <div>
    {race && race.cc > 0 ? <div>
      <Section label="Bonus a scelta" aux={"+1 a " + race.cc + (race.cc > 1 ? " caratteristiche" : " caratteristica")} />
      <Card>{scelte.map((v, i) => <Scelta key={i} label={"Scelta " + (i + 1)} value={v || ""}
        options={[["", "— scegli —"]].concat(C.statNames.filter(st => st === v || (!(race.bonuses && race.bonuses[st]) && !scelte.some((x, j) => j !== i && x === st))).map(st => [st, st]))}
        onChange={st => C.act.setRaceChoice(i, st)} />)}</Card></div> : null}
    <Section label="Razza" aux={C.races.length + " razze"} />
    <Card>{C.races.map(r => <button key={r.id} className="gx-row" aria-pressed={r.id === ch.raceId} onClick={() => C.act.setRace(r.id)}
      style={r.id === ch.raceId ? { background: "var(--s2)", boxShadow: "inset 3px 0 0 var(--acc)" } : undefined}>
      <span className="nm">{r.name}<small>{r.desc}</small></span>
      {r.id === ch.raceId ? <span className="gx-tag" style={{ color: "var(--acc)" }}>scelta</span> : null}
    </button>)}</Card>
  </div>;
}

/* ── Classe e attributi (classe solo in creazione) ── */
function EditClasse({ C }) {
  const cls = C.classes[0] ? C.classes[0].name : "";
  return <div>
    {C.can.classes ? <div>
      <Section label="Classe" aux="si parte dal 1° livello; le altre classi si aggiungono col level-up" />
      <Card style={{ padding: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
        {C.classList.map(n => <Chip key={n} on={n === cls} onClick={() => C.act.setClass(n === cls ? "" : n)}>{n}</Chip>)}
      </Card></div> : <div><Section label="Classi" /><Card><Row name={C.classes.map(c => c.name + " " + c.level).join(" / ")} sub="le classi cambiano solo col level-up" /></Card></div>}
    <Section label="Attributi" />
    <Card>
      <Row name="Mischia" sub="caratteristica degli attacchi in mischia con armi accurate e affini">
        <div className="gx-segm" style={{ margin: 0 }}>{[["Forza", "FOR"], ["Destrezza", "DES"]].map(m =>
          <button key={m[0]} aria-pressed={C.ma === m[0]} disabled={!C.can.stats} onClick={() => C.act.setAttr({ ma: m[0] })}>{m[1]}</button>)}</div></Row>
      {C.magicStat ? <Row name="Magia" sub={"fissata dalla classe: " + C.magicStat} />
        : <Scelta label="Magia" value={C.ga} disabled={!C.can.stats} options={C.statNames} onChange={v => C.act.setAttr({ ga: v })} />}
    </Card>
  </div>;
}

/* ── Caratteristiche: punteggi, B/M, PF bonus ── */
function EditCaratteristiche({ C }) {
  const crea = C.inCreation;
  const pb = C.pointBuy;
  return <div>
    {crea ? <div className="gx-pool" style={{ marginTop: 8 }}><span>Point buy<small style={{ display: "block" }}>base 8 · massimo 15 · dopo 13 costa doppio</small></span>
      <b className={pb.rem < 0 ? "bad" : ""}>{pb.rem}</b></div> : null}
    <Section label="Caratteristiche" aux={crea ? "punteggio · costo" : "punteggio · bonus o malus al modificatore"} />
    <Card>{GX_CAR.map(k => { const st = C.stats[k[0]]; return <Row key={k[0]} name={k[0]}
      sub={"mod. " + fm(C.mods[k[0]]) + (st.racial ? " · razza " + fm(st.racial) : "") + (st.item ? " · oggetti " + fm(st.item) : "") + (crea ? " · costo " + pb.cost(st.score) : "")}>
      <Stepper value={st.score} min={crea ? 8 : 1} max={crea ? 15 : 30} label={"Punteggio di " + k[0]} onChange={v => C.act.setStat(k[0], v)} />
      {!crea ? <Stepper value={st.bonus || 0} min={-10} max={10} label={"B/M di " + k[0]} onChange={v => C.act.setStatBonus(k[0], v)} /> : null}
    </Row>; })}
      {crea && C.points.creationSpent > 0 ? <Row name={<small>{"Con dei rank già comprati, una caratteristica scende solo finché i punti competenza restano sopra lo zero."}</small>} /> : null}</Card>
    {!crea ? <div><Section label="Punti ferita" />
      <Card><Row name="PF bonus" sub={"talenti ed effetti permanenti · PF massimi " + C.hp.max}>
        <Stepper value={C.ch.hpBonus || 0} min={-99} max={999} label="PF bonus" onChange={v => C.act.setHpBonus(v)} /></Row></Card></div> : null}
  </div>;
}

/* ── Competenze: rank (creazione), B/M (sempre), costo forzato (creazione e Master) ── */
function EditCompetenze({ C, modoIniziale }) {
  const [q, setQ] = useState("");
  const [modo, setModo] = useState(modoIniziale || (C.inCreation ? "rank" : "bm"));
  const gruppi = gxGruppi(C, q);
  const modi = [["rank", "Rank"], ["bm", "B/M"], ["costo", "Costo"]].filter(m => m[0] !== "rank" || C.can.rank).filter(m => m[0] !== "costo" || C.can.costOverride);
  const pts = C.points;
  /* Punti, modo e ricerca restano fermi in alto mentre l'elenco scorre (21/11, Alessandro) */
  return <div>
    <div className="gx-fermo" style={{ position: "sticky", top: 0, zIndex: 5, background: "var(--bg)", paddingBottom: 6, boxShadow: "0 6px 6px -6px rgba(0,0,0,.35)" }}>
    {C.inCreation ? <div className="gx-pool" style={{ marginTop: 8 }}><span>Punti competenza<small style={{ display: "block" }}>{"spesi " + pts.creationSpent + " su " + pts.creationAvail + " · alla creazione fino a rank 4 (le lingue fino a 8)"}</small></span>
      <b className={pts.creationRem < 0 ? "bad" : ""}>{pts.creationRem}</b></div> : null}
    <div className="gx-segm" style={{ marginTop: 8 }} role="group" aria-label="Cosa modificare">
      {modi.map(m => <button key={m[0]} aria-pressed={modo === m[0]} onClick={() => setModo(m[0])}>{m[1]}</button>)}</div>
    <div style={{ marginTop: 8 }}><SearchField value={q} onChange={setQ} placeholder="Cerca competenza o categoria" /></div>
    </div>
    <Section label={modo === "rank" ? "Rank" : modo === "bm" ? "Bonus o malus fisso" : "Costo per rank forzato"}
      aux={modo === "bm" ? "oggetti magici, situazioni particolari, privilegi" : modo === "costo" ? "vuoto = costo della classe (Master)" : null} />
    {C.bilancio && C.bilancio.modificabile && !q ? <TalentiRazziali C={C} /> : null}
    {C.lingue && C.lingue.modificabile && !q ? <Madrelingue C={C} /> : null}
    {gruppi.map(g => <div key={g.name}><Section label={g.name} aux={g.skills.length} />
      <Card>{g.skills.map(s => {
        const sub = s.attr + " · rank " + s.rank + " · totale " + fm(s.tot) + (s.bonus ? " · B/M " + fm(s.bonus) : "") + " · costo " + (s.costOverride || s.classCost) + (s.costOverride ? " (forzato)" : "") + (s.extra ? " · aggiunta dal master" : "");
        let riga;
        if (modo === "rank") riga = <Row key={s.i} name={s.name} sub={sub}>
          <Stepper value={s.rank} min={0} max={C.creation ? C.creation.maxRank(s.i) : 0} label={"Rank di " + s.name} onChange={v => C.act.setRank(s.i, v)} /></Row>;
        else if (modo === "bm") riga = <Row key={s.i} name={s.name} sub={sub}>
          <Stepper value={s.bonus || 0} min={-20} max={20} label={"B/M di " + s.name} onChange={v => C.act.setSkillBM(s.i, v)} /></Row>;
        else riga = <Row key={s.i} name={s.name} sub={"costo della classe " + s.classCost}>
          <input className="gx-inp" style={Object.assign({}, GXE_INP, { width: 72, textAlign: "right" })} type="number" min="1" max="9" inputMode="numeric"
            aria-label={"Costo forzato di " + s.name} placeholder={String(s.classCost)} value={s.costOverride || ""} onChange={e => C.act.setCostOverride(s.i, e.target.value)} />
          {s.extra && C.master && s.rank === 0 ? <button className="gx-btn q" aria-label={"Togli la competenza " + s.name} onClick={() => C.act.removeSkill(s.i)}>{"✕"}</button> : null}</Row>;
        /* lingue e strumenti: si scrive quale (alla creazione e in Modifica scheda) */
        if (!(s.slot || s.extra) || !(C.inCreation || C.master)) return riga;
        return <div key={s.i}>{riga}
          <div className="gx-row" style={{ paddingTop: 0 }}><input className="gx-inp" style={Object.assign({}, GXE_INP, { flex: 1, width: "auto" })} type="text"
            aria-label={"Quale: " + s.nomeBase} placeholder={/^Lingua/.test(s.nomeBase) ? "quale lingua? (" + s.nomeBase + ")" : /^Strumento/.test(s.nomeBase) ? "quale strumento? (" + s.nomeBase + ")" : "nome"}
            value={s.cn} onChange={e => C.act.setSkillName(s.i, e.target.value)} /></div></div>;
      })}</Card>
      {C.master ? <NuovaCompetenza C={C} cat={g.name} /> : null}</div>)}
  </div>;
}
/* Talenti del bilancio razziale (R1.6): somma dei bonus razziali sotto 3 → 2 talenti, sotto 6 → 1; gratuiti e attivi da subito */
function TalentiRazziali({ C }) {
  const [apri, setApri] = useState(false), [q, setQ] = useState("");
  const B = C.bilancio;
  if (!B.talenti && !B.presi) return null;
  const presi = C.privilegi.filter(p => p.razziale);
  const t = q.trim().toLowerCase();
  const lista = C.privCatalogo.filter(r => r.tipo === "talento" && (!t || (r.nome + " " + r.effetti).toLowerCase().indexOf(t) >= 0));
  return <div>
    <Section label="Talenti del bilancio razziale" aux={"bilancio " + fm(B.valore) + " · " + B.presi + " su " + B.talenti + " gratuiti"} />
    <Card>
      {presi.map(p => <div key={p.uid} className="gx-row" style={{ gap: 6 }}><span className="nm" style={{ flex: "1 1 180px" }}>{p.nome}<small>{[p.scelteTesto, p.effetti].filter(Boolean).join(" · ")}</small></span>
        <button className="gx-btn q" aria-label={"Togli il talento " + p.nome} onClick={() => C.act.removePrivilegio(p.uid)}>{"✕"}</button></div>)}
      {B.presi < B.talenti ? <Row name={<small>{"La razza ha un bilancio di " + fm(B.valore) + ": " + (B.talenti === 2 ? "2 talenti gratuiti" : "1 talento gratuito") + ", da concordare con il master, attivi da subito (R1.6)."}</small>}>
        <Btn kind={apri ? "q" : "pri"} onClick={() => setApri(!apri)}>{apri ? "Chiudi" : "Scegli"}</Btn></Row> : null}
    </Card>
    {apri && B.presi < B.talenti ? <div><SearchField value={q} onChange={setQ} placeholder="Cerca talento" />
      <Card>{lista.map(r => <PrivRiga key={r.id} C={C} r={r} razziale={true} onPreso={() => setApri(false)} />)}</Card></div> : null}
  </div>;
}
/* Lingue madrelingua (P-113): da 1 a 3 a discrezione del master, ognuna in una famiglia (stessa famiglia = lingue parenti),
   rank 8 senza spesa. Il nome si scrive qui o nell'elenco sotto. */
function Madrelingue({ C }) {
  const L = C.lingue;
  return <div>
    <Section label="Lingue madrelingua" aux="rank 8, senza spesa" />
    <Card>
      <Row name="Quante" sub="da 1 a 3, a discrezione del master">
        <Stepper value={L.madre.length} min={1} max={3} label="Numero di lingue madrelingua" onChange={v => C.act.setMadreNum(v)} /></Row>
      {L.madre.map(m => <div key={m.k} style={{ borderTop: "1px solid var(--line)" }}>
        <Scelta label={"Madrelingua " + (m.k + 1)} value={String(m.fam)} onChange={v => C.act.setMadreFam(m.k, +v)}
          options={L.famiglie.map(f => [String(f), "Famiglia " + f])} />
        <div className="gx-row" style={{ paddingTop: 0 }}><input className="gx-inp" style={Object.assign({}, GXE_INP, { flex: 1, width: "auto" })} type="text"
          aria-label={"Nome della madrelingua " + (m.k + 1)} placeholder={"quale lingua? (" + m.base + ")"} value={m.nome} onChange={e => C.act.setSkillName(m.i, e.target.value)} /></div>
      </div>)}
      <Row name={<small>Le lingue della stessa famiglia sono parenti: per esempio italiano e spagnolo in Famiglia 1, cinese in Famiglia 2.</small>}>
        <Btn kind="q" onClick={() => C.act.addFamigliaLingue()}>+ Famiglia</Btn></Row>
    </Card>
  </div>;
}
/* Competenza nuova in una categoria, a discrezione del master (21/11, Alessandro): nome, affinità o indipendente,
   caratteristica, costi per classe copiati da una competenza della categoria (o uguali per tutte le classi). */
function NuovaCompetenza({ C, cat }) {
  const [apri, setApri] = useState(false);
  const info = C.skCategoria(cat);
  const [d, setD] = useState({ n: "", f: info.gruppi.length ? "affine" : "sep", s: info.gruppi.length ? info.gruppi[0].s : "", a: "", da: info.competenze.length ? String(info.competenze[0].i) : "", fisso: 0 });
  const [msg, setMsg] = useState("");
  if (!apri) return <div className="gx-row" style={{ justifyContent: "flex-end", paddingTop: 2 }}><Btn kind="q" onClick={() => setApri(true)}>{"+ Nuova competenza in " + cat}</Btn></div>;
  const base = info.competenze.filter(x => String(x.i) === d.da)[0];
  const attr = d.a || (base ? base.a : "Destrezza");
  const salva = () => {
    const k = {};
    Object.keys(GX_CLASSI_COSTO).forEach(c => { k[c] = d.fisso > 0 ? d.fisso : base && base.k ? (base.k[c] || 2) : 2; });
    const r = C.act.addSkill({ n: d.n, c: cat, f: d.f, s: d.s, a: attr, k: k });
    if (r && r.errore) setMsg(r.errore); else { setApri(false); setMsg(""); setD(Object.assign({}, d, { n: "" })); }
  };
  return <Card>
    <Row name={"Nuova competenza in " + cat} sub="la decide il master: vale solo per questo personaggio" />
    <Campo label="Nome" value={d.n} placeholder="es. Liuto, Lingua dei ladri" onChange={v => setD(Object.assign({}, d, { n: v }))} width={200} />
    <Scelta label="Crescita" value={d.f === "sep" ? "sep" : "g:" + d.s} onChange={v => setD(Object.assign({}, d, v === "sep" ? { f: "sep" } : { f: "affine", s: v.slice(2) }))}
      options={info.gruppi.map(g => ["g:" + g.s, "affine a " + g.esempio]).concat([["sep", "indipendente dalla categoria"]])} />
    <Scelta label="Caratteristica" value={attr} onChange={v => setD(Object.assign({}, d, { a: v }))}
      options={[["_m", "Mischia (Forza o Destrezza)"], ["_g", "Magia (caratteristica da incantatore)"]].concat(STATS.map(x => [x, x]))} />
    <Scelta label="Costi per classe come" value={d.da} onChange={v => setD(Object.assign({}, d, { da: v }))}
      options={info.competenze.map(x => [String(x.i), x.n])} />
    <Row name="Oppure costo uguale per tutte le classi" sub="0 = usa i costi della competenza scelta sopra">
      <Stepper value={d.fisso} min={0} max={9} label="Costo uguale per tutte le classi" onChange={v => setD(Object.assign({}, d, { fisso: v }))} /></Row>
    {msg ? <Row name={<small style={{ color: "var(--bad, #c0392b)" }}>{msg}</small>} /> : null}
    <div className="gx-flex" style={{ padding: "6px 12px 10px" }}>
      <Btn kind="q" wide onClick={() => { setApri(false); setMsg(""); }}>Annulla</Btn>
      <Btn kind="pri" wide disabled={!d.n.trim()} onClick={salva}>Aggiungi la competenza</Btn></div>
  </Card>;
}
const GX_CLASSI_COSTO = { Artefice: 1, Barbaro: 1, Bardo: 1, Chierico: 1, Druido: 1, Guerriero: 1, Ladro: 1, Mago: 1, Monaco: 1, Paladino: 1, Ranger: 1, Stregone: 1, Warlock: 1 };

/* ── Creazione guidata: sostituisce la creazione della vecchia interfaccia ── */
const GXE_PASSI = [["razza", "Razza"], ["classe", "Classe"], ["car", "Caratteristiche"], ["comp", "Competenze"], ["id", "Identità"], ["fine", "Riepilogo"]];
function Creazione({ C }) {
  const [p, setP] = useState(0);
  const scroller = useRef(null);
  useEffect(() => { if (scroller.current) scroller.current.scrollTop = 0; }, [p]);
  const passo = GXE_PASSI[p][0];
  const err = C.creation ? C.creation.errors : [];
  return <div className="gx-full">
    <div className="gx-wiz"><div className="gx-flex" style={{ justifyContent: "space-between" }}>
      <span className="gx-lab">Nuovo personaggio · passo {p + 1} di {GXE_PASSI.length}</span><span className="gx-ver">v{gxVersione(C.version)}</span></div>
      <h2>{GXE_PASSI[p][1]}</h2>
      <div className="gx-flex" style={{ gap: 6, flexWrap: "wrap", marginTop: 6 }}>{GXE_PASSI.map((x, i) =>
        <Chip key={x[0]} on={i === p} onClick={() => setP(i)}>{(i + 1) + " " + x[1]}</Chip>)}</div></div>
    <main className="gx-scroll" ref={scroller}>
      {passo === "razza" ? <EditRazza C={C} /> : null}
      {passo === "classe" ? <EditClasse C={C} /> : null}
      {passo === "car" ? <EditCaratteristiche C={C} /> : null}
      {passo === "comp" ? <EditCompetenze C={C} /> : null}
      {passo === "id" ? <EditIdentita C={C} /> : null}
      {passo === "fine" ? <div>
        <Section label="Riepilogo" />
        <Card>
          <Row name="Nome" sub={C.ch.name || "—"} />
          <Row name="Razza" sub={C.race ? C.race.name : "—"} />
          <Row name="Classe" sub={C.classes.length ? C.classes.map(c => c.name).join(" / ") + " 1" : "—"} />
          <Row name="Caratteristiche" sub={GX_CAR.map(k => k[1] + " " + C.stats[k[0]].score + " (" + fm(C.mods[k[0]]) + ")").join(" · ")} />
          <Row name="PF · CA · velocità" sub={C.hp.max + " · " + C.ca.total + " · " + gxMetri(C.speed.final)} />
          <Row name="Punti competenza avanzati" sub={String(Math.max(0, C.points.creationRem))} />
        </Card>
        {err.length ? <div><Section label="Da completare" /><Card>{err.map(e => <Row key={e} name={<span style={{ color: "var(--bad)" }}>{e}</span>} />)}</Card></div>
          : <Card style={{ marginTop: 12 }}><Row name="Tutto pronto" sub="Con «Crea il personaggio» la scheda si blocca e si passa al gioco. Le modifiche successive si fanno con il level-up o dal Menu › Modifica scheda (Master)." /></Card>}
      </div> : null}
    </main>
    <div className="gx-foot">
      <Btn kind="q" disabled={p === 0} onClick={() => setP(p - 1)}>Indietro</Btn>
      {p < GXE_PASSI.length - 1 ? <Btn kind="pri" onClick={() => setP(p + 1)}>Avanti</Btn>
        : <Btn kind="pri" disabled={!!err.length} onClick={() => C.act.confirmCreation()}>Crea il personaggio</Btn>}
    </div>
  </div>;
}

/* ── Modalità Master: modifiche a scheda creata, con traccia ── */
function ModificaScheda({ C }) {
  const [parte, setParte] = useState("id");
  return <div className="gx-full">
    <div className="gx-wiz"><div className="gx-flex" style={{ justifyContent: "space-between" }}>
      <span className="gx-lab">Modalità Master · la scheda è sbloccata</span><span className="gx-ver">v{gxVersione(C.version)}</span></div>
      <h2>Modifica scheda</h2>
      <div className="gx-segm" style={{ marginTop: 6 }} role="group" aria-label="Parte da modificare">
        {[["id", "Identità"], ["classe", "Attributi"], ["car", "Caratteristiche"], ["comp", "Competenze"], ["priv", "Privilegi"]].map(x =>
          <button key={x[0]} aria-pressed={parte === x[0]} onClick={() => setParte(x[0])}>{x[1]}</button>)}</div></div>
    <main className="gx-scroll">
      {parte === "id" ? <EditIdentita C={C} /> : null}
      {parte === "classe" ? <EditClasse C={C} /> : null}
      {parte === "car" ? <EditCaratteristiche C={C} /> : null}
      {parte === "comp" ? <EditCompetenze C={C} modoIniziale="bm" /> : null}
      {parte === "priv" ? <div><PrivilegiTalenti C={C} aperto={true} /><Modificatori C={C} /></div> : null}
      <Card style={{ marginTop: 12 }}><Row name={<small>Rank, razza e classi cambiano solo con la creazione o il level-up, come nella vecchia scheda. Annulla nel Menu riporta indietro una modifica alla volta.</small>} /></Card>
    </main>
    <div className="gx-foot" style={{ gridTemplateColumns: "1fr" }}><Btn kind="pri" wide onClick={() => C.act.setMaster(false)}>Fine · blocca la scheda</Btn></div>
  </div>;
}

/* ── Armi: catalogo, proprietà speciali, codice ── */
function CatalogoArmi({ C, onClose, side }) {
  const [q, setQ] = useState(""), [cat, setCat] = useState(""), [fuoco, setFuoco] = useState(false), [codice, setCodice] = useState(""), [msg, setMsg] = useState("");
  const cats = []; C.weaponCatalog.forEach(d => { if (cats.indexOf(d.category) < 0) cats.push(d.category); });
  const t = q.trim().toLowerCase();
  const lista = C.weaponCatalog.filter(d => (fuoco || !d.optional) && (!cat || d.category === cat) && (!t || d.name.toLowerCase().indexOf(t) >= 0 || String(d.nameEn || "").toLowerCase().indexOf(t) >= 0));
  return <Sheet titolo="Aggiungi un'arma" onClose={onClose} side={side}>
    <div className="gx-flex" style={{ gap: 8, flexWrap: "wrap" }}>
      <select value={cat} onChange={e => setCat(e.target.value)} style={Object.assign({}, GXE_SEL, { flex: 1 })} aria-label="Categoria">
        <option value="">Tutte le categorie</option>{cats.map(c => <option key={c} value={c}>{c}</option>)}</select>
      <Chip on={fuoco} onClick={() => setFuoco(!fuoco)}>Armi da fuoco</Chip></div>
    <div style={{ marginTop: 8 }}><SearchField value={q} onChange={setQ} placeholder="Cerca arma" /></div>
    <Card style={{ marginTop: 8 }}>{lista.slice(0, 120).map(d => <Row key={d.id} name={d.name} sub={d.dmg + " " + d.dmgType.toLowerCase() + " · " + d.category + (d.props ? " · " + d.props : "")}>
      <Btn kind="q" onClick={() => { C.act.addWeapon(d.id); setMsg(d.name + " aggiunta."); }}>Aggiungi</Btn></Row>)}
      {lista.length > 120 ? <Row name={<small>{"Altre " + (lista.length - 120) + ": restringi la ricerca."}</small>} /> : null}</Card>
    <Section label="Codice arma" aux="arma condivisa da un altro giocatore" />
    <div className="gx-flex" style={{ gap: 8 }}><input className="gx-inp" style={Object.assign({}, GXE_INP, { flex: 1 })} value={codice} placeholder="ARMA1§…" onChange={e => setCodice(e.target.value)} aria-label="Codice arma" />
      <Btn disabled={!codice.trim()} onClick={() => { if (C.act.pasteWeaponCode(codice)) { setMsg("Arma dal codice aggiunta."); setCodice(""); } else setMsg("Codice non valido: deve iniziare con ARMA1§ e contenere un'arma del catalogo."); }}>Incolla</Btn></div>
    {msg ? <p className="gx-lab" style={{ textTransform: "none", marginTop: 8 }} role="status">{msg}</p> : null}
  </Sheet>;
}

function ProprietaArma({ C, w, onClose, side }) {
  const sp = w.special || {};
  const set = p => C.act.setWeaponProps(w.i, { special: Object.assign({}, sp, p) });
  const ed = sp.extraDamage || [], oh = sp.onHit || [];
  const [copiato, setCopiato] = useState("");
  const copia = () => {
    const code = C.weaponCode(w.i);
    try { navigator.clipboard.writeText(code).then(() => setCopiato("Codice copiato."), () => setCopiato(code)); } catch (e) { setCopiato(code); }
  };
  const dadi = ["1d4", "1d6", "1d8", "1d10", "1d12", "2d4", "2d6", "2d8", "2d10", "3d6"];
  return <Sheet titolo={"Proprietà · " + w.name} onClose={onClose} side={side}>
    {w.base ? <p className="gx-lab" style={{ textTransform: "none" }}>{"Base: " + w.base.name + " · " + w.base.dmg + " " + w.base.dmgType.toLowerCase() + " · " + w.base.category + (w.base.props ? " · " + w.base.props : "")}</p> : null}
    <Card>
      <Campo label="Nome" value={w.name} onChange={v => C.act.setWeaponProps(w.i, { name: v })} />
      <Row name="Quantità"><Stepper value={w.qty} min={1} max={999} label="Quantità" onChange={v => C.act.setWeaponProps(w.i, { qty: v })} /></Row>
      <Row name="Magica"><Toggle on={!!sp.isMagic} label="Arma magica" onChange={on => set({ isMagic: on })} /></Row>
      <Row name="Incantamento" sub="al tiro per colpire e ai danni"><Stepper value={sp.enhancement || 0} min={0} max={3} label="Incantamento" onChange={v => set({ enhancement: v, isMagic: v > 0 ? true : sp.isMagic })} /></Row>
      <Scelta label="Dado di danno" value={sp.dmgOverride || ""} options={[["", "base (" + (w.base ? w.base.dmg : "—") + ")"]].concat(dadi.map(d => [d, d]))} onChange={v => set({ dmgOverride: v || null })} />
      <Scelta label="Critico" value={String(sp.critRangeBonus || 0)} options={[["0", "20"], ["1", "19-20"], ["2", "18-20"]]} onChange={v => set({ critRangeBonus: +v })} />
      <Scelta label="Dadi extra sul critico" value={sp.extraCritDice || ""} options={[["", "nessuno"]].concat(dadi.map(d => [d, d]))} onChange={v => set({ extraCritDice: v || null })} />
      <Row name="Richiede sintonia"><Toggle on={!!sp.requiresAttunement} label="Richiede sintonia" onChange={on => set({ requiresAttunement: on })} /></Row>
      <Scelta label="Resistenza concessa" value={sp.grantsResistance || ""} options={[["", "— nessuna —"]].concat(ALL_DMG_TYPES.map(t => [t, t]))} onChange={v => set({ grantsResistance: v || null })} />
      <Campo label="Luce (m)" type="number" value={sp.lightRadius || 0} onChange={v => set({ lightRadius: v })} width={96} />
      <Scelta label="Rarità" value={sp.rarity || ""} options={[["", "automatica"]].concat(RARITIES.map(r => [r.id, r.label]))} onChange={v => set({ rarity: v || null })} />
    </Card>
    <Section label="Danni aggiuntivi" />
    <Card>{ed.map((x, i) => <div key={i} className="gx-row" style={{ flexWrap: "wrap", gap: 6 }}>
      <select value={x.dice} style={GXE_SEL} aria-label="Dadi" onChange={e => set({ extraDamage: ed.map((y, j) => j === i ? Object.assign({}, y, { dice: e.target.value }) : y) })}>{dadi.map(d => <option key={d}>{d}</option>)}</select>
      <select value={x.damageType} style={GXE_SEL} aria-label="Tipo" onChange={e => set({ extraDamage: ed.map((y, j) => j === i ? Object.assign({}, y, { damageType: e.target.value }) : y) })}>{ALL_DMG_TYPES.map(d => <option key={d}>{d}</option>)}</select>
      <select value={x.condition} style={GXE_SEL} aria-label="Quando" onChange={e => set({ extraDamage: ed.map((y, j) => j === i ? Object.assign({}, y, { condition: e.target.value }) : y) })}>{DMG_CONDITIONS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}</select>
      {x.condition === "vsType" ? <select value={x.creatureType || ""} style={GXE_SEL} aria-label="Contro" onChange={e => set({ extraDamage: ed.map((y, j) => j === i ? Object.assign({}, y, { creatureType: e.target.value }) : y) })}><option value="">— tipo —</option>{CREATURE_TYPES.map(d => <option key={d}>{d}</option>)}</select> : null}
      <button className="gx-btn q" aria-label="Togli" onClick={() => set({ extraDamage: ed.filter((y, j) => j !== i) })}>{"✕"}</button></div>)}
      <div className="gx-row"><Btn kind="q" onClick={() => set({ extraDamage: ed.concat([{ dice: "1d6", damageType: "Fuoco", condition: "always", creatureType: "" }]) })}>+ Danno aggiuntivo</Btn></div></Card>
    <Section label="Effetti al colpo" aux="tiro salvezza del bersaglio" />
    <Card>{oh.map((x, i) => <div key={i} className="gx-row" style={{ flexWrap: "wrap", gap: 6 }}>
      <input className="gx-inp" type="number" style={Object.assign({}, GXE_INP, { width: 64 })} value={x.dc} aria-label="CD" onChange={e => set({ onHit: oh.map((y, j) => j === i ? Object.assign({}, y, { dc: +e.target.value }) : y) })} />
      <select value={x.ability} style={GXE_SEL} aria-label="Caratteristica" onChange={e => set({ onHit: oh.map((y, j) => j === i ? Object.assign({}, y, { ability: e.target.value }) : y) })}>{C.statNames.map(d => <option key={d}>{d}</option>)}</select>
      <input className="gx-inp" style={Object.assign({}, GXE_INP, { flex: 1, minWidth: 120 })} value={x.effect} placeholder="effetto" aria-label="Effetto" onChange={e => set({ onHit: oh.map((y, j) => j === i ? Object.assign({}, y, { effect: e.target.value }) : y) })} />
      <button className="gx-btn q" aria-label="Togli" onClick={() => set({ onHit: oh.filter((y, j) => j !== i) })}>{"✕"}</button></div>)}
      <div className="gx-row"><Btn kind="q" onClick={() => set({ onHit: oh.concat([{ dc: 13, ability: "Costituzione", effect: "" }]) })}>+ Effetto</Btn></div></Card>
    <Section label="Senziente e maledizione" />
    <Card>
      <Row name="Arma senziente"><Toggle on={!!(sp.sentient && sp.sentient.enabled)} label="Senziente" onChange={on => set({ sentient: Object.assign({}, sp.sentient, { enabled: on }) })} /></Row>
      {sp.sentient && sp.sentient.enabled ? <Campo label="Note senziente" value={sp.sentient.notes || ""} onChange={v => set({ sentient: Object.assign({}, sp.sentient, { notes: v }) })} width={220} /> : null}
      <Row name="Maledetta"><Toggle on={!!(sp.curse && sp.curse.enabled)} label="Maledetta" onChange={on => set({ curse: Object.assign({}, sp.curse, { enabled: on }) })} /></Row>
      {sp.curse && sp.curse.enabled ? <Campo label="Effetto della maledizione" value={sp.curse.notes || ""} onChange={v => set({ curse: Object.assign({}, sp.curse, { notes: v }) })} width={220} /> : null}
      <Campo label="Note" value={sp.notes || ""} onChange={v => set({ notes: v })} width={220} />
    </Card>
    <div className="gx-flex" style={{ gap: 8, marginTop: 12, flexWrap: "wrap" }}>
      <Btn kind="q" onClick={copia}>Copia codice arma</Btn>
      <Btn kind="q" onClick={() => { C.act.removeWeapon(w.i); onClose(); }}>Togli l'arma</Btn></div>
    {copiato ? <p className="gx-lab" style={{ textTransform: "none", wordBreak: "break-all" }} role="status">{copiato}</p> : null}
  </Sheet>;
}

/* ── Oggetti: equipaggiato, sintonia, bonus a caratteristiche e competenze ── */
function BonusOggetto({ C, it, onClose, side }) {
  const [q, setQ] = useState("");
  const sm = it.statMods || {}, km = it.skillMods || {};
  const setStat = (st, v) => { const n = Object.assign({}, sm); if (v) n[st] = v; else delete n[st]; C.act.setItem(it.i, { statMods: n }); };
  const setSkill = (i, v) => { const n = Object.assign({}, km); if (v) n[i] = v; else delete n[i]; C.act.setItem(it.i, { skillMods: n }); };
  const t = q.trim().toLowerCase();
  const sk = C.skills.filter(s => km[s.i] || (t.length >= 2 && s.name.toLowerCase().indexOf(t) >= 0)).slice(0, 40);
  return <Sheet titolo={"Oggetto · " + (it.name || "senza nome")} onClose={onClose} side={side}>
    <Card>
      <Campo label="Nome" value={it.name} onChange={v => C.act.setItem(it.i, { name: v })} />
      <Campo label="Descrizione" value={it.desc} onChange={v => C.act.setItem(it.i, { desc: v })} />
      <Campo label="Peso (kg)" type="number" value={it.weight || 0} onChange={v => C.act.setItem(it.i, { weight: v })} width={96} />
      <Campo label="Valore (MO)" type="number" value={it.value || 0} onChange={v => C.act.setItem(it.i, { value: v })} width={96} />
      <Campo label="Note" value={it.notes} onChange={v => C.act.setItem(it.i, { notes: v })} />
      <Row name="Equipaggiato"><Toggle on={!!it.equipped} label="Equipaggiato" onChange={on => C.act.setItem(it.i, { equipped: on })} /></Row>
      <Row name="Richiede sintonia"><Toggle on={!!it.requiresAttunement} label="Richiede sintonia" onChange={on => C.act.setItem(it.i, { requiresAttunement: on, attuned: on ? !!it.attuned : false })} /></Row>
      {it.requiresAttunement ? <Row name="In sintonia"><Toggle on={!!it.attuned} label="In sintonia" onChange={on => C.act.setItem(it.i, { attuned: on })} /></Row> : null}
    </Card>
    <p className="gx-lab" style={{ textTransform: "none" }}>I bonus valgono se l'oggetto è equipaggiato (e in sintonia, quando la richiede).</p>
    <Section label="Bonus alle caratteristiche" />
    <Card>{GX_CAR.map(k => <Row key={k[0]} name={k[0]}><Stepper value={sm[k[0]] || 0} min={-10} max={10} label={"Bonus oggetto a " + k[0]} onChange={v => setStat(k[0], v)} /></Row>)}</Card>
    <Section label="Bonus alle competenze" />
    <SearchField value={q} onChange={setQ} placeholder="Cerca competenza (almeno 2 lettere)" />
    <Card style={{ marginTop: 8 }}>{sk.length ? sk.map(s => <Row key={s.i} name={s.name} sub={s.cat}><Stepper value={km[s.i] || 0} min={-10} max={10} label={"Bonus oggetto a " + s.name} onChange={v => setSkill(s.i, v)} /></Row>)
      : <Row name={<small>Nessun bonus alle competenze. Cerca una competenza per aggiungerlo.</small>} />}</Card>
  </Sheet>;
}

/* ── Armature e scudi: CA base e bonus speciale ── */
function ProtezioniEdit({ C, onClose, side }) {
  const eq = C.equip;
  const nA = { light: "Armatura leggera", medium: "Armatura media", heavy: "Armatura pesante" }, nS = { small: "Scudo piccolo", medium: "Scudo medio", large: "Scudo grande" };
  return <Sheet titolo="Armature e scudi" onClose={onClose} side={side}>
    <Card>{Object.keys(nA).map(k => <Row key={k} name={nA[k]} sub={"rank " + (eq.armor[k].rank || 0) + " · CA base · bonus speciale"}>
      <Stepper value={eq.armor[k].caBase || 0} min={0} max={20} label={"CA base " + nA[k]} onChange={v => C.act.setArmor(k, { caBase: v })} />
      <Stepper value={eq.armor[k].bonusSpec || 0} min={-5} max={5} label={"Bonus speciale " + nA[k]} onChange={v => C.act.setArmor(k, { bonusSpec: v })} /></Row>)}</Card>
    <Card style={{ marginTop: 8 }}>{Object.keys(nS).map(k => <Row key={k} name={nS[k]} sub={"rank " + (eq.shield[k].rank || 0) + " · bonus CA · bonus speciale"}>
      <Stepper value={eq.shield[k].caBonus || 0} min={0} max={10} label={"Bonus CA " + nS[k]} onChange={v => C.act.setShield(k, { caBonus: v })} />
      <Stepper value={eq.shield[k].bonusSpec || 0} min={-5} max={5} label={"Bonus speciale " + nS[k]} onChange={v => C.act.setShield(k, { bonusSpec: v })} /></Row>)}</Card>
    <p className="gx-lab" style={{ textTransform: "none" }}>Il limite di Destrezza e la penalità dello scudo grande li calcola la scheda dai rank (P-09, P-78).</p>
  </Sheet>;
}

/* ── Gemme e gioielli ── */
function Gemme({ C }) {
  const tot = C.gems.reduce((a, g) => a + (Number(g.qty) || 0) * (Number(g.unitValue) || 0), 0);
  return <div>
    <Section label="Gemme e gioielli" aux={tot ? String(Math.round(tot * 100) / 100).replace(".", ",") + " MO" : null} />
    <Card>{C.gems.map(g => <div key={g.i} className="gx-row" style={{ gap: 6 }}>
      <input className="gx-inp" style={Object.assign({}, GXE_INP, { flex: 1, minWidth: 0 })} value={g.name || ""} placeholder="Gemma o gioiello" aria-label="Nome" onChange={e => C.act.setGem(g.i, { name: e.target.value })} />
      <Stepper value={g.qty || 0} min={0} max={9999} label={"Quantità " + (g.name || "")} onChange={v => C.act.setGem(g.i, { qty: v })} />
      <input className="gx-inp" type="number" min="0" step="0.1" style={Object.assign({}, GXE_INP, { width: 80, textAlign: "right" })} value={g.unitValue || 0} aria-label="Valore unitario in MO" onChange={e => C.act.setGem(g.i, { unitValue: gxeNum(e.target.value) })} />
      <button className="gx-btn q" aria-label="Togli" onClick={() => C.act.removeGem(g.i)}>{"✕"}</button></div>)}
      <div className="gx-row"><Btn kind="q" onClick={() => C.act.addGem({})}>+ Gemma o gioiello</Btn><span className="gx-lab" style={{ textTransform: "none" }}>valore unitario in MO</span></div></Card>
  </div>;
}

/* ── Incantesimi: catalogo e repertorio ── */
function CatalogoIncantesimi({ C, onClose, side }) {
  const mie = C.classes.map(c => c.name);
  const [cls, setCls] = useState(mie.length ? "__mie__" : "__tutte__"), [scuola, setScuola] = useState(""), [liv, setLiv] = useState(""), [q, setQ] = useState(""), [aperto, setAperto] = useState(null), [msg, setMsg] = useState("");
  const t = q.trim().toLowerCase();
  const presenti = {}; C.spells.forEach(s => { if (s.id) presenti[s.id] = true; });
  const lista = C.spellCatalog.filter(sp => {
    const hb = sp.classesHb || [];
    if (cls === "__mie__" && mie.length && !hb.some(c => mie.indexOf(c) >= 0)) return false;
    if (cls !== "__mie__" && cls !== "__tutte__" && hb.indexOf(cls) < 0) return false;
    if (scuola && sp.school !== scuola) return false;
    if (liv !== "" && String(sp.level) !== liv) return false;
    if (t && String(sp.name).toLowerCase().indexOf(t) < 0 && String(sp.nameEn || "").toLowerCase().indexOf(t) < 0) return false;
    return true;
  }).sort((a, b) => (Number(a.level) - Number(b.level)) || String(a.name).localeCompare(String(b.name)));
  const accesso = sp => { const lv = Number(sp.level); if (!lv) return "trucchetto"; if (mie.length && !(sp.classesHb || []).some(c => mie.indexOf(c) >= 0)) return "fuori lista"; return lv <= C.pm.soglia ? "entro soglia" : "sovra-lancio"; };
  return <Sheet titolo="Catalogo incantesimi" onClose={onClose} side={side}>
    <div className="gx-flex" style={{ gap: 6, flexWrap: "wrap" }}>
      <select value={cls} onChange={e => setCls(e.target.value)} style={Object.assign({}, GXE_SEL, { flex: "1 1 100%" })} aria-label="Classe">
        <option value="__mie__">Le mie classi</option><option value="__tutte__">Tutte le classi</option>{C.classList.map(c => <option key={c}>{c}</option>)}</select>
      <select value={scuola} onChange={e => setScuola(e.target.value)} style={Object.assign({}, GXE_SEL, { flex: "1 1 40%", minWidth: 0 })} aria-label="Scuola">
        <option value="">Tutte le scuole</option>{GXE_SCUOLE.map(s => <option key={s}>{s}</option>)}</select>
      <select value={liv} onChange={e => setLiv(e.target.value)} style={Object.assign({}, GXE_SEL, { flex: "1 1 40%", minWidth: 0 })} aria-label="Livello">
        <option value="">Tutti i livelli</option>{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(l => <option key={l} value={String(l)}>{l ? l + "° livello" : "Trucchetti"}</option>)}</select></div>
    <div style={{ marginTop: 8 }}><SearchField value={q} onChange={setQ} placeholder="Cerca nome (italiano o inglese)" /></div>
    <p className="gx-lab" style={{ textTransform: "none" }}>{lista.length + " incantesimi"}{msg ? " · " + msg : ""}</p>
    <Card>{lista.slice(0, 150).map(sp => <div key={sp.id}>
      <div className="gx-row">
        <button className="nm" style={{ all: "unset", flex: 1, cursor: "pointer" }} aria-expanded={aperto === sp.id} onClick={() => setAperto(aperto === sp.id ? null : sp.id)}>
          <span className="nm">{sp.name}<small>{(Number(sp.level) ? sp.level + "° · " : "trucchetto · ") + sp.school + " · " + accesso(sp)}</small></span></button>
        {presenti[sp.id] ? <span className="gx-tag">nel repertorio</span> : <Btn kind="q" onClick={() => { C.act.addSpell(sp.id); setMsg(sp.name + " aggiunto"); }}>Aggiungi</Btn>}</div>
      {aperto === sp.id ? <div style={{ padding: "0 12px 12px", fontSize: 14, lineHeight: 1.5 }}>
        <p className="gx-lab" style={{ textTransform: "none" }}>{[sp.castTime, sp.range, sp.duration, sp.components].filter(Boolean).join(" · ")}</p>
        <p style={{ margin: "6px 0" }}>{sp.effects}</p>
        {sp.desc || sp.descEn ? <p style={{ margin: 0, color: "var(--muted)" }}>{sp.desc || sp.descEn}</p> : null}</div> : null}
    </div>)}{lista.length > 150 ? <Row name={<small>{"Altri " + (lista.length - 150) + ": restringi i filtri."}</small>} /> : null}</Card>
  </Sheet>;
}

function Repertorio({ C, onCatalogo }) {
  const [nuovo, setNuovo] = useState({ name: "", level: 1, school: "Invocazione" });
  return <div>
    <Section label="Repertorio" aux={C.spells.length + " incantesimi"} />
    <Card>
      {C.spells.map(s => <Row key={s.key} name={s.name} sub={(s.level ? s.level + "° · " : "trucchetto · ") + (s.school || "—") + (s.custom ? " · personalizzato" : "")}>
        <Chip on={s.prepared} onClick={() => C.act.setSpell(s.key, { prepared: !s.prepared })}>{s.prepared ? "Preparato" : "Prepara"}</Chip>
        <button className="gx-btn q" aria-label={"Togli " + s.name} onClick={() => C.act.removeSpell(s.key)}>{"✕"}</button></Row>)}
      <div className="gx-row"><Btn onClick={onCatalogo}>+ Dal catalogo</Btn></div>
    </Card>
    <Section label="Incantesimo personalizzato" />
    <Card>
      <div className="gx-row" style={{ gap: 6, flexWrap: "wrap" }}>
        <input className="gx-inp" style={Object.assign({}, GXE_INP, { flex: 1, minWidth: 140 })} value={nuovo.name} placeholder="Nome" aria-label="Nome" onChange={e => setNuovo(Object.assign({}, nuovo, { name: e.target.value }))} />
        <select value={nuovo.level} style={GXE_SEL} aria-label="Livello" onChange={e => setNuovo(Object.assign({}, nuovo, { level: +e.target.value }))}>{[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(l => <option key={l} value={l}>{l ? l + "°" : "trucchetto"}</option>)}</select>
        <select value={nuovo.school} style={GXE_SEL} aria-label="Scuola" onChange={e => setNuovo(Object.assign({}, nuovo, { school: e.target.value }))}>{GXE_SCUOLE.map(x => <option key={x}>{x}</option>)}</select>
        <Btn disabled={!nuovo.name.trim()} onClick={() => { C.act.addCustomSpell({ name: nuovo.name.trim(), level: nuovo.level, school: nuovo.school }); setNuovo({ name: "", level: 1, school: nuovo.school }); }}>Aggiungi</Btn></div>
    </Card>
  </div>;
}

/* ── Privilegi e talenti dall'archivio (10.6): si aggiungono con un tocco, i numeri diventano modificatori fissi ── */
/* ── Privilegi e talenti (10.7): archivio dai dati di ARCHETIPI e TALENTI, scelte, prerequisiti, acquisto dei talenti ── */
/* Le scelte di un privilegio o talento; con «acquisto» è il talento comprato al level-up (prezzo, accordo del master) */
function PrivScelteForm({ C, pid, acquisto, razziale, onDone, onCancel }) {
  const [sc, setSc] = useState({}), [forza, setForza] = useState(false), [ok, setOk] = useState(false), [msg, setMsg] = useState("");
  const r = C.privCatalogo.filter(x => x.id === pid)[0];
  if (!r) return null;
  const voci = C.privScelte(pid, sc);
  const setV = (k, i, v) => { const cur = Array.isArray(sc[k]) ? sc[k].slice() : sc[k] != null ? [sc[k]] : []; cur[i] = v; const n = Object.assign({}, sc); n[k] = cur.length > 1 ? cur : cur[0]; setSc(n); setMsg(""); };
  const val = (k, i) => { const v = sc[k]; return Array.isArray(v) ? (v[i] || "") : i === 0 ? (v || "") : ""; };
  const opts = { acquisto: !!acquisto, approvato: ok, forza: forza, razziale: !!razziale };
  const ver = C.privVerifica(pid, sc, opts);
  const mancanti = C.privVerifica(pid, sc, Object.assign({}, opts, { forza: true, approvato: true })).errore ? [] : (C.privVerifica(pid, sc, { forza: false, approvato: true, acquisto: false }).mancanti || []);
  const prezzo = acquisto ? C.privPrezzo(pid, sc) : null;
  const vai = () => { const res = C.act.addPrivilegio(pid, sc, opts); if (res && res.errore) setMsg(res.errore); else onDone && onDone(res); };
  return <Card>
    <Row name={r.nome} sub={[r.requisiti ? "requisiti: " + r.requisiti : "", r.scelteTesto].filter(Boolean).join(" · ")} />
    {voci.map(v => <div key={v.chiave}>{Array.from({ length: v.numero }).map((x, i) => {
      const lab = v.etichetta + (v.numero > 1 ? " " + (i + 1) : "");
      if (!v.opzioni) return <Campo key={i} label={lab} value={val(v.chiave, i)} placeholder="scrivi la scelta" onChange={t => setV(v.chiave, i, t)} />;
      const altri = Array.from({ length: v.numero }).map((y, j) => j !== i ? val(v.chiave, j) : null).filter(Boolean);
      return <Scelta key={i} label={lab} value={val(v.chiave, i)} onChange={t => setV(v.chiave, i, t)}
        options={[["", v.opzioni.length ? "— scegli —" : "— nessuna opzione possibile —"]].concat(v.opzioni.filter(o => altri.indexOf(o.v) < 0).map(o => [o.v, o.t]))} />;
    })}</div>)}
    {mancanti.length ? <Row name={<small>{"Manca: " + mancanti.join("; ") + ". Il master può concederlo lo stesso."}</small>}>
      <Toggle on={forza} label="Il master concede il talento senza il requisito" onChange={setForza} /></Row> : null}
    {acquisto ? <Row name="Prezzo" sub={"P-103 · per " + (C.lu ? C.lu.cls : "") + " · dal livello dopo, finché ti eserciti (P-102)"}>
      <b className="gx-num">{typeof prezzo === "number" ? prezzo + " punti" : prezzo && prezzo.da != null ? prezzo.da + "–" + prezzo.a + " punti" : "—"}</b></Row> : null}
    {acquisto ? <Row name="Il master è d'accordo" sub="il talento deve essere coerente con il percorso del personaggio"><Toggle on={ok} label="Il master è d'accordo" onChange={setOk} /></Row> : null}
    {msg || (ver.errore && !/Mancano delle scelte|accordo del master|Requisiti mancanti/.test(ver.errore)) ? <Row name={<small style={{ color: "var(--bad, #c0392b)" }}>{msg || ver.errore}</small>} /> : null}
    <div className="gx-flex" style={{ padding: "6px 12px 10px" }}>
      <Btn kind="q" wide onClick={onCancel}>Annulla</Btn>
      <Btn kind="pri" wide disabled={!!ver.errore} onClick={vai}>{acquisto ? (typeof prezzo === "number" ? "Compra per " + prezzo + " punti" : "Compra") : "Aggiungi"}</Btn></div>
  </Card>;
}
function PrivRiga({ C, r, breve, bloccato, acquisto, razziale, onPreso }) {
  const [form, setForm] = useState(false);
  const dove = r.tipo === "talento" ? r.rif : (r.classe ? r.classe + (r.archetipo ? " (" + r.archetipo + ")" : "") + " " + r.livello + "°" : r.rif);
  const sub = [dove, r.effetti, r.condizione ? "situazionale: " + r.condizione : "", r.mancanti.length ? "serve: " + r.mancanti.join("; ") : "",
    acquisto && r.prezzo != null ? r.prezzo + " punti" : acquisto && r.prezzoDa ? r.prezzoDa.da + "–" + r.prezzoDa.a + " punti" : ""].filter(Boolean).join(" · ");
  if (form) return <PrivScelteForm C={C} pid={r.id} acquisto={acquisto} razziale={razziale} onCancel={() => setForm(false)} onDone={() => { setForm(false); onPreso && onPreso(); }} />;
  if (bloccato && !r.applicato) return <Row name={breve || r.nome} sub={sub}>
    <Btn kind="q" disabled={true} title="Hai già scelto un'altra opzione: per cambiarla togli quella scelta">Un'altra scelta</Btn></Row>;
  const diretto = !acquisto && !r.haScelte && !r.mancanti.length;
  return <Row name={breve || r.nome} sub={sub}>
    <Btn kind={r.applicato && r.tipo !== "talento" ? "q" : "pri"} disabled={r.applicato && r.tipo !== "talento"}
      onClick={() => { if (diretto) { const res = C.act.addPrivilegio(r.id, {}, razziale ? { razziale: true } : null); if (res && !res.errore && onPreso) onPreso(); } else setForm(true); }}>
      {r.applicato && r.tipo !== "talento" ? "Sulla scheda" : acquisto ? "Scegli" : r.haScelte ? "Scegli…" : "Aggiungi"}</Btn></Row>;
}
function PrivilegiTalenti({ C, aperto }) {
  const [q, setQ] = useState(""), [filtro, setFiltro] = useState("tuoi"), [apri, setApri] = useState(!!aperto);
  const t = q.trim().toLowerCase();
  const libero = C.master || C.inCreation;   // fuori dal level-up i talenti li dà solo il master (P-102)
  const lista = C.privCatalogo
    .filter(r => filtro === "tutti" || (filtro === "talenti" ? r.tipo === "talento" : r.tipo !== "talento" && r.tuo))
    .filter(r => !t || (r.nome + " " + (r.classe || "") + " " + (r.archetipo || "") + " " + r.effetti).toLowerCase().indexOf(t) >= 0);
  const vuoto = filtro === "tuoi" ? "Nell'archivio non ci sono privilegi per le tue classi e i tuoi livelli. Prova «Tutti»." : "Nessun risultato.";
  return <div>
    <Section label="Privilegi e talenti" aux={C.privilegi.length ? C.privilegi.length + " sulla scheda" : "classe, archetipo, talenti"} />
    <Card>{C.privilegi.length ? C.privilegi.map(p => <div key={p.uid} className="gx-row" style={{ gap: 6, opacity: p.inAddestramento ? .65 : 1 }}>
      <span className="nm" style={{ flex: "1 1 180px" }}>{p.nome}<small>{[p.fonte + (p.classe ? " · " + p.classe + (p.livello ? " " + p.livello + "°" : "") : ""),
        p.scelteTesto, p.effetti, p.inAddestramento ? "in addestramento: vale dal " + p.attivoDal + "° livello" : "",
        p.acquisto ? "comprato per " + p.prezzo + " punti" : "", p.forzato ? "concesso dal master senza: " + p.forzato.join("; ") : "",
        p.condizione ? "situazionale: " + p.condizione : "", p.nota, !p.noto ? "non più nei dati: resta come promemoria" : ""].filter(Boolean).join(" · ")}</small></span>
      <button className="gx-btn q" aria-label={"Togli il privilegio " + p.nome} title="Toglie anche i suoi effetti" onClick={() => C.act.removePrivilegio(p.uid)}>{"✕"}</button></div>)
      : <Row name={<small>Nessuno. Qui si aggiungono i privilegi di classe, di archetipo e i talenti: i bonus si sommano da soli, il resto resta come promemoria.</small>} />}</Card>
    <div className="gx-row" style={{ marginTop: 12 }}><Btn kind={apri ? "q" : "pri"} onClick={() => setApri(!apri)}>{apri ? "Chiudi l'archivio" : "+ Aggiungi privilegio o talento"}</Btn></div>
    {apri ? <div>
      <div className="gx-segm" style={{ margin: "4px 12px 0" }} role="group" aria-label="Quali mostrare">
        {[["tuoi", "Delle tue classi"], ["talenti", "Talenti"], ["tutti", "Tutti"]].map(f => <button key={f[0]} aria-pressed={filtro === f[0]} onClick={() => setFiltro(f[0])}>{f[1]}</button>)}</div>
      <SearchField value={q} onChange={setQ} placeholder="Cerca privilegio, talento, classe" />
      {filtro !== "tuoi" && !libero ? <Row name={<small>I talenti si comprano nel passaggio di livello, ai livelli con aumento di caratteristica (P-102). Da qui li aggiunge il master, in Modifica scheda.</small>} /> : null}
      <Card>{lista.length ? lista.slice(0, 80).map(r => r.tipo === "talento" && !libero
        ? <Row key={r.id} name={r.nome} sub={[r.rif, r.effetti, r.mancanti.length ? "serve: " + r.mancanti.join("; ") : ""].filter(Boolean).join(" · ")} />
        : <PrivRiga key={r.id} C={C} r={r} />) : <Row name={<small>{vuoto}</small>} />}
        {lista.length > 80 ? <Row name={<small>{"Altri " + (lista.length - 80) + ": restringi la ricerca."}</small>} /> : null}</Card>
    </div> : null}
  </div>;
}
/* Nel passaggio di livello: i privilegi del nuovo livello della classe scelta.
   Le scelte di gruppo (Stile di combattimento) e le alternative di Tasha (alternativaDi) si tengono una sola. */
function PrivilegiLivello({ C }) {
  const pl = C.privLivello; if (!pl) return null;
  const recs = C.privCatalogo.filter(r => pl.ids.indexOf(r.id) >= 0);
  const gruppi = [];
  recs.forEach(r => {
    const g = r.gruppo || (r.alternativaDi && pl.ids.indexOf(r.alternativaDi) >= 0 ? "alt:" + r.alternativaDi : null) || (recs.some(x => x.alternativaDi === r.id) ? "alt:" + r.id : r.id);
    let x = gruppi.filter(y => y.g === g)[0];
    if (!x) { x = { g: g, scelta: !!r.gruppo || g.indexOf("alt:") === 0, alt: g.indexOf("alt:") === 0, nome: r.gruppo ? r.nome.split(":")[0] : r.nome, rs: [] }; gruppi.push(x); }
    x.rs.push(r);
  });
  return <div>
    <Section label={"Privilegi di " + pl.classe + " al " + pl.livello + "° livello"} aux={recs.length ? "si aggiungono con un tocco" : "nessuno nell'archivio"} />
    {recs.length ? gruppi.map(g => <div key={g.g}>
      {g.scelta ? <Row name={<small>{g.rs.some(r => r.applicato) ? g.nome + ": scelta fatta. Per cambiarla togli quella scelta in «Privilegi e talenti» qui sotto."
        : g.alt ? "Uno dei due: " + g.rs.map(r => r.nome).join(" oppure ") + "." : "Scegli " + g.nome + ": una sola opzione."}</small>} /> : null}
      <Card>{g.rs.map(r => <PrivRiga key={r.id} C={C} r={r} breve={g.scelta && !g.alt ? r.nome.split(": ").slice(1).join(": ") : null} bloccato={g.scelta && g.rs.some(x => x.applicato)} />)}</Card></div>)
      : <Card><Row name={<small>L'archivio non ha privilegi per questo livello di {pl.classe}. Se ne serve uno, aggiungilo da «Privilegi e talenti» qui sotto.</small>} /></Card>}
  </div>;
}
/* Nel passaggio di livello: il talento facoltativo ai livelli con aumento di caratteristica (P-102, P-103) */
function TalentoLivello({ C }) {
  const [q, setQ] = useState(""), [apri, setApri] = useState(false);
  const tal = C.talenti; if (!C.inLU || !tal) return null;
  const preso = tal.compratoOra ? C.privilegi.filter(p => p.uid === tal.compratoOra)[0] : null;
  if (!preso && !tal.possibile) return null;
  const t = q.trim().toLowerCase();
  const lista = C.privCatalogo.filter(r => r.tipo === "talento").filter(r => !t || (r.nome + " " + r.effetti).toLowerCase().indexOf(t) >= 0);
  return <div>
    <Section label="Talento" aux={tal.qui ? "aumento di caratteristica a questo livello" : tal.aperte + (tal.aperte === 1 ? " occasione aperta" : " occasioni aperte")} />
    {preso ? <Card><div className="gx-row" style={{ gap: 6 }}><span className="nm" style={{ flex: "1 1 180px" }}>{preso.nome}<small>{[preso.scelteTesto, preso.effetti,
      preso.prezzo + " punti, vale dal " + (preso.livelloPreso + 1) + "° livello (addestramento)"].filter(Boolean).join(" · ")}</small></span>
      <button className="gx-btn q" aria-label={"Togli il talento " + preso.nome} onClick={() => C.act.removePrivilegio(preso.uid)}>{"✕"}</button></div></Card>
      : <div>
        <Card><Row name={<small>Facoltativo, in più all'aumento di caratteristica. Si paga con i punti di questo livello e vale dal livello dopo, se il master è d'accordo. Se ora non ti bastano i punti, l'occasione resta aperta.</small>} /></Card>
        <div className="gx-row" style={{ marginTop: 8 }}><Btn kind={apri ? "q" : "pri"} onClick={() => setApri(!apri)}>{apri ? "Chiudi" : "Scegli un talento"}</Btn></div>
        {apri ? <div><SearchField value={q} onChange={setQ} placeholder="Cerca talento" />
          <Card>{lista.map(r => <PrivRiga key={r.id} C={C} r={r} acquisto={true} onPreso={() => setApri(false)} />)}</Card></div> : null}
      </div>}
  </div>;
}

/* ── Modificatori fissi: talenti, privilegi, archetipi, oggetti, situazioni (10.5) ── */
function Modificatori({ C }) {
  const vuoto = { nome: "", fonte: "Talento", valore: 1, bersagli: [], note: "" };
  const [n, setN] = useState(vuoto);
  const [q, setQ] = useState("");
  const [apri, setApri] = useState(false);
  const t = q.trim().toLowerCase();
  const nomeB = b => { const x = C.modTargets.filter(y => y[0] === b)[0]; if (x) return x[1]; const s = C.skills.filter(y => "sk:" + y.i === b)[0]; return s ? s.name : b; };
  const togB = b => setN(Object.assign({}, n, { bersagli: n.bersagli.indexOf(b) >= 0 ? n.bersagli.filter(x => x !== b) : n.bersagli.concat([b]) }));
  const trovate = t.length >= 2 ? C.skills.filter(s => s.name.toLowerCase().indexOf(t) >= 0 || s.cat.toLowerCase().indexOf(t) >= 0).slice(0, 30) : [];
  return <div>
    <Section label="Modificatori fissi" aux={C.modifiers.length ? C.modifiers.length + " attivi o sospesi" : "talenti, privilegi, oggetti"} />
    <Card>{C.modifiers.length ? C.modifiers.map(m => <div key={m.id} className="gx-row" style={{ flexWrap: "wrap", gap: 6, opacity: m.attivo === false ? .5 : 1 }}>
      <span className="nm" style={{ flex: "1 1 180px" }}>{m.nome || "senza nome"}<small>{m.fonte + (m.perLivello ? " · per livello" : "") + " · " + m.bersagliNomi.join(", ") + (m.priv ? " · dal privilegio" : "") + (m.condizione ? " · situazionale" : "") + (m.attivo === false ? " · sospeso" : "") + (m.note ? " · " + m.note : "")}</small></span>
      {m.derivato ? <b className="gx-num" title="Viene dal privilegio: si cambia togliendo il privilegio">{m.valoreTesto ? m.valoreTesto + " = " + fm(m.valoreCalc) : fm(m.valoreCalc)}</b>
        : <Stepper value={Number(m.valore) || 0} min={-20} max={20} step={m.bersagli.length === 1 && m.bersagli[0] === "vel" ? 1.5 : 1} label={"Valore di " + (m.nome || "modificatore")} onChange={v => C.act.setModifier(m.id, { valore: v })} />}
      {!m.derivato || m.condizione ? <Toggle on={m.attivo !== false} label={"Attivo: " + (m.nome || "modificatore")} onChange={on => C.act.setModifier(m.id, { attivo: on })} /> : null}
      {m.derivato ? null : <button className="gx-btn q" aria-label={"Togli " + (m.nome || "modificatore")} onClick={() => C.act.removeModifier(m.id)}>{"✕"}</button>}</div>)
      : <Row name={<small>Nessun modificatore. Aggiungine uno sotto: per esempio un talento che dà +5 all'iniziativa, o +2 ai tiri con le armi da tiro.</small>} />}</Card>
    <div className="gx-row" style={{ marginTop: 12 }}><Btn kind={apri ? "q" : "pri"} onClick={() => setApri(!apri)}>{apri ? "Chiudi" : "+ Nuovo modificatore"}</Btn></div>
    {apri ? <Card>
      <Campo label="Nome" value={n.nome} placeholder="es. Allerta, Stile difensivo" onChange={v => setN(Object.assign({}, n, { nome: v }))} />
      <Scelta label="Fonte" value={n.fonte} options={C.modSources} onChange={v => setN(Object.assign({}, n, { fonte: v }))} />
      <Row name="Valore"><Stepper value={n.valore} min={-20} max={20} step={n.bersagli.length === 1 && n.bersagli[0] === "vel" ? 1.5 : 1} label="Valore" onChange={v => setN(Object.assign({}, n, { valore: v }))} /></Row>
      <Section label="Si applica a" aux={n.bersagli.length ? n.bersagli.map(nomeB).join(", ") : "scegli almeno un bersaglio"} />
      <div style={{ padding: "0 12px 8px", display: "flex", gap: 6, flexWrap: "wrap" }}>
        {C.modTargets.map(b => <Chip key={b[0]} on={n.bersagli.indexOf(b[0]) >= 0} onClick={() => togB(b[0])}>{b[1]}</Chip>)}
        {n.bersagli.filter(b => b.indexOf("sk:") === 0).map(b => <Chip key={b} on={true} onClick={() => togB(b)}>{nomeB(b)}</Chip>)}</div>
      <div style={{ padding: "0 12px" }}><SearchField value={q} onChange={setQ} placeholder="Aggiungi competenze: cerca nome o categoria" /></div>
      {trovate.map(s => <Row key={s.i} name={s.name} sub={s.cat}><Chip on={n.bersagli.indexOf("sk:" + s.i) >= 0} onClick={() => togB("sk:" + s.i)}>{n.bersagli.indexOf("sk:" + s.i) >= 0 ? "Scelta" : "Scegli"}</Chip></Row>)}
      <Campo label="Nota" value={n.note} placeholder="regola, livello, fonte" onChange={v => setN(Object.assign({}, n, { note: v }))} />
      <div className="gx-row"><Btn kind="pri" disabled={!n.nome.trim() || !n.bersagli.length} onClick={() => { C.act.addModifier(Object.assign({}, n, { nome: n.nome.trim() })); setN(vuoto); setQ(""); setApri(false); }}>Aggiungi il modificatore</Btn></div>
    </Card> : null}
  </div>;
}
