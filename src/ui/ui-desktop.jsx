/* ui-desktop.jsx · La Gemma di San Batacchio · strato nuovo, parti di DESKTOP (strada D, pacchetto 0)
   Contratto di useCharacter 2.1 (tab REGIA — Pacchetto 0).
   Contiene: <Pannelli C={C} onMenu onAspetto attivo />  cornice da 768 px: Stato, una o due schermate, Tiri da 1280 px
             useScorciatoie(…)                          scorciatoie da tastiera
             <Stampa C={C} />                           Scheda a due colonne per la stampa A4
   NuovaUI (ui-new.jsx, MOBILE) inietta GXD_CSS dopo GX_CSS, monta Pannelli da 768 px e Stampa a ogni larghezza,
   come figlia diretta della radice .gx. Livello, creazione e pannello Aspetto restano di NuovaUI.
   Vincoli: React globale, niente import/export, niente optional chaining, dati solo da C, nessun calcolo di regole.
   Usa per nome da ui-new.jsx: StatusBar, HpPanel, Section, Card, Row, Btn, Chip, Pips, Segmented, RollToast, Sheet,
   BottomNav, PannelloTiri, PannelloCondizioni, PannelloRiposo, SCHERMATE, useGxToast, fm, gxClassi, gxDadi.
   Nomi propri con prefisso gxd / Gxd; gli hook si chiamano React.useState e simili, senza destrutturare. */

/* ═══ CSS (NuovaUI lo inietta dopo GX_CSS; usa solo le variabili di MOBILE) ═══
   Con Formato «Computer» sotto i 768 px la radice è larga almeno 1024 px e scorre in orizzontale (character.jsx):
   qui valgono le colonne della fascia 768–899. */
