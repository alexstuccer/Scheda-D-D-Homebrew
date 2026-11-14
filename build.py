#!/usr/bin/env python3
"""Compila La Gemma di San Batacchio in un file unico offline.
Uso: python3 build.py [uscita.html]   (richiede esbuild: npm i esbuild)
Ingressi: src/shell.html (HTML, React inline), src/app.jsx (applicazione e interfaccia classica),
src/ui/ui-new.jsx (nuova interfaccia, MOBILE), src/ui/ui-desktop.jsx (cornice desktop, DESKTOP),
src/ui/character.jsx (useCharacter, REGIA), src/ui/fonts.css (caratteri), src/spells-db.json (incantesimi).
I file della nuova interfaccia entrano prima del montaggio finale di app.jsx, in un solo script."""
import subprocess, sys, json, re, os, hashlib, shutil
here = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(here, "src")
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, "dashboard.html")
esb = os.environ.get("ESBUILD") or shutil.which("esbuild") or os.path.join(here, "node_modules", ".bin", "esbuild")
def rd(*p): return open(os.path.join(src, *p), encoding="utf-8").read()
app = rd("app.jsx")
cut = app.index("const root = ReactDOM.createRoot(")
ui_new = rd("ui", "ui-new.jsx")
dline = "const { useState, useEffect, useRef } = React;\n"
assert ui_new.count(dline) == 1, "ui-new.jsx: riga di React attesa una volta"
ui_new = ui_new.replace(dline, "")   # app.jsx la dichiara già
parts = [app[:cut], "\n/* ═══ nuova interfaccia: ui-new.jsx ═══ */\n", ui_new,
         "\n/* ═══ nuova interfaccia: ui-desktop.jsx ═══ */\n", rd("ui", "ui-desktop.jsx"),
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
