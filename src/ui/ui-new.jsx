/* ui-new.jsx · Nuova interfaccia della Gemma di San Batacchio (strada D), MOBILE, 14/11/2026, contratto C v2.1.
   Due strati. 1) Componenti di base con le proprietà della sezione 4 di MOBILE — Componenti: non conoscono C,
   ricevono valori e funzioni (li usa anche ui-desktop.jsx). 2) Schermate legate a C: Sessione, Attacchi, Magia,
   Scheda, raccolte in SCHERMATE; leggono solo dai campi di C e chiamano C.act. Nessun calcolo di regole.
   Ingresso: <NuovaUI C={C} onClassica={fn} />. Sotto 768 px colonna con barra in basso; da 768 px, se c'è,
   la cornice Pannelli di DESKTOP. React globale, niente import/export, niente optional chaining. */
const { useState, useEffect, useRef } = React;

const GX_CSS = `/* La Gemma di San Batacchio · strato di presentazione nuovo (strada D)
   Componenti comuni di MOBILE, 14/11/2026. Classi con prefisso gx- per convivere con la vecchia interfaccia.
   Radice: <div class="gx" data-theme="str|per|arn" data-var="dark|light">. I font (@font-face) vanno prima di questo blocco.
   Ordine: token per tema e variante, struttura comune, regole proprie di Pergamena e di Arena. */
/* ═══ TOKEN PER TEMA E VARIANTE ═══ */
.gx{--radius:10px;--pip-r:2px;--font-ui:'Plex',system-ui,sans-serif;--font-num:'PlexCond','Plex',sans-serif;--font-label:'PlexCond','Plex',sans-serif;--label-tt:uppercase;--label-ls:.8px;--name-style:normal;
  --sch-amm:var(--acc);--sch-inv:var(--acc);--sch-evo:var(--acc);--sch-abj:var(--acc);--sch-tra:var(--acc);--sch-div:var(--acc);--sch-ill:var(--acc);--sch-nec:var(--acc)}
.gx[data-theme=str][data-var=dark]{--bg:#0f1113;--s1:#171a1d;--s2:#1f2327;--line:#2b3035;--ink:#eceae6;--muted:#9097a0;--acc:#e3a33b;--on-acc:#1b1408;--good:#4cb871;--bad:#ef6b62;--mana:#5aa7e0;color-scheme:dark}
.gx[data-theme=str][data-var=light]{--bg:#f2f3f5;--s1:#ffffff;--s2:#eceef1;--line:#d3d7dc;--ink:#14171a;--muted:#5a636d;--acc:#935806;--on-acc:#fff;--good:#1d7a3e;--bad:#c0362c;--mana:#1f6fb2;color-scheme:light}
.gx[data-theme=per]{--radius:6px;--pip-r:50%;--font-ui:'Crimson',Georgia,serif;--font-num:'Crimson',Georgia,serif;--font-label:'Cinzel',Georgia,serif;--label-tt:none;--label-ls:1.2px;--name-style:italic}
.gx[data-theme=per][data-var=light]{--bg:#eee3c9;--s1:#f7efdc;--s2:#efe3c6;--line:#b99d6c;--ink:#2a1f14;--muted:#6e5330;--acc:#8f2a1d;--on-acc:#f7efdc;--good:#3d6b2a;--bad:#8f2a1d;--mana:#2c4a6b;color-scheme:light}
.gx[data-theme=per][data-var=dark]{--bg:#1c1611;--s1:#261f18;--s2:#30271d;--line:#53442f;--ink:#efe0c2;--muted:#b49c74;--acc:#d6aa4c;--on-acc:#1c1611;--good:#8bbd73;--bad:#e07a62;--mana:#86acd6;color-scheme:dark}
.gx[data-theme=arn]{--radius:14px;--pip-r:2px;--font-ui:'Plex',system-ui,sans-serif;--font-num:'Teko',sans-serif;--font-label:'Teko',sans-serif;--label-ls:1px;
  --sch-amm:#e86fd8;--sch-inv:#ff8a3d;--sch-evo:#3ddc8a;--sch-abj:#4dc3ff;--sch-tra:#b48cff;--sch-div:#f2d04b;--sch-ill:#7aa2ff;--sch-nec:#a3a8b0}
.gx[data-theme=arn][data-var=dark]{--bg:#0d0a17;--s1:#181231;--s2:#231a45;--line:#3a2e66;--ink:#f3effe;--muted:#a69dca;--acc:#ffcf5a;--on-acc:#2a1b05;--good:#5ef0a0;--bad:#ff5c7a;--mana:#4dc3ff;color-scheme:dark}
.gx[data-theme=arn][data-var=light]{--bg:#f1eefb;--s1:#ffffff;--s2:#e9e3fa;--line:#d2c8ef;--ink:#1c1433;--muted:#625a88;--acc:#7f5800;--on-acc:#fff;--good:#0c6a40;--bad:#b82442;--mana:#11669a;color-scheme:light;
  --sch-amm:#b4329f;--sch-inv:#c75a12;--sch-evo:#13864f;--sch-abj:#1676ad;--sch-tra:#7a4fd0;--sch-div:#8a6d00;--sch-ill:#3a5fcf;--sch-nec:#5b636b}

/* ═══ STRUTTURA COMUNE ═══ */
:where(.gx),:where(.gx) *{box-sizing:border-box;margin:0;padding:0}
:where(.gx) button{font:inherit;color:inherit;background:none;border:0;cursor:pointer;text-align:inherit}
:where(.gx) button:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
.gx{height:100%;display:flex;flex-direction:column;background:var(--bg);color:var(--ink);font-family:var(--font-ui);font-size:15px;position:relative}
.gx-num{font-family:var(--font-num);font-variant-numeric:tabular-nums lining-nums}
.gx-lab{font-family:var(--font-label);text-transform:var(--label-tt);letter-spacing:var(--label-ls);font-size:12px;color:var(--muted)}
.gx-status{background:var(--s1);border-bottom:1px solid var(--line);padding:8px 12px 10px;display:grid;grid-template-columns:auto 1fr auto auto;grid-template-areas:"ava who ver menu" "tiles tiles tiles tiles";gap:6px 10px;align-items:center}
.gx-ava{grid-area:ava;display:none}
.gx-who{grid-area:who;min-width:0}
.gx-who b{font-weight:600;font-size:16px;font-style:var(--name-style);display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gx-who small{display:block;font-size:12.5px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.gx-ver{grid-area:ver;font-family:var(--font-num);font-size:12px;color:var(--muted);border:1px solid var(--line);border-radius:8px;padding:1px 6px;white-space:nowrap}
.gx-menu{grid-area:menu;width:44px;height:40px;margin-right:-8px;font-size:22px;color:var(--muted);display:flex;align-items:center;justify-content:center}
.gx-tiles{grid-area:tiles;display:grid;grid-template-columns:1.7fr 1fr 1fr 1fr;gap:6px}
.gx-tile{background:var(--s2);border:1px solid var(--line);border-radius:calc(var(--radius) - 2px);padding:5px 8px;min-height:52px;display:flex;flex-direction:column;justify-content:space-between}
.gx-tile .gx-lab{font-size:11px}
.gx-tile b{font-family:var(--font-num);font-size:22px;font-weight:600;line-height:1.05}
.gx-tile b i{font-style:normal;font-size:13px;color:var(--muted);font-weight:500}
.gx-bar{height:4px;background:var(--line);border-radius:2px;overflow:hidden;margin-top:2px}.gx-bar>div{height:100%;background:var(--good)}
.gx-scroll{flex:1;overflow-y:auto;overflow-x:hidden;padding-bottom:16px}
.gx-sec{display:flex;justify-content:space-between;align-items:baseline;padding:14px 12px 6px}
.gx-card{background:var(--s1);border:1px solid var(--line);border-radius:var(--radius);margin:0 12px}
.gx-row{display:flex;align-items:center;gap:10px;min-height:48px;padding:4px 12px;border-top:1px solid var(--line);width:100%}
.gx-row:first-child{border-top:0}
.gx-row .nm{flex:1;min-width:0;line-height:1.2}
.gx-row .nm small{display:block;font-size:12.5px;color:var(--muted)}
.gx-val{font-family:var(--font-num);font-size:19px;font-weight:600;min-width:36px;text-align:right}
.gx-neg{color:var(--bad)}.gx-pos{color:var(--good)}
.gx-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-width:56px;height:40px;padding:0 12px;border-radius:calc(var(--radius) - 2px);border:1px solid var(--acc);color:var(--acc);font-weight:600;font-size:14px;white-space:nowrap}
.gx-btn.q{border-color:var(--line);color:var(--ink)}
.gx-btn.pri{background:var(--acc);color:var(--on-acc)}
.gx-btn.w{flex:1}
.gx-hp{padding:12px;display:flex;flex-direction:column;gap:10px}
.gx-hp .big{font-family:var(--font-num);font-size:42px;font-weight:600;line-height:1}
.gx-hp .big i{font-size:18px;color:var(--muted);font-style:normal;font-weight:500}
.gx-grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
.gx-grid4 button{height:44px;border-radius:calc(var(--radius) - 2px);background:var(--s2);border:1px solid var(--line);font-family:var(--font-num);font-size:17px;font-weight:600;text-align:center}
.gx-flex{display:flex;gap:6px;align-items:center}
.gx-chips{display:flex;flex-wrap:wrap;gap:6px;padding:0 12px}
.gx-chip{height:36px;padding:0 12px;border-radius:18px;border:1px solid var(--line);font-size:14px;display:inline-flex;align-items:center;gap:6px;background:var(--s1)}
.gx-chip.on{border-color:var(--mana);color:var(--mana)}
.gx-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:0 12px}
.gx-stat{background:var(--s1);border:1px solid var(--line);border-radius:var(--radius);height:68px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:1px}
.gx-stat b{font-family:var(--font-num);font-size:24px;font-weight:600;line-height:1}
.gx-stat i{font-style:normal;font-size:12.5px;color:var(--muted)}
.gx-search{margin:8px 12px 0;height:44px;border-radius:var(--radius);background:var(--s2);border:1px solid var(--line);display:flex;align-items:center;padding:0 12px;color:var(--muted);font-size:14px}
.gx-segm{display:grid;grid-template-columns:repeat(3,1fr);margin:12px 12px 0;border:1px solid var(--line);border-radius:var(--radius);overflow:hidden;background:var(--s1)}
.gx-segm button{height:40px;font-size:14px;color:var(--muted);text-align:center;border-left:1px solid var(--line)}
.gx-segm button:first-child{border-left:0}
.gx-segm button[aria-pressed=true]{background:var(--s2);color:var(--ink);font-weight:600}
.gx-wpn{padding:12px;display:flex;flex-direction:column;gap:10px}
.gx-wpn h3{font-size:18px;font-weight:600;font-style:var(--name-style);display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.gx-wpn h3 small{font-size:12.5px;color:var(--muted);font-weight:400;font-style:normal}
.gx-l2{display:flex;align-items:center;gap:8px}
.gx-l2 .lb{flex:1;font-size:13px;color:var(--muted);line-height:1.25}
.gx-l2 .lb b{display:block;font-family:var(--font-num);font-size:24px;color:var(--ink);font-weight:600}
.gx-tag{font-size:12px;padding:2px 7px;border-radius:5px;border:1px solid var(--line);color:var(--muted);white-space:nowrap}
.gx-lvl{width:30px;height:30px;flex:none;border-radius:calc(var(--radius) - 4px);background:var(--s2);border:1px solid var(--line);display:flex;align-items:center;justify-content:center;font-family:var(--font-num);font-weight:600;font-size:16px}
.gx-stripe{width:4px;align-self:stretch;margin:-4px 0 -4px -12px;border-radius:0;background:transparent}
.gx-pips{display:flex;gap:5px;flex-wrap:wrap}
.gx-pip{width:16px;height:16px;border-radius:var(--pip-r);background:var(--mana)}
.gx-pip.u{background:transparent;border:1.5px solid var(--line)}
.gx-open{background:var(--s2);border-top:1px solid var(--line);padding:12px;display:flex;flex-direction:column;gap:10px}
.gx-open p{font-size:14px;line-height:1.4}
.gx-lvp{display:flex;gap:6px;align-items:center}
.gx-lvp button{width:48px;height:44px;border-radius:calc(var(--radius) - 2px);border:1px solid var(--line);font-family:var(--font-num);font-size:18px;font-weight:600;text-align:center}
.gx-lvp button[aria-pressed=true]{border-color:var(--acc);color:var(--acc)}
.gx-lvp button.over{color:var(--bad)}
.gx-warn{font-size:13.5px;color:var(--bad);border:1px solid var(--bad);border-radius:calc(var(--radius) - 2px);padding:8px 10px}
.gx-nav{display:grid;grid-template-columns:1fr 1fr 76px 1fr 1fr;align-items:center;height:68px;background:var(--s1);border-top:1px solid var(--line);position:relative}
.gx-nav button{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-size:11.5px;color:var(--muted);height:100%;text-align:center}
.gx-nav svg{width:22px;height:22px;stroke:currentColor;fill:none;stroke-width:1.7}
.gx-nav button[aria-current=true]{color:var(--acc);font-weight:600}
.gx-nav .d20{width:60px;height:60px;margin:-22px auto 0;border-radius:50%;background:var(--acc);color:var(--on-acc);box-shadow:0 0 0 4px var(--bg);flex:none}
.gx-nav .d20 svg{width:30px;height:30px}
.gx-toast{position:absolute;left:12px;right:12px;bottom:80px;z-index:20;pointer-events:none;opacity:0;transform:translateY(8px);transition:opacity .15s,transform .15s}
.gx-toast.on{opacity:1;transform:none}
.gx-toast>div{background:var(--s2);border:1px solid var(--acc);border-radius:var(--radius);padding:10px 12px;display:flex;justify-content:space-between;align-items:center;font-size:13px;color:var(--muted);box-shadow:0 6px 20px rgba(0,0,0,.3)}
.gx-toast b{font-family:var(--font-num);font-size:30px;color:var(--ink);line-height:1}
.gx-sheet{position:absolute;inset:0;z-index:30;display:flex;flex-direction:column;justify-content:flex-end;background:rgba(0,0,0,.45)}
.gx-sheet>div{background:var(--s1);border-top:1px solid var(--line);border-radius:18px 18px 0 0;padding:8px 12px 20px;display:flex;flex-direction:column;gap:12px;max-height:80%;overflow-y:auto}
.gx-sheet .grab{width:40px;height:5px;border-radius:3px;background:var(--line);margin:0 auto 4px}
.gx-sheet h3{font-size:17px;font-weight:600}
.gx-opts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.gx-opt{border:1px solid var(--line);border-radius:var(--radius);padding:10px 8px;display:flex;flex-direction:column;gap:6px;align-items:flex-start;min-height:72px}
.gx-opt[aria-pressed=true]{border-color:var(--acc);box-shadow:inset 0 0 0 1px var(--acc)}
.gx-opt .sw{display:flex;gap:3px}.gx-opt .sw i{width:14px;height:14px;border-radius:3px;display:block}
.gx-wiz{background:var(--s1);border-bottom:1px solid var(--line);padding:10px 12px 12px}
.gx-wiz h2{font-size:21px;font-weight:600;font-style:var(--name-style)}
.gx-steps{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:4px;margin-top:10px}
.gx-steps div{height:4px;border-radius:2px;background:var(--line)}.gx-steps div.d{background:var(--acc)}
.gx-pool{display:flex;justify-content:space-between;align-items:center;padding:10px 12px;background:var(--s2);border-bottom:1px solid var(--line)}
.gx-pool b{font-family:var(--font-num);font-size:28px}
.gx-tog{width:52px;height:32px;border-radius:16px;background:var(--line);position:relative;flex:none}
.gx-tog::after{content:"";position:absolute;top:3px;left:3px;width:26px;height:26px;border-radius:50%;background:var(--s1);transition:left .12s}
.gx-tog[aria-pressed=true]{background:var(--acc)}.gx-tog[aria-pressed=true]::after{left:23px}
.gx-foot{display:grid;grid-template-columns:1fr 2fr;gap:8px;padding:10px 12px;border-top:1px solid var(--line);background:var(--s1)}
.gx-foot .gx-btn{height:48px}
.gx-full{position:absolute;inset:0;z-index:25;display:flex;flex-direction:column;background:var(--bg)}
.gx-chev{color:var(--muted);font-size:18px}
.gx-step{display:inline-flex;align-items:center;gap:4px}
.gx-step button{width:44px;height:44px;border-radius:calc(var(--radius) - 2px);border:1px solid var(--line);font-size:20px;text-align:center}
.gx-step button:disabled{opacity:.4;cursor:default}
.gx-step b{min-width:28px;text-align:center;font-family:var(--font-num);font-size:19px}
@media (pointer:coarse){.gx-row,.gx-chip{min-height:44px}}
@media (prefers-reduced-motion:reduce){.gx-toast,.gx-tog::after{transition:none}}

/* ═══ REGOLE PROPRIE · PERGAMENA ═══ */
.gx[data-theme=per]{font-size:17px;background-image:radial-gradient(ellipse at 15% 0%,rgba(255,255,255,.18),transparent 55%),radial-gradient(ellipse at 100% 100%,rgba(122,90,47,.16),transparent 55%)}
.gx[data-theme=per][data-var=dark]{background-image:radial-gradient(ellipse at 15% 0%,rgba(214,170,76,.07),transparent 55%),radial-gradient(ellipse at 100% 100%,rgba(0,0,0,.35),transparent 60%)}
.gx[data-theme=per] .gx-lab{font-size:11.5px}
.gx[data-theme=per] .gx-who b{font-size:21px}
.gx[data-theme=per] .gx-card,.gx[data-theme=per] .gx-tile,.gx[data-theme=per] .gx-stat{border-width:1.5px;border-color:var(--muted);background:var(--s1)}
.gx[data-theme=per] .gx-card{box-shadow:inset 0 0 0 3px var(--s1),inset 0 0 0 4px var(--line)}
.gx[data-theme=per] .gx-stat{border-radius:10px 10px 24px 24px;height:78px}
.gx[data-theme=per] .gx-sec{justify-content:center;gap:8px}
.gx[data-theme=per] .gx-sec .gx-lab{font-size:13px;color:var(--muted)}
.gx[data-theme=per] .gx-sec .aux{display:none}
.gx[data-theme=per] .gx-sec::before,.gx[data-theme=per] .gx-sec::after{content:"";flex:1;height:1px;background:var(--line);align-self:center}
.gx[data-theme=per] .gx-tile.ca{border-radius:4px 4px 50% 50% / 4px 4px 26% 26%;padding-bottom:10px}
.gx[data-theme=per] .gx-nav button[aria-current=true]{box-shadow:inset 0 3px 0 var(--acc)}
.gx[data-theme=per] .gx-btn{font-family:'Cinzel',serif;font-size:13px;letter-spacing:.6px}
.gx[data-theme=per] .gx-hp .big{color:var(--bad);font-style:italic}

/* ═══ REGOLE PROPRIE · ARENA ═══ */
.gx[data-theme=arn][data-var=dark]{background-image:radial-gradient(120% 50% at 50% -10%,#3a1f6b 0%,transparent 60%),radial-gradient(80% 40% at 100% 110%,#1f3a6b 0%,transparent 60%)}
.gx[data-theme=arn][data-var=light]{background-image:radial-gradient(120% 50% at 50% -10%,#d9ccff 0%,transparent 60%)}
.gx[data-theme=arn] .gx-status{background:transparent;border-bottom:0}
.gx[data-theme=arn] .gx-ava{display:flex;width:52px;height:52px;border-radius:50%;align-items:center;justify-content:center;position:relative}
.gx[data-theme=arn] .gx-ava>div{width:44px;height:44px;border-radius:50%;background:var(--s2);display:flex;align-items:center;justify-content:center;font-family:'Teko';font-size:26px;color:var(--acc)}
.gx[data-theme=arn] .gx-lab{font-size:15px;line-height:1}
.gx[data-theme=arn] .gx-tile b,.gx[data-theme=arn] .gx-stat b,.gx[data-theme=arn] .gx-val{font-size:28px;line-height:.9;font-weight:500}
.gx[data-theme=arn] .gx-stat{clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%);border:0;background:linear-gradient(160deg,var(--s2),var(--s1));height:76px}
.gx[data-theme=arn] .gx-pip{transform:rotate(45deg) scale(.8);box-shadow:0 0 8px color-mix(in srgb,var(--mana) 60%,transparent)}
.gx[data-theme=arn] .gx-pip.u{box-shadow:none}
.gx[data-theme=arn] .gx-stripe{background:var(--sc)}
.gx[data-theme=arn] .gx-card{box-shadow:0 8px 24px rgba(0,0,0,.18)}
.gx[data-theme=arn] .gx-wcard{background:linear-gradient(160deg,var(--s2),var(--s1))}
.gx[data-theme=arn] .gx-btn{font-family:'Teko';font-size:19px;letter-spacing:1px;text-transform:uppercase;font-weight:500}
.gx[data-theme=arn] .gx-nav .d20{box-shadow:0 0 0 4px var(--bg),0 0 22px color-mix(in srgb,var(--acc) 55%,transparent)}
.gx[data-theme=arn] .gx-hp .big{font-size:56px;font-weight:500}
.gx-sheet.r{flex-direction:row;justify-content:flex-end}
.gx-sheet.r>div{width:min(420px,100%);max-height:none;height:100%;border-radius:0;border-top:0;border-left:1px solid var(--line)}
.gx-sheet.r .grab{display:none}
.gx-lvp{overflow-x:auto;padding-bottom:2px}
.gx-lvp button{flex:none}
.gx-inp{height:40px;min-width:0;border:1px solid var(--line);border-radius:calc(var(--radius) - 2px);background:var(--s2);color:var(--ink);font:inherit;font-size:15px;padding:0 10px}
.gx-inp:focus{outline:2px solid var(--acc);outline-offset:1px}
@media (pointer:coarse){.gx-inp{min-height:44px}}
.gx-status[data-density=column] .gx-tiles{grid-template-columns:1fr 1fr!important}
.gx-hp .big{white-space:nowrap}
.gx-hp>.gx-flex:first-child{flex-wrap:wrap}
.gx-hp-r{flex:1 0 auto;justify-content:flex-end}
.gx-grid4 button:disabled,.gx-btn:disabled{opacity:.4;cursor:default}
/* 10.5.x MOBILE: il contenuto dei pannelli non si schiaccia (il selettore V/N/S era tagliato a metà) */
.gx-sheet>div>*{flex-shrink:0}
.gx-row .nm small s{opacity:.55}
.gx-row .nm small b{color:var(--ink);font-weight:600}
.gx-val.gx-nat20{color:var(--good)}
.gx-val.gx-nat1{color:var(--bad)}
.gx-mtag{font-style:normal;font-size:11px;font-weight:600;margin-left:6px;padding:0 5px;border:1px solid var(--line);border-radius:4px;color:var(--muted);vertical-align:1px}
.gx-row .nm small .gx-ora{float:right;margin-left:8px;opacity:.7}
.gx-storico{justify-content:space-between;align-items:center;margin-top:4px}
/* riserva grande in una riga: barra corta, il nome resta leggibile */
.gx-row>.gx-flex:has(>.gx-bar){max-width:96px}
.gx-storico .gx-btn{min-height:30px;padding:0 10px}
/* segmentati con 1, 2 o 5 opzioni (Modifica scheda, level-up, archivio): niente colonne vuote */
.gx-segm:has(>button:only-child){grid-template-columns:1fr}
.gx-segm:has(>button:nth-child(2):last-child){grid-template-columns:repeat(2,1fr)}
.gx-segm:has(>button:nth-child(5):last-child){grid-template-columns:repeat(6,1fr)}
.gx-segm:has(>button:nth-child(5):last-child)>button{grid-column:span 2}
.gx-segm:has(>button:nth-child(5):last-child)>button:nth-child(n+4){grid-column:span 3;border-top:1px solid var(--line)}
.gx-segm:has(>button:nth-child(5):last-child)>button:nth-child(4){border-left:0}
@media (min-width:768px){.gx-segm:has(>button:nth-child(5):last-child){grid-template-columns:repeat(5,1fr)}.gx-segm:has(>button:nth-child(5):last-child)>button,.gx-segm:has(>button:nth-child(5):last-child)>button:nth-child(n+4){grid-column:auto;border-top:0}.gx-segm:has(>button:nth-child(5):last-child)>button:nth-child(4){border-left:1px solid var(--line)}}
/* intestazione di sezione con nota lunga: la nota va a capo a destra, non sopra l'etichetta */
.gx-sec{gap:12px}
.gx-sec .aux{text-align:right;min-width:0}
/* note di servizio in gx-lab con text-transform:none: testo normale, leggibile anche in Pergamena (Cinzel non ha minuscole) */
.gx-lab[style*="text-transform: none"]{font-family:var(--font-body);letter-spacing:0;font-size:12.5px;line-height:1.35}
/* scheda a quattro parti: due righe da due al telefono */
.gx-segm.g4{grid-template-columns:repeat(2,1fr)}
.gx-segm.g4 button:nth-child(3){border-left:0}
.gx-segm.g4 button:nth-child(n+3){border-top:1px solid var(--line)}
@media (min-width:768px){.gx-segm.g4{grid-template-columns:repeat(4,1fr)}.gx-segm.g4 button:nth-child(3){border-left:1px solid var(--line)}.gx-segm.g4 button:nth-child(n+3){border-top:0}}
/* segmentato dentro una riga (FOR | DES): colonne quante sono le opzioni */
.gx-row .gx-segm{grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:minmax(56px,auto);flex:none}
.gx-row .gx-segm button{padding:0 12px}
/* riga con due stepper: al telefono il nome va sopra, gli stepper sotto */
@media (max-width:767px){.gx-row:has(>.gx-step+.gx-step){flex-wrap:wrap;padding-top:8px;padding-bottom:8px}.gx-row:has(>.gx-step+.gx-step)>.nm{flex-basis:100%}.gx-row:has(>.gx-step+.gx-step)>.gx-step+.gx-step{margin-left:auto}}
`;

