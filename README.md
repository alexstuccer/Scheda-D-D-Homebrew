# La Gemma di San Batacchio · scheda del personaggio

Scheda per D&D 5e con le regole della casa, in un solo file HTML che funziona offline.

| File | Cosa è |
|---|---|
| `dashboard_v3.html` | Versione di produzione (9.11). |
| `experimental/dashboard_10.4.1.html` | Versione di prova 10.4.1: nuova interfaccia con tre temi (Strumento, Pergamena, Arena), formato telefono e computer; la vecchia scheda resta come «Editor completo» per creazione e level-up. |
| `experimental/index.html` | Versione di prova, sempre l'ultima, all'indirizzo fisso https://alexstuccer.github.io/Scheda-D-D-Homebrew/experimental/ (ora 10.7.11 (pulsante Esporta in vista; prove delle competenze tirabili dall'elenco; senza gestione delle campagne; collegare una cartella non fa più perdere i personaggi): privilegi di classe e talenti dai dati di ARCHETIPI e TALENTI, creazione e level-up nella nuova interfaccia, madrelingue, competenze aggiunte dal master, aumento di caratteristica, punti competenza che non scendono sotto zero. |
| `src/` | Sorgente leggibile (React, JSX). `src/data/` contiene privilegi e talenti. |
| `tests/` | Prove automatiche (Playwright): istruzioni in `tests/LEGGIMI.txt`. |
| `build.py` | Compila `src/` in un file unico: `python3 build.py dashboard.html` (serve esbuild: `npm i esbuild`). |

Per usare la scheda basta il file HTML: React, incantesimi e caratteri sono già dentro.

Prima di aprire la versione di prova dallo stesso sito della produzione, esporta i personaggi in JSON: le due versioni condividono i dati salvati nel browser e la 10.x aggiorna alcuni campi (per esempio i nomi dei tipi di danno).