const GXD_CSS = `
.gx>.gxd{flex:1;min-height:0;display:grid;grid-template-rows:auto minmax(0,1fr) auto;
  grid-template-columns:280px minmax(470px,1fr);grid-template-areas:"top top" "stato main" "nav nav"}
@media (min-width:900px){.gx>.gxd{grid-template-columns:300px minmax(470px,1fr)}}
@media (min-width:1280px){.gx>.gxd{grid-template-columns:304px minmax(560px,1fr) 288px;
  grid-template-areas:"top top top" "stato main tiri" "nav nav nav"}}
@media (min-width:1600px){.gx>.gxd{grid-template-columns:304px minmax(560px,1fr) minmax(560px,1fr) 300px;
  grid-template-areas:"top top top top" "stato main main2 tiri" "nav nav nav nav"}}
.gxd-top{grid-area:top;display:flex;align-items:center;gap:8px;min-height:56px;padding:0 12px;background:var(--s1);border-bottom:1px solid var(--line)}
.gxd-tabs{display:flex;gap:4px;margin:0 auto}
.gxd-tabs button{height:40px;padding:0 16px;border-radius:calc(var(--radius) - 2px);font-family:var(--font-label);text-transform:var(--label-tt);letter-spacing:var(--label-ls);font-size:13px;color:var(--muted)}
.gxd-tabs button[aria-current=true]{color:var(--ink);background:var(--s2);box-shadow:inset 0 -2px 0 var(--acc)}
.gxd-tabs kbd{font-family:var(--font-num);font-size:11px;color:var(--muted);margin-left:6px;opacity:.7}
.gxd-tool{height:36px;padding:0 12px;border:1px solid var(--line);border-radius:18px;font-size:13px;color:var(--muted);white-space:nowrap}
.gxd-stato{grid-area:stato;min-height:0;overflow-y:auto;background:var(--s1);border-right:1px solid var(--line);padding-bottom:16px}
.gxd-main,.gxd-main2{min-height:0;overflow-y:auto;display:flex;flex-direction:column}
.gxd-main{grid-area:main}.gxd-main2{grid-area:main2;border-left:1px solid var(--line)}
.gxd-scr{width:100%;max-width:760px;margin:0 auto;padding-bottom:16px}
.gxd-tiri{grid-area:tiri;min-height:0;overflow-y:auto;background:var(--s1);border-left:1px solid var(--line);padding-bottom:76px}
.gxd-navw{grid-area:nav}
.gxd-pf{display:flex;gap:6px;align-items:center;margin:8px 12px 0}
.gxd-pf input{flex:1;min-width:0;height:40px;border-radius:calc(var(--radius) - 2px);border:1px solid var(--line);background:var(--s2);color:var(--ink);font-family:var(--font-num);font-size:18px;padding:0 10px}
.gxd-pf input:focus{outline:2px solid var(--acc);outline-offset:1px}
.gxd-pf .gx-btn[aria-pressed=true]{background:var(--acc);color:var(--on-acc)}
.gxd-esito{margin:12px 12px 0;padding:12px;border:1px solid var(--acc);border-radius:var(--radius);background:var(--s2);display:flex;flex-direction:column;gap:4px}
.gxd-esito small{font-size:13px;color:var(--muted)}
.gxd-esito b{font-family:var(--font-num);font-size:52px;line-height:1;font-weight:600}
.gxd-dadi{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin:10px 12px 0}
.gxd-dadi .gx-btn{min-width:0;padding:0 6px}
.gxd-dadi .d20{grid-column:span 2}
.gxd-keys{display:grid;grid-template-columns:auto 1fr;gap:6px 12px;font-size:14px}
.gxd-keys kbd{font-family:var(--font-num);font-size:13px;border:1px solid var(--line);border-radius:5px;padding:1px 6px;background:var(--s2);white-space:nowrap}
.gxd-vuota{margin:24px 12px;padding:16px;border:1px dashed var(--line);border-radius:var(--radius);color:var(--muted);font-size:14px}
@media (pointer:fine){.gxd-navw{display:none}}
@media (pointer:coarse){.gxd-top{display:none}.gxd-pf input{min-height:44px}}

/* stampa: <Stampa> è figlia diretta di .gx; in stampa si nascondono le altre figlie, la barra della campagna e il 🐞,
   e il contenitore .gx-host (fisso, overflow nascosto) torna nel flusso, altrimenti la stampa si ferma alla prima pagina */
.gxd-print{display:none}
@media print{
  @page{size:A4;margin:12mm}
  html,body,#root{height:auto!important;background:#fff!important}
  .gx{height:auto!important;display:block!important;background:#fff!important;background-image:none!important;color:#111!important}
  .gx>*:not(.gxd-print){display:none!important}
  .gx>.gxd-print{display:block!important}
  .gx-host{position:static!important;overflow:visible!important;height:auto!important}
  .dash-bar,.bugrep-fab{display:none!important}
}
.gxd-print{font-size:10pt;line-height:1.25;color:#111}
.gxd-print h1{font-size:18pt;font-weight:600;font-style:var(--name-style);margin:0}
.gxd-print h2{font-family:var(--font-label);text-transform:uppercase;letter-spacing:1px;font-size:8.5pt;color:#444;border-bottom:1px solid #999;margin:8pt 0 4pt;padding-bottom:1pt}
.gxd-print .p-sub{font-size:9.5pt;color:#444}
.gxd-print .p-page{display:grid;grid-template-columns:1fr 1fr;gap:0 10mm;align-items:start}
.gxd-print .p-page+.p-page{break-before:page;page-break-before:always}
.gxd-print .p-full{grid-column:1 / -1}
.gxd-print .p-boxes{display:grid;grid-template-columns:repeat(6,1fr);gap:4pt;margin-top:6pt}
.gxd-print .p-box{border:1px solid #777;border-radius:4pt;padding:3pt 4pt;text-align:center}
.gxd-print .p-box span{display:block;font-family:var(--font-label);font-size:7pt;letter-spacing:.6px;text-transform:uppercase;color:#555}
.gxd-print .p-box b{font-family:var(--font-num);font-size:15pt;font-weight:600}
.gxd-print .p-box i{display:block;font-style:normal;font-size:8pt;color:#555}
.gxd-print table{width:100%;border-collapse:collapse}
.gxd-print td,.gxd-print th{padding:1.5pt 3pt;border-bottom:.5pt solid #bbb;text-align:left;vertical-align:top}
.gxd-print th{font-family:var(--font-label);font-size:7pt;text-transform:uppercase;letter-spacing:.5px;color:#555;font-weight:400}
.gxd-print td.n{font-family:var(--font-num);text-align:right;white-space:nowrap}
.gxd-print .p-colonne{columns:4;column-gap:5mm;font-size:8pt;line-height:1.13}
.gxd-print .p-cat{break-inside:avoid;margin-bottom:2.5pt}
.gxd-print .p-cat b{display:block;margin-bottom:.5pt;font-family:var(--font-label);font-size:7pt;text-transform:uppercase;letter-spacing:.5px;color:#555;border-bottom:.5pt solid #999}
.gxd-print .p-sk{display:flex;gap:4pt}
.gxd-print .p-sk span:first-child{flex:1}
.gxd-print .p-sk span:not(:first-child){font-family:var(--font-num);min-width:16pt;text-align:right}
.gxd-print .p-sk.z{color:#777}
.gxd-print .p-chk{display:inline-block;width:8pt;height:8pt;border:.8pt solid #333;margin-right:2pt;vertical-align:-1pt}
.gxd-print .p-chk.on{background:#333}
.gxd-print .p-lines div{border-bottom:.5pt solid #bbb;height:13pt}
`;