/* ═══ funzioni di presentazione (formattano, non calcolano) ═══ */
const fm = v => (v < 0 ? "−" : "+") + Math.abs(v);
const tone = v => (v < 0 ? "gx-neg" : "");
const GX_SCUOLE = { Abiurazione: "abj", Ammaliamento: "amm", Divinazione: "div", Evocazione: "evo", Illusione: "ill", Invocazione: "inv", Necromanzia: "nec", Trasmutazione: "tra" };
const GX_MODI = [["vantaggio", "Vantaggio"], ["normale", "Normale"], ["svantaggio", "Svantaggio"]];
const GX_CAR = [["Forza", "FOR"], ["Destrezza", "DES"], ["Costituzione", "COS"], ["Intelligenza", "INT"], ["Saggezza", "SAG"], ["Carisma", "CAR"]];
const GX_RUOLI = { main: "mano principale", off: "mano secondaria", none: "" };
const gxDanno = groups => (groups || []).map(g => g.dice + (g.flat ? fm(g.flat) : "") + (g.type ? " " + g.type : "")).join(" + ");
/* due d20 (vantaggio/svantaggio): uno dei due è il dado tenuto (totale − mod); altrimenti i dadi si sommano */
/* d20 con vantaggio/svantaggio: indice del dado tenuto. Dalla 10.7 lo dice r.chosen; per le voci senza, totale − mod */
const gxScelto = r => (Array.isArray(r.dice) && r.dice.length === 2 && !r.parts ? r.dice.indexOf(r.chosen != null ? r.chosen : r.total - (r.mod || 0)) : -1);
const gxDadi = r => (Array.isArray(r.dice) ? r.dice.join(gxScelto(r) >= 0 ? "/" : "+") : (r.dice == null ? "" : String(r.dice)));
const gxDadiVis = r => { const k = gxScelto(r); if (k < 0) return gxDadi(r); return r.dice.map((d, i) => <span key={i}>{i ? "/" : ""}{i === k ? <b>{d}</b> : <s>{d}</s>}</span>); };
const gxTestoTiro = r => r.label + (gxDadi(r) ? " · " + gxDadi(r) : "") + (typeof r.mod === "number" ? " " + fm(r.mod) : "");
const gxVersione = v => (v != null ? v : (typeof APP_VERSION !== "undefined" ? APP_VERSION : ""));
const gxClassi = C => C.classes.map(c => c.name + " " + c.level).join(" / ") + (C.race ? " · " + C.race.name : "");
const gxMetri = v => (v == null ? "—" : String(v).replace(".", ",") + " m");

