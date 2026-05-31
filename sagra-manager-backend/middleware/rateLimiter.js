import rateLimit from 'express-rate-limit';

// Login: max 10 tentativi per IP ogni 15 minuti
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Troppi tentativi di accesso. Riprova tra 15 minuti.' },
  skipSuccessfulRequests: true, // conta solo i fallimenti
});

// API generali: max 200 req per IP ogni minuto
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite di chiamate API superato!' },
});

// Ordini: max 60 per IP ogni minuto (evita spam accidentale)
export const ordersLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limite di ordini inviati superato!' },
});
