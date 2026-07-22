// ==================================================================
//  TWEADUP — Espace administrateur (toutes les routes exigent le
//  rôle admin)
// ==================================================================
const express = require('express');
const db = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { notify, slugify } = require('../utils/helpers');
const { defaultTopics } = require('../scripts/contentGen');
const { insertFormationContent } = require('../scripts/formationInserter');

const router = express.Router();
router.use(authenticate, requireAdmin);

// ------------------------- TABLEAU DE BORD -------------------------
router.get('/stats', async (req, res) => {
  try {
    const base = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM users u JOIN roles r ON r.id=u.role_id WHERE r.nom='etudiant') AS etudiants,
        (SELECT COUNT(*) FROM formations) AS formations,
        (SELECT COUNT(*) FROM enrollment_requests WHERE statut='en_attente') AS demandes_attente,
        (SELECT COUNT(*) FROM certificates) AS certificats,
        (SELECT COUNT(*) FROM enrollments) AS inscriptions`);

    const reussite = await db.query(`
      SELECT COUNT(*)::int AS total,
             COALESCE(SUM(CASE WHEN reussi THEN 1 ELSE 0 END), 0)::int AS reussis
      FROM exam_attempts`);
    const t = reussite.rows[0];
    const taux_reussite = t.total ? Math.round((t.reussis / t.total) * 100) : 0;

    const prog = await db.query(`
      SELECT
        (SELECT COUNT(*) FROM progress WHERE completed) AS fait,
        (SELECT COUNT(*) FROM enrollments) AS total`);
    const pg = prog.rows[0];
    const progression_globale = +pg.total ? Math.round((pg.fait / (pg.total * 10)) * 100) : 0;

    const top = await db.query(`
      SELECT f.titre, COUNT(e.id)::int AS inscrits
      FROM formations f LEFT JOIN enrollments e ON e.formation_id = f.id
      GROUP BY f.id ORDER BY inscrits DESC, f.titre LIMIT 5`);

    const parCategorie = await db.query(`
      SELECT c.nom, COUNT(f.id)::int AS formations
      FROM categories c LEFT JOIN formations f ON f.categorie_id = c.id
      GROUP BY c.id ORDER BY c.id`);

    // Inscrits des 6 derniers mois (agrégation en JS : compatible partout
    // et inclut les mois sans inscription)
    const usersDates = await db.query('SELECT created_at FROM users');
    const parMois = {};
    for (const r of usersDates.rows) {
      const d = new Date(r.created_at);
      const key = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      parMois[key] = (parMois[key] || 0) + 1;
    }
    const maintenant = new Date();
    const inscrits_par_mois = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - i, 1);
      const key = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      inscrits_par_mois.push({ mois: key, nb: parMois[key] || 0 });
    }

    res.json({
      ...base.rows[0],
      taux_reussite,
      progression_globale,
      top_formations: top.rows,
      par_categorie: parCategorie.rows,
      inscrits_par_mois
    });
  } catch (e) {
    console.error('admin/stats:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ---------------------------- ÉTUDIANTS ----------------------------
router.get('/etudiants', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const params = [];
    let where = "WHERE r.nom = 'etudiant'";
    if (q) {
      params.push(`%${q}%`);
      where += ` AND (u.nom ILIKE $1 OR u.prenom ILIKE $1 OR u.email ILIKE $1)`;
    }
    const r = await db.query(`
      SELECT u.id, u.nom, u.prenom, u.email, u.telephone, u.pays,
             u.created_at, u.last_login, p.photo_url,
             COALESCE(en.nb, 0)::int AS nb_formations,
             COALESCE(ce.nb, 0)::int AS nb_certificats
      FROM users u
      JOIN roles r ON r.id = u.role_id
      LEFT JOIN profiles p ON p.user_id = u.id
      LEFT JOIN (SELECT user_id, COUNT(*) AS nb FROM enrollments GROUP BY user_id) en
        ON en.user_id = u.id
      LEFT JOIN (SELECT user_id, COUNT(*) AS nb FROM certificates GROUP BY user_id) ce
        ON ce.user_id = u.id
      ${where}
      ORDER BY u.created_at DESC`, params);
    res.json({ etudiants: r.rows });
  } catch (e) {
    console.error('admin/etudiants:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Profil complet d'un étudiant + progression détaillée
router.get('/etudiants/:id', async (req, res) => {
  try {
    const u = (await db.query(
      `SELECT u.id, u.nom, u.prenom, u.email, u.telephone, u.pays,
              u.created_at, u.last_login
       FROM users u WHERE u.id=$1`, [req.params.id])).rows[0];
    if (!u) return res.status(404).json({ message: 'Étudiant introuvable.' });

    const formations = await db.query(`
      SELECT f.titre, e.date_inscription, e.termine,
             COALESCE(co.total, 0)::int AS total_cours,
             COALESCE(pr.termines, 0)::int AS cours_termines,
             act.derniere AS derniere_activite
      FROM enrollments e
      JOIN formations f ON f.id = e.formation_id
      LEFT JOIN (SELECT formation_id, COUNT(*) AS total FROM courses GROUP BY formation_id) co
        ON co.formation_id = f.id
      LEFT JOIN (SELECT c2.formation_id, COUNT(*) AS termines
                 FROM progress p JOIN courses c2 ON c2.id = p.course_id
                 WHERE p.user_id = $1 AND p.completed
                 GROUP BY c2.formation_id) pr
        ON pr.formation_id = f.id
      LEFT JOIN (SELECT c3.formation_id, MAX(p2.completed_at) AS derniere
                 FROM progress p2 JOIN courses c3 ON c3.id = p2.course_id
                 WHERE p2.user_id = $1
                 GROUP BY c3.formation_id) act
        ON act.formation_id = f.id
      WHERE e.user_id = $1`, [req.params.id]);

    const quiz = await db.query(
      `SELECT COUNT(*)::int AS reussis, COALESCE(AVG(quiz_score),0)::int AS score_moyen
       FROM progress WHERE user_id=$1 AND completed`, [req.params.id]);

    const examens = await db.query(
      `SELECT ea.score, ea.reussi, ea.created_at, f.titre AS formation
       FROM exam_attempts ea
       JOIN final_exams ex ON ex.id = ea.exam_id
       JOIN formations f ON f.id = ex.formation_id
       WHERE ea.user_id=$1 ORDER BY ea.created_at DESC`, [req.params.id]);

    const certificats = await db.query(
      `SELECT c.id, c.numero, c.date_delivrance, f.titre AS formation
       FROM certificates c JOIN formations f ON f.id=c.formation_id
       WHERE c.user_id=$1`, [req.params.id]);

    const demandes = await db.query(
      `SELECT er.statut, er.created_at, f.titre AS formation
       FROM enrollment_requests er JOIN formations f ON f.id=er.formation_id
       WHERE er.user_id=$1 ORDER BY er.created_at DESC`, [req.params.id]);

    res.json({
      etudiant: u,
      formations: formations.rows.map((f) => ({
        ...f,
        progression: f.total_cours ? Math.round((f.cours_termines / f.total_cours) * 100) : 0
      })),
      quiz: quiz.rows[0],
      examens: examens.rows,
      certificats: certificats.rows,
      demandes: demandes.rows
    });
  } catch (e) {
    console.error('admin/etudiant detail:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Modifier un étudiant
router.put('/etudiants/:id', async (req, res) => {
  try {
    const { nom, prenom, email, telephone, pays } = req.body || {};
    if (!nom || !prenom || !email) {
      return res.status(400).json({ message: 'Nom, prénom et email sont obligatoires.' });
    }
    const doublon = await db.query(
      'SELECT id FROM users WHERE email=$1 AND id<>$2', [email.toLowerCase(), req.params.id]);
    if (doublon.rows[0]) return res.status(409).json({ message: 'Cet email est déjà utilisé.' });

    await db.query(
      'UPDATE users SET nom=$1, prenom=$2, email=$3, telephone=$4, pays=$5 WHERE id=$6',
      [nom.trim(), prenom.trim(), email.trim().toLowerCase(), telephone || '', pays || '', req.params.id]);
    res.json({ message: 'Étudiant mis à jour.' });
  } catch (e) {
    console.error('admin/etudiant update:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Supprimer un étudiant (cascade sur ses données)
router.delete('/etudiants/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id=$1', [req.params.id]);
    res.json({ message: 'Étudiant supprimé.' });
  } catch (e) {
    console.error('admin/etudiant delete:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ---------------------- DEMANDES D'INSCRIPTION ----------------------
router.get('/demandes', async (req, res) => {
  try {
    const statut = req.query.statut || '';
    const params = [];
    let where = '';
    if (statut) {
      params.push(statut);
      where = 'WHERE er.statut = $1';
    }
    const r = await db.query(`
      SELECT er.id, er.statut, er.created_at, er.traitee_le,
             u.id AS user_id, u.prenom, u.nom, u.email,
             f.id AS formation_id, f.titre AS formation
      FROM enrollment_requests er
      JOIN users u ON u.id = er.user_id
      JOIN formations f ON f.id = er.formation_id
      ${where}
      ORDER BY CASE WHEN er.statut='en_attente' THEN 0 ELSE 1 END, er.created_at DESC`, params);
    res.json({ demandes: r.rows });
  } catch (e) {
    console.error('admin/demandes:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Accepter ou refuser une demande
router.put('/demandes/:id', async (req, res) => {
  const client = await db.getPool().connect();
  try {
    const decision = (req.body || {}).decision;
    if (!['acceptee', 'refusee'].includes(decision)) {
      return res.status(400).json({ message: 'Décision invalide (acceptee ou refusee).' });
    }
    await client.query('BEGIN');

    const demande = (await client.query(
      `SELECT er.*, f.titre AS formation_titre, u.prenom, u.nom
       FROM enrollment_requests er
       JOIN formations f ON f.id = er.formation_id
       JOIN users u ON u.id = er.user_id
       WHERE er.id = $1`, [req.params.id])).rows[0];
    if (!demande) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: 'Demande introuvable.' });
    }

    await client.query(
      'UPDATE enrollment_requests SET statut=$1, traitee_le=NOW() WHERE id=$2',
      [decision, demande.id]);

    if (decision === 'acceptee') {
      await client.query(
        'INSERT INTO enrollments (user_id, formation_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
        [demande.user_id, demande.formation_id]);
    }

    await client.query(
      'INSERT INTO notifications (user_id, type, titre, message) VALUES ($1,$2,$3,$4)',
      [demande.user_id,
       decision === 'acceptee' ? 'acceptee' : 'refusee',
       decision === 'acceptee' ? 'Inscription acceptée ✅' : 'Inscription refusée ❌',
       decision === 'acceptee'
         ? `Ta demande pour « ${demande.formation_titre} » a été acceptée. La formation est maintenant accessible dans « Mes formations ».`
         : `Ta demande pour « ${demande.formation_titre} » a été refusée. Contacte l'administrateur pour plus d'informations.`]);

    await client.query('COMMIT');
    res.json({ message: decision === 'acceptee' ? 'Demande acceptée.' : 'Demande refusée.' });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('admin/demande decision:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  } finally {
    client.release();
  }
});

// --------------------------- CERTIFICATS ---------------------------
router.get('/certificats', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const params = [];
    let where = '';
    if (q) {
      params.push(`%${q}%`);
      where = `WHERE u.nom ILIKE $1 OR u.prenom ILIKE $1 OR f.titre ILIKE $1 OR c.numero ILIKE $1`;
    }
    const r = await db.query(`
      SELECT c.id, c.numero, c.date_delivrance,
             u.prenom, u.nom, u.email, f.titre AS formation
      FROM certificates c
      JOIN users u ON u.id = c.user_id
      JOIN formations f ON f.id = c.formation_id
      ${where}
      ORDER BY c.date_delivrance DESC`, params);
    res.json({ certificats: r.rows });
  } catch (e) {
    console.error('admin/certificats:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.delete('/certificats/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM certificates WHERE id=$1', [req.params.id]);
    res.json({ message: 'Certificat supprimé.' });
  } catch (e) {
    console.error('admin/certificat delete:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// --------------------- GESTION DES FORMATIONS ---------------------
router.get('/formations', async (req, res) => {
  try {
    const r = await db.query(`
      SELECT f.*, c.nom AS categorie,
             COALESCE(co.nb, 0)::int AS nb_cours,
             COALESCE(en.nb, 0)::int AS nb_inscrits
      FROM formations f
      LEFT JOIN categories c ON c.id = f.categorie_id
      LEFT JOIN (SELECT formation_id, COUNT(*) AS nb FROM courses GROUP BY formation_id) co
        ON co.formation_id = f.id
      LEFT JOIN (SELECT formation_id, COUNT(*) AS nb FROM enrollments GROUP BY formation_id) en
        ON en.formation_id = f.id
      ORDER BY f.id`);
    res.json({ formations: r.rows });
  } catch (e) {
    console.error('admin/formations:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Créer une formation : 10 cours + quiz + examen générés automatiquement
router.post('/formations', async (req, res) => {
  const client = await db.getPool().connect();
  try {
    const { titre, categorie_id, description, duree_heures, niveau, enseignant, image_url } = req.body || {};
    if (!titre || !titre.trim()) {
      return res.status(400).json({ message: 'Le titre de la formation est obligatoire.' });
    }
    let slug = slugify(titre);
    const clash = await client.query('SELECT id FROM formations WHERE slug=$1', [slug]);
    if (clash.rows[0]) slug = `${slug}-${Date.now().toString(36)}`;

    await client.query('BEGIN');
    const formationId = (await client.query(
      `INSERT INTO formations (categorie_id, titre, slug, description, image_url, duree_heures, niveau, enseignant)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
      [categorie_id || null, titre.trim(), slug, description || '', image_url || null,
       parseInt(duree_heures, 10) || 20, niveau || 'Débutant', enseignant || 'Équipe Tweadup'])).rows[0].id;

    // 10 cours + 10 quiz + examen de 50 questions, générés en requêtes groupées
    await insertFormationContent(client, formationId, titre.trim(), defaultTopics(titre.trim()), []);

    // Notification à tous les étudiants
    await client.query(
      `INSERT INTO notifications (user_id, type, titre, message)
       SELECT u.id, 'formation', 'Nouvelle formation disponible 📚',
              $2 FROM users u JOIN roles r ON r.id=u.role_id WHERE r.nom='etudiant'`,
      [formationId, `« ${titre.trim()} » vient d'être ajoutée au catalogue. Demande ton inscription dès maintenant !`]);

    await client.query('COMMIT');
    res.status(201).json({ message: 'Formation créée avec 10 cours, 10 quiz et un examen final.', id: formationId });
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('admin/formation create:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  } finally {
    client.release();
  }
});