function useGxMedia(q) {
  const mq = typeof matchMedia === "function" ? matchMedia(q) : null;
  const [v, setV] = useState(mq ? mq.matches : false);
  useEffect(() => {
    if (!mq) return undefined;
    const f = () => setV(mq.matches);
    f();
    if (mq.addEventListener) mq.addEventListener("change", f); else mq.addListener(f);
    return () => { if (mq.removeEventListener) mq.removeEventListener("change", f); else mq.removeListener(f); };
  }, [q]);
  return v;
}

/* ═══ aspetto: tema e variante, salvati nel browser; partenza Strumento scuro; primo = nessun valore salvato ═══ */
function useAspetto() {
  const saved = () => { try { const p = JSON.parse(localStorage.getItem("ui_aspetto_v1") || "null"); if (p && p.theme) return p; } catch (e) {} return null; };
  const [primo] = useState(() => !saved());
  const [a, setA] = useState(() => saved() || { theme: "str", v: "dark" });
  const light = useGxMedia("(prefers-color-scheme: light)");
  const set = (theme, v, f) => { const n = { theme: theme || a.theme, v: v || a.v, f: f || a.f || "auto" }; setA(n); try { localStorage.setItem("ui_aspetto_v1", JSON.stringify(n)); window.dispatchEvent(new Event("gx-aspetto")); } catch (e) {} };
  const eff = a.v === "auto" ? (light ? "light" : "dark") : a.v;
  return { theme: a.theme, v: a.v, f: a.f || "auto", eff, set, primo };
}

