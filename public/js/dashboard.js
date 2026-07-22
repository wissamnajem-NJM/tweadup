// ==================================================================
//  TWEADUP — Tableau de bord étudiant (5 sections)
// ==================================================================

const user = requireRole('etudiant');
if (user) {
  document.getElementById('user-name').textContent = `${user.prenom} ${user.nom}`;
  document.getElementById('user-initials').textContent =
    `${(user.prenom || '?')[0]}${(user.nom || '')[0] || ''}`.toUpperCase();
}

const content = document.getElementById('content');
const titles = {
  formations: 'Mes formations',
  catalogue: 'Catalogue',
  certificats: 'Mes certificats',
  demandes: 'Mes demandes',
  notifications: 'Notifications'
};

// ------------------------ Navigation ------------------------
document.querySelectorAll('.side-link[data-section]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.side-link[data-section]').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('sidebar').classList.remove('open');
    loadSection(btn.dataset.section);
  });
});

function loadSection(section) {
  document.getElementById('page-title').textContent = titles[section];
  content.innerHTML = '<div class="spinner"></div>';
  ({ formations: loadMesFormations,
     catalogue: loadCatalogue,
     certificats: loadCertificats,
     demandes: loadDemandes,
     notifications: loadNotifications }[section])();
}

// ====================== 1. MES FORMATIONS ======================
async function loadMesFormations() {
  try {
    const { formations } = await api('/student/me/formations');
    if (!formations.length) {
      content.innerHTML = `
        <div class="card empty">
          <div class="big">📭</div>
          <h3>Aucune formation pour le moment</h3>
          <p>Parcours le catalogue et demande ton inscription à une formation.</p>
          <button class="btn btn-primary mt-3" onclick="goCatalogue()">Découvrir le catalogue</button>
        </div>`;
      return;
    }
    content.innerHTML = `<div class="grid grid-2">${formations.map((f) => `
      <div class="card formation-card">
        ${coverHTML(f)}
        <div class="body">
          <div class="between">
            <span class="badge badge-primary">${f.icone || '📚'} ${esc(f.categorie || '')}</span>
            ${f.termine ? '<span class="badge badge-success">✅ Terminée</span>' : ''}
          </div>
          <h3>${esc(f.titre)}</h3>
          <div class="between">
            <span class="muted" style="font-size:.85rem">${f.cours_termines}/${f.total_cours} cours terminés</span>
            <strong style="color:var(--primary)">${f.progression} %</strong>
          </div>
          <div class="progress"><span style="width:${f.progression}%"></span></div>
          <div class="flex mt-1" style="flex-wrap:wrap">
            <a class="btn btn-primary btn-sm" href="/formation.html?id=${f.id}">
              ${f.progression === 0 ? 'Commencer' : f.termine ? 'Revoir' : 'Continuer'} →
            </a>
            ${f.certificat_id ? `<a class="btn btn-outline btn-sm" href="/certificat.html?id=${f.certificat_id}">🎓 Certificat</a>` : ''}
          </div>
        </div>
      </div>`).join('')}</div>`;
  } catch (e) {
    content.innerHTML = `<div class="form-error">❌ ${esc(e.message)}</div>`;
  }
}

function goCatalogue() {
  document.querySelector('[data-section="catalogue"]').click();
}

// ======================== 2. CATALOGUE ========================
let catalogueData = [];
let categorieActive = '';

async function loadCatalogue() {
  content.innerHTML = `
    <div class="card card-pad mb-3">
      <div class="between">
        <input id="search" placeholder="🔍 Rechercher une formation…"
          style="flex:1;min-width:220px;padding:12px 16px;background:var(--bg-soft);border:2px solid transparent;border-radius:12px;color:var(--text);font-size:.95rem;outline:none">
      </div>
      <div class="flex mt-2" id="cat-chips" style="flex-wrap:wrap;gap:8px"></div>
    </div>
    <div id="catalogue-list"><div class="spinner"></div></div>`;

  document.getElementById('search').addEventListener('input', debounce(renderCatalogue, 250));

  try {
    const { categories } = await api('/public/categories');
    document.getElementById('cat-chips').innerHTML =
      `<button class="btn btn-sm btn-primary" data-cat="">Toutes</button>` +
      categories.map((c) => `<button class="btn btn-sm btn-ghost" data-cat="${c.slug}">${c.icone} ${esc(c.nom)}</button>`).join('');
    document.querySelectorAll('#cat-chips button').forEach((b) => {
      b.addEventListener('click', () => {
        document.querySelectorAll('#cat-chips button').forEach((x) => { x.className = 'btn btn-sm btn-ghost'; });
        b.className = 'btn btn-sm btn-primary';
        categorieActive = b.dataset.cat;
        renderCatalogue();
      });
    });
  } catch (e) { /* chips facultatives */ }

  await refreshCatalogue();
}

