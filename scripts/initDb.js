// ==================================================================
//  TWEADUP — Création du schéma dans Neon PostgreSQL
//  Usage : node scripts/initDb.js
//  ATTENTION : recrée toutes les tables (efface les anciennes).
// ==================================================================
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

async function main() {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.includes('TON_MOT_DE_PASSE')) {
    console.error('❌ Configure d\'abord DATABASE_URL dans le fichier .env');
    process.exit(1);
  }
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  console.log('⏳ Création du schéma dans Neon...');
  await pool.query(sql);
  console.log('✅ Schéma créé avec succès (19 tables + index).');
  await pool.end();
}

main().catch((e) => {
  console.error('❌ Erreur :', e.message);
  process.exit(1);
});