/* ═══ icone ═══ */
const GxIco = {
  sessione: <svg viewBox="0 0 24 24"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" /></svg>,
  attacchi: <svg viewBox="0 0 24 24"><path d="M5 19L17 7l2-4-4 2L3 17" /><path d="M14 14l5 5M17 17l2-2" /></svg>,
  magia: <svg viewBox="0 0 24 24"><path d="M12 2l2.5 6.5L21 9l-5 4.5L17.5 21 12 17l-5.5 4L8 13.5 3 9l6.5-.5z" /></svg>,
  scheda: <svg viewBox="0 0 24 24"><path d="M6 3h9l4 4v14H6z" /><path d="M9 11h7M9 15h7M9 7h4" /></svg>,
  d20: <svg viewBox="0 0 24 24"><path d="M12 2l9 5v10l-9 5-9-5V7z" /><path d="M12 2l-5 9h10z M7 11l5 11 5-11M3 7l4 4M21 7l-4 4" /></svg>
};

/* ═══ 1 · COMPONENTI DI BASE (proprietà della sezione 4) ═══ */
function Section({ label, aux }) {
  return <div className="gx-sec"><span className="gx-lab">{label}</span>{aux ? <span className="gx-lab aux">{aux}</span> : null}</div>;
}
function Card({ children, style }) {
  return <div className="gx-card" style={style}>{children}</div>;
}
/* Riga: con onRoll tutta la riga è il tiro (valore e indicatore d20); senza, un div con i figli. */
function Row({ name, sub, value, onRoll, children, style }) {
  const nm = <span className="nm">{name}{sub ? <small>{sub}</small> : null}</span>;
  if (onRoll) return <button className="gx-row" style={style} onClick={onRoll}>{nm}
    <span className={"gx-val " + tone(value)}>{fm(value)}</span><span className="gx-btn">d20</span>{children}</button>;
  return <div className="gx-row" style={style}>{nm}{children}</div>;
}
function Btn({ kind, wide, onClick, disabled, title, children }) {
  return <button className={"gx-btn" + (kind ? " " + kind : "") + (wide ? " w" : "")} onClick={onClick} disabled={disabled} title={title}>{children}</button>;
}
function Chip({ on, onClick, children }) {
  return <button className={"gx-chip" + (on ? " on" : "")} aria-pressed={!!on} onClick={onClick}>{children}</button>;
}
function Pips({ max, rem }) {
  if (max > 12) return <div className="gx-flex" style={{ flex: 1 }}><div className="gx-bar" style={{ flex: 1, height: 8 }}><div style={{ width: (max ? rem / max * 100 : 0) + "%", background: "var(--mana)" }} /></div><b className="gx-num">{rem}</b></div>;
  const out = [];
  for (let i = 0; i < max; i++) out.push(<span key={i} className={"gx-pip" + (i < rem ? "" : " u")} />);
  return <div className="gx-pips">{out}</div>;
}
function Stepper({ value, min, max, onChange, label, step }) {
  const st = step || 1, r = v => Math.round(v * 10) / 10;   // step 1,5 per la velocità (10.7, N-02)
  return <div className="gx-step" role="group" aria-label={label}>
    <button aria-label="Meno" disabled={value <= min} onClick={() => onChange(r(value - st))}>{"−"}</button>
    <b>{String(value).replace(".", ",")}</b>
    <button aria-label="Più" disabled={value >= max} onClick={() => onChange(r(value + st))}>+</button>
  </div>;
}
function Toggle({ on, onChange, label }) {
  return <button className="gx-tog" aria-pressed={on} aria-label={label} onClick={() => onChange(!on)} />;
}
/* riserve grandi (oltre 12, es. Imposizione delle mani): due pulsanti, −1 e −5; onUsa riceve quanti */
function ResourceCounter({ nome, max, usati, recupero, onUsa }) {
  const rem = max - usati;
  if (max > 12) return <Row name={nome} sub={recupero}><Pips max={max} rem={rem} />
    <Btn kind="q" disabled={rem < 1} onClick={() => onUsa(1)}>{"−1"}</Btn><Btn kind="q" disabled={rem < 5} onClick={() => onUsa(5)}>{"−5"}</Btn></Row>;
  return <Row name={nome} sub={recupero}><Pips max={max} rem={rem} />
    <Btn kind="q" disabled={usati >= max} onClick={() => onUsa(1)}>Usa</Btn></Row>;
}
function Segmented({ mode, setMode }) {
  return <div className="gx-segm" role="group" aria-label="Modo dei tiri">
    {GX_MODI.map(m => <button key={m[0]} aria-pressed={mode === m[0]} onClick={() => setMode(m[0])}>{m[1]}</button>)}
  </div>;
}
function RollToast({ last }) {
  return <div className={"gx-toast" + (last ? " on" : "")} role="status">
    {last ? <div><span>{last.testo}</span><b>{last.totale}</b></div> : null}
  </div>;
}
/* side="right": pannello laterale a tutta altezza (da 768 px). */
function Sheet({ titolo, onClose, side, children }) {
  useEffect(() => { const k = e => { if (e.key === "Escape") onClose(); }; document.addEventListener("keydown", k); return () => document.removeEventListener("keydown", k); }, []);
  return <div className={"gx-sheet" + (side === "right" ? " r" : "")} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div role="dialog" aria-label={titolo}><div className="grab" /><h3>{titolo}</h3>{children}</div>
  </div>;
}
function SearchField({ value, onChange, placeholder }) {
  return <label className="gx-search"><span aria-hidden="true">{"⌕"}</span>
    <input type="search" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={{ all: "unset", flex: 1, marginLeft: 8 }} /></label>;
}
function StatusBar({ name, cls, conc, portrait, hp, ca, pm, init, version, density, onHp, onPm, onInit, onMenu }) {
  const pct = hp.max ? Math.max(0, Math.min(100, Math.round(hp.cur / hp.max * 100))) : 0;
  const nome = name || "Senza nome";
  return <header className="gx-status" data-density={density || "bar"}>
    <div className="gx-ava" style={{ background: "conic-gradient(var(--bad) 0 " + pct + "%, var(--line) " + pct + "% 100%)" }}>
      <div>{portrait ? <img src={portrait} alt="" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover" }} /> : nome.charAt(0)}</div>
    </div>
    <div className="gx-who"><b>{nome}</b><small>{cls}{conc ? <span> {"·"} <span style={{ color: "var(--mana)" }}>conc. {conc}</span></span> : null}</small></div>
    <span className="gx-ver" title="Versione della scheda">v{gxVersione(version)}</span>
    <button className="gx-menu" aria-label="Menu" onClick={onMenu}>{"⋯"}</button>
    <div className="gx-tiles" style={pm ? null : { gridTemplateColumns: "1.7fr 1fr 1fr" }}>
      <button className="gx-tile" onClick={onHp}>
        <span className="gx-lab">PF</span><b>{hp.cur}{hp.temp ? <i style={{ color: "var(--mana)" }}> +{hp.temp}</i> : null}<i> / {hp.max}</i></b>
        <div className="gx-bar"><div style={{ width: pct + "%" }} /></div>
      </button>
      <div className="gx-tile ca"><span className="gx-lab">CA</span><b>{ca}</b></div>
      {pm ? <button className="gx-tile" onClick={onPm}><span className="gx-lab">PM</span><b>{pm.rem}<i> / {pm.max}</i></b></button> : null}
      <button className="gx-tile" onClick={onInit}><span className="gx-lab">Iniz.</span><b className={tone(init)}>{fm(init)}</b></button>
    </div>
  </header>;
}
function BottomNav({ current, onGo, onDice }) {
  const b = (k, l) => <button aria-current={current === k} onClick={() => onGo(k)}>{GxIco[k]}{l}</button>;
  return <nav className="gx-nav">{b("sessione", "Sessione")}{b("attacchi", "Attacchi")}
    <button className="d20" aria-label="Pannello tiri" onClick={onDice}>{GxIco.d20}</button>
    {b("magia", "Magia")}{b("scheda", "Scheda")}</nav>;
}
/* bloccoCure: testo da mostrare quando le cure non hanno effetto (C.noHeal); i pulsanti + si spengono. */
function HpPanel({ cur, max, temp, onDelta, onTemp, onShortRest, onLongRest, bloccoCure, onSblocca }) {
  return <div className="gx-card gx-hp">
    <div className="gx-flex"><div className="big gx-num" style={{ flex: 1 }}>{cur}<i> / {max}</i></div>
      <div className="gx-flex gx-hp-r"><Btn kind="q" onClick={onShortRest} disabled={!onShortRest} title={onShortRest ? undefined : "Arriva con il patto e gli usi dei privilegi"}>Riposo breve</Btn><Btn kind="q" onClick={onLongRest}>Lungo</Btn></div></div>
    <div className="gx-grid4">
      <button className="gx-neg" onClick={() => onDelta(-5)}>{"−"}5</button>
      <button className="gx-neg" onClick={() => onDelta(-1)}>{"−"}1</button>
      <button className="gx-pos" disabled={!!bloccoCure} onClick={() => onDelta(1)}>+1</button>
      <button className="gx-pos" disabled={!!bloccoCure} onClick={() => onDelta(5)}>+5</button>
    </div>
    {!onShortRest ? <small className="gx-lab" style={{ textTransform: "none" }}>Riposo breve: arriva con il patto e gli usi dei privilegi.</small> : null}
    {bloccoCure ? <div className="gx-warn gx-flex"><span style={{ flex: 1 }}>{bloccoCure}</span>{onSblocca ? <Btn kind="q" onClick={onSblocca}>Fine</Btn> : null}</div> : null}
    <div className="gx-flex"><span className="gx-lab" style={{ flex: 1 }}>Temporanei</span>
      <Stepper value={temp || 0} min={0} max={999} label="PF temporanei" onChange={onTemp} /></div>
  </div>;
}
function StatTile({ abbr, mod, score, onRoll }) {
  return <button className="gx-stat" onClick={onRoll}><span className="gx-lab">{abbr}</span><b className={tone(mod)}>{fm(mod)}</b><i className="gx-num">{score}</i></button>;
}
function WeaponCard({ w, onHit, onDmg, onCrit }) {
  return <div className="gx-card gx-wpn gx-wcard">
    <h3>{w.name}<small>{GX_RUOLI[w.role] || ""}</small></h3>
    <div className="gx-l2"><div className="lb">Per colpire<b>{fm(w.toHit)}</b>{(w.notes || []).join(" · ")}</div><Btn onClick={onHit}>Tira</Btn></div>
    <div className="gx-l2"><div className="lb">Danni<b>{gxDanno(w.dmg)}</b>{(w.props || []).concat(w.crit && w.crit.range ? ["critico " + w.crit.range] : []).join(" · ")}</div>
      <Btn onClick={onDmg}>Tira</Btn>{w.crit ? <Btn kind="q" onClick={onCrit}>Crit</Btn> : null}</div>
  </div>;
}
/* Incantesimo: riga che apre il pannello di lancio; i livelli di lancio e i loro costi arrivano in s.levels. */
function SpellRow({ s, open, onToggle, soglia, onCast, onAttack, onDmg }) {
  const lvls = s.levels && s.levels.length ? s.levels : [{ lv: s.level, pmCost: s.pmCost, over: s.over }];
  const [lv, setLv] = useState(lvls[0].lv);
  const cur = lvls.filter(x => x.lv === lv)[0] || lvls[0];
  const sub = [s.school, s.castTime, s.conc ? "conc." : null, s.ritual ? "rituale" : null, s.prepared || s.auto ? null : "non memorizzato"].filter(Boolean).join(" · ");
  return <div>
    <button className="gx-row" style={{ "--sc": "var(--sch-" + (GX_SCUOLE[s.school] || "inv") + ")" }} onClick={onToggle} aria-expanded={open}>
      <span className="gx-stripe" /><span className="gx-lvl">{s.level || "T"}</span>
      <span className="nm">{s.name}<small>{sub}</small></span>
      {s.dmg ? <span className="gx-tag">{s.dmg.dice} {s.dmg.type}</span> : null}
      {s.dc ? <span className="gx-tag">CD {s.dc.value}</span> : null}
      {s.source && s.source !== "classe" ? <span className="gx-tag">{s.source}</span> : null}
    </button>
    {open ? <div className="gx-open">
      {s.effects ? <p>{s.effects}</p> : null}
      {s.dc ? <p className="gx-lab">TS {s.dc.ability} {"·"} {s.dc.success}</p> : null}
      {lvls.length > 1 ? <div className="gx-lvp"><span className="gx-lab">Lancia al</span>{lvls.map(x =>
        <button key={x.lv} aria-pressed={x.lv === lv} className={x.lv > soglia ? "over" : ""} onClick={() => setLv(x.lv)}>{x.lv}{"°"}</button>)}</div> : null}
      {cur.over ? <div className="gx-warn">Sovra-lancio{cur.over.dry ? " a secco di PM" : ""}: prova con CD {cur.over.cd}. Pedaggio in PF: {cur.over.toll.ok} se riesce, {cur.over.toll.fail} se fallisce, {cur.over.toll.nat1} con 1 naturale. Il tiro lo fa la scheda al lancio.</div> : null}
      <div className="gx-flex">
        <Btn kind="pri" wide onClick={() => onCast(cur.lv)}>{cur.lv ? (cur.over ? "Lancia con sovra-lancio" : "Lancia · " + cur.pmCost + " PM") : "Lancia"}</Btn>
        {s.attack != null ? <Btn kind="q" onClick={onAttack}>Att. {fm(s.attack)}</Btn> : null}
        {s.dmg ? <Btn kind="q" onClick={onDmg}>{s.dmg.dice}</Btn> : null}
      </div>
    </div> : null}
  </div>;
}

/* ═══ 2 · PANNELLI LEGATI A C (li aprono le schermate e NuovaUI) ═══ */
function PannelloCondizioni({ C, onClose, side }) {
  return <Sheet titolo="Condizioni" onClose={onClose} side={side}>
    <div className="gx-chips" style={{ padding: 0 }}>{C.condList.map(c => <Chip key={c} on={C.conds.indexOf(c) >= 0} onClick={() => C.act.toggleCond(c)}>{c}</Chip>)}</div>
    <span className="gx-lab">Esaurimento</span>
    <div className="gx-grid4">{[0, 1, 2, 3, 4, 5, 6].map(n => <button key={n} aria-pressed={C.exhaustion === n} style={C.exhaustion === n ? { borderColor: "var(--acc)", color: "var(--acc)" } : null} onClick={() => C.act.setExhaustion(n)}>{n}</button>)}</div>
  </Sheet>;
}
function PannelloRiposo({ C, tipo, onClose, side }) {
  return <Sheet titolo={"Riposo " + tipo} onClose={onClose} side={side}>
    <p style={{ fontSize: 14, lineHeight: 1.4 }}>{tipo === "breve" ? "Dadi vita da spendere, PM del patto, privilegi a riposo breve." : "PF pieni, PM, metà dei dadi vita (minimo 1), privilegi a riposo lungo."}</p>
    <div className="gx-flex"><Btn kind="q" wide onClick={onClose}>Annulla</Btn><Btn kind="pri" wide onClick={() => { C.act.rest(tipo); onClose(); }}>Riposa</Btn></div>
  </Sheet>;
}
const GX_MODO_SIGLA = { vantaggio: "V", svantaggio: "S" };
const gxOra = t => { if (!t) return ""; const d = new Date(t); return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); };
/* una voce dello storico: d20 (dado tenuto, modo, 20 e 1 naturali) o danni (parti con tipo, critico) */
function VoceTiro({ r }) {
  const d20 = r.die === 20 || (!r.parts && typeof r.mod === "number");
  const nat = d20 ? (r.chosen != null ? r.chosen : (r.dice && r.dice.length === 1 ? r.dice[0] : null)) : null;
  let sub;
  if (r.parts && r.parts.length) {
    sub = r.parts.map((p, i) => <span key={i}>{i ? " · " : ""}{p.dice}{p.rolls && p.rolls.length ? " [" + p.rolls.join("+") + "]" : ""}{p.flat ? " " + fm(p.flat) : ""}{p.type ? " " + p.type : ""}</span>);
  } else sub = <>{gxDadiVis(r)}{typeof r.mod === "number" ? " " + fm(r.mod) : ""}</>;
  const sigla = d20 ? GX_MODO_SIGLA[r.mode] : null;
  const nome = <>{r.parts && r.crit ? "💥 " : ""}{r.label}{sigla ? <i className="gx-mtag" title={r.mode}>{sigla}</i> : null}</>;
  return <Row name={nome} sub={<>{sub}<span className="gx-ora">{gxOra(r.t)}</span></>}>
    <b className={"gx-val" + (nat === 20 ? " gx-nat20" : nat === 1 ? " gx-nat1" : "")}>{r.total}</b></Row>;
}
function PannelloTiri({ C, onClose, side }) {
  const [conferma, setConferma] = useState(false);
  useEffect(() => { if (!conferma) return; const t = setTimeout(() => setConferma(false), 4000); return () => clearTimeout(t); }, [conferma]);
  const svuota = () => { if (!conferma) { setConferma(true); return; } setConferma(false); C.act.clearRolls(); };
  const n = C.roll.history.length;
  return <Sheet titolo="Tiri" onClose={onClose} side={side}>
    <Segmented mode={C.roll.mode} setMode={C.act.setMode} />
    <div className="gx-grid4">{[4, 6, 8, 10, 12, 100].map(f => <button key={f} onClick={() => C.act.roll("d" + f, 0, { die: f })}>d{f}</button>)}
      <button style={{ gridColumn: "span 2" }} onClick={() => C.act.roll("d20 libero", 0, { die: 20 })}>d20 libero</button></div>
    <div className="gx-flex gx-storico"><span className="gx-lab">Storico{n > 12 ? " · ultimi 12 di " + n : ""}</span>
      {n && C.act.clearRolls ? <Btn kind={conferma ? "pri" : "q"} onClick={svuota}>{conferma ? "Svuoto? Conferma" : "Svuota"}</Btn> : null}</div>
    <Card>{n ? C.roll.history.slice(0, 12).map((r, i) => <VoceTiro key={r.t || i} r={r} />)
      : <Row name={<small>Nessun tiro</small>} />}</Card>
  </Sheet>;
}
/* Menu ⋯: annulla e ripeti (se riceve C), tema, variante, stampa. */
/* Tema, variante e formato: nel Menu e nella pagina iniziale (tutti e tre i temi scelti da subito). */
function SceltaAspetto({ aspetto }) {
  const largo = useGxMedia("(min-width:768px)");
  return <React.Fragment>
    <span className="gx-lab">Tema</span>
    <div className="gx-opts">{[["str", "Strumento", ["#0f1113", "#e3a33b", "#5aa7e0"]], ["per", "Pergamena", ["#eee3c9", "#8f2a1d", "#2c4a6b"]], ["arn", "Arena", ["#181231", "#ffcf5a", "#4dc3ff"]]].map(t =>
      <button key={t[0]} className="gx-opt" aria-pressed={aspetto.theme === t[0]} onClick={() => aspetto.set(t[0], null)}>
        <span className="sw">{t[2].map(c => <i key={c} style={{ background: c }} />)}</span><span style={{ fontSize: 14, fontWeight: 600 }}>{t[1]}</span></button>)}</div>
    <span className="gx-lab">Variante</span>
    <div className="gx-segm" style={{ margin: 0 }}>{[["dark", "Scura"], ["light", "Chiara"], ["auto", "Automatica"]].map(v =>
      <button key={v[0]} aria-pressed={aspetto.v === v[0]} onClick={() => aspetto.set(null, v[0])}>{v[1]}</button>)}</div>
    <span className="gx-lab">Formato</span>
    <div className="gx-segm" style={{ margin: 0 }}>{[["auto", "Automatico"], ["tel", "Telefono"], ["pc", "Computer"]].map(f =>
      <button key={f[0]} aria-pressed={aspetto.f === f[0]} disabled={f[0] === "pc" && !largo} onClick={() => aspetto.set(null, null, f[0])}>{f[1]}</button>)}</div>
    {!largo ? <small className="gx-lab" style={{ textTransform: "none" }}>«Computer» serve uno schermo largo almeno 768 px.</small> : null}
  </React.Fragment>;
}
function PannelloAspetto({ aspetto, C, onClose, side, onBug }) {
  return <Sheet titolo="Menu" onClose={onClose} side={side}>
    {C ? <div className="gx-flex">
      <Btn kind="q" wide disabled={!C.can.undo} onClick={() => C.act.undo()}>{"\u21b6"} Annulla</Btn>
      <Btn kind="q" wide disabled={!C.can.redo} onClick={() => C.act.redo()}>Ripeti {"\u21b7"}</Btn>
    </div> : null}
    <SceltaAspetto aspetto={aspetto} />
    {typeof Stampa === "function" ? <Btn kind="q" onClick={() => window.print()}>Stampa la scheda</Btn> : null}
    {C && C.ch.creationDone && !C.inLU ? <Btn kind="q" onClick={() => { onClose(); C.act.setMaster(true); }} title="Sblocca la scheda per modificare identità, caratteristiche, B/M e costi">Modifica scheda (Master)</Btn> : null}
    {C ? <Btn kind="q" onClick={() => { C.act.exportJSON(); }}>Esporta il personaggio (JSON)</Btn> : null}
    {onBug ? <Btn kind="q" onClick={() => { onClose(); onBug(); }}>{"\ud83d\udc1e"} Segnala un problema</Btn> : null}
  </Sheet>;
}

