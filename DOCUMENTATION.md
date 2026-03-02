# SagraManager V2 — Documentazione Completa (utente finale / sviluppatore)

> Questa documentazione è pensata per **chi parte da zero** con JavaScript/React e Node.js. 
> Ti guiderò passo‑passo attraverso la struttura del progetto, come eseguirlo in locale, dove mettere le mani per modifiche comuni e come risolvere i problemi più frequenti.

---
## Indice
1. Panoramica generale
2. Prerequisiti software
3. Struttura progetto (file e cartelle principali)
4. Configurazione ambiente (variabili d'ambiente)
5. Avvio in sviluppo — passo passo
6. Come funziona il Frontend (cartelle e file chiave)
7. Come funziona il Backend (entrypoint, routes, stampa)
8. Database — schema e come inizializzarlo
9. Stampa PDF & ESC/POS — funzionamento e risoluzione problemi
10. Modifiche frequenti: esempi pratici (dove e come cambiare)
11. Debugging e troubleshooting
12. Sicurezza e produzione: appunti pratici
13. File aggiunti (SQL e README deploy)
---

## 1) Panoramica generale
`SagraManager V2` è una applicazione web per la gestione di eventi/fiere (sagre):
- frontend React (Vite + Tailwind) per interfaccia operatore;
- backend Node.js + Express (API REST) e WebSocket per notifiche real‑time;
- PostgreSQL come DB relazionale;
- integrazione con stampanti termiche Epson (ESC/POS) e generazione PDF (pdfkit) per test/preview;
- gestione sessioni (apri/chiudi "serata") e stampe automatiche quando si salva un ordine.

Questa documentazione ti spiega TUTTO in modo pratico: dove trovare i file, cosa modificare e come farlo.

---
## 2) Prerequisiti software
- Node.js 18+ (includes npm)
- PostgreSQL 12+
- Git (opzionale)
- (Se usi stampante fisica) driver/permessi per USB e `libusb` / regole `udev` su Linux o driver su Windows.
- Consiglio: usare VSCode come editor (ha integrazione terminale, ricerca testo e devtools).

---
## 3) Struttura del progetto (dove guardare)
All'interno dello zip estratto trovi due sotto-progetti principali:

```
/sagra-manager/                 # frontend (React + Vite)
  package.json
  vite.config.js
  src/
    main.jsx
    App.jsx
    components/
      Header.jsx
      Sidebar.jsx
      Cart.jsx
      ProductList.jsx
      ProductConfig.jsx
      OrdersKitchen.jsx
      Toast.jsx
      Login.jsx
      ChangePassword.jsx
      UserProfile.jsx
      AppearanceSettings.jsx
      PrintProfiles.jsx
      ReverseOrder.jsx
    assets/
    styles/ (se presente)
  .env.local (VITE_API_URL)
/sagra-manager-backend/         # backend (Express, WS, stampa)
  package.json
  server.js
  db.js
  routes/
    auth.js
    profile.js
    products.js
    orders.js
    printers.js
    sessions.js
  utils/
    receiptTemplates.js
  middleware/
    authenticate.js
  tmp/                          # dove vengono salvati i PDF generati
  .env                          # DB creds, JWT secret, etc.
```

> Nota: i percorsi nel tuo ambiente possono variare leggermente, ma i file chiave elencati sono quelli da cercare.

---
## 4) Configurazione ambiente (variabili d'ambiente)

### Frontend
Nel folder `sagra-manager/` puoi avere un file `.env.local` contenente:
```
VITE_API_URL=http://localhost:3000/api
VITE_WS_URL=ws://localhost:3001
```
`VITE_API_URL` è la base URL usata dal frontend per chiamare le API del backend. Se il backend gira su porta diversa, aggiornalo.

### Backend
Nel folder `sagra-manager-backend/` crea `.env` con (esempio):
```
PORT=3000
WS_PORT=3001
PG_HOST=localhost
PG_PORT=5432
PG_USER=your_db_user
PG_PASSWORD=your_db_password
PG_DATABASE=sagramanager
JWT_SECRET=una-parola-segreta-da-cambiare
PRINT_TMP_DIR=./tmp
```
> Cambia `JWT_SECRET` con una chiave forte in produzione.

---
## 5) Avvio in sviluppo — passo passo (dettagliato)

1. Estrai lo zip (già fatto si stai leggendo questo file).
2. Apri due terminali o usa un terminal multiplexer (es. VSCode integrated terminal con 2 split).
3. Frontend:
   ```bash
   cd /path/to/sagra-manager
   npm install
   npm run dev
   ```
   Vite ti mostrerà l'URL (es. http://localhost:5173).
4. Backend:
   ```bash
   cd /path/to/sagra-manager-backend
   npm install
   npm run dev   # o `npm start` se configurato
   ```
5. Crea il database (vedi sezione 8) e imposta le variabili d'ambiente del backend.
6. Apri il frontend, fai il login (usa un utente seed o crea con query SQL) e prova.

> Se vuoi avviare tutto con un singolo comando, puoi aggiungere script nella root che usa `concurrently`, ma il repository potrebbe già avere uno script `dev` pronto. Controlla `package.json` nella root.

---
## 6) Frontend — spiegazione per file/concetti chiave (per principianti)

### Concetti base (in 2 parole)
- **React** è una libreria per costruire UI. Un'app React è composta da "componenti" (file `.jsx`) che ritornano HTML-like (JSX).
- **State** è la memoria di un componente (`useState`); cambia lo stato e React aggiorna l'interfaccia.
- **Props** sono parametri che si passano da componente padre a figlio.

### File di partenza
- `src/main.jsx`: monta l'app React dentro il DOM (file `index.html` creato da Vite).
- `src/App.jsx`: componente principale. Contiene lo stato globale dell'app (prodotti, carrello, utente, WebSocket, ecc.).
  - Qui trovi `useEffect` che carica prodotti dopo il login e crea la connessione WebSocket.
  - Se vuoi modificare la logica di invio ordine, guardalo: funzione `sendOrder` prepara il payload e fa `fetch` a `POST /api/orders`.

### Componenti principali
- `Sidebar.jsx`:
  - Mostra il menu a sinistra e pulsanti per avviare/chiudere sessione.
  - Funzioni chiave: `startSession` (chiama `POST /sessions/start`) e `endSession` (POST /sessions/end).
  - Se vuoi aggiungere voci al menu, modifica l'array `menuItems` all'inizio del file.
- `Cart.jsx`:
  - Visualizza gli articoli selezionati. Qui trovi la logica per le note degli articoli (spoiler: convertite in MAIUSCOLO).
  - Pulsante `Invia Ordine` chiama `sendOrder` passato da `App.jsx`.
  - Per cambiare look, modifica le classi Tailwind presenti negli elementi JSX.
- `ProductList.jsx`:
  - Renderizza i prodotti (bottoni "Aggiungi"). Modifica qui se desideri cambiare UX per aggiungere prodotti (es. aggiunta con modale per quantità).
- `ProductConfig.jsx`:
  - Un esempio di popup/modal form per aggiungere/modificare prodotti. Ottimo da usare come modello se vuoi creare altri popup (es. "Avvia sessione" con campo nome serata).
- `OrdersKitchen.jsx`:
  - View per la cucina che mostra ordini ricevuti (leggi dati da `GET /api/orders` o riceve tramite WebSocket).

### Come aggiungere un nuovo campo prodotto (conciso)
1. DB: aggiungi colonna `allergens TEXT` (o `jsonb`).
2. Backend: modifica le query INSERT/UPDATE/SELECT in `routes/products.js` per includere `allergens`.
3. Frontend:
   - `ProductConfig.jsx`: aggiungi un `<input name="allergens" ...>` e includilo nel body del fetch.
   - `ProductList.jsx` e `Cart.jsx`: usa `product.allergens` dove vuoi mostrarlo.

---
## 7) Backend — spiegazione (per principianti)

### Che cosa fa `server.js` (o entrypoint)
- Imposta Express (middleware `express.json()`, CORS).
- Inizializza connessione DB (`db.js`) con `pg` (pool).
- Monta rotte (`/api/login`, `/api/products`, `/api/orders`, `/api/sessions`, `/api/printers`, ecc.).
- Avvia anche un server WebSocket (porta separata) per notifiche real-time (es. quando un prodotto viene creato/aggiornato/cancellato il backend invia messaggi ai client con `type` e `payload`).
- Gestisce la generazione della stampa (PDF + invio ESC/POS) quando arriva un nuovo ordine.

### Middleware di autenticazione (JWT)
- `authenticate.js` legge l'header `Authorization: Bearer <token>`, verifica il token con `JWT_SECRET` e aggiunge `req.user` alla richiesta.
- Rotte protette (es. POST /api/orders) richiedono token valido.

### Rotte importanti
- `POST /api/login` → valida credenziali e restituisce token e dati utente.
- `PATCH /api/profile` → modifica username/password.
- `GET /api/products`, `POST /api/products`, `DELETE /api/products/:id` → CRUD prodotti.
- `POST /api/orders` → salva ordine, genera ricevute, invia print (se configurato).
- `GET /api/sessions/latest`, `POST /api/sessions/start`, `POST /api/sessions/end` → gestione sessioni/serate.
- `GET /api/printers` → lista stampanti disponibili (Windows PowerShell script o altro metodo).

---
## 8) Database — schema & inizializzazione (guida pratica)
Trovi lo script SQL `schema.sql` accanto a questa documentazione (file `schema.sql`).

### Come eseguire lo script con psql (esempio)
```bash
psql -U your_db_user -d postgres -h localhost -f /path/to/schema.sql
# oppure
psql -U your_db_user -d sagramanager -h localhost
\i /path/to/schema.sql
```

### Note su utenti/seed
- Nel file SQL è presente un utente amministratore "admin" con `password_hash` = NULL (se preferisci, puoi impostare un hash bcrypt prima di inserire l'utente).
- Se usi `password_hash = NULL`, il frontend suggerirà al login che l'utente deve cambiare password (funzione già gestita dal backend).

---
## 9) Stampa (PDF + ESC/POS) — dettagli operativi

### Flusso completo
1. Frontend manda `POST /api/orders` con il payload dell’ordine.
2. Backend salva l'ordine in DB.
3. Backend seleziona le impostazioni di stampa dell'utente (tabella `user_print_settings`) per capire quali copie generare (Cliente, Cucina, Bar).
4. Per ogni copia abilitata:
   - Viene generato un PDF usando `pdfkit` e le funzioni in `utils/receiptTemplates.js`.
   - Se una stampante fisica è configurata e raggiungibile, viene aperto il device con `escpos-usb` e inviato il comando ESC/POS corrispondente.
5. Il PDF viene salvato in `tmp/` per debug o download.

### Problemi comuni e soluzioni
- **Logo non appare**: probabilmente il path è sbagliato. Usa `console.log(logoPath, fs.existsSync(logoPath))` per debuggare. Usa path assoluto con `path.resolve(__dirname, '../assets/logo.png')` dal backend.
- **Test locale senza stampante**: usa la generazione PDF (si trova in `tmp/`); apri il PDF per verificare layout.
- **Permessi USB su Linux**: aggiungi regole `udev` per consentire accesso al device della stampante. Esempio (file `/etc/udev/rules.d/99-escpos.rules`):
  ```text
  SUBSYSTEM=="usb", ATTR{idVendor}=="XXXX", ATTR{idProduct}=="YYYY", MODE="0666"
  ```
  Sostituisci vendor/product id con quelli della tua stampante (`lsusb` per trovarli). Riavvia udev con `sudo udevadm control --reload-rules && sudo udevadm trigger`.

---
## 10) Modifiche frequenti — guide passo‑passo

### A) Inserire il popup "Nome serata" nella Sidebar (flow richiesto)
Se vuoi che il popup appaia SOLO dopo click su "Inizia" nella Sidebar:
1. Apri `src/components/Sidebar.jsx`.
2. Aggiungi `useState` all'import: `import React, { useEffect, useState } from 'react';`
3. Aggiungi stati in cima al componente:
   ```js
   const [showSessionPopup, setShowSessionPopup] = useState(false);
   const [sessionName, setSessionName] = useState('');
   ```
4. Modifica onclick del bottone Inizia: invece di chiamare direttamente `startSession`, fai `() => setShowSessionPopup(true)`
5. Aggiungi funzione `confirmStartSession` che chiama la tua API `POST /api/sessions/start` con body `{ name: sessionName }` e su successo chiama `setSessionActive(true); setShowSessionPopup(false); showToast(...);`
6. Copia lo stile del modal da `ProductConfig.jsx` (la struttura del popup).
7. Assicurati che la funzione `showToast` sia disponibile nel componente (passala come prop da `App.jsx` a `Sidebar` se non è già presente).

### B) Aggiungere il campo "allergeni" per prodotti
1. DB: `ALTER TABLE products ADD COLUMN allergens TEXT;`
2. Backend: modifica endpoint `POST /api/products` e `GET /api/products` per includere `allergens` nel payload.
3. Frontend: in `ProductConfig.jsx` aggiungi input `<input name="allergens" ... />` e includilo nella formData. Mostralo in `ProductList.jsx` e `Cart.jsx` se necessario.

### C) Cambiare template della ricevuta (PDF)
- File: `sagra-manager-backend/utils/receiptTemplates.js`
- Modifica funzioni `renderHeader`, `renderItems`, `renderFooter` per cambiare fontSize, larghezze, posizionamento e logo.
- Test: genera un ordine dal frontend; il backend salverà il PDF in `tmp/` (apri e controlla).

---
## 11) Debugging & troubleshooting (concetti pratici)

### Come leggere i log
- Frontend (Vite) stampa log nella console del browser e nel terminale dove hai eseguito `npm run dev`.
- Backend: guarda il terminale dove è avviato (`nodemon` o `node`). Aggiungi `console.log(...)` in punti chiave (es. dentro `/api/orders` prima e dopo l'inserimento DB).
- Se non arriva la stampa: verifica che `user_print_settings` per l'utente abbia `printer_name` corretto e che il backend abbia i permessi USB.

### Problemi di CORS o token
- Se il frontend non riesce a chiamare `/api/*`, controlla la console del browser per errori CORS o 401/403. Verifica che `VITE_API_URL` punti al corretto `http://localhost:3000/api`.
- JWT: se ricevi 401, controlla che il token sia inviato con `Authorization: Bearer <token>` e che `JWT_SECRET` sia lo stesso in backend e in eventuali script di generazione token.

---
## 12) Sicurezza e produzione (consigli pratici)
- Non commitare `.env` con segreti. Usa secret manager o variabili d'ambiente sul server.
- Usa HTTPS in produzione (nginx + certbot o Cloud provider).
- Limitare permessi DB all'app (user con permessi minimi).
- Aggiorna dipendenze regolarmente e limita accesso SSH al server.

---
## 13) File aggiunti in questa consegna
- `schema.sql` (script per creare schema DB e seed minimale).
- `README_PRODUCTION.md` (istruzioni dettagliate per deploy / nginx / systemd / PM2).

---
Se vuoi, posso generare anche:
- una versione in PDF di questa documentazione;
- script di migration per `knex` o `sequelize` (se preferisci migrations rispetto allo script SQL);
- un file `DOCUMENTATION.md` collocato automaticamente nella root del progetto estratto (l'ho già creato in questa sessione: vedi link di download).

Se vuoi che apporti direttamente modifiche al codice (es. integrare il popup nella Sidebar e passare `showToast`), dimmi e lo faccio passo‑passo, o posso generare la patch pronta da applicare.

Grazie — dimmi se desideri aggiustamenti, più dettagli o esempi di codice per parti specifiche.