/* ═══ COSTANTI DI INTERFACCIA ═══ */
const GXD_SCHERMATE = [["sessione", "Sessione"], ["attacchi", "Attacchi"], ["magia", "Magia"], ["scheda", "Scheda"]];
const GXD_MODI = { v: "vantaggio", n: "normale", s: "svantaggio" };
const GXD_DADI = [4, 6, 8, 10, 12, 100];
const GXD_CHIAVE = "ui_desktop_v1"; // coppia di schermate del monitor grande, per dispositivo
const GXD_TASTI = [
  ["1 · 2 · 3 · 4", "Sessione, Attacchi, Magia, Scheda (sul monitor grande apre nella colonna usata meno di recente)"],
  ["V · N · S", "Tiro con vantaggio, normale, con svantaggio"],
  ["T", "d20 libero"],
  ["I", "Tira l'iniziativa"],
  ["D · C", "Campo danni o cura: scrivi il numero e premi Invio"],
  ["↑ · ↓", "Pulsante precedente o successivo nella schermata"],
  ["Invio", "Azione del pulsante: tira, lancia, apre"],
  ["Esc", "Chiude il pannello aperto"],
  ["Ctrl+Z · Ctrl+Maiusc+Z", "Annulla e ripeti (Cmd su Mac)"],
  ["?", "Questo elenco"]];

/* ═══ PICCOLE FUNZIONI DI PRESENTAZIONE (formattano, non calcolano) ═══ */
function gxdMetri(v) { return v == null ? "—" : String(v).replace(".", ",") + " m"; }
function gxdKg(v) { return v == null ? "" : String(v).replace(".", ","); }
function gxdTesto(r) { return gxDadi(r) ? "[" + gxDadi(r) + "]" + (r.mod ? " " + fm(r.mod) : "") : (r.mod ? fm(r.mod) : ""); }
function gxdLeggi(chiave) { try { return JSON.parse(localStorage.getItem(chiave) || "null"); } catch (e) { return null; } }
function gxdScrivi(chiave, v) { try { localStorage.setItem(chiave, JSON.stringify(v)); } catch (e) { } }
function gxdSchermata(key) { return typeof SCHERMATE !== "undefined" && SCHERMATE ? SCHERMATE[key] || null : null; }

function useGxdMedia(q) {
  var init = typeof window !== "undefined" && window.matchMedia ? window.matchMedia(q).matches : false;
  var s = React.useState(init), v = s[0], set = s[1];
  React.useEffect(function () {
    if (!window.matchMedia) return undefined;
    var m = window.matchMedia(q), f = function () { set(m.matches); };
    f();
    if (m.addEventListener) m.addEventListener("change", f); else m.addListener(f);
    return function () { if (m.removeEventListener) m.removeEventListener("change", f); else m.removeListener(f); };
  }, [q]);
  return v;
}

/* ═══ COLONNA STATO: PF, condizioni, movimento, PM del patto (i privilegi con usi stanno in Attacchi) ═══ */
function GxdCampoPF(props) {
  var C = props.C, noCure = !!C.noHeal;
  var s = React.useState(""), val = s[0], setVal = s[1];
  var applica = function (modo) {
    var n = parseInt(val, 10);
    if (!(n > 0)) return;
    if (modo === "cura") C.act.heal(n); else C.act.damage(n);
    setVal("");
    props.setModo("danno");
  };
  return (
    <div className="gxd-pf">
      <input ref={props.inputRef} type="number" min="1" inputMode="numeric" value={val}
        aria-label={props.modo === "cura" ? "Punti ferita da curare" : "Danni da sottrarre"}
        placeholder={props.modo === "cura" ? "Cura" : "Danni"}
        onChange={function (e) { setVal(e.target.value); }}
        onKeyDown={function (e) {
          if (e.key === "Enter") { e.preventDefault(); applica(props.modo); }
          if (e.key === "Escape") { setVal(""); e.currentTarget.blur(); }
        }} />
      <button className="gx-btn" aria-pressed={props.modo === "danno"} onClick={function () { applica("danno"); }}>Danno</button>
      <button className="gx-btn" aria-pressed={props.modo === "cura"} disabled={noCure}
        title={noCure ? "Niente cure per il sovra-lancio" : null} onClick={function () { applica("cura"); }}>Cura</button>
    </div>
  );
}

function GxdStato(props) {
  var C = props.C, pm = C.pm, conc = C.conc ? C.conc.name : null;
  return (
    <aside className="gxd-stato" aria-label="Stato del personaggio">
      <StatusBar name={C.ch.name} cls={gxClassi(C)} conc={conc} portrait={C.portrait}
        hp={C.hp} ca={C.ca.total} pm={pm.max ? pm : null} init={C.init} version={C.version} density="column"
        onHp={function () { props.focusPF("danno"); }} onPm={function () { props.vai("magia"); }}
        onInit={function () { C.act.roll("Iniziativa", C.init); }} onMenu={props.onMenu} />
      <Section label="Punti ferita" aux={"temp " + (C.hp.temp || 0)} />
      <HpPanel cur={C.hp.cur} max={C.hp.max} temp={C.hp.temp}
        onDelta={function (n) { if (n < 0) C.act.damage(-n); else C.act.heal(n); }}
        onTemp={function (n) { C.act.setTemp(n); }}
        onShortRest={C.can.shortRest === false ? null : function () { props.apri("breve"); }} onLongRest={function () { props.apri("lungo"); }}
        bloccoCure={C.noHeal ? "Niente cure per " + C.noHeal.rounds + " round (" + C.noHeal.spell + ")" : null}
        onSblocca={function () { C.act.endNoHeal(); }} />
      <GxdCampoPF C={C} modo={props.modoPF} setModo={props.setModoPF} inputRef={props.pfRef} />
      <Section label="Condizioni" aux={"esaurimento " + (C.exhaustion || 0)} />
      <div className="gx-chips">
        {conc ? <Chip on onClick={function () { C.act.setConc(null); }}>{"Concentrazione · " + conc + " ✕"}</Chip> : null}
        {C.conds.map(function (c) { return <Chip key={c} on onClick={function () { C.act.toggleCond(c); }}>{c + " ✕"}</Chip>; })}
        {C.exhaustion ? <Chip on onClick={function () { props.apri("condizioni"); }}>{"Esaurimento " + C.exhaustion}</Chip> : null}
        <Chip onClick={function () { props.apri("condizioni"); }}>+ Condizione</Chip>
      </div>
      <Section label="Movimento" aux={C.speed.overload ? "sovraccarico" : null} />
      <Card><Row name="Velocità" sub={C.speed.overload ? "ridotta dal carico" : "a piedi"}>
        <span className="gx-val">{gxdMetri(C.speed.final)}</span></Row></Card>
      {pm.pact ? (
        <React.Fragment>
          <Section label="PM del patto" aux={"soglia " + pm.pact.soglia + "° · riposo breve"} />
          <Card><Row name="Riserva del patto"><Pips max={pm.pact.max} rem={pm.pact.rem} /></Row></Card>
        </React.Fragment>
      ) : null}
    </aside>
  );
}

/* ═══ COLONNA TIRI (da 1280 px; sotto c'è PannelloTiri a destra) ═══ */
function GxdTiri(props) {
  var C = props.C;
  var storia = C.roll.history.slice(0, 20); // il più recente è history[0]
  var ult = storia.length ? storia[0] : null;
  var tira = function (n) { C.act.roll(n === 20 ? "d20 libero" : "d" + n, 0, { die: n }); };
  return (
    <div>
      <Segmented mode={C.roll.mode} setMode={C.act.setMode} />
      <div className="gxd-esito" role="status" aria-live="polite">
        {ult ? (
          <React.Fragment>
            <small>{ult.label + (gxdTesto(ult) ? " · " + gxdTesto(ult) : "")}</small>
            <b>{ult.total}</b>
            <small>{C.roll.mode}</small>
          </React.Fragment>
        ) : <small>Nessun tiro in questa sessione</small>}
      </div>
      <div className="gxd-dadi">
        <Btn kind="d20" onClick={function () { tira(20); }}>d20 libero</Btn>
        {GXD_DADI.map(function (n) { return <Btn key={n} kind="q" onClick={function () { tira(n); }}>{"d" + n}</Btn>; })}
      </div>
      <Section label="Storico" aux={storia.length ? "ultimi " + storia.length : null} />
      <Card>
        {storia.length ? storia.map(function (r, i) {
          return <Row key={r.t || i} name={r.label} sub={gxdTesto(r)}><b className="gx-val">{r.total}</b></Row>;
        }) : <Row name={<small>Vuoto</small>} />}
      </Card>
    </div>
  );
}

/* ═══ SCORCIATOIE ═══
   Tasti singoli solo col fuoco fuori dai campi di testo e senza pannelli o percorsi aperti. */
function gxdInCampo(el) {
  if (!el) return false;
  var t = (el.tagName || "").toLowerCase();
  return t === "input" || t === "textarea" || t === "select" || el.isContentEditable;
}
function gxdPannelloAperto() { return !!document.querySelector(".gx-sheet, .gx-full"); }
function gxdSpostaFuoco(dir) {
  var att = document.activeElement;
  var col = att && att.closest ? att.closest(".gxd-main, .gxd-main2") : null;
  if (!col) col = document.querySelector(".gxd-main");
  if (!col) return;
  var righe = Array.prototype.slice.call(col.querySelectorAll("button"))
    .filter(function (b) { return !b.disabled && b.offsetParent !== null; });
  if (!righe.length) return;
  var i = righe.indexOf(att);
  var j = i < 0 ? (dir > 0 ? 0 : righe.length - 1) : Math.max(0, Math.min(righe.length - 1, i + dir));
  righe[j].focus();
  if (righe[j].scrollIntoView) righe[j].scrollIntoView({ block: "nearest" });
}

function useScorciatoie(o) {
  // o = { C, attivo, vai(key), focusPF(modo), chiudi() → true se ha chiuso qualcosa, aiuto() }
  var rif = React.useRef(o);
  rif.current = o;
  React.useEffect(function () {
    var su = function (e) {
      var x = rif.current, C = x.C, k = e.key;
      if (!x.attivo) return;
      if ((e.ctrlKey || e.metaKey) && !e.altKey && (k === "z" || k === "Z")) {
        if (gxdInCampo(e.target)) return; // nei campi di testo vale l'annulla del browser
        var ripeti = e.shiftKey;
        if (ripeti ? C.can.redo : C.can.undo) { e.preventDefault(); if (ripeti) C.act.redo(); else C.act.undo(); }
        return;
      }
      if (k === "Escape") { if (x.chiudi()) e.preventDefault(); return; } // gli Sheet di MOBILE chiudono da sé
      if (e.ctrlKey || e.metaKey || e.altKey || gxdInCampo(e.target) || gxdPannelloAperto()) return;
      var l = k.length === 1 ? k.toLowerCase() : k;
      if (l === "1" || l === "2" || l === "3" || l === "4") { x.vai(GXD_SCHERMATE[parseInt(l, 10) - 1][0]); e.preventDefault(); return; }
      if (GXD_MODI[l]) { C.act.setMode(GXD_MODI[l]); e.preventDefault(); return; }
      if (l === "t") { C.act.roll("d20 libero", 0, { die: 20 }); e.preventDefault(); return; }
      if (l === "i") { C.act.roll("Iniziativa", C.init); e.preventDefault(); return; }
      if (l === "d") { x.focusPF("danno"); e.preventDefault(); return; }
      if (l === "c") { x.focusPF("cura"); e.preventDefault(); return; }
      if (k === "?") { x.aiuto(); e.preventDefault(); return; }
      if (k === "ArrowDown") { gxdSpostaFuoco(1); e.preventDefault(); return; }
      if (k === "ArrowUp") { gxdSpostaFuoco(-1); e.preventDefault(); return; }
    };
    window.addEventListener("keydown", su);
    return function () { window.removeEventListener("keydown", su); };
  }, []);
}

