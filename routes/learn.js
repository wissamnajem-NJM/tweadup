// ==================================================================
//  TWEADUP — Moteur d'apprentissage
//  GET  /api/learn/courses/:id          → contenu du cours + quiz
//  POST /api/learn/courses/:id/quiz     → correction du quiz (serveur)
//  GET  /api/learn/formations/:id/exam  → examen final (50 q mélangées)
//  POST /api/learn/formations/:id/exam  → correction + certificat
//  GET  /api/learn/certificats/:id      → détail d'un certificat
//
//  SÉCURITÉ : les bonnes réponses ne sont JAMAIS envoyées au client.
//  La correction est faite côté serveur uniquement.
// ==================================================================
const express = require('express');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { shuffle } = require('../scripts/contentGen');
const { notify, genCertNumero, genCodeVerification } = require('../utils/helpers');

const router = express.Router();
router.use(authenticate);

// Vérifie que l'utilisateur est inscrit à la formation
async function checkEnrollment(userId, formationId) {
  const r = await db.query(
    'SELECT 1 FROM enrollments WHERE user_id=$1 AND formation_id=$2',
    [userId, formationId]);
  return !!r.rows[0];
}

// --------------------------- COURS ---------------------------
router.get('/courses/:id', async (req, res) => {
  try {
    const cRes = await db.query(
      `SELECT c.id, c.formation_id, c.numero, c.titre, c.contenu, c.video_url,
              c.pdf_url, c.duree_minutes, f.titre AS formation_titre
       FROM courses c JOIN formations f ON f.id = c.formation_id
       WHERE c.id = $1`, [req.params.id]);
    const course = cRes.rows[0];
    if (!course) return res.status(404).json({ message: 'Cours introuvable.' });

    if (!(await checkEnrollment(req.user.id, course.formation_id))) {
      return res.status(403).json({ message: 'Tu n\'es pas inscrit à cette formation.' });
    }

    // Verrouillage : le cours est ouvert si c'est le n°1 ou si le précédent est terminé
    if (course.numero > 1) {
      const prev = await db.query(
        `SELECT COALESCE(p.completed, false) AS completed
         FROM courses c
         LEFT JOIN progress p ON p.course_id = c.id AND p.user_id = $1
         WHERE c.formation_id = $2 AND c.numero = $3`,
        [req.user.id, course.formation_id, course.numero - 1]);
      if (!prev.rows[0] || !prev.rows[0].completed) {
        return res.status(403).json({
          verrouille: true,
          message: 'Ce cours est verrouillé. Termine d\'abord le cours précédent (quiz ≥ 70 %).'
        });
      }
    }

    // Quiz associé — SANS les indicateurs de bonne réponse
    const quiz = (await db.query(
      'SELECT id, score_min FROM quizzes WHERE course_id=$1', [course.id])).rows[0];
    let questions = [];
    if (quiz) {
      const qs = await db.query(
        'SELECT id, question FROM quiz_questions WHERE quiz_id=$1 ORDER BY id', [quiz.id]);
      for (const q of qs.rows) {
        const ans = await db.query(
          'SELECT id, texte FROM quiz_answers WHERE question_id=$1 ORDER BY id', [q.id]);
        questions.push({ id: q.id, question: q.question, answers: shuffle(ans.rows) });
      }
      questions = shuffle(questions);
    }

    // Progression actuelle sur ce cours
    const prog = (await db.query(
      'SELECT completed, quiz_score FROM progress WHERE user_id=$1 AND course_id=$2',
      [req.user.id, course.id])).rows[0];

    // Cours précédent / suivant (navigation)
    const nav = await db.query(
      `SELECT numero, id FROM courses WHERE formation_id=$1 AND numero IN ($2, $3)`,
      [course.formation_id, course.numero - 1, course.numero + 1]);
    const prevC = nav.rows.find((r) => r.numero === course.numero - 1);
    const nextC = nav.rows.find((r) => r.numero === course.numero + 1);

    res.json({
      course,
      quiz: quiz ? { id: quiz.id, score_min: quiz.score_min, questions } : null,
      progression: prog || null,
      navigation: { precedent: prevC || null, suivant: nextC || null }
    });
  } catch (e) {
    console.error('learn/course:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// --------------------- CORRECTION DU QUIZ ---------------------
router.post('/courses/:id/quiz', async (req, res) => {
  try {
    const reponses = (req.body || {}).answers || {};
    const cRes = await db.query(
      'SELECT id, formation_id, titre FROM courses WHERE id=$1', [req.params.id]);
    const course = cRes.rows[0];
    if (!course) return res.status(404).json({ message: 'Cours introuvable.' });

    if (!(await checkEnrollment(req.user.id, course.formation_id))) {
      return res.status(403).json({ message: 'Tu n\'es pas inscrit à cette formation.' });
    }

    const quiz = (await db.query(
      'SELECT id, score_min FROM quizzes WHERE course_id=$1', [course.id])).rows[0];
    if (!quiz) return res.status(404).json({ message: 'Quiz introuvable.' });

    // Récupération des bonnes réponses (côté serveur uniquement)
    const qs = await db.query(
      `SELECT qq.id AS question_id, qa.id AS bonne_reponse
       FROM quiz_questions qq
       JOIN quiz_answers qa ON qa.question_id = qq.id AND qa.is_correct
       WHERE qq.quiz_id = $1`, [quiz.id]);

    const total = qs.rows.length;
    let bonnes = 0;
    const corrections = {};
    for (const q of qs.rows) {
      const choisie = parseInt(reponses[q.question_id], 10);
      corrections[q.question_id] = q.bonne_reponse;
      if (choisie === q.bonne_reponse) bonnes++;
    }
    const score = total ? Math.round((bonnes / total) * 100) : 0;
    const reussi = score >= quiz.score_min;

    // Enregistrement de la progression (UPSERT)
    await db.query(
      `INSERT INTO progress (user_id, course_id, quiz_score, completed, completed_at)
       VALUES ($1, $2, $3, $4, CASE WHEN $4 THEN NOW() ELSE NULL END)
       ON CONFLICT (user_id, course_id) DO UPDATE SET
         quiz_score   = GREATEST(COALESCE(progress.quiz_score, 0), EXCLUDED.quiz_score),
         completed    = progress.completed OR EXCLUDED.completed,
         completed_at = CASE
                          WHEN progress.completed THEN progress.completed_at
                          WHEN EXCLUDED.completed THEN NOW()
                          ELSE progress.completed_at END`,
      [req.user.id, course.id, score, reussi]);

    res.json({ score, reussi, bonnes, total, score_min: quiz.score_min, corrections });
  } catch (e) {
    console.error('quiz submit:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ------------------------ EXAMEN FINAL ------------------------
router.get('/formations/:id/exam', async (req, res) => {
  try {
    const formationId = req.params.id;
    if (!(await checkEnrollment(req.user.id, formationId))) {
      return res.status(403).json({ message: 'Tu n\'es pas inscrit à cette formation.' });
    }

    // Tous les cours doivent être terminés
    const check = await db.query(
      `SELECT COUNT(*)::int AS total,
              COALESCE(SUM(CASE WHEN COALESCE(p.completed, false) THEN 1 ELSE 0 END), 0)::int AS termines
       FROM courses c
       LEFT JOIN progress p ON p.course_id = c.id AND p.user_id = $1
       WHERE c.formation_id = $2`, [req.user.id, formationId]);
    const { total, termines } = check.rows[0];
    if (!total || termines < total) {
      return res.status(403).json({
        message: `Examen verrouillé : termine les ${total} cours d'abord (${termines}/${total}).`
      });
    }

    const exam = (await db.query(
      'SELECT id, duree_minutes, score_min FROM final_exams WHERE formation_id=$1',
      [formationId])).rows[0];
    if (!exam) return res.status(404).json({ message: 'Examen introuvable.' });

    // Questions mélangées + réponses mélangées — SANS is_correct
    const qs = await db.query(
      'SELECT id, question FROM exam_questions WHERE exam_id=$1 ORDER BY id', [exam.id]);
    let questions = [];
    for (const q of qs.rows) {
      const ans = await db.query(
        'SELECT id, texte FROM exam_answers WHERE question_id=$1 ORDER BY id', [q.id]);
      questions.push({ id: q.id, question: q.question, answers: shuffle(ans.rows) });
    }
    questions = shuffle(questions);

    const formation = (await db.query(
      'SELECT titre FROM formations WHERE id=$1', [formationId])).rows[0];

    res.json({
      exam: { id: exam.id, duree_minutes: exam.duree_minutes, score_min: exam.score_min },
      formation_titre: formation ? formation.titre : '',
      questions
    });
  } catch (e) {
    console.error('exam get:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// --------------------- CORRECTION EXAMEN ---------------------
router.post('/formations/:id/exam', async (req, res) => {
  try {
    const formationId = req.params.id;
    const reponses = (req.body || {}).answers || {};
    if (!(await checkEnrollment(req.user.id, formationId))) {
      return res.status(403).json({ message: 'Tu n\'es pas inscrit à cette formation.' });
    }

    const exam = (await db.query(
      'SELECT id, score_min FROM final_exams WHERE formation_id=$1', [formationId])).rows[0];
    if (!exam) return res.status(404).json({ message: 'Examen introuvable.' });

    const qs = await db.query(
      `SELECT qq.id AS question_id, qa.id AS bonne_reponse
       FROM exam_questions qq
       JOIN exam_answers qa ON qa.question_id = qq.id AND qa.is_correct
       WHERE qq.exam_id = $1`, [exam.id]);

    const total = qs.rows.length;
    let bonnes = 0;
    for (const q of qs.rows) {
      if (parseInt(reponses[q.question_id], 10) === q.bonne_reponse) bonnes++;
    }
    const score = total ? Math.round((bonnes / total) * 100) : 0;
    const reussi = score >= exam.score_min;

    await db.query(
      'INSERT INTO exam_attempts (user_id, exam_id, score, reussi) VALUES ($1,$2,$3,$4)',
      [req.user.id, exam.id, score, reussi]);

    let certificat = null;
    if (reussi) {
      const formation = (await db.query(
        'SELECT titre FROM formations WHERE id=$1', [formationId])).rows[0];

      // Un seul certificat par utilisateur et par formation
      const existant = (await db.query(
        'SELECT id, numero, code_verification, date_delivrance FROM certificates WHERE user_id=$1 AND formation_id=$2',
        [req.user.id, formationId])).rows[0];

      if (existant) {
        certificat = existant;
      } else {
        // Génération avec retry en cas de collision (très improbable)
        let ins = null;
        for (let i = 0; i < 5 && !ins; i++) {
          try {
            ins = (await db.query(
              `INSERT INTO certificates (user_id, formation_id, numero, code_verification)
               VALUES ($1,$2,$3,$4)
               RETURNING id, numero, code_verification, date_delivrance`,
              [req.user.id, formationId, genCertNumero(), genCodeVerification()])).rows[0];
          } catch (err) {
            if (err.code !== '23505') throw err; // 23505 = violation d'unicité
          }
        }
        certificat = ins;
        await db.query(
          'UPDATE enrollments SET termine=true WHERE user_id=$1 AND formation_id=$2',
          [req.user.id, formationId]);
        await notify(
          req.user.id, 'certificat',
          'Certificat obtenu 🎓',
          `Félicitations ! Tu as réussi l'examen de « ${formation ? formation.titre : ''} » avec ${score} %. Ton certificat est disponible dans « Mes certificats ».`);
      }
    }

    res.json({ score, reussi, bonnes, total, score_min: exam.score_min, certificat });
  } catch (e) {
    console.error('exam submit:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

// ------------------------ CERTIFICAT ------------------------
router.get('/certificats/:id', async (req, res) => {
  try {
    const r = await db.query(
      `SELECT c.id, c.user_id, c.numero, c.code_verification, c.date_delivrance,
              u.prenom, u.nom, f.titre AS formation, f.duree_heures, cat.nom AS categorie
       FROM certificates c
       JOIN users u ON u.id = c.user_id
       JOIN formations f ON f.id = c.formation_id
       LEFT JOIN categories cat ON cat.id = f.categorie_id
       WHERE c.id = $1`, [req.params.id]);
    const cert = r.rows[0];
    if (!cert) return res.status(404).json({ message: 'Certificat introuvable.' });
    if (req.user.role !== 'admin' && cert.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé.' });
    }
    res.json({ certificat: cert });
  } catch (e) {
    console.error('certificat:', e);
    res.status(500).json({ message: 'Erreur serveur.' });
  }
});

module.exports = router;
