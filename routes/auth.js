// ==================================================================
//  TWEADUP — Routes d'authentification
//  POST /api/auth/register   → création de compte (rôle étudiant)
//  POST /api/auth/login      → connexion (renvoie token + rôle)
//  GET  /api/auth/me         → profil de l'utilisateur connecté
// ==================================================================
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

function sign(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, nom: user.nom, prenom: user.prenom },
    process.env.JWT_SECRET,
    { expiresIn: '7d' });
}

// ------------------------- INSCRIPTION -------------------------
router.post('/register', async (req, res) => {
  try {
    let { nom, prenom, email, telephone, pays, password, confirmPassword } = req.body || {};
    nom = (nom || '').trim();
    prenom = (prenom || '').trim();
    email = (email || '').trim().toLowerCase();
    telephone = (telephone || '').trim();
    pays = (pays || '').trim();

    if (!nom || !prenom || !email || !password) {
      return res.status(400).json({ message: 'Nom, prénom, email et mot de passe sont obligatoires.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: 'Adresse email invalide.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Le mot de passe doit contenir au moins 6 caractères.' });
    }
    if (confirmPassword !== undefined && password !== confirmPassword) {
      return res.status(400).json({ message: 'Les mots de passe ne correspondent pas.' });
    }

    const exists = await db.query('SELECT id FROM users WHERE email=$1', [email]);
    if (exists.rows[0]) {
      return res.status(409).json({ message: 'Un compte existe déjà avec cet email.' });
    }

    const roleId = (await db.query("SELECT id FROM roles WHERE nom='etudiant'")).rows[0].id;
    const hash = await bcrypt.hash(password, 10);
    const r = await db.query(
      `INSERT INTO users (role_id, nom, prenom, email, telephone, pays, password_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id, nom, prenom, email`,
      [roleId, nom, prenom, email, telephone, pays, hash]);
    const user = r.rows[0];

    // Profil étudiant généré automatiquement
    await db.query('INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT DO NOTHING', [user.id]);
    await db.query(
      `INSERT INTO notifications (user_id, type, titre, message)
       VALUES ($1,'info','Bienvenue sur Tweadup 🎉',
               'Ton compte a été créé avec succès. Parcours le catalogue et demande ta première inscription.')`,
      [user.id]);

    const token = sign({ ...user, role: 'etudiant' });
    res.status(201).json({
      token,
      user: { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, role: 'etudiant' }
    });
  } catch (e) {
    console.error('register:', e);
    res.status(500).json({ message: 'Erreur serveur lors de l\'inscription.' });
  }
});

// -------------------------- CONNEXION --------------------------
router.post('/login', async (req, res) => {
  try {
    const email = ((req.body || {}).email || '').trim().toLowerCase();
    const password = (req.body || {}).password || '';

    const r = await db.query(
      `SELECT u.id, u.nom, u.prenom, u.email, u.password_hash, r.nom AS role
       FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.email = $1`, [email]);
    const user = r.rows[0];

    // Message identique volontairement (ne pas révéler si l'email existe)
    if (!user) return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: 'Email ou mot de passe incorrect.' });

    await db.query('UPDATE users SET last_login = NOW() WHERE id=$1', [user.id]);

    const token = sign(user);
    res.json({
      token,
      user: { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email, role: user.role }
    });
  } catch (e) {
    console.error('login:', e);
    res.status(500).json({ message: 'Erreur serveur lors de la connexion.' });
  }
});

// ------------------------ PROFIL CONNECTÉ ------------------------
router.get('/me', authenticate, async (req, res) => {
  try {
    const r = await db.query(
      `SELECT u.id, u.nom, u.prenom, u.email, u.telephone, u.pays,
              u.created_at, u.last_login, r.nom AS role
       FROM users u JOIN roles r ON r.id = u.role_id
       WHERE u.id = $1`, [req.user.id]);
    if (!r.rows[0]) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    res.json({ user: r.rows[0] });
  } catch (e) {
    console.error('me:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