/* ═══ 3 · SCHERMATE <S C={C} wide? tiri? />
   wide = dentro la cornice di DESKTOP: Sessione salta Punti ferita e Condizioni (stanno nella colonna Stato) e i pannelli si aprono a destra.
   tiri = è visibile la colonna Tiri: Attacchi salta il selettore del modo. ═══ */
function Sessione({ C, wide }) {
  const [pan, setPan] = useState(null);
  const [q, setQ] = useState("");
  const side = wide ? "right" : undefined;
  const pinned = C.skills.filter(s => C.pinned.indexOf(s.i) >= 0);
  const hits = q.length >= 2 ? C.skills.filter(s => s.name.toLowerCase().indexOf(q.toLowerCase()) >= 0).slice(0, 8) : [];
  const conc = C.conc ? C.conc.name : null;
  return <div>
    {wide ? null : <div>
      <Section label="Punti ferita" aux={"temp " + (C.hp.temp || 0)} />
      <HpPanel cur={C.hp.cur} max={C.hp.max} temp={C.hp.temp} onDelta={n => (n < 0 ? C.act.damage(-n) : C.act.heal(n))}
        onTemp={n => C.act.setTemp(n)} onShortRest={C.can.shortRest === false ? null : () => setPan("breve")} onLongRest={() => setPan("lungo")}
        bloccoCure={C.noHeal ? "Niente cure per " + C.noHeal.rounds + " round (" + C.noHeal.spell + ")" : null} onSblocca={() => C.act.endNoHeal()} />
      <Section label="Condizioni" aux={"esaurimento " + (C.exhaustion || 0)} />
      <div className="gx-chips">
        {conc ? <Chip on onClick={() => C.act.setConc(null)}>Concentrazione {"·"} {conc} {"✕"}</Chip> : null}
        {C.conds.map(c => <Chip key={c} on onClick={() => C.act.toggleCond(c)}>{c} {"✕"}</Chip>)}
        {C.exhaustion ? <Chip on onClick={() => setPan("condizioni")}>Esaurimento {C.exhaustion}</Chip> : null}
        <Chip onClick={() => setPan("condizioni")}>+ Condizione</Chip>
      </div>
    </div>}
    <Section label="Caratteristiche" aux="tocca per la prova" />
    <div className="gx-stats">{GX_CAR.map(k => <StatTile key={k[0]} abbr={k[1]} mod={C.mods[k[0]]} score={C.stats[k[0]].score} onRoll={() => C.act.roll(k[0], C.mods[k[0]])} />)}</div>
    <Section label="Prove fissate" aux="dalla Scheda" />
    <Card>{pinned.length ? pinned.map(s => <Row key={s.i} name={s.name} sub={s.attr} value={s.tot} onRoll={() => C.act.roll(s.name, s.tot)} />)
      : <Row name={<small>Nessuna prova fissata. Si fissano dalla Scheda con «Fissa».</small>} />}</Card>
    <div style={{ marginTop: 10 }}><SearchField value={q} onChange={setQ} placeholder={"Cerca tra " + C.skills.length + " competenze"} /></div>
    {hits.length ? <Card style={{ marginTop: 8 }}>{hits.map(s => <Row key={s.i} name={s.name} sub={s.attr} value={s.tot} onRoll={() => C.act.roll(s.name, s.tot)} />)}</Card> : null}
    {pan === "condizioni" ? <PannelloCondizioni C={C} side={side} onClose={() => setPan(null)} /> : null}
    {pan === "breve" || pan === "lungo" ? <PannelloRiposo C={C} tipo={pan} side={side} onClose={() => setPan(null)} /> : null}
  </div>;
}
function Attacchi({ C, tiri }) {
  const inUso = C.weapons.filter(w => w.role === "main" || w.role === "off");
  const altre = C.weapons.filter(w => w.role !== "main" && w.role !== "off");
  const usi = C.features.filter(f => f.uses && f.uses.max > 0);
  return <div>
    {tiri ? null : <Segmented mode={C.roll.mode} setMode={C.act.setMode} />}
    <Section label="Armi in uso" />
    {inUso.length ? inUso.map(w => <div key={w.key} style={{ marginBottom: 8 }}><WeaponCard w={w}
      onHit={() => C.act.roll("Colpire · " + w.name, w.toHit)} onDmg={() => C.act.rollDamage("Danni · " + w.name, w.dmg)}
      onCrit={() => C.act.rollDamage("Critico · " + w.name, w.crit.dmg)} /></div>)
      : <Card><Row name={<small>Nessuna arma impugnata: si impugna dalla Scheda, in Equipaggiamento.</small>} /></Card>}
    {altre.length ? <div><Section label="Altre armi" /><Card>{altre.map(w =>
      <Row key={w.key} name={w.name} sub={gxDanno(w.dmg)} value={w.toHit} onRoll={() => C.act.roll("Colpire · " + w.name, w.toHit)} />)}</Card></div> : null}
    {C.maneuvers.length ? <div><Section label="Manovre" /><Card>{C.maneuvers.map(m =>
      <Row key={m.name} name={m.name} sub={[m.die ? "dado " + m.die : null, m.dc ? "CD " + m.dc : null].filter(Boolean).join(" · ")} value={m.tot} onRoll={() => C.act.roll(m.name, m.tot)} />)}</Card></div> : null}
    {usi.length ? <div><Section label="Privilegi" aux="usi" /><Card>{usi.map(f =>
      <ResourceCounter key={f.key} nome={f.name} max={f.uses.max} usati={f.uses.spent} recupero={"riposo " + f.uses.rest + (f.dc ? " · CD " + f.dc : "")} onUsa={n => C.act.use(f.key, n || 1)} />)}</Card></div> : null}
  </div>;
}
function Magia({ C }) {
  const [open, setOpen] = useState(null);
  const [cat, setCat] = useState(false);
  const side = useGxMedia("(min-width:768px)") ? "right" : undefined;
  const pm = C.pm;
  const lvls = [];
  C.spells.forEach(s => { if (lvls.indexOf(s.level) < 0) lvls.push(s.level); });
  lvls.sort((a, b) => a - b);
  const riserva = (nome, r, pool, nota) => <div className="gx-flex">
    <span className="gx-lab" style={{ flex: 1 }}>{nome}{nota ? " · " + nota : ""}</span>
    <button className="gx-btn q" aria-label={"Spendi un PM " + nome} disabled={r.rem <= 0} onClick={() => C.act.usePM(1, pool)}>{"−"}</button>
    <b className="gx-num" style={{ minWidth: 56, textAlign: "center" }}>{r.rem} / {r.max}</b>
    <button className="gx-btn q" aria-label={"Recupera un PM " + nome} disabled={r.rem >= r.max} onClick={() => C.act.usePM(-1, pool)}>+</button>
  </div>;
  return <div>
    <Section label="Punti magia" aux={"soglia " + pm.soglia + "°"} />
    <Card style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      {riserva("Classe", pm, "classe", pm.perClass.map(p => p.cls + " " + p.pm).join(" · "))}
      <Pips max={pm.max} rem={pm.rem} />
      {pm.pact ? riserva("Patto", pm.pact, "patto", "riposo breve · soglia " + pm.pact.soglia + "°") : null}
    </Card>
    {lvls.map(l => <div key={l}>
      <Section label={l ? l + "° livello" : "Trucchetti"} aux={l > pm.soglia ? "oltre soglia" : (l ? "entro soglia" : "")} />
      <Card>{C.spells.filter(s => s.level === l).map(s => <SpellRow key={s.key} s={s} soglia={pm.soglia} open={open === s.key}
        onToggle={() => setOpen(open === s.key ? null : s.key)}
        onCast={lv => C.act.castSpell(s.key, { level: lv })}
        onAttack={() => C.act.roll("Attacco · " + s.name, s.attack)}
        onDmg={() => C.act.rollDamage(s.name, [{ dice: s.dmg.dice, flat: 0, type: s.dmg.type }])} />)}</Card>
    </div>)}
    <Repertorio C={C} onCatalogo={() => setCat(true)} />
    {cat ? <CatalogoIncantesimi C={C} side={side} onClose={() => setCat(false)} /> : null}
  </div>;
}
/* Equipaggiamento (modificabile a scheda bloccata): si legge da C.equip. Armi con setWeapon e setDualWield, oggetti con
   addItem, setItem e removeItem; setEquip solo per armor, shield e coins, la cui chiave sostituisce per intero. */