/* ═══ CORNICE ═══
   Proprietà: C; onMenu (⋯ della barra di stato); onAspetto (pulsante «Menu» in alto, se c'è);
   attivo=false spegne le scorciatoie (livello e creazione). Pannelli laterali propri: tiri sotto i 1280 px,
   condizioni e riposo della colonna Stato, elenco dei tasti. */
function Pannelli(props) {
  var C = props.C;
  var medio = useGxdMedia("(min-width:1280px)");
  var due = useGxdMedia("(min-width:1600px)");
  var dito = useGxdMedia("(pointer:coarse)");
  var toast = useGxToast(C); // avviso dell'ultimo tiro, mostrato solo sotto i 1280 px

  // Due posti al centro; "ultimo" è quello usato per ultimo. Sotto i 1600 px si vede solo quello.
  var salvato = gxdLeggi(GXD_CHIAVE);
  var iniziale = salvato && salvato.posti && salvato.posti.length === 2 ? salvato :
    { posti: C.pm.max ? ["attacchi", "magia"] : ["sessione", "attacchi"], ultimo: 0 };
  var st = React.useState(iniziale), stato = st[0], setStato = st[1];
  var pp = React.useState(null), pan = pp[0], setPan = pp[1]; // "tiri" | "condizioni" | "breve" | "lungo" | "tasti"
  var mp = React.useState("danno"), modoPF = mp[0], setModoPF = mp[1];
  var pfRef = React.useRef(null);

  var vai = function (key) {
    setStato(function (s) {
      var posti = s.posti.slice(), i = posti.indexOf(key), ultimo;
      if (i >= 0) ultimo = i;
      else if (!due) { posti[s.ultimo] = key; ultimo = s.ultimo; }
      else { ultimo = 1 - s.ultimo; posti[ultimo] = key; }
      var n = { posti: posti, ultimo: ultimo };
      gxdScrivi(GXD_CHIAVE, n);
      return n;
    });
  };
  var focusPF = function (modo) {
    setModoPF(modo);
    if (pfRef.current) { pfRef.current.focus(); pfRef.current.select(); }
  };
  var chiudi = function () {
    if (pan) { setPan(null); return true; }
    var a = document.activeElement;
    if (a && a !== document.body && a.blur && !gxdPannelloAperto()) { a.blur(); return true; }
    return false;
  };
  useScorciatoie({ C: C, attivo: props.attivo !== false, vai: vai, focusPF: focusPF, chiudi: chiudi,
    aiuto: function () { setPan("tasti"); } });

  var visibili = due ? stato.posti : [stato.posti[stato.ultimo]];
  var chiudiPan = function () { setPan(null); };
  var schermata = function (key, cls) {
    var S = gxdSchermata(key);
    return (
      <main key={cls} className={cls} aria-label={key}>
        <div className="gxd-scr">
          {S ? <S C={C} wide={true} tiri={medio} /> :
            <div className="gxd-vuota">{"Schermata «" + key + "» di ui-new.jsx non trovata."}</div>}
        </div>
      </main>
    );
  };

  return (
    <div className="gxd">
      <header className="gxd-top">
        <nav className="gxd-tabs" aria-label="Schermate">
          {GXD_SCHERMATE.map(function (s, i) {
            return <button key={s[0]} aria-current={visibili.indexOf(s[0]) >= 0} onClick={function () { vai(s[0]); }}>
              {s[1]}<kbd>{i + 1}</kbd></button>;
          })}
        </nav>
        {!medio && !dito ? <button className="gxd-tool" onClick={function () { setPan("tiri"); }}>Tiri</button> : null}
        {!dito ? <button className="gxd-tool" aria-label="Scorciatoie da tastiera" onClick={function () { setPan("tasti"); }}>?</button> : null}
        {props.onAspetto && !dito ? <button className="gxd-tool" onClick={props.onAspetto}>Menu</button> : null}
      </header>

      <GxdStato C={C} vai={vai} onMenu={props.onMenu} apri={setPan}
        focusPF={focusPF} modoPF={modoPF} setModoPF={setModoPF} pfRef={pfRef} />

      {schermata(visibili[0], "gxd-main")}
      {visibili[1] ? schermata(visibili[1], "gxd-main2") : null}

      {medio ? <aside className="gxd-tiri" aria-label="Tiri"><GxdTiri C={C} /></aside> : null}

      {dito ? (
        <div className="gxd-navw">
          <BottomNav current={stato.posti[stato.ultimo]} onGo={vai} onDice={function () { if (!medio) setPan("tiri"); }} />
        </div>
      ) : null}

      {!medio ? <RollToast last={toast} /> : null}

      {pan === "tiri" ? <PannelloTiri C={C} side="right" onClose={chiudiPan} /> : null}
      {pan === "condizioni" ? <PannelloCondizioni C={C} side="right" onClose={chiudiPan} /> : null}
      {pan === "breve" || pan === "lungo" ? <PannelloRiposo C={C} tipo={pan} side="right" onClose={chiudiPan} /> : null}
      {pan === "tasti" ? (
        <Sheet titolo="Scorciatoie da tastiera" side="right" onClose={chiudiPan}>
          <div className="gxd-keys">
            {GXD_TASTI.map(function (t) { return <React.Fragment key={t[0]}><kbd>{t[0]}</kbd><span>{t[1]}</span></React.Fragment>; })}
          </div>
        </Sheet>
      ) : null}
    </div>
  );
}

