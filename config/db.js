// ==================================================================
//  TWEADUP — Connexion PostgreSQL (Neon)
//  Le pool est mis en cache global pour être réutilisé entre les
//  invocations serverless sur Vercel.
// ==================================================================
const { Pool } = require('pg');

let pool;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5
    });
  }
  return pool;
}

module.exports = {
  query: (text, params) => getPool().query(text, params),
  getPool
};