function Equipaggiamento({ C }) {
  const eq = C.equip;
  const [nuovo, setNuovo] = useState("");
  const [pan, setPan] = useState(null);   // {tipo: "armi" | "arma" | "oggetto" | "protezioni", i}
  const side = useGxMedia("(min-width:768px)") ? "right" : undefined;
  const items = eq.items || [];
  const armi = eq.weapons || [];
  const scegli = (gruppo, chiave) => {
    const g = eq[gruppo], n = {};
    Object.keys(g).forEach(k => { n[k] = Object.assign({}, g[k], { equipped: k === chiave ? !g[k].equipped : false }); });
    const patch = {}; patch[gruppo] = n; C.act.setEquip(patch);
  };
  const nomiA = { light: "leggera", medium: "media", heavy: "pesante" }, nomiS = { small: "piccolo", medium: "medio", large: "grande" };
  const load = eq.load;
  return <div>
    <Section label="Armatura e scudo" aux={"CA " + C.ca.total} />
    <Card>
      {C.ca.parts && C.ca.parts.length ? <Row name={<small>{"CA " + C.ca.total + " = " + C.ca.testo}</small>} /> : null}
      <div className="gx-row"><Btn kind="q" onClick={() => setPan({ tipo: "protezioni" })}>Modifica CA di armature e scudi</Btn></div>
      {Object.keys(eq.armor || {}).map(k => <Row key={k} name={"Armatura " + (nomiA[k] || k)} sub={"CA base " + eq.armor[k].caBase + (eq.armor[k].rank ? " · rank " + eq.armor[k].rank : "")}>
        <Toggle on={!!eq.armor[k].equipped} label={"Indossa armatura " + (nomiA[k] || k)} onChange={() => scegli("armor", k)} /></Row>)}
      {Object.keys(eq.shield || {}).map(k => <Row key={k} name={"Scudo " + (nomiS[k] || k)} sub={"CA " + fm(eq.shield[k].caBonus) + (eq.shield[k].rank ? " · rank " + eq.shield[k].rank : "")}>
        <Toggle on={!!eq.shield[k].equipped} label={"Imbraccia scudo " + (nomiS[k] || k)} onChange={() => scegli("shield", k)} /></Row>)}
    </Card>
    <Section label="Armi" aux={eq.dualWield ? "due armi" : null} />
    <Card>
      {armi.map(w => <Row key={w.i} name={w.name + (w.qty > 1 ? " ×" + w.qty : "")} sub={w.equipped ? (w.offHand ? "impugnata · mano secondaria" : "impugnata") : "nello zaino"}>
        {eq.dualWield && w.equipped ? <Chip on={!!w.offHand} onClick={() => C.act.setWeapon(w.i, { equipped: true, offHand: !w.offHand })}>Secondaria</Chip> : null}
        <Toggle on={!!w.equipped} label={"Impugna " + w.name} onChange={on => C.act.setWeapon(w.i, { equipped: on, offHand: on ? !!w.offHand : false })} />
        <button className="gx-btn q" aria-label={"Proprietà di " + w.name} onClick={() => setPan({ tipo: "arma", i: w.i })}>{"⚙"}</button></Row>)}
      <div className="gx-row"><Btn kind="q" onClick={() => setPan({ tipo: "armi" })}>+ Arma dal catalogo o da codice</Btn></div>
      <Row name="Combattere con due armi"><Toggle on={!!eq.dualWield} label="Combattere con due armi" onChange={on => C.act.setDualWield(on)} /></Row>
    </Card>
    <Section label="Oggetti" aux={load ? String(load.tot).replace(".", ",") + " / " + String(load.max).replace(".", ",") + " kg" + (load.over ? " · sovraccarico" : "") : null} />
    <Card>{items.map(it => <Row key={it.i} name={it.name} sub={[it.weight != null ? String(it.weight).replace(".", ",") + " kg" : null, it.desc, it.notes].filter(Boolean).join(" · ")}>
      {it.equipped ? <span className="gx-tag">equip.</span> : null}
      <Stepper value={it.qty == null ? 1 : it.qty} min={0} max={9999} label={"Quantità " + it.name} onChange={v => C.act.setItem(it.i, { qty: v })} />
      <button className="gx-btn q" aria-label={"Dettagli e bonus di " + it.name} onClick={() => setPan({ tipo: "oggetto", i: it.i })}>{"⚙"}</button>
      <button className="gx-btn q" aria-label={"Togli " + it.name} onClick={() => C.act.removeItem(it.i)}>{"✕"}</button></Row>)}
      <div className="gx-row"><input className="gx-inp" style={{ flex: 1 }} value={nuovo} placeholder="Nuovo oggetto" onChange={e => setNuovo(e.target.value)} />
        <Btn disabled={!nuovo.trim()} onClick={() => { C.act.addItem({ name: nuovo.trim(), qty: 1 }); setNuovo(""); }}>Aggiungi</Btn></div>
    </Card>
    <Gemme C={C} />
    <Section label="Monete" />
    <Card>{[["mp", "Platino"], ["mo", "Oro"], ["me", "Electrum"], ["ma", "Argento"], ["mr", "Rame"]].map(m => <Row key={m[0]} name={m[1]}>
      <input className="gx-inp" type="number" min="0" inputMode="numeric" style={{ width: 96, textAlign: "right" }} aria-label={m[1]} value={(eq.coins || {})[m[0]] || 0}
        onChange={e => { const c = Object.assign({}, eq.coins); c[m[0]] = Math.max(0, parseInt(e.target.value, 10) || 0); C.act.setEquip({ coins: c }); }} /></Row>)}</Card>
    {pan && pan.tipo === "armi" ? <CatalogoArmi C={C} side={side} onClose={() => setPan(null)} /> : null}
    {pan && pan.tipo === "arma" && armi.filter(w => w.i === pan.i)[0] ? <ProprietaArma C={C} side={side} w={armi.filter(w => w.i === pan.i)[0]} onClose={() => setPan(null)} /> : null}
    {pan && pan.tipo === "oggetto" && items.filter(x => x.i === pan.i)[0] ? <BonusOggetto C={C} side={side} it={items.filter(x => x.i === pan.i)[0]} onClose={() => setPan(null)} /> : null}
    {pan && pan.tipo === "protezioni" ? <ProtezioniEdit C={C} side={side} onClose={() => setPan(null)} /> : null}
  </div>;
}
/* Note libere del personaggio. Si salvano quando smetti di scrivere (mezzo secondo) o esci dal campo,
   così annulla e ripeti non registrano ogni lettera. */
