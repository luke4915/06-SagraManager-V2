# SagraManager V2 — README per Deploy in Produzione

Questa guida spiega come deployare in produzione la webapp `SagraManager V2`. Contiene consigli pratici su build frontend, configurazione `nginx`, servizio backend (`systemd` o `PM2`), database Postgres, SSL e note per la gestione delle stampanti termiche.

---
## 1) Panoramica architettura di produzione
- Frontend (build statico) servito da `nginx` (o CDN).
- Backend Node.js (Express) dietro `nginx` come reverse proxy (porta privata es. 3000).
- WebSocket (porta 3001) gestita dal backend; `nginx` configurato per proxy pass WebSocket.
- PostgreSQL come DB persistente.
- Files temporanei per PDF in `/var/sagra/tmp` (configurare permessi).

---
## 2) Preparazione server (Ubuntu 22.04 LTS - esempio)
```bash
# update & base tools
sudo apt update && sudo apt upgrade -y
sudo apt install -y nginx git curl build-essential
# Node.js (installare versione LTS tramite NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
# PostgreSQL
sudo apt install -y postgresql postgresql-contrib
```

---
## 3) Utente dedicato e file system
Crea un utente per l'app (non usare root):
```bash
sudo adduser --disabled-password --gecos "" sagra
sudo mkdir -p /var/www/sagramanager
sudo chown sagra:sagra /var/www/sagramanager
```
Copia i repository in `/var/www/sagramanager` (git clone o copia file).

Crea la cartella tmp per PDF e dai permessi:
```bash
sudo mkdir -p /var/www/sagramanager/tmp
sudo chown -R sagra:sagra /var/www/sagramanager/tmp
chmod 755 /var/www/sagramanager/tmp
```

---
## 4) Variabili d'ambiente (esempio di file .env)
Crea `/var/www/sagramanager/.env` (più sicuro usare systemd env o secret manager):
```
PORT=3000
WS_PORT=3001
PG_HOST=localhost
PG_PORT=5432
PG_USER=sagra_user
PG_PASSWORD=secure_password_here
PG_DATABASE=sagramanager
JWT_SECRET=very-strong-secret
PRINT_TMP_DIR=/var/www/sagramanager/tmp
```
> Non committare `.env` nel repo.

---
## 5) Build frontend e configurazione nginx
### Build frontend
```bash
cd /var/www/sagramanager/sagra-manager
npm ci
npm run build
# build output in dist/ (Vite default)
```
Copia build in `/var/www/sagramanager/frontend` oppure servi direttamente dalla cartella `dist`.

### nginx config (esempio)
Crea file `/etc/nginx/sites-available/sagramanager`:
```
server {
    listen 80;
    server_name your-domain.example;

    root /var/www/sagramanager/sagra-manager/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # proxy WebSocket (es. /ws)
    location /ws/ {
        proxy_pass http://127.0.0.1:3001/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```
Abilita sito e ricarica nginx:
```bash
sudo ln -s /etc/nginx/sites-available/sagramanager /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### SSL con Certbot
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.example
```

---
## 6) Avviare il backend con PM2 o systemd

### PM2 (semplice)
```bash
# come utente sagra
cd /var/www/sagramanager/sagra-manager-backend
npm ci
pm2 start server.js --name sagramanager-backend --watch
pm2 save
pm2 startup # follow instructions
```

### systemd (esempio service file)
Crea `/etc/systemd/system/sagramanager.service`:
```
[Unit]
Description=SagraManager Backend
After=network.target

[Service]
Type=simple
User=sagra
WorkingDirectory=/var/www/sagramanager/sagra-manager-backend
EnvironmentFile=/var/www/sagramanager/.env
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=5
LimitNOFILE=10000

[Install]
WantedBy=multi-user.target
```
Abilita e avvia:
```bash
sudo systemctl daemon-reload
sudo systemctl enable sagramanager.service
sudo systemctl start sagramanager.service
sudo journalctl -u sagramanager.service -f
```

---
## 7) PostgreSQL: creare DB e user
```bash
sudo -u postgres psql
CREATE DATABASE sagramanager;
CREATE USER sagra_user WITH ENCRYPTED PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE sagramanager TO sagra_user;
\q
```
Esegui lo script SQL `schema.sql` fornito per creare tabelle e seed.

---
## 8) Stampanti termiche e permessi (produzione)
- Se la stampante è collegata via USB al server, assicurati che l'utente che esegue il backend (es. `sagra`) abbia accesso a /dev/bus/usb/*.
- Regole udev (esempio):
```
SUBSYSTEM=="usb", ATTR{idVendor}=="XXXX", ATTR{idProduct}=="YYYY", MODE="0666", GROUP="sagra"
```
- Riavvia udev e scollega/ricollega la stampante.

---
## 9) Backup & Log
- Esegui backup del DB (pg_dump) regolarmente.
- Imposta rotazione log per i log del backend (systemd/journald o file log con logrotate).

---
## 10) Manutenzione & aggiornamenti
- Aggiorna Node.js e dipendenze in ambiente di staging prima di aggiornare produzione.
- Testa le stampe da staging con stampANTE virtuale o PDF.
- Conserva sempre un ambiente di staging identico a produzione per testare modifiche di stampa e DB.

---
## 11) Contatti utili e ulteriori risorse
- Documentazione Node.js: https://nodejs.org/
- PostgreSQL docs: https://www.postgresql.org/docs/
- ESC/POS / escpos-usb: repository del pacchetto NPM e documentazione
- PDFKit docs: https://pdfkit.org/
