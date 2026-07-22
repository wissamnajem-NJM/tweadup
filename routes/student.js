// ==================================================================
//  TWEADUP — Espace étudiant
//  GET  /api/student/me/formations     → mes inscriptions + progression
//  GET  /api/student/me/demandes       → mes demandes d'inscription
//  POST /api/student/formations/:id/demande → demander une inscription
//  GET  /api/student/me/notifications  → mes notifications
//  PUT  /api/student/me/notifications/tout-lu
//  PUT  /api/student/me/notifications/:id/lu
//  GET  /api/student/me/certificats    → mes certificats
// ==================================================================
const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { notifyAdmins } = require('../utils/helpers');

const router = express.Router();
router.use(authenticate);

// Mes formations (inscriptions acceptées) + progression
router.get('/me/formations', async (req, res) => {
  try {
    const r = await db.query(`
      SELECT f.id, f.titre, f.description, f.image_url, f.duree_heures, f.niveau,
             f.enseignant, c.nom AS categorie, c.icone,
             e.date_inscription, e.termine,
             COALESCE(co.total, 0)::int AS total_cours,
             COALESCE(pr.termines, 0)::int AS cours_termines,
             ct.id AS certificat_id
      FROM enrollments e
      JOIN formations f ON f.id = e.formation_id
      LEFT JOIN categories c ON c.id = f.categorie_id
      LEFT JOIN (SELECT formation_id, COUNT(*) AS total FROM courses GROUP BY formation_id) co
        ON co.formation_id = f.id
      LEFT JOIN (SELECT c2.formation_id, COUNT(*) AS termines
                 FROM progress p JOIN courses c2 ON c2.id = p.course_id
                 WHERE p.user_id = $1 AND p.completed
                 GROUP BY c2.formation_id) pr
        ON pr.formation_id = f.id
      LEFT JOIN certificates ct ON ct.formation_id = f.id AND ct.user_id = $1
      WHERE e.user_id = $1
      ORDER BY e.date_inscription DESC`, [req.user.id]);
    const formations = r.rows.map((f) => ({
      ...f,
      progression: f.total_cours ? Math.round((f.cours_termines / f.total_cours) * 100) : 0
    }));
    res.json({ formations });
  } catch (e) {
    console.error('me/formations:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Mes demandes d'inscription
router.get('/me/demandes', async (req, res) => {
  try {
    const r = await db.query(`
      SELECT er.id, er.statut, er.created_at, er.traitee_le,
             f.id AS formation_id, f.titre, c.nom AS categorie, c.icone
      FROM enrollment_requests er
      JOIN formations f ON f.id = er.formation_id
      LEFT JOIN categories c ON c.id = f.categorie_id
      WHERE er.user_id = $1
      ORDER BY er.created_at DESC`, [req.user.id]);
    res.json({ demandes: r.rows });
  } catch (e) {
    console.error('me/demandes:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Demander l'inscription à une formation
router.post('/formations/:id/demande', async (req, res) => {
  try {
    const formation = (await db.query(
      'SELECT id, titre FROM formations WHERE id=$1 AND is_published',
      [req.params.id])).rows[0];
    if (!formation) return res.status(404).json({ message: 'Formation introuvable.' });

    const dejaInscrit = (await db.query(
      'SELECT 1 FROM enrollments WHERE user_id=$1 AND formation_id=$2',
      [req.user.id, formation.id])).rows[0];
    if (dejaInscrit) return res.status(409).json({ message: 'Tu es déjà inscrit à cette formation.' });

    const enAttente = (await db.query(
      `SELECT 1 FROM enrollment_requests
       WHERE user_id=$1 AND formation_id=$2 AND statut='en_attente'`,
      [req.user.id, formation.id])).rows[0];
    if (enAttente) {
      return res.status(409).json({ message: 'Tu as déjà une demande en attente pour cette formation.' });
    }

    await db.query(
      'INSERT INTO enrollment_requests (user_id, formation_id) VALUES ($1,$2)',
      [req.user.id, formation.id]);

    await notifyAdmins(
      'demande',
      'Nouvelle demande d\'inscription',
      `${req.user.prenom} ${req.user.nom} demande l'accès à « ${formation.titre} ».`);

    res.status(201).json({ message: 'Demande envoyée. Statut : en attente de traitement.' });
  } catch (e) {
    console.error('demande:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Mes notifications
router.get('/me/notifications', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT id, type, titre, message, lu, created_at
       FROM notifications WHERE user_id=$1
       ORDER BY created_at DESC LIMIT 50`, [req.user.id]);
    const nonLues = (await db.query(
      'SELECT COUNT(*)::int AS n FROM notifications WHERE user_id=$1 AND NOT lu',
      [req.user.id])).rows[0].n;
    res.json({ notifications: r.rows, non_lues: nonLues });
  } catch (e) {
    console.error('me/notifications:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Marquer toutes les notifications comme lues
router.put('/me/notifications/tout-lu', async (req, res) => {
  try {
    await db.query('UPDATE notifications SET lu=true WHERE user_id=$1', [req.user.id]);
    res.json({ message: 'Notifications marquées comme lues.' });
  } catch (e) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Marquer une notification comme lue
router.put('/me/notifications/:id/lu', async (req, res) => {
  try {
    await db.query('UPDATE notifications SET lu=true WHERE id=$1 AND user_id=$2',
      [req.params.id, req.user.id]);
    res.json({ message: 'OK' });
  } catch (e) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Mes certificats
router.get('/me/certificats', async (req, res) => {
  try {
    const r = await db.query(`
      SELECT c.id, c.numero, c.code_verification, c.date_delivrance,
             f.titre AS formation, f.duree_heures, cat.nom AS categorie
      FROM certificates c
      JOIN formations f ON f.id = c.formation_id
      LEFT JOIN categories cat ON cat.id = f.categorie_id
      WHERE c.user_id = $1
      ORDER BY c.date_delivrance DESC`, [req.user.id]);
    res.json({ certificats: r.rows });
  } catch (e) {
    console.error('me/certificats:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