function NoteScheda({ C }) {
  const [t, setT] = useState(C.notes || "");
  const fermo = useRef(null);
  useEffect(() => { setT(C.notes || ""); }, [C.notes, C.ch.name]);
  const salva = v => { if (fermo.current) clearTimeout(fermo.current); fermo.current = null; if (v !== (C.notes || "")) C.act.setNotes(v); };
  const scrivi = v => { setT(v); if (fermo.current) clearTimeout(fermo.current); fermo.current = setTimeout(() => salva(v), 500); };
  const ultimo = useRef(null); ultimo.current = { t, salva };
  useEffect(() => () => { if (fermo.current) ultimo.current.salva(ultimo.current.t); }, []);   // cambio di schermata: salva quello che resta
  return <div>
    <Section label="Note" aux={t.length ? t.length + " caratteri" : "vuote"} />
    <Card style={{ padding: 0 }}><textarea value={t} onChange={e => scrivi(e.target.value)} onBlur={e => salva(e.target.value)}
      placeholder="Storia, contatti, missioni, promemoria per la prossima sessione…" aria-label="Note del personaggio"
      style={{ width: "100%", minHeight: 260, boxSizing: "border-box", resize: "vertical", border: 0, outline: "none", background: "transparent",
        color: "var(--ink)", font: "inherit", fontSize: 15, lineHeight: 1.5, padding: 12 }} /></Card>
  </div>;
}
/* Competenze per categoria, filtrate dalla ricerca (nome o categoria). */
function gxGruppi(C, q) {
  const t = (q || "").trim().toLowerCase();
  const byI = {}; C.skills.forEach(s => { byI[s.i] = s; });
  return C.cats.map(c => ({ name: c.name, skills: c.items.map(i => byI[i]).filter(s => s && (!t || s.name.toLowerCase().indexOf(t) >= 0 || c.name.toLowerCase().indexOf(t) >= 0)) }))
    .filter(g => g.skills.length);
}
function Scheda({ C }) {
  const [chiuse, setChiuse] = useState({});   // categorie richiuse a mano; di base sono tutte aperte
  const [q, setQ] = useState("");
  const [parte, setParte] = useState("competenze");
  const [bm, setBm] = useState(false);
  const side = useGxMedia("(min-width:768px)") ? "right" : undefined;
  const gruppi = gxGruppi(C, q);
  return <div>
    {bm ? <Sheet titolo="B/M e costi delle competenze" side={side} onClose={() => setBm(false)}><EditCompetenze C={C} modoIniziale="bm" /></Sheet> : null}
    <Section label="Personaggio" aux={"livello " + C.tl} />
    <Card>
      <Row name="Razza" sub={C.race ? C.race.name : "—"} />
      <Row name="Classi" sub={C.classes.map(c => c.name + " " + c.level + (c.sub ? " (" + c.sub + ")" : "") + " · d" + c.hd).join(" / ")}>
        {C.locked && !C.inLU ? <Btn onClick={() => C.act.startLU()}>Level-up</Btn> : null}</Row>
      <Row name="Caratteristiche" sub={GX_CAR.map(k => k[1] + " " + C.stats[k[0]].score).join(" · ")} />
      <Row name="Velocità" sub={gxMetri(C.speed.final) + (C.speed.overload ? " · sovraccarico" : "")} />
    </Card>
    <div className="gx-segm g4" style={{ marginTop: 12 }} role="group" aria-label="Parte della scheda">
      {[["competenze", "Competenze"], ["equip", "Equipaggiamento"], ["mod", "Modificatori"], ["note", "Note"]].map(p => <button key={p[0]} aria-pressed={parte === p[0]} onClick={() => setParte(p[0])}>{p[1]}</button>)}</div>
    {parte === "note" ? <NoteScheda C={C} /> : parte === "mod" ? <div><PrivilegiTalenti C={C} /><Modificatori C={C} /></div> : parte === "equip" ? <Equipaggiamento C={C} /> : <div>
      <Section label="Competenze" aux={C.skills.length + " · " + C.cats.length + " categorie"} />
      <div className="gx-flex" style={{ gap: 8, marginBottom: 8 }}><Btn kind="q" onClick={() => setBm(true)}>B/M e costi delle competenze</Btn></div>
      <SearchField value={q} onChange={setQ} placeholder={"Cerca tra " + C.skills.length + " competenze o per categoria"} />
      <Card style={{ marginTop: 8 }}>{gruppi.length ? gruppi.map(g => { const aperta = !!q || !chiuse[g.name]; return <div key={g.name}>
        <button className="gx-row" aria-expanded={aperta} onClick={() => setChiuse(Object.assign({}, chiuse, { [g.name]: aperta }))}>
          <span className="nm" style={{ fontWeight: 700 }}>{g.name}</span><span className="gx-tag">{g.skills.length}</span><span className="gx-chev">{aperta ? "⌄" : "›"}</span></button>
        {aperta ? g.skills.map(s => <Row key={s.i} style={{ paddingLeft: 24 }} name={s.name} sub={s.attr + " · rank " + s.rank + (s.bonus ? " · B/M " + fm(s.bonus) : "") + (s.tal ? " · mod. " + fm(s.tal) : "")}>
          <Chip on={s.pinned} onClick={() => C.act.pin(s.i)}>{s.pinned ? "Fissata" : "Fissa"}</Chip>
          <button className="gx-val" style={{ minWidth: 48 }} aria-label={"Prova di " + s.name} onClick={() => C.act.roll(s.name, s.tot)}><span className={tone(s.tot)}>{fm(s.tot)}</span></button></Row>) : null}
      </div>; }) : <Row name={<small>Nessuna competenza trovata.</small>} />}</Card></div>}
  </div>;
}
const SCHERMATE = { sessione: Sessione, attacchi: Attacchi, magia: Magia, scheda: Scheda };

