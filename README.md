# COKNO

Motore di ricerca federato multi-fonte con grafo di conoscenza: aggrega risultati da 98 connettori esterni su 5 categorie (immagini, video, GIF, modelli 3D, testi), e li collega tra loro tramite un grafo di relazioni — fatti curati da Wikidata più associazioni lessicali da Datamuse — esplorabile, definizioni da dizionario, e un percorso di conoscenza persistito per sessione.

## Requisiti

- Node.js 18+
- Google Chrome installato (usato per lo scraping via Puppeteer su circa metà dei connettori)

## Avvio

```bash
cd backend
npm install
npm run dev
```

Il backend serve sia le API (`/api/...`) sia il frontend statico sulla stessa porta: apri **http://localhost:3001** nel browser.

## Test

```bash
cd backend
npm test
```

Copre la logica pura e deterministica dei servizi condivisi (filtri di safe search, matching testo↔query per il grafo di conoscenza, correzione ortografica) — non richiede chiavi API né rete.

## Configurazione delle chiavi API

Nessuna chiave è obbligatoria per avviare il progetto: la maggior parte dei connettori (circa due terzi) funziona senza alcuna configurazione. Le chiavi servono solo ad abilitare le fonti che le richiedono — senza, quella singola fonte viene semplicemente segnalata come non disponibile e il resto della ricerca funziona normalmente.

Per abilitarle:

1. Copia il file di esempio:
   ```bash
   cd backend
   cp .env.example .env
   ```
2. Apri `.env` e inserisci le chiavi per le fonti che vuoi attivare. Ogni riga in `.env.example` indica il link dove registrarsi e ottenere la chiave gratuitamente:

   | Categoria | Servizi che richiedono una chiave |
   |---|---|
   | Immagini | Unsplash, Pexels, Pixabay, Flickr, Europeana, Smithsonian, DPLA |
   | Video | YouTube, Vimeo |
   | GIF | Giphy, Tenor, Imgur |
   | Modelli 3D | Thingiverse |
   | Testi | Merriam-Webster, CORE |

   Tutti gli altri connettori (NASA, Library of Congress, The Met, Wikipedia, arXiv, PubMed, Etymonline, Treccani, Wikidata, Reddit, TED, Sketchfab, ecc.) non richiedono alcuna chiave.
3. Riavvia il backend (`npm run dev`) perché le nuove variabili vengano lette.

## Struttura del progetto

- `backend/` — API Express + TypeScript, un connettore per fonte (`src/connectors/<categoria>/<fonte>.ts`), servizi condivisi per grafo di conoscenza, safe search, correzione ortografica e definizioni (`src/services/`).
- `frontend/` — HTML/CSS/JS vanilla, nessun framework, nessun database: la persistenza è solo lato browser (`localStorage`, sessione).
