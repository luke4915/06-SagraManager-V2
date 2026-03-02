// server.js (backend)
import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import dotenv from "dotenv";
import profileRoutes from './routes/profile.js';
import printersRoutes from "./routes/printers.js";
import productRoutes from './routes/products.js';
import orderRoutes from './routes/orders.js';
import sessionRoutes from './routes/sessions.js';
import authRoutes from './routes/auth.js'
import escpos from "escpos";
import escposUsb from "escpos-usb";
import cookieParser from "cookie-parser";

escpos.USB = escposUsb;

dotenv.config();

const app = express();

app.use(cookieParser());
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use('/assets', express.static('assets'));

// WebSocket server su porta 3001
const WSPORT = process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 3001;
const wss = new WebSocketServer({ port: WSPORT });
wss.on("connection", (ws) => {
  console.log("📡 WS client connesso");
  ws.send(JSON.stringify({ type: "connected" }));
});

// helper broadcast
function broadcast(msg) {
  const payload = JSON.stringify(msg);
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(payload);
  });
}

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/profile', profileRoutes);
app.use('/api/products', productRoutes);
app.use("/api/printers", printersRoutes);

// Passiamo la funzione broadcast ai router che ne hanno bisogno
app.use('/api/orders', orderRoutes(broadcast));
app.use('/api/sessions', sessionRoutes(broadcast));

/* -----------------------------------------
   5️⃣ Avvio server
----------------------------------------- */
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API server su http://0.0.0.0:${PORT}  (WS su port ${WSPORT})`);
});
