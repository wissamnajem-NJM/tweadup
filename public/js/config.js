// ==================================================================
//  TWEADUP — Utilitaires JS partagés (API, auth, thème, toast)
// ==================================================================

const TweaAuth = {
  get token() { return localStorage.getItem('tweadup_token'); },
  get user() {
    try { return JSON.parse(localStorage.getItem('tweadup_user')); }
    catch (e) { return null; }
  },
  save(token, user) {
    localStorage.setItem('tweadup_token', token);
    localStorage.setItem('tweadup_user', JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem('tweadup_token');
    localStorage.removeItem('tweadup_user');
  }
};

// Appel API avec gestion du token et des erreurs
async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (TweaAuth.token) headers.Authorization = `Bearer ${TweaAuth.token}`;
  let res;
  try {
    res = await fetch(`/api${path}`, { ...options, headers });
  } catch (e) {
    throw new Error('Impossible de contacter le serveur. Vérifie ta connexion.');
  }
  let data = {};
  try { data = await res.json(); } catch (e) { /* réponse vide */ }
  if (res.status === 401) {
    TweaAuth.clear();
    window.location.href = '/login.html';
    throw new Error(data.message || 'Session expirée.');
  }
  if (!res.ok) throw new Error(data.message || `Erreur ${res.status}`);
  return data;
}

// Protège une page selon le rôle attendu
function requireRole(role) {
  const u = TweaAuth.user;
  if (!TweaAuth.token || !u) {
    window.location.href = '/login.html';
    return null;
  }
  if (role && u.role !== role) {
    window.location.href = u.role === 'admin' ? '/admin.html' : '/dashboard.html';
    return null;
  }
  return u;
}

function logout() {
  TweaAuth.clear();
  window.location.href = '/login.html';
}

// ------------------------- Thème clair / sombre -------------------------
function initTheme() {
  const saved = localStorage.getItem('tweadup_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
}
function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', current);
  localStorage.setItem('tweadup_theme', current);
  document.querySelectorAll('[data-theme-icon]').forEach((el) => { el.textContent = current === 'dark' ? '☀️' : '🌙'; });
}
initTheme();

// ------------------------------- Toast -------------------------------
function toast(message, type = 'info') {
  let box = document.getElementById('toast-box');
  if (!box) {
    box = document.createElement('div');
    box.id = 'toast-box';
    document.body.appendChild(box);
  }
  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  box.appendChild(el);
  setTimeout(() => el.classList.add('show'), 10);
  setTimeout(() => {
    el.classList.remove('show');
    setTimeout(() => el.remove(), 300);
  }, 4000);
}

// ----------------------------- Helpers -----------------------------
function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// URL YouTube → URL d'intégration (embed)
function youtubeEmbed(url) {
  if (!url) return null;
  const m = String(url).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}

// Couverture d'une formation (image ou dégradé avec icône)
function coverHTML(f, cls = 'card-cover') {
  if (f.image_url) {
    return `<div class="${cls}" style="background-image:url('${esc(f.image_url)}')"></div>`;
  }
  const gradients = [
    'linear-gradient(135deg,#6366f1,#8b5cf6)', 'linear-gradient(135deg,#0ea5e9,#22d3ee)',
    'linear-gradient(135deg,#f59e0b,#f97316)', 'linear-gradient(135deg,#10b981,#34d399)',
    'linear-gradient(135deg,#ec4899,#f43f5e)', 'linear-gradient(135deg,#8b5cf6,#d946ef)',
    'linear-gradient(135deg,#14b8a6,#06b6d4)', 'linear-gradient(135deg,#f43f5e,#fb7185)'
  ];
  const g = gradients[(f.id || 0) % gradients.length];
  const icone = f.icone || '📚';
  return `<div class="${cls} cover-gradient" style="background:${g}"><span>${icone}</span></div>`;
}