/* ═══ 4 · PERCORSI A SCHERMO PIENO ═══ */
function LevelUp({ C }) {
  const p = C.points;
  const [q, setQ] = useState("");
  const cancel = () => C.act.cancelLU();
  const gruppi = gxGruppi(C, q);
  const lu = C.lu || { cls: "", isNew: false, options: [] };
  const [modo, setModo] = useState("rank");   // rank | bonus: lo stesso elenco modifica i rank o i bonus fissi
  const [carOpen, setCarOpen] = useState(false);
  return <div className="gx-full">
    <div className="gx-wiz"><div className="gx-flex" style={{ justifyContent: "space-between" }}>
      <span className="gx-lab">Passaggio di livello {"·"} competenze</span>
      <span className="gx-flex"><span className="gx-ver">v{gxVersione(C.version)}</span><button className="gx-lab" style={{ fontSize: 20 }} aria-label="Chiudi" onClick={cancel}>{"✕"}</button></span></div>
      <h2>Competenze</h2></div>
    <div className="gx-pool"><span style={{ fontSize: 13.5, color: "var(--muted)" }}>Punti competenza<br />spesi {p.luSpent} su {p.luAvail}</span>
      <b className={"gx-num " + tone(p.luRem)}>{p.luRem}</b></div>
    <div className="gx-flex" style={{ margin: "8px 12px 0", gap: 8 }}>
      <span className="gx-lab">Classe</span>
      <select value={lu.cls} onChange={e => C.act.setLUClass && C.act.setLUClass(e.target.value)} aria-label="Classe che sale di livello"
        style={{ flex: 1, height: 40, background: "var(--s2)", color: "var(--ink)", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "0 8px", font: "inherit" }}>
        {lu.options.map(o => <option key={o.name} value={o.name}>{o.isNew ? "+ " + o.name + " (nuova classe)" : o.name + " " + o.level + " → " + (o.level + 1)}</option>)}
      </select>
      {lu.isNew ? <span className="gx-tag" style={{ color: "var(--bad)" }}>−48 multiclasse</span> : null}</div>
    <SearchField value={q} onChange={setQ} placeholder="Cerca competenza o categoria" />
    <main className="gx-scroll">
      {/* 10.7.7 (REGIA): l'aumento di caratteristica si vede da solo ai livelli con aumento, +2 da distribuire, massimo 20 */}
      {C.luAumento && C.luAumento.possibile ? <div>
        <Section label="Aumento di caratteristica" aux={"+" + C.luAumento.usati + " su +" + C.luAumento.max + " · massimo 20"} />
        <Card>
          {GX_CAR.map(k => <Row key={k[0]} name={k[0]} sub={"mod. " + fm(C.mods[k[0]])}>
            <Stepper value={C.stats[k[0]].score} min={1} max={30} label={"Punteggio di " + k[0]} onChange={v => C.act.setLUStat(k[0], v)} /></Row>)}
          <Row name={<small>{"Al " + C.luAumento.livello + "° livello di " + C.luAumento.classe + ": +2 a una caratteristica o +1 a due. Il talento qui sotto è facoltativo e si aggiunge all'aumento. Se hai già speso i punti in più, prima di togliere l'aumento togli qualche rank."}</small>} />
        </Card></div> : null}
      <button className="gx-row" aria-expanded={carOpen} onClick={() => setCarOpen(!carOpen)} style={{ marginTop: 8 }}>
        <span className="nm" style={{ fontWeight: 700 }}>Bonus e PF</span><span className="gx-tag">B/M, PF bonus</span><span className="gx-chev">{carOpen ? "⌄" : "›"}</span></button>
      {carOpen ? <Card>
        {GX_CAR.map(k => <Row key={k[0]} name={k[0]} sub={"mod. " + fm(C.mods[k[0]]) + " · B/M " + fm(C.stats[k[0]].bonus || 0)}>
          <Stepper value={C.stats[k[0]].bonus || 0} min={-10} max={10} label={"Bonus o malus al modificatore di " + k[0]} onChange={v => C.act.setStatBonus(k[0], v)} /></Row>)}
        <Row name="PF bonus" sub="effetti permanenti decisi dal master">
          <Stepper value={lu.hpBonus || 0} min={-99} max={999} label="PF bonus" onChange={v => C.act.setHpBonus(v)} /></Row>
        <Row name={<small>Bonus o malus al modificatore e PF in più. L'aumento dei punteggi c'è solo ai livelli con aumento; fuori da lì lo cambia il master in Modifica scheda.</small>} />
      </Card> : null}
      <PrivilegiLivello C={C} />
      <TalentoLivello C={C} />
      <PrivilegiTalenti C={C} />
      <div className="gx-segm" style={{ marginTop: 12 }} role="group" aria-label="Cosa modificare">
        {[["rank", "Rank"], ["bonus", "Bonus fissi"]].map(m => <button key={m[0]} aria-pressed={modo === m[0]} onClick={() => setModo(m[0])}>{m[1]}</button>)}</div>
      <Section label={modo === "rank" ? "Rank" : "Bonus fissi"} aux={modo === "rank" ? "primo rank 1; poi +2 a livello fino al 14°, da lì +1" : "stili di combattimento, privilegi, talenti: si sommano al totale"} />
      {gruppi.map(g => <div key={g.name}><Section label={g.name} aux={g.skills.length} />
        <Card>{g.skills.map(s => modo === "rank"
          ? <Row key={s.i} name={s.name} sub={s.attr + " · costo " + s.cost + " · rank " + s.luMin + (s.rank > s.luMin ? " → " + s.rank : "") + " · max " + s.luMax + (s.bonus ? " · bonus " + fm(s.bonus) : "")}>
              <Stepper value={s.rank} min={s.luMin} max={s.luMax} label={s.name} onChange={v => C.act.setLURank(s.i, v)} /></Row>
          : <Row key={s.i} name={s.name} sub={s.attr + " · totale " + fm(s.tot)}>
              <Stepper value={s.bonus || 0} min={-10} max={10} label={"Bonus fisso di " + s.name} onChange={v => C.act.setSkillBonus(s.i, v)} /></Row>)}</Card></div>)}</main>
    <div className="gx-foot"><Btn kind="q" onClick={cancel}>Annulla</Btn>
      <Btn kind="pri" disabled={p.luRem < 0} title={p.luRem < 0 ? "Punti negativi" : null} onClick={() => C.act.applyLU()}>Applica</Btn></div>
  </div>;
}
/* ═══ 5 · INGRESSO ═══ */
function useGxToast(C) {
  const h = C.roll.history;
  const t0 = h.length ? h[0].t : null;
  const primo = useRef(t0);
  const [last, setLast] = useState(null);
  useEffect(() => {
    if (!h.length || t0 === primo.current) return undefined;
    setLast({ testo: gxTestoTiro(h[0]), totale: h[0].total });
    const id = setTimeout(() => setLast(null), 2600);
    return () => clearTimeout(id);
  }, [t0]);
  return last;
}
function NuovaUI({ C, onClassica, onBug }) {
  const aspetto = useAspetto();
  const schermoLargo = useGxMedia("(min-width:768px)");   // Formato del Menu: automatico dalla larghezza, oppure forzato
  const largo = (aspetto.f === "tel" ? false : schermoLargo) && typeof Pannelli === "function";   // «Computer» vale solo da 768 px
  const [scr, setScr] = useState("sessione");
  const [pan, setPan] = useState(null);   // la scelta dell'aspetto si fa nella pagina iniziale o dal Menu
  const scroller = useRef(null);
  const toast = useGxToast(C);
  useEffect(() => { if (scroller.current) scroller.current.scrollTop = 0; }, [scr]);
  const go = k => { setScr(k); setPan(null); };
  const S = SCHERMATE[scr];
  const side = largo ? "right" : undefined;
  return <div className="gx" data-theme={aspetto.theme} data-var={aspetto.eff} data-form={aspetto.f}>
    <style>{GX_CSS + (typeof GXD_CSS === "string" ? GXD_CSS : "")}</style>
    {largo ? <Pannelli C={C} onMenu={() => setPan("aspetto")} onAspetto={() => setPan("aspetto")} attivo={!C.inLU && C.creationDone} />
      : <React.Fragment>
        <StatusBar name={C.ch.name} cls={gxClassi(C)} conc={C.conc ? C.conc.name : null} portrait={C.portrait}
          hp={C.hp} ca={C.ca.total} pm={C.pm.max ? C.pm : null} init={C.init} version={C.version}
          onHp={() => go("sessione")} onPm={() => go("magia")} onInit={() => C.act.roll("Iniziativa", C.init)} onMenu={() => setPan("aspetto")} />
        <main className="gx-scroll" ref={scroller}><S C={C} /></main>
        <BottomNav current={scr} onGo={go} onDice={() => setPan("tiri")} />
        <RollToast last={toast} />
        {pan === "tiri" ? <PannelloTiri C={C} onClose={() => setPan(null)} /> : null}
      </React.Fragment>}
    {pan === "aspetto" ? <PannelloAspetto aspetto={aspetto} C={C} side={side} onBug={onBug ? () => onBug({ schermata: largo ? "desktop" : scr }) : null} onClose={() => setPan(null)} /> : null}
    {C.inLU ? <LevelUp C={C} /> : null}
    {!C.creationDone ? <Creazione C={C} /> : null}
    {C.master ? <ModificaScheda C={C} /> : null}
    {typeof Stampa === "function" ? <Stampa C={C} /> : null}
  </div>;
}
