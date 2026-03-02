// middleware/authorizeAdmin.js

export function authorizeAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Utente non autenticato' });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Accesso riservato agli amministratori' });
  }

  next();
}
