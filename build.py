#!/usr/bin/env python3
"""Compila La Gemma di San Batacchio in un file unico offline.
Uso: python3 build.py [uscita.html]   (richiede esbuild: npm i esbuild)
Ingressi: src/shell.html (HTML, React inline), src/app.jsx (applicazione e interfaccia classica),
src/ui/ui-new.jsx (nuova interfaccia, MOBILE), src/ui/ui-desktop.jsx (cornice desktop, DESKTOP),
src/data/privilegi.json e src/data/talenti.json (dati di ARCHETIPI e TALENTI), src/ui/privilegi.jsx (motore di privilegi e talenti, REGIA), src/ui/character.jsx (useCharacter, REGIA), src/ui/fonts.css (caratteri), src/spells-db.json (incantesimi).
I file della nuova interfaccia entrano prima del montaggio finale di app.jsx, in un solo script."""
import subprocess, sys, json, re, os, hashlib, shutil
here = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(here, "src")
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, "dashboard.html")
esb = os.environ.get("ESBUILD") or shutil.which("esbuild") or os.path.join(here, "node_modules", ".bin", "esbuild")
def rd(*p): return open(os.path.join(src, *p), encoding="utf-8").read()
app = rd("app.jsx")
def dati_js():
    """src/data/privilegi.json (ARCHETIPI) e src/data/talenti.json (TALENTI) entrano come costanti; se mancano, null."""
    out = []
    for nome, var in (("privilegi.json", "DATA_PRIVILEGI"), ("talenti.json", "DATA_TALENTI")):
        f = os.path.join(src, "data", nome)
        if os.path.exists(f):
            txt = open(f, encoding="utf-8").read()
            d = json.loads(txt)
            out.append("const %s = %s;\n" % (var, json.dumps(d, ensure_ascii=False).replace("</", "<\\/")))
            print("dati:", nome, d.get("versione"), file=sys.stderr)
        else:
            out.append("const %s = null;\n" % var)
            print("ATTENZIONE: manca src/data/" + nome + ", la scheda usa i dati di riserva", file=sys.stderr)
    return "".join(out)
cut = app.index("const root = ReactDOM.createRoot(")
ui_new = rd("ui", "ui-new.jsx")
dline = "const { useState, useEffect, useRef } = React;\n"
assert ui_new.count(dline) == 1, "ui-new.jsx: riga di React attesa una volta"
ui_new = ui_new.replace(dline, "")   # app.jsx la dichiara già
parts = [app[:cut], "\n/* ═══ nuova interfaccia: ui-new.jsx ═══ */\n", ui_new,
         "\n/* ═══ nuova interfaccia: ui-desktop.jsx ═══ */\n", rd("ui", "ui-desktop.jsx"),
         "\n/* ═══ editor: editor.jsx ═══ */\n", rd("ui", "editor.jsx"),
         "\n/* ═══ dati di privilegi e talenti: src/data (ARCHETIPI, TALENTI) ═══ */\n", dati_js(),
         "\n/* ═══ privilegi e talenti: privilegi.jsx ═══ */\n", rd("ui", "privilegi.jsx"),
         "\n/* ═══ useCharacter: character.jsx ═══ */\n", rd("ui", "character.jsx"), "\n", app[cut:]]
js = subprocess.run([esb, "--loader=jsx", "--log-level=warning"], input="".join(parts),
                    check=True, capture_output=True, text=True, encoding="utf-8").stdout
assert "</script" not in js.lower(), "il codice compilato contiene </script>"
db = open(os.path.join(src, "spells-db.json"), encoding="utf-8").read()
json.loads(db)
assert "</script" not in db.lower()
shell = open(os.path.join(src, "shell.html"), encoding="utf-8").read()
assert shell.count("@@APP@@") == 1 and shell.count("@@DB@@") == 1 and shell.count("@@FONTS@@") == 1
fonts = rd("ui", "fonts.css")
assert "</style" not in fonts.lower()
html = shell.replace("@@FONTS@@", fonts.strip()).replace("@@DB@@", db).replace("@@APP@@", js.rstrip("\n"))
ver = re.search(r'const APP_VERSION = "([^"]+)"', js).group(1)
open(out, "w", encoding="utf-8").write(html)
print("v" + ver, out, len(html), "byte, SHA-256", hashlib.sha256(html.encode("utf-8")).hexdigest())
