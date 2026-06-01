import jwt from 'jsonwebtoken';

export function authenticate(req, res, next) {
  let token = req.cookies?.token;
  if (!token) {
    const auth = req.headers['authorization'] || req.headers['Authorization'];
    if (auth?.startsWith('Bearer ')) token = auth.split(' ')[1];
  }
  if (!token) return res.status(401).json({ error: 'Token mancante' });

  if (!process.env.JWT_SECRET) {
    logger.error({ err }, 'JWT_SECRET non impostata')
    return res.status(500).json({ error: 'Server misconfigured' });
  }

  try {
    const { id, username, role } = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id, username, role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError')
      return res.status(401).json({ error: 'Token scaduto', code: 'TOKEN_EXPIRED' });
    return res.status(403).json({ error: 'Token non valido' });
  }
}

export function authorizeAdmin(req, res, next) {
  if (req.user?.role !== 'admin')
    return res.status(403).json({ error: 'Accesso riservato agli amministratori' });
  next();
}