async function refreshCatalogue() {
  try {
    const { formations } = await api('/formations');
    catalogueData = formations;
    renderCatalogue();
  } catch (e) {
    document.getElementById('catalogue-list').innerHTML =
      `<div class="form-error">❌ ${esc(e.message)}</div>`;
  }
}

function renderCatalogue() {
  const q = (document.getElementById('search')?.value || '').toLowerCase();
  const list = catalogueData.filter((f) =>
    (!categorieActive || slugCat(f) === categorieActive) &&
    (!q || f.titre.toLowerCase().includes(q) || (f.description || '').toLowerCase().includes(q)));

  if (!list.length) {
    document.getElementById('catalogue-list').innerHTML =
      '<div class="card empty"><div class="big">🔍</div><p>Aucune formation ne correspond à ta recherche.</p></div>';
    return;
  }

  document.getElementById('catalogue-list').innerHTML =
    `<div class="grid grid-3">${list.map((f) => `
      <div class="card formation-card hoverable">
        ${coverHTML(f)}
        <div class="body">
          <div class="between">
            <span class="badge badge-primary">${f.icone || '📚'} ${esc(f.categorie || '')}</span>
            <span class="muted" style="font-size:.8rem">${f.nb_inscrits} inscrit${f.nb_inscrits > 1 ? 's' : ''}</span>
          </div>
          <h3>${esc(f.titre)}</h3>
          <p class="desc">${esc(f.description || '')}</p>
          <div class="formation-meta">
            <span>⏱ ${f.duree_heures} h</span><span>📈 ${esc(f.niveau)}</span><span>👨‍🏫 ${esc(f.enseignant || 'Équipe Tweadup')}</span>
          </div>
          ${actionButton(f)}
        </div>
      </div>`).join('')}</div>`;

  document.querySelectorAll('[data-demande]').forEach((btn) => {
    btn.addEventListener('click', () => demanderInscription(btn.dataset.demande, btn));
  });
}

function slugCat(f) {
  return f.categorie_slug || '';
}

function actionButton(f) {
  if (f.inscrit) {
    return `<a class="btn btn-success btn-sm mt-1" href="/formation.html?id=${f.id}">✅ Inscrit — Accéder</a>`;
  }
  if (f.ma_demande === 'en_attente') {
    return `<button class="btn btn-ghost btn-sm mt-1" disabled>⏳ En attente de traitement</button>`;
  }
  if (f.ma_demande === 'refusee') {
    return `<button class="btn btn-primary btn-sm mt-1" data-demande="${f.id}">↻ Redemander l'inscription</button>`;
  }
  return `<button class="btn btn-primary btn-sm mt-1" data-demande="${f.id}">Demander l'inscription</button>`;
}

async function demanderInscription(formationId, btn) {
  btn.disabled = true;
  btn.textContent = 'Envoi…';
  try {
    const r = await api(`/student/formations/${formationId}/demande`, { method: 'POST' });
    toast(r.message, 'success');
    await refreshCatalogue();
    refreshNotifCount();
  } catch (e) {
    toast(e.message, 'error');
    btn.disabled = false;
    btn.textContent = "Demander l'inscription";
  }
}

// ====================== 3. MES CERTIFICATS ======================
async function loadCertificats() {
  try {
    const { certificats } = await api('/student/me/certificats');
    if (!certificats.length) {
      content.innerHTML = `
        <div class="card empty">
          <div class="big">🎓</div>
          <h3>Aucun certificat pour l'instant</h3>
          <p>Termine une formation et réussis l'examen final (≥ 70 %) pour décrocher ton premier certificat.</p>
        </div>`;
      return;
    }
    content.innerHTML = `<div class="grid grid-2">${certificats.map((c) => `
      <div class="card card-pad">
        <div class="between mb-2">
          <span style="font-size:2rem">🎓</span>
          <span class="badge badge-success">Vérifiable</span>
        </div>
        <h3>${esc(c.formation)}</h3>
        <p class="muted mt-1" style="font-size:.88rem">
          N° <strong>${esc(c.numero)}</strong><br>
          Délivré le ${formatDate(c.date_delivrance)}<br>
          Catégorie : ${esc(c.categorie || '—')} • ${c.duree_heures} h de formation
        </p>
        <div class="flex mt-2" style="flex-wrap:wrap">
          <a class="btn btn-primary btn-sm" href="/certificat.html?id=${c.id}">👁 Visualiser</a>
          <a class="btn btn-outline btn-sm" href="/certificat.html?id=${c.id}&download=1">⬇ PDF</a>
          <a class="btn btn-ghost btn-sm" href="/verify.html?code=${c.code_verification}" target="_blank">🔍 Vérifier</a>
        </div>
      </div>`).join('')}</div>`;
  } catch (e) {
    content.innerHTML = `<div class="form-error">❌ ${esc(e.message)}</div>`;
  }
}

