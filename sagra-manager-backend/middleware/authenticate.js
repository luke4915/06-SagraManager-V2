// middleware/authenticate.js
import jwt from "jsonwebtoken";

export function authenticate(req, res, next) {
  // 1️⃣ PROVA A LEGGERE IL TOKEN DAL COOKIE
  let token = req.cookies?.token || null;

  // 2️⃣ FALLBACK: Authorization: Bearer ...
  if (!token) {
    const authHeader =
      req.headers["authorization"] || req.headers["Authorization"];

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    }
  }

  // 3️⃣ Se ancora non c’è → non autenticato
  if (!token) {
    return res.status(401).json({ error: "Token mancante" });
  }

  // 4️⃣ Verifica che la secret esista
  if (!process.env.JWT_SECRET) {
    console.error("*** ERRORE: JWT_SECRET non impostata nel processo ***");
    return res
      .status(500)
      .json({ error: "Server misconfigured: JWT_SECRET mancante" });
  }

  // 5️⃣ Verifica token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, username, role, iat, exp }
    next();
  } catch (err) {
    console.error("[authenticate] jwt.verify fallita:", err.message);
    return res.status(403).json({
      error: "Token non valido",
      details:
        process.env.NODE_ENV !== "production" ? err.message : undefined,
    });
  }
}

export function authorizeAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: "Utente non autenticato" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Accesso riservato agli amministratori" });
  }

  next();
}
