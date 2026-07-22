// ==================================================================
//  TWEADUP — Landing page : stats, catégories, formations, FAQ,
//  contact, animations au scroll
// ==================================================================

document.getElementById('year').textContent = new Date().getFullYear();

// Si déjà connecté → proposer d'aller au tableau de bord
(function () {
  const u = TweaAuth.user;
  if (u && TweaAuth.token) {
    const actions = document.querySelector('.nav-actions');
    actions.innerHTML = `
      <button class="icon-btn" onclick="toggleTheme()" aria-label="Thème"><span data-theme-icon>🌙</span></button>
      <a class="btn btn-primary btn-sm" href="${u.role === 'admin' ? '/admin.html' : '/dashboard.html'}">Mon espace →</a>`;
    const t = localStorage.getItem('tweadup_theme') || 'light';
    document.querySelectorAll('[data-theme-icon]').forEach((el) => { el.textContent = t === 'dark' ? '☀️' : '🌙'; });
  }
})();

// ----------------------- Statistiques -----------------------
fetch('/api/public/stats')
  .then((r) => r.json())
  .then((s) => {
    animateNum('st-etudiants', s.etudiants || 0);
    animateNum('st-formations', s.formations || 0);
    animateNum('st-cours', s.cours || 0);
    animateNum('st-certificats', s.certificats || 0);
  })
  .catch(() => {});

function animateNum(id, target) {
  const el = document.getElementById(id);
  const dur = 900;
  const start = performance.now();
  function step(now) {
    const p = Math.min(1, (now - start) / dur);
    el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3)));
    if (p < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ------------------------ Catégories ------------------------
fetch('/api/public/categories')
  .then((r) => r.json())
  .then(({ categories }) => {
    document.getElementById('categories-grid').innerHTML = categories.map((c) => `
      <div class="card categorie-card hoverable reveal visible">
        <div class="ico">${c.icone}</div>
        <div>
          <h3>${esc(c.nom)}</h3>
          <p>${c.nb_formations} formation${c.nb_formations > 1 ? 's' : ''}</p>
        </div>
      </div>`).join('');
  })
  .catch(() => {
    document.getElementById('categories-grid').innerHTML =
      '<p class="muted">Impossible de charger les catégories.</p>';
  });

// -------------------- Formations vedettes --------------------
fetch('/api/public/formations')
  .then((r) => r.json())
  .then(({ formations }) => {
    document.getElementById('formations-grid').innerHTML = formations.map((f) => `
      <div class="card formation-card hoverable reveal visible">
        ${coverHTML(f)}
        <div class="body">
          <span class="badge badge-primary" style="align-self:flex-start">${f.icone || '📚'} ${esc(f.categorie || 'Formation')}</span>
          <h3>${esc(f.titre)}</h3>
          <p class="desc">${esc(f.description || '')}</p>
          <div class="formation-meta">
            <span>⏱ ${f.duree_heures} h</span>
            <span>📈 ${esc(f.niveau)}</span>
            <span>👨‍🏫 ${esc(f.enseignant || 'Équipe Tweadup')}</span>
          </div>
          <a class="btn btn-outline btn-sm mt-1" href="/register.html">Demander l'inscription</a>
        </div>
      </div>`).join('');
  })
  .catch(() => {
    document.getElementById('formations-grid').innerHTML =
      '<p class="muted">Impossible de charger les formations.</p>';
  });

// --------------------------- FAQ ---------------------------
document.querySelectorAll('.faq-q').forEach((btn) => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const wasOpen = item.classList.contains('open');
    document.querySelectorAll('.faq-item.open').forEach((i) => i.classList.remove('open'));
    if (!wasOpen) item.classList.add('open');
  });
});

// ------------------------- Contact -------------------------
document.getElementById('contact-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msgBox = document.getElementById('contact-msg');
  const btn = e.target.querySelector('button');
  btn.disabled = true;
  btn.textContent = 'Envoi…';
  try {
    const r = await fetch('/api/public/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom: document.getElementById('c-nom').value,
        email: document.getElementById('c-email').value,
        sujet: document.getElementById('c-sujet').value,
        message: document.getElementById('c-message').value
      })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.message);
    msgBox.innerHTML = `<div class="form-success">✅ ${esc(data.message)}</div>`;
    e.target.reset();
  } catch (err) {
    msgBox.innerHTML = `<div class="form-error">❌ ${esc(err.message)}</div>`;
  } finally {
    btn.disabled = false;
    btn.textContent = 'Envoyer le message';
  }
});

// ------------------- Animations au scroll -------------------
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