// ======================== 4. MES DEMANDES ========================
async function loadDemandes() {
  try {
    const { demandes } = await api('/student/me/demandes');
    if (!demandes.length) {
      content.innerHTML = `
        <div class="card empty">
          <div class="big">📨</div>
          <h3>Aucune demande</h3>
          <p>Tes demandes d'inscription apparaîtront ici avec leur statut.</p>
        </div>`;
      return;
    }
    const statutBadge = {
      en_attente: '<span class="badge badge-warning">⏳ En attente de traitement</span>',
      acceptee: '<span class="badge badge-success">✅ Acceptée</span>',
      refusee: '<span class="badge badge-danger">❌ Refusée</span>'
    };
    content.innerHTML = demandes.map((d) => `
      <div class="course-row">
        <div class="course-num">${d.icone || '📚'}</div>
        <div style="flex:1">
          <strong>${esc(d.titre)}</strong><br>
          <span class="muted" style="font-size:.85rem">
            Demandée le ${formatDateTime(d.created_at)}
            ${d.traitee_le ? ` • traitée le ${formatDateTime(d.traitee_le)}` : ''}
          </span>
        </div>
        ${statutBadge[d.statut] || ''}
        ${d.statut === 'acceptee' ? `<a class="btn btn-primary btn-sm" href="/formation.html?id=${d.formation_id}">Accéder →</a>` : ''}
      </div>`).join('');
  } catch (e) {
    content.innerHTML = `<div class="form-error">❌ ${esc(e.message)}</div>`;
  }
}

// ====================== 5. NOTIFICATIONS ======================
async function loadNotifications() {
  try {
    const { notifications } = await api('/student/me/notifications');
    if (!notifications.length) {
      content.innerHTML = '<div class="card empty"><div class="big">🔔</div><p>Aucune notification pour le moment.</p></div>';
      return;
    }
    const icons = { info: 'ℹ️', acceptee: '✅', refusee: '❌', certificat: '🎓', formation: '📚', demande: '📨' };
    content.innerHTML = `
      <div class="between mb-2">
        <p class="muted">${notifications.filter((n) => !n.lu).length} non lue(s)</p>
        <button class="btn btn-ghost btn-sm" onclick="toutLire()">Tout marquer comme lu</button>
      </div>` +
      notifications.map((n) => `
      <div class="course-row ${n.lu ? '' : ''}" style="${n.lu ? '' : 'border-left:4px solid var(--primary)'}">
        <div class="course-num">${icons[n.type] || 'ℹ️'}</div>
        <div style="flex:1">
          <strong>${esc(n.titre)}</strong>
          <p class="muted" style="font-size:.88rem;margin:4px 0">${esc(n.message || '')}</p>
          <span class="muted" style="font-size:.78rem">${formatDateTime(n.created_at)}</span>
        </div>
      </div>`).join('');
    refreshNotifCount();
  } catch (e) {
    content.innerHTML = `<div class="form-error">❌ ${esc(e.message)}</div>`;
  }
}

async function toutLire() {
  try {
    await api('/student/me/notifications/tout-lu', { method: 'PUT' });
    loadNotifications();
  } catch (e) { toast(e.message, 'error'); }
}

async function refreshNotifCount() {
  try {
    const { non_lues } = await api('/student/me/notifications');
    const badge = document.getElementById('notif-count');
    if (non_lues > 0) {
      badge.textContent = non_lues;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  } catch (e) { /* silencieux */ }
}

// ---------------------------- Utils ----------------------------
function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ---------------------------- Init ----------------------------
refreshNotifCount();
loadMesFormations();
