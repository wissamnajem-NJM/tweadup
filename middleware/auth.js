// ==================================================================
//  TWEADUP — Middlewares d'authentification JWT et contrôle de rôle
// ==================================================================
const jwt = require('jsonwebtoken');

// Vérifie le token JWT (header "Authorization: Bearer <token>")
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: 'Non authentifié. Connecte-toi d\'abord.' });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Session expirée. Reconnecte-toi.' });
  }
}

// Réserve une route aux administrateurs
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Accès réservé à l\'administrateur.' });
  }
  next();
}

module.exports = { authenticate, requireAdmin };
