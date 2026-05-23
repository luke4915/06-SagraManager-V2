// server.js (backend)
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";
import profileRoutes from './routes/profile.js';
import printersRoutes from "./routes/printers.js";
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import sessionRoutes from './routes/sessions.js';
import authRoutes from './routes/auth.js';
import escpos from "escpos";
import escposUsb from "escpos-usb";
import cookieParser from "cookie-parser";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

escpos.USB = escposUsb;
dotenv.config();

const app = express();

app.use(cookieParser());
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/api/assets', express.static(path.join(__dirname, 'assets')));

// HTTP server unificato (API + WS sulla stessa porta)
const server = createServer(app);
const wss = new WebSocketServer({ server });

wss.on("connection", (ws) => {
  console.log("📡 WS client connesso");
  ws.send(JSON.stringify({ type: "connected" }));
});

function broadcast(msg) {
  const payload = JSON.stringify(msg);
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(payload);
  });
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/products', productRoutes);
app.use("/api/printers", printersRoutes);
app.use('/api/orders', orderRoutes(broadcast));
app.use('/api/sessions', sessionRoutes(broadcast));

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API + WS su http://0.0.0.0:${PORT}`);
});