import jwt from 'jsonwebtoken';

export function authenticateMaster(req, res, next) {
  const token = req.cookies?.master_token;
  if (!token) return res.status(401).json({ error: 'Non autenticato' });
  if (!process.env.MASTER_JWT_SECRET) {
    return res.status(500).json({ error: 'MASTER_JWT_SECRET non configurato' });
  }
  try {
    jwt.verify(token, process.env.MASTER_JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Sessione master non valida' });
  }
}