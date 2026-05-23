"""Build dashboard_v3.html — wrappa il JSX della dashboard v3
in un HTML standalone con React+Babel da CDN. Inietta anche il
download Blob per l'export e il bottone Stampa nella scheda interna."""
import re

with open('/home/claude/dashboard/dashboard_v3.jsx', 'r') as f:
    jsx = f.read()

# 1. Rimuovi import React (usiamo i globali da CDN)
jsx = re.sub(r'^import\s+\{[^}]+\}\s+from\s+"react";?\s*\n', '', jsx, count=1, flags=re.MULTILINE)

# 2. Hook destructuring all'inizio
jsx = 'const { useState, useMemo, useRef, useEffect } = React;\n\n' + jsx

# 3. doExport: usa Blob download (funziona in HTML standalone, non nell'iframe artifact)
one_liner = r'const doExport\s*=\s*\(\)\s*=>\s*setExpData\(JSON\.stringify\(ch,\s*null,\s*2\)\)\s*;'
new_export = '''const doExport = () => {
    const json = JSON.stringify(ch,null,2);
    try {
      const blob = new Blob([json], {type:"application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = (ch.name || "scheda") + ".json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (e) {
      setExpData(json);
    }
  };'''
if re.search(one_liner, jsx):
    jsx = re.sub(one_liner, new_export, jsx, count=1)
    print("✓ doExport con Blob iniettato")
else:
    print("✗ doExport one-liner non trovato")

# 4. Bottone Stampa accanto a Esporta (nella scheda)
old_btn = '<button className="btn bs" onClick={doExport}>⬇ Esporta</button>'
new_btn = '<button className="btn bs" onClick={() => window.print()}>🖨 Stampa</button>\n              <button className="btn bs" onClick={doExport}>⬇ Esporta</button>'
if old_btn in jsx:
    jsx = jsx.replace(old_btn, new_btn, 1)
    print("✓ Bottone Stampa aggiunto")

# 5. Wrappa in HTML, monta <Dashboard />
html = '''<!DOCTYPE html>
<html lang="it">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Schede Personaggio — La Gemma di San Batacchio</title>
<script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
<script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
<script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
<style>
html,body{margin:0;padding:0;background:#1a1714}
#root{min-height:100vh}
</style>
</head>
<body>
<div id="root"></div>
<script type="text/babel" data-presets="react">
''' + jsx + '''

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<Dashboard />);
</script>
</body>
</html>
'''

with open('/home/claude/dashboard/dashboard_v3.html', 'w') as f:
    f.write(html)

print(f"\nOutput: {len(html)} bytes, {len(html.splitlines())} righe")
