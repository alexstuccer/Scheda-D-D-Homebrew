# La Gemma di San Batacchio · scheda del personaggio

Scheda per D&D 5e con le regole della casa, in un solo file HTML che funziona offline.

| File | Cosa è |
|---|---|
| `dashboard_v3.html` | Versione di produzione (9.11). |
| `experimental/dashboard_10.4.1.html` | Versione di prova 10.4.1: nuova interfaccia con tre temi (Strumento, Pergamena, Arena), formato telefono e computer; la vecchia scheda resta come «Editor completo» per creazione e level-up. |
| `src/` | Sorgente leggibile (React, JSX). |
| `build.py` | Compila `src/` in un file unico: `python3 build.py dashboard.html` (serve esbuild: `npm i esbuild`). |

Per usare la scheda basta il file HTML: React, incantesimi e caratteri sono già dentro.

Prima di aprire la versione di prova dallo stesso sito della produzione, esporta i personaggi in JSON: le due versioni condividono i dati salvati nel browser e la 10.x aggiorna alcuni campi (per esempio i nomi dei tipi di danno).