// Modifier une formation
router.put('/formations/:id', async (req, res) => {
  try {
    const { titre, categorie_id, description, duree_heures, niveau, enseignant, image_url, is_published } = req.body || {};
    await db.query(
      `UPDATE formations SET
         titre        = COALESCE($1, titre),
         categorie_id = COALESCE($2, categorie_id),
         description  = COALESCE($3, description),
         duree_heures = COALESCE($4, duree_heures),
         niveau       = COALESCE($5, niveau),
         enseignant   = COALESCE($6, enseignant),
         image_url    = COALESCE($7, image_url),
         is_published = COALESCE($8, is_published)
       WHERE id=$9`,
      [titre || null, categorie_id || null, description ?? null,
       duree_heures ? parseInt(duree_heures, 10) : null, niveau || null, enseignant || null,
       image_url ?? null, typeof is_published === 'boolean' ? is_published : null, req.params.id]);
    res.json({ message: 'Formation mise à jour.' });
  } catch (e) {
    console.error('admin/formation update:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Supprimer une formation (cascade : cours, quiz, examens, inscriptions…)
router.delete('/formations/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM formations WHERE id=$1', [req.params.id]);
    res.json({ message: 'Formation supprimée.' });
  } catch (e) {
    console.error('admin/formation delete:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Cours d'une formation (pour l'édition)
router.get('/formations/:id/courses', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT id, numero, titre, contenu, video_url, pdf_url, duree_minutes
       FROM courses WHERE formation_id=$1 ORDER BY numero`, [req.params.id]);
    res.json({ courses: r.rows });
  } catch (e) {
    console.error('admin/courses:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// Modifier un cours (texte, PDF, vidéo YouTube)
router.put('/courses/:id', async (req, res) => {
  try {
    const { titre, contenu, video_url, pdf_url, duree_minutes } = req.body || {};
    await db.query(
      `UPDATE courses SET
         titre         = COALESCE($1, titre),
         contenu       = COALESCE($2, contenu),
         video_url     = COALESCE($3, video_url),
         pdf_url       = COALESCE($4, pdf_url),
         duree_minutes = COALESCE($5, duree_minutes)
       WHERE id=$6`,
      [titre || null, contenu ?? null, video_url ?? null, pdf_url ?? null,
       duree_minutes ? parseInt(duree_minutes, 10) : null, req.params.id]);
    res.json({ message: 'Cours mis à jour.' });
  } catch (e) {
    console.error('admin/course update:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ------------------- PROGRESSION DES ÉTUDIANTS -------------------
router.get('/progression', async (req, res) => {
  try {
    const r = await db.query(`
      SELECT u.id AS user_id, u.prenom, u.nom, u.email, u.last_login,
             f.titre AS formation,
             COALESCE(co.total, 0)::int AS total_cours,
             COALESCE(pr.termines, 0)::int AS cours_termines,
             act.derniere AS derniere_activite,
             CASE WHEN ct.id IS NULL THEN 0 ELSE 1 END AS certificat
      FROM enrollments e
      JOIN users u ON u.id = e.user_id
      JOIN formations f ON f.id = e.formation_id
      LEFT JOIN (SELECT formation_id, COUNT(*) AS total FROM courses GROUP BY formation_id) co
        ON co.formation_id = f.id
      LEFT JOIN (SELECT c2.formation_id, p2.user_id, COUNT(*) AS termines
                 FROM progress p2 JOIN courses c2 ON c2.id = p2.course_id
                 WHERE p2.completed
                 GROUP BY c2.formation_id, p2.user_id) pr
        ON pr.formation_id = f.id AND pr.user_id = u.id
      LEFT JOIN (SELECT c3.formation_id, p3.user_id, MAX(p3.completed_at) AS derniere
                 FROM progress p3 JOIN courses c3 ON c3.id = p3.course_id
                 GROUP BY c3.formation_id, p3.user_id) act
        ON act.formation_id = f.id AND act.user_id = u.id
      LEFT JOIN certificates ct ON ct.formation_id = f.id AND ct.user_id = u.id
      ORDER BY u.nom, f.titre`);
    res.json({
      progression: r.rows.map((row) => ({
        ...row,
        progression: row.total_cours ? Math.round((row.cours_termines / row.total_cours) * 100) : 0
      }))
    });
  } catch (e) {
    console.error('admin/progression:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ------------------------ MESSAGES DE CONTACT ------------------------
router.get('/messages', async (req, res) => {
  try {
    const r = await db.query(
      'SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 100');
    res.json({ messages: r.rows });
  } catch (e) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

router.put('/messages/:id/lu', async (req, res) => {
  try {
    await db.query('UPDATE contact_messages SET lu=true WHERE id=$1', [req.params.id]);
    res.json({ message: 'OK' });
  } catch (e) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
