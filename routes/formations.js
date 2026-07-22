// ==================================================================
//  TWEADUP — Catalogue des formations (utilisateur connecté)
//  GET /api/formations        → liste + statut de l'utilisateur
//  GET /api/formations/:id    → détail + cours + verrouillage
// ==================================================================
const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
router.use(authenticate);

// Liste du catalogue avec le statut de l'utilisateur courant
router.get('/', async (req, res) => {
  try {
    const { categorie, q } = req.query;
    const params = [req.user.id];
    let where = 'WHERE f.is_published';
    if (categorie) {
      params.push(categorie);
      where += ` AND c.slug = $${params.length}`;
    }
    if (q) {
      params.push(`%${q}%`);
      where += ` AND (f.titre ILIKE $${params.length} OR f.description ILIKE $${params.length})`;
    }
    const r = await db.query(`
      SELECT f.id, f.titre, f.slug, f.description, f.image_url, f.duree_heures,
             f.niveau, f.enseignant, c.nom AS categorie, c.icone, c.slug AS categorie_slug,
             COALESCE(e.nb, 0)::int AS nb_inscrits,
             r.statut AS ma_demande,
             (e2.user_id IS NOT NULL) AS inscrit
      FROM formations f
      LEFT JOIN categories c ON c.id = f.categorie_id
      LEFT JOIN (SELECT formation_id, COUNT(*) AS nb FROM enrollments GROUP BY formation_id) e
        ON e.formation_id = f.id
      LEFT JOIN (
        SELECT er.formation_id, er.statut
        FROM enrollment_requests er
        JOIN (SELECT formation_id, MAX(created_at) AS mx
              FROM enrollment_requests WHERE user_id = $1 GROUP BY formation_id) m
          ON m.formation_id = er.formation_id AND m.mx = er.created_at
        WHERE er.user_id = $1
      ) r ON r.formation_id = f.id
      LEFT JOIN enrollments e2 ON e2.formation_id = f.id AND e2.user_id = $1
      ${where}
      ORDER BY f.id`, params);
    res.json({ formations: r.rows });
  } catch (e) {
    console.error('formations list:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Détail d'une formation + progression de l'utilisateur
router.get('/:id', async (req, res) => {
  try {
    const fRes = await db.query(
      `SELECT f.*, c.nom AS categorie, c.icone
       FROM formations f LEFT JOIN categories c ON c.id = f.categorie_id
       WHERE f.id = $1 AND f.is_published`, [req.params.id]);
    const formation = fRes.rows[0];
    if (!formation) return res.status(404).json({ message: 'Formation introuvable.' });

    const inscrit = !!(await db.query(
      'SELECT 1 FROM enrollments WHERE user_id=$1 AND formation_id=$2',
      [req.user.id, formation.id])).rows[0];

    const demande = (await db.query(
      `SELECT statut FROM enrollment_requests
       WHERE user_id=$1 AND formation_id=$2 ORDER BY created_at DESC LIMIT 1`,
      [req.user.id, formation.id])).rows[0];

    // Cours + progression de l'utilisateur
    const cRes = await db.query(
      `SELECT c.id, c.numero, c.titre, c.duree_minutes,
              COALESCE(p.completed, false) AS completed,
              p.quiz_score
       FROM courses c
       LEFT JOIN progress p ON p.course_id = c.id AND p.user_id = $1
       WHERE c.formation_id = $2
       ORDER BY c.numero`, [req.user.id, formation.id]);

    // Verrouillage : cours N ouvert si N=1 ou si le cours N-1 est terminé
    let previousCompleted = true;
    const cours = cRes.rows.map((c) => {
      const unlocked = c.numero === 1 || previousCompleted;
      previousCompleted = c.completed;
      return { ...c, unlocked: inscrit && unlocked };
    });

    const termines = cours.filter((c) => c.completed).length;
    const progression = cours.length ? Math.round((termines / cours.length) * 100) : 0;

    // Examen final
    const exam = (await db.query(
      'SELECT id, duree_minutes, score_min FROM final_exams WHERE formation_id=$1',
      [formation.id])).rows[0];
    const certificat = (await db.query(
      'SELECT id FROM certificates WHERE user_id=$1 AND formation_id=$2',
      [req.user.id, formation.id])).rows[0];

    res.json({
      formation,
      inscrit,
      ma_demande: demande ? demande.statut : null,
      cours: inscrit ? cours : cours.map((c) => ({ ...c, unlocked: false })),
      progression: inscrit ? progression : 0,
      examen: {
        disponible: inscrit && !!exam && termines === cours.length && cours.length > 0,
        duree_minutes: exam ? exam.duree_minutes : 60,
        score_min: exam ? exam.score_min : 70,
        deja_reussi: !!certificat,
        certificat_id: certificat ? certificat.id : null
      }
    });
  } catch (e) {
    console.error('formation detail:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
