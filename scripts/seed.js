// ==================================================================
//  TWEADUP — Seed de la base
//  Crée : catégories, compte admin, étudiant démo,
//  30 formations × 10 cours × quiz (10 q) + examen final (50 q).
//  Insertions groupées (UNNEST) → exécution en quelques secondes.
//  Usage : node scripts/seed.js          (ajoute ce qui manque)
//          node scripts/seed.js --force  (efface et recrée le catalogue)
// ==================================================================
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const { categories, formations } = require('./seedData');
const { insertFormationContent } = require('./formationInserter');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

function slugify(t) {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\+\+/g, 'plus-plus').replace(/#/g, 'sharp')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

async function upsertUser(client, { nom, prenom, email, telephone, pays, password, role }) {
  const roleId = (await client.query('SELECT id FROM roles WHERE nom=$1', [role])).rows[0].id;
  const hash = await bcrypt.hash(password, 10);
  const r = await client.query(
    `INSERT INTO users (role_id, nom, prenom, email, telephone, pays, password_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (email) DO NOTHING RETURNING id`,
    [roleId, nom, prenom, email, telephone, pays, hash]);
  const id = r.rows[0]
    ? r.rows[0].id
    : (await client.query('SELECT id FROM users WHERE email=$1', [email])).rows[0].id;
  await client.query('INSERT INTO profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [id]);
  return id;
}

async function seedFormation(client, catIdBySlug, f) {
  const slug = slugify(f.titre);
  const existing = await client.query('SELECT id FROM formations WHERE slug=$1', [slug]);
  if (existing.rows[0]) return { id: existing.rows[0].id, created: false };

  const formationId = (await client.query(
    `INSERT INTO formations (categorie_id, titre, slug, description, duree_heures, niveau, enseignant)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [catIdBySlug[f.cat], f.titre, slug, f.description, f.duree, f.niveau, f.enseignant])).rows[0].id;

  await insertFormationContent(client, formationId, f.titre, f.topics, f.videos || []);
  return { id: formationId, created: true };
}

async function main() {
  const force = process.argv.includes('--force');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    if (force) {
      console.log('⚠️  Mode --force : suppression du catalogue existant...');
      await client.query('TRUNCATE certificates, exam_attempts, progress, enrollments, enrollment_requests, exam_answers, exam_questions, final_exams, quiz_answers, quiz_questions, quizzes, courses, formations RESTART IDENTITY CASCADE');
    }

    // 1) Catégories
    const catIdBySlug = {};
    for (const c of categories) {
      catIdBySlug[c.slug] = (await client.query(
        `INSERT INTO categories (nom, slug, icone) VALUES ($1,$2,$3)
         ON CONFLICT (slug) DO UPDATE SET nom=EXCLUDED.nom, icone=EXCLUDED.icone
         RETURNING id`, [c.nom, c.slug, c.icone])).rows[0].id;
    }

    // 2) Comptes
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com';
    const adminPass = process.env.ADMIN_PASSWORD || 'Admin2005';
    await upsertUser(client, { nom: 'Admin', prenom: 'Tweadup', email: adminEmail, telephone: '', pays: '', password: adminPass, role: 'admin' });

    const demoId = await upsertUser(client, {
      nom: 'Étudiant', prenom: 'Démo', email: 'etudiant@tweadup.com',
      telephone: '+33 6 00 00 00 00', pays: 'France', password: 'Etudiant2024!', role: 'etudiant'
    });

    // 3) Les 30 formations
    let created = 0;
    for (const f of formations) {
      const { id, created: wasCreated } = await seedFormation(client, catIdBySlug, f);
      if (wasCreated) {
        created++;
        console.log(`   ✔ ${f.titre}`);
      }

      // Inscrire l'étudiant démo à la première formation (demande acceptée)
      if (f === formations[0] && id) {
        await client.query(
          'INSERT INTO enrollments (user_id, formation_id) VALUES ($1,$2) ON CONFLICT DO NOTHING',
          [demoId, id]);
        const reqExists = await client.query(
          'SELECT id FROM enrollment_requests WHERE user_id=$1 AND formation_id=$2', [demoId, id]);
        if (!reqExists.rows[0]) {
          await client.query(
            `INSERT INTO enrollment_requests (user_id, formation_id, statut, traitee_le)
             VALUES ($1,$2,'acceptee',NOW())`, [demoId, id]);
        }
      }
    }

    // Notification de bienvenue pour l'étudiant démo
    const notifExists = await client.query(
      'SELECT id FROM notifications WHERE user_id=$1 AND titre LIKE $2', [demoId, 'Bienvenue%']);
    if (!notifExists.rows[0]) {
      await client.query(
        `INSERT INTO notifications (user_id, type, titre, message)
         VALUES ($1,'info','Bienvenue sur Tweadup 🎉',
                 'Ton compte est prêt. Parcours le catalogue et demande ta première inscription.')`,
        [demoId]);
    }

    await client.query('COMMIT');
    const stats = await pool.query(`
      SELECT
        (SELECT COUNT(*) FROM formations)     AS formations,
        (SELECT COUNT(*) FROM courses)        AS cours,
        (SELECT COUNT(*) FROM quiz_questions) AS questions_quiz,
        (SELECT COUNT(*) FROM exam_questions) AS questions_examen`);
    console.log(`✅ Seed terminé : ${created} nouvelle(s) formation(s) créée(s).`);
    console.log('📊 Contenu total :', stats.rows[0]);
    console.log(`👤 Admin : ${adminEmail} / ${adminPass}`);
    console.log('👤 Étudiant démo : etudiant@tweadup.com / Etudiant2024!');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('❌ Erreur pendant le seed :', e.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) main();

module.exports = { main };
