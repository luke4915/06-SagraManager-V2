import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import { fileURLToPath } from 'url';
import path from 'path';
import escpos from 'escpos';
import escposUsb from 'escpos-usb';

import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profile.js';
import productRoutes from './routes/products.js';
import printersRoutes from './routes/printers.js';
import orderRoutes from './routes/orders.js';
import sessionRoutes from './routes/sessions.js';
import exportRoutes from './routes/exports.js';
import printSettingsRoutes from './routes/printSettings.js';
import { loginLimiter, apiLimiter, ordersLimiter } from './middleware/rateLimiter.js';

escpos.USB = escposUsb;
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.set('trust proxy', 1); // necessario per rate limiter dietro proxy/nginx

app.use(cookieParser());
app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    const ok = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.');
    cb(ok ? null : new Error('CORS non consentito'), ok);
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' })); // limita payload JSON
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Rate limiting globale su tutte le API
app.use('/api', apiLimiter);
// Rate limiting specifico
app.use('/api/auth/login', loginLimiter);
app.use('/api/orders', ordersLimiter);

const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('📡 WS client connesso');
  ws.send(JSON.stringify({ type: 'connected' }));
  ws.on('error', (err) => console.error('WS client error:', err.message));
});

function broadcast(msg) {
  const payload = JSON.stringify(msg);
  wss.clients.forEach(client => { if (client.readyState === 1) client.send(payload); });
}

app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/products', productRoutes);
app.use('/api/printers', printersRoutes);
app.use('/api/print-settings', printSettingsRoutes);
app.use('/api/orders', orderRoutes(broadcast));
app.use('/api/sessions', sessionRoutes(broadcast));
app.use('/api/exports', exportRoutes);

// Serve frontend build in produzione
const distPath = path.join(__dirname, '..', 'sagra-manager', 'dist');
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

// Handler errori globale
app.use((err, _req, res, _next) => {
  console.error('Errore non gestito:', err.message);
  res.status(500).json({ error: 'Errore interno del server' });
});

const PORT = parseInt(process.env.PORT) || 3000;
server.listen(PORT, '0.0.0.0', () => console.log(`🚀 API + WS su http://0.0.0.0:${PORT}`));
