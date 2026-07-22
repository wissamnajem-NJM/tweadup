// ==================================================================
//  TWEADUP — Fonctions utilitaires partagées
// ==================================================================
const crypto = require('crypto');
const db = require('../config/db');

// Envoie une notification à un utilisateur
async function notify(userId, type, titre, message) {
  await db.query(
    'INSERT INTO notifications (user_id, type, titre, message) VALUES ($1,$2,$3,$4)',
    [userId, type, titre, message]);
}

// Envoie une notification à tous les administrateurs
async function notifyAdmins(type, titre, message) {
  const admins = await db.query(
    "SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE r.nom = 'admin'");
  for (const a of admins.rows) {
    await notify(a.id, type, titre, message);
  }
}

// Numéro de certificat unique, ex : TWD-2026-8F3K2A
function genCertNumero() {
  return `TWD-${new Date().getFullYear()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

// Code de vérification unique (QR code), ex : 9f2c4a...
function genCodeVerification() {
  return crypto.randomBytes(16).toString('hex');
}

function slugify(t) {
  return t.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/\+\+/g, 'plus-plus').replace(/#/g, 'sharp')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

module.exports = { notify, notifyAdmins, genCertNumero, genCodeVerification, slugify };
