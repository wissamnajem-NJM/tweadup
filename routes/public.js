// ==================================================================
//  TWEADUP — Routes publiques (sans authentification)
//  GET  /api/public/stats          → statistiques de la landing page
//  GET  /api/public/categories     → catégories + nombre de formations
//  GET  /api/public/formations     → formations vedettes (aperçu)
//  POST /api/public/contact        → message de contact
//  GET  /api/public/verify/:code   → vérification d'un certificat
// ==================================================================
const express = require('express');
const db = require('../config/db');

const router = express.Router();

// Statistiques affichées sur la landing page
router.get('/stats', async (req, res) => {
  try {
    const r = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM users u JOIN roles ro ON ro.id=u.role_id WHERE ro.nom='etudiant') AS etudiants,
        (SELECT COUNT(*) FROM formations WHERE is_published) AS formations,
        (SELECT COUNT(*) FROM courses) AS cours,
        (SELECT COUNT(*) FROM certificates) AS certificats`);
    res.json(r.rows[0]);
  } catch (e) {
    console.error('public/stats:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Catégories avec nombre de formations publiées
router.get('/categories', async (req, res) => {
  try {
    const r = await db.query(`
      SELECT c.id, c.nom, c.slug, c.icone,
             COUNT(f.id)::int AS nb_formations
      FROM categories c
      LEFT JOIN formations f ON f.categorie_id = c.id AND f.is_published
      GROUP BY c.id ORDER BY c.id`);
    res.json({ categories: r.rows });
  } catch (e) {
    console.error('public/categories:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Aperçu du catalogue pour la landing page (6 formations)
router.get('/formations', async (req, res) => {
  try {
    const r = await db.query(`
      SELECT f.id, f.titre, f.description, f.image_url, f.duree_heures, f.niveau,
             f.enseignant, c.nom AS categorie, c.icone,
             COALESCE(e.nb, 0)::int AS nb_inscrits
      FROM formations f
      LEFT JOIN categories c ON c.id = f.categorie_id
      LEFT JOIN (SELECT formation_id, COUNT(*) AS nb FROM enrollments GROUP BY formation_id) e
        ON e.formation_id = f.id
      WHERE f.is_published
      ORDER BY nb_inscrits DESC, f.id
      LIMIT 6`);
    res.json({ formations: r.rows });
  } catch (e) {
    console.error('public/formations:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Formulaire de contact de la landing page
router.post('/contact', async (req, res) => {
  try {
    const { nom, email, sujet, message } = req.body || {};
    if (!nom || !email || !message) {
      return res.status(400).json({ message: 'Nom, email et message sont obligatoires.' });
    }
    await db.query(
      'INSERT INTO contact_messages (nom, email, sujet, message) VALUES ($1,$2,$3,$4)',
      [nom.trim(), email.trim().toLowerCase(), (sujet || '').trim(), message.trim()]);
    res.status(201).json({ message: 'Message envoyé. L\'équipe Tweadup te répondra rapidement.' });
  } catch (e) {
    console.error('public/contact:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Vérification publique d'un certificat (via QR code)
router.get('/verify/:code', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT c.numero, c.date_delivrance, u.prenom, u.nom, f.titre AS formation
       FROM certificates c
       JOIN users u ON u.id = c.user_id
       JOIN formations f ON f.id = c.formation_id
       WHERE c.code_verification = $1`, [req.params.code]);
    if (!r.rows[0]) {
      return res.status(404).json({ valide: false, message: 'Certificat introuvable ou invalide.' });
    }
    res.json({ valide: true, certificat: r.rows[0] });
  } catch (e) {
    console.error('public/verify:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
