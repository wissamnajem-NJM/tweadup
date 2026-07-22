// ==================================================================
//  TWEADUP — Application Express principale
// ==================================================================
require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// En-têtes de sécurité de base
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ----------------------------- API -----------------------------
app.use('/api/auth', require('./routes/auth'));
app.use('/api/public', require('./routes/public'));
app.use('/api/formations', require('./routes/formations'));
app.use('/api/student', require('./routes/student'));
app.use('/api/learn', require('./routes/learn'));
app.use('/api/admin', require('./routes/admin'));

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'Tweadup API' }));

// 404 pour les routes API inconnues
app.use('/api', (req, res) => res.status(404).json({ message: 'Route API introuvable.' }));

// ------------------------- FRONTEND (local) -------------------------
// Sur Vercel, le dossier public/ est servi automatiquement.
app.use(express.static(path.join(__dirname, 'public')));

// Gestion centralisée des erreurs
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error('Erreur serveur:', err);
  res.status(500).json({ message: 'Erreur interne du serveur.' });
});

module.exports = app;