/* ═══ STAMPA · Scheda a due colonne, A4, legge solo da C ═══
   NuovaUI la monta come figlia diretta della radice .gx, a ogni larghezza; a schermo è nascosta.
   «Stampa la scheda» nel pannello Aspetto chiama window.print(). */
function Stampa(props) {
  var C = props.C, ch = C.ch || {}, eq = C.equip || {};
  var STATS = ["Forza", "Destrezza", "Costituzione", "Intelligenza", "Saggezza", "Carisma"];
  var MONETE = [["mp", "Platino"], ["mo", "Oro"], ["me", "Electrum"], ["ma", "Argento"], ["mr", "Rame"]];
  var spells = C.spells || [], monete = eq.coins || {}, carico = eq.load;
  var livelli = [];
  spells.forEach(function (s) { if (livelli.indexOf(s.level) < 0) livelli.push(s.level); });
  livelli.sort(function (a, b) { return a - b; });
  var caselle = function (n) {
    var out = [];
    for (var i = 0; i < n; i++) out.push(<span key={i} className="p-chk" />);
    return out;
  };
  return (
    <div className="gxd-print" aria-hidden="true">
      <section className="p-page">
        <div className="p-full">
          <h1>{ch.name || "Senza nome"}</h1>
          <div className="p-sub">{[gxClassi(C), ch.align, ch.pn ? "giocatore " + ch.pn : null,
            "livello " + C.tl, C.version ? "scheda v" + C.version : null].filter(Boolean).join(" · ")}</div>
          <div className="p-boxes">
            <div className="p-box"><span>CA</span><b>{C.ca.total}</b><i>&nbsp;</i></div>
            <div className="p-box"><span>PF massimi</span><b>{C.hp.max}</b><i>attuali ____</i></div>
            <div className="p-box"><span>Iniziativa</span><b>{fm(C.init)}</b><i>&nbsp;</i></div>
            <div className="p-box"><span>Velocità</span><b>{gxdMetri(C.speed.final)}</b><i>{C.speed.overload ? "sovraccarico" : ""}</i></div>
            <div className="p-box"><span>PM</span><b>{C.pm.max}</b><i>{"Soglia " + C.pm.soglia + "°"}</i></div>
            <div className="p-box"><span>PM patto</span><b>{C.pm.pact ? C.pm.pact.max : "—"}</b><i>{C.pm.pact ? "Soglia " + C.pm.pact.soglia + "°" : ""}</i></div>
          </div>
        </div>

        <div>
          <h2>Caratteristiche</h2>
          <table><tbody>
            {STATS.map(function (k) {
              var s = C.stats[k] || {};
              return <tr key={k}><td>{k}</td><td className="n">{s.score}</td><td className="n"><b>{fm(C.mods[k])}</b></td></tr>;
            })}
          </tbody></table>

          <h2>Armi</h2>
          <table>
            <thead><tr><th>Arma</th><th>Colpire</th><th>Danni</th><th>Critico</th></tr></thead>
            <tbody>
              {C.weapons.map(function (w) {
                return <tr key={w.key}><td>{w.name}{w.notes && w.notes.length ? <div className="p-sub">{w.notes.join(" · ")}</div> : null}</td>
                  <td className="n">{fm(w.toHit)}</td><td>{gxDanno(w.dmg)}</td>
                  <td>{w.crit ? (w.crit.range ? w.crit.range + " · " : "") + gxDanno(w.crit.dmg) : ""}</td></tr>;
              })}
            </tbody>
          </table>

          {C.maneuvers.length ? (
            <React.Fragment>
              <h2>Manovre</h2>
              <table><tbody>
                {C.maneuvers.map(function (m) {
                  return <tr key={m.name}><td>{m.name}</td><td className="n">{fm(m.tot)}</td><td className="n">{m.dc ? "CD " + m.dc : ""}</td></tr>;
                })}
              </tbody></table>
            </React.Fragment>
          ) : null}

          {C.features.length ? (
            <React.Fragment>
              <h2>Privilegi</h2>
              <table><tbody>
                {C.features.map(function (f) {
                  return <tr key={f.key}><td>{f.name}<div className="p-sub">{f.cls + " " + f.lv + (f.dc ? " · CD " + f.dc : "")}</div></td>
                    <td>{f.uses && f.uses.max ? caselle(f.uses.max) : null}</td></tr>;
                })}
              </tbody></table>
            </React.Fragment>
          ) : null}
        </div>

        <div>
          <h2>Incantesimi</h2>
          {spells.length ? (
            <table>
              <thead><tr><th></th><th>Incantesimo</th><th>PM</th><th>CD / att.</th><th>Danni</th></tr></thead>
              <tbody>
                {livelli.map(function (lv) {
                  return spells.filter(function (s) { return s.level === lv; }).map(function (s) {
                    return <tr key={s.key}>
                      <td><span className={"p-chk" + (s.prepared || s.auto ? " on" : "")} /></td>
                      <td>{(lv ? lv + "° · " : "Trucchetto · ") + s.name}<div className="p-sub">{[s.school, s.castTime, s.conc ? "concentrazione" : null,
                        s.ritual ? "rituale" : null, s.source && s.source !== "classe" ? s.source : null].filter(Boolean).join(" · ")}</div></td>
                      <td className="n">{s.pmCost}</td>
                      <td className="n">{s.dc && s.dc.value ? "CD " + s.dc.value : s.attack != null ? fm(s.attack) : ""}</td>
                      <td>{s.dmg ? s.dmg.dice + " " + s.dmg.type : ""}</td></tr>;
                  });
                })}
              </tbody>
            </table>
          ) : <div className="p-sub">Nessuno</div>}

          <h2>Condizioni e note in sessione</h2>
          <div className="p-lines"><div /><div /><div /><div /><div /></div>
        </div>
      </section>

      <section className="p-page">
        <div className="p-full">
          <h2>Competenze <span style={{ textTransform: "none", letterSpacing: 0 }}>· rango e totale</span></h2>
          <div className="p-colonne">
            {C.cats.map(function (cat) {
              return <div key={cat.name} className="p-cat"><b>{cat.name}</b>
                {cat.items.map(function (i) {
                  var s = C.skills[i] || {};
                  return <div key={i} className={"p-sk" + (s.rank ? "" : " z")}><span>{s.name}</span><span>{s.rank || "·"}</span><span>{fm(s.tot)}</span></div>;
                })}
              </div>;
            })}
          </div>
        </div>
        <div>
          <h2>Equipaggiamento{carico ? <span style={{ textTransform: "none", letterSpacing: 0 }}>{" · " + gxdKg(carico.tot) + " / " + gxdKg(carico.max) + " kg" + (carico.over ? " · sovraccarico" : "")}</span> : null}</h2>
          <table>
            <thead><tr><th>Oggetto</th><th>Q.tà</th><th>kg</th></tr></thead>
            <tbody>
              {(eq.items || []).map(function (it, k) {
                return <tr key={it.i != null ? it.i : k}><td>{it.name}{it.notes ? <div className="p-sub">{it.notes}</div> : null}</td>
                  <td className="n">{it.qty == null ? 1 : it.qty}</td><td className="n">{gxdKg(it.weight)}</td></tr>;
              })}
            </tbody>
          </table>
        </div>
        <div>
          <h2>Monete</h2>
          <table><tbody>
            {MONETE.map(function (m) {
              return <tr key={m[0]}><td>{m[1]}</td><td className="n">{monete[m[0]] || 0}</td><td className="n">____</td></tr>;
            })}
          </tbody></table>
          <h2>Note</h2>
          <div className="p-lines"><div /><div /><div /></div>
        </div>
      </section>
    </div>
  );
}
