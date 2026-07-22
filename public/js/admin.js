// ==================================================================
//  TWEADUP — Tableau de bord administrateur (6 sections)
// ==================================================================

const user = requireRole('admin');
if (user) {
  document.getElementById('user-name').textContent = `${user.prenom} ${user.nom}`;
}

const content = document.getElementById('content');
const modalRoot = document.getElementById('modal-root');
const titles = {
  dashboard: 'Tableau de bord',
  etudiants: 'Gestion des étudiants',
  demandes: "Demandes d'inscription",
  certificats: 'Certificats délivrés',
  formations: 'Gestion des formations',
  progression: 'Progression des étudiants'
};
let charts = [];

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
  charts.forEach((c) => c.destroy());
  charts = [];
  content.innerHTML = '<div class="spinner"></div>';
  ({ dashboard: loadDashboard,
     etudiants: loadEtudiants,
     demandes: loadDemandes,
     certificats: loadCertificats,
     formations: loadFormations,
     progression: loadProgression }[section])();
}

// ==================== 1. TABLEAU DE BORD ====================
async function loadDashboard() {
  try {
    const s = await api('/admin/stats');
    content.innerHTML = `
      <div class="grid grid-4 mb-3">
        <div class="card stat-mini"><div class="ico">👨‍🎓</div><div><div class="num">${s.etudiants}</div><div class="lbl">Étudiants</div></div></div>
        <div class="card stat-mini"><div class="ico">📚</div><div><div class="num">${s.formations}</div><div class="lbl">Formations</div></div></div>
        <div class="card stat-mini"><div class="ico">⏳</div><div><div class="num">${s.demandes_attente}</div><div class="lbl">Demandes en attente</div></div></div>
        <div class="card stat-mini"><div class="ico">🎓</div><div><div class="num">${s.certificats}</div><div class="lbl">Certificats délivrés</div></div></div>
      </div>
      <div class="grid grid-4 mb-3">
        <div class="card stat-mini"><div class="ico">📝</div><div><div class="num">${s.inscriptions}</div><div class="lbl">Inscriptions aux formations</div></div></div>
        <div class="card stat-mini"><div class="ico">✅</div><div><div class="num">${s.taux_reussite} %</div><div class="lbl">Taux de réussite aux examens</div></div></div>
        <div class="card stat-mini"><div class="ico">📈</div><div><div class="num">${s.progression_globale} %</div><div class="lbl">Progression globale</div></div></div>
        <div class="card stat-mini"><div class="ico">🏆</div><div><div class="num">${s.top_formations[0] ? s.top_formations[0].inscrits : 0}</div><div class="lbl">Record d'inscrits (top formation)</div></div></div>
      </div>
      <div class="grid grid-2 mb-3">
        <div class="card card-pad">
          <h3 class="mb-2">Nouveaux inscrits par mois</h3>
          <canvas id="chart-mois"></canvas>
        </div>
        <div class="card card-pad">
          <h3 class="mb-2">Formations par catégorie</h3>
          <canvas id="chart-cat"></canvas>
        </div>
      </div>
      <div class="card card-pad">
        <h3 class="mb-2">🏆 Formations les plus suivies</h3>
        ${s.top_formations.map((f, i) => `
          <div class="between" style="padding:10px 0;border-bottom:1px solid var(--card-border)">
            <span>${['🥇','🥈','🥉','4.','5.'][i]} ${esc(f.titre)}</span>
            <span class="badge badge-primary">${f.inscrits} inscrit${f.inscrits > 1 ? 's' : ''}</span>
          </div>`).join('')}
      </div>`;

    const cssColor = getComputedStyle(document.documentElement).getPropertyValue('--text-soft').trim();
    charts.push(new Chart(document.getElementById('chart-mois'), {
      type: 'bar',
      data: {
        labels: s.inscrits_par_mois.map((m) => m.mois),
        datasets: [{ label: 'Inscrits', data: s.inscrits_par_mois.map((m) => m.nb),
                     backgroundColor: '#6366f1', borderRadius: 8 }]
      },
      options: { plugins: { legend: { display: false } },
                 scales: { y: { beginAtZero: true, ticks: { precision: 0, color: cssColor } },
                           x: { ticks: { color: cssColor } } } }
    }));
    charts.push(new Chart(document.getElementById('chart-cat'), {
      type: 'doughnut',
      data: {
        labels: s.par_categorie.map((c) => c.nom),
        datasets: [{ data: s.par_categorie.map((c) => c.formations),
                     backgroundColor: ['#6366f1','#8b5cf6','#0ea5e9','#10b981','#f59e0b','#ec4899','#14b8a6','#f43f5e'] }]
      },
      options: { plugins: { legend: { position: 'bottom', labels: { color: cssColor } } } }
    }));
  } catch (e) {
    content.innerHTML = `<div class="form-error">❌ ${esc(e.message)}</div>`;
  }
}

// ======================= 2. ÉTUDIANTS =======================
async function loadEtudiants() {
  content.innerHTML = `
    <div class="card card-pad mb-3">
      <input id="search-etud" placeholder="🔍 Rechercher par nom ou email…"
        style="width:100%;padding:12px 16px;background:var(--bg-soft);border:2px solid transparent;border-radius:12px;color:var(--text);outline:none">
    </div>
    <div id="etudiants-list"><div class="spinner"></div></div>`;
  document.getElementById('search-etud').addEventListener('input', debounce(refreshEtudiants, 300));
  await refreshEtudiants();
}

async function refreshEtudiants() {
  const q = document.getElementById('search-etud')?.value || '';
  try {
    const { etudiants } = await api(`/admin/etudiants${q ? `?q=${encodeURIComponent(q)}` : ''}`);
    document.getElementById('etudiants-list').innerHTML = !etudiants.length
      ? '<div class="card empty"><div class="big">👨‍🎓</div><p>Aucun étudiant trouvé.</p></div>'
      : `<div class="table-wrap"><table>
          <thead><tr><th>Étudiant</th><th>Contact</th><th>Inscrit le</th><th>Dernière connexion</th><th>Formations</th><th>Certificats</th><th>Actions</th></tr></thead>
          <tbody>${etudiants.map((u) => `
            <tr>
              <td>
                <div class="flex">
                  <div class="avatar" style="width:38px;height:38px;font-size:.8rem">${(u.prenom[0] + u.nom[0]).toUpperCase()}</div>
                  <div><strong>${esc(u.prenom)} ${esc(u.nom)}</strong><br><span class="muted" style="font-size:.8rem">${esc(u.pays || '')}</span></div>
                </div>
              </td>
              <td><span style="font-size:.85rem">${esc(u.email)}<br><span class="muted">${esc(u.telephone || '—')}</span></span></td>
              <td style="font-size:.85rem">${formatDate(u.created_at)}</td>
              <td style="font-size:.85rem">${u.last_login ? formatDateTime(u.last_login) : '<span class="muted">Jamais</span>'}</td>
              <td><span class="badge badge-primary">${u.nb_formations}</span></td>
              <td><span class="badge badge-success">${u.nb_certificats}</span></td>
              <td>
                <div class="flex" style="gap:6px">
                  <button class="btn btn-ghost btn-sm" onclick="voirEtudiant(${u.id})">👁</button>
                  <button class="btn btn-outline btn-sm" onclick='editEtudiant(${JSON.stringify(u)})'>✏️</button>
                  <button class="btn btn-danger btn-sm" onclick="deleteEtudiant(${u.id}, '${esc(u.prenom)} ${esc(u.nom)}')">🗑</button>
                </div>
              </td>
            </tr>`).join('')}</tbody></table></div>`;
  } catch (e) {
    document.getElementById('etudiants-list').innerHTML = `<div class="form-error">❌ ${esc(e.message)}</div>`;
  }
}

async function voirEtudiant(id) {
  openModal('Profil étudiant', '<div class="spinner"></div>');
  try {
    const d = await api(`/admin/etudiants/${id}`);
    const u = d.etudiant;
    document.getElementById('modal-title').textContent = `👨‍🎓 ${u.prenom} ${u.nom}`;
    document.getElementById('modal-body').innerHTML = `
      <div class="grid grid-2 mb-3">
        <div><span class="muted">Email</span><br><strong>${esc(u.email)}</strong></div>
        <div><span class="muted">Téléphone</span><br><strong>${esc(u.telephone || '—')}</strong></div>
        <div><span class="muted">Pays</span><br><strong>${esc(u.pays || '—')}</strong></div>
        <div><span class="muted">Dernière connexion</span><br><strong>${u.last_login ? formatDateTime(u.last_login) : 'Jamais'}</strong></div>
      </div>
      <h4 class="mb-1">📚 Formations suivies (${d.formations.length})</h4>
      ${d.formations.length ? d.formations.map((f) => `
        <div class="mb-1">
          <div class="between"><span style="font-size:.9rem">${esc(f.titre)}</span><strong style="font-size:.85rem;color:var(--primary)">${f.progression} %</strong></div>
          <div class="progress"><span style="width:${f.progression}%"></span></div>
        </div>`).join('') : '<p class="muted">Aucune formation.</p>'}
      <h4 class="mb-1 mt-3">🧠 Quiz</h4>
      <p>${d.quiz.reussis} quiz réussis • score moyen ${d.quiz.score_moyen} %</p>
      <h4 class="mb-1 mt-3">🏁 Examens (${d.examens.length})</h4>
      ${d.examens.length ? d.examens.map((x) => `
        <div class="between" style="padding:6px 0;border-bottom:1px solid var(--card-border);font-size:.88rem">
          <span>${esc(x.formation)}</span>
          <span class="badge ${x.reussi ? 'badge-success' : 'badge-danger'}">${x.score} %</span>
        </div>`).join('') : '<p class="muted">Aucun examen passé.</p>'}
      <h4 class="mb-1 mt-3">🎓 Certificats (${d.certificats.length})</h4>
      ${d.certificats.length ? d.certificats.map((c) => `
        <div class="between" style="padding:6px 0;border-bottom:1px solid var(--card-border);font-size:.88rem">
          <span>${esc(c.formation)} — ${esc(c.numero)}</span>
          <a class="btn btn-ghost btn-sm" href="/certificat.html?id=${c.id}" target="_blank">👁</a>
        </div>`).join('') : '<p class="muted">Aucun certificat.</p>'}`;
  } catch (e) {
    document.getElementById('modal-body').innerHTML = `<div class="form-error">❌ ${esc(e.message)}</div>`;
  }
}

function editEtudiant(u) {
  openModal('Modifier l\'étudiant', `
    <div class="form-row">
      <div class="form-group"><label>Prénom</label><input id="e-prenom" value="${esc(u.prenom)}"></div>
      <div class="form-group"><label>Nom</label><input id="e-nom" value="${esc(u.nom)}"></div>
    </div>
    <div class="form-group"><label>Email</label><input id="e-email" type="email" value="${esc(u.email)}"></div>
    <div class="form-row">
      <div class="form-group"><label>Téléphone</label><input id="e-tel" value="${esc(u.telephone || '')}"></div>
      <div class="form-group"><label>Pays</label><input id="e-pays" value="${esc(u.pays || '')}"></div>
    </div>
    <button class="btn btn-primary btn-block" onclick="saveEtudiant(${u.id})">Enregistrer</button>`);
}

async function saveEtudiant(id) {
  try {
    const r = await api(`/admin/etudiants/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        prenom: document.getElementById('e-prenom').value,
        nom: document.getElementById('e-nom').value,
        email: document.getElementById('e-email').value,
        telephone: document.getElementById('e-tel').value,
        pays: document.getElementById('e-pays').value
      })
    });
    toast(r.message, 'success');
    closeModal();
    refreshEtudiants();
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteEtudiant(id, nom) {
  if (!confirm(`Supprimer définitivement ${nom} et toutes ses données ?`)) return;
  try {
    const r = await api(`/admin/etudiants/${id}`, { method: 'DELETE' });
    toast(r.message, 'success');
    refreshEtudiants();
  } catch (e) { toast(e.message, 'error'); }
}

// ======================== 3. DEMANDES ========================
let demandeFiltre = '';

async function loadDemandes() {
  content.innerHTML = `
    <div class="flex mb-3" style="flex-wrap:wrap;gap:8px">
      <button class="btn btn-sm btn-primary" data-f="">Toutes</button>
      <button class="btn btn-sm btn-ghost" data-f="en_attente">⏳ En attente</button>
      <button class="btn btn-sm btn-ghost" data-f="acceptee">✅ Acceptées</button>
      <button class="btn btn-sm btn-ghost" data-f="refusee">❌ Refusées</button>
    </div>
    <div id="demandes-list"><div class="spinner"></div></div>`;
  document.querySelectorAll('[data-f]').forEach((b) => {
    b.addEventListener('click', () => {
      document.querySelectorAll('[data-f]').forEach((x) => { x.className = 'btn btn-sm btn-ghost'; });
      b.className = 'btn btn-sm btn-primary';
      demandeFiltre = b.dataset.f;
      refreshDemandes();
    });
  });
  await refreshDemandes();
}

async function refreshDemandes() {
  try {
    const { demandes } = await api(`/admin/demandes${demandeFiltre ? `?statut=${demandeFiltre}` : ''}`);
    const badge = { en_attente: 'badge-warning', acceptee: 'badge-success', refusee: 'badge-danger' };
    const label = { en_attente: '⏳ En attente', acceptee: '✅ Acceptée', refusee: '❌ Refusée' };
    document.getElementById('demandes-list').innerHTML = !demandes.length
      ? '<div class="card empty"><div class="big">📨</div><p>Aucune demande.</p></div>'
      : `<div class="table-wrap"><table>
          <thead><tr><th>Étudiant</th><th>Formation</th><th>Demandée le</th><th>Statut</th><th>Actions</th></tr></thead>
          <tbody>${demandes.map((d) => `
            <tr>
              <td><strong>${esc(d.prenom)} ${esc(d.nom)}</strong><br><span class="muted" style="font-size:.82rem">${esc(d.email)}</span></td>
              <td>${esc(d.formation)}</td>
              <td style="font-size:.85rem">${formatDateTime(d.created_at)}</td>
              <td><span class="badge ${badge[d.statut]}">${label[d.statut]}</span></td>
              <td>
                ${d.statut === 'en_attente'
                  ? `<div class="flex" style="gap:6px">
                       <button class="btn btn-success btn-sm" onclick="decision(${d.id}, 'acceptee')">✅ Accepter</button>
                       <button class="btn btn-danger btn-sm" onclick="decision(${d.id}, 'refusee')">❌ Refuser</button>
                     </div>`
                  : '<span class="muted" style="font-size:.82rem">Traitée</span>'}
              </td>
            </tr>`).join('')}</tbody></table></div>`;
    refreshDemandeCount();
  } catch (e) {
    document.getElementById('demandes-list').innerHTML = `<div class="form-error">❌ ${esc(e.message)}</div>`;
  }
}

async function decision(id, dec) {
  try {
    const r = await api(`/admin/demandes/${id}`, { method: 'PUT', body: JSON.stringify({ decision: dec }) });
    toast(r.message, 'success');
    refreshDemandes();
  } catch (e) { toast(e.message, 'error'); }
}

async function refreshDemandeCount() {
  try {
    const { demandes } = await api('/admin/demandes?statut=en_attente');
    const badge = document.getElementById('demande-count');
    if (demandes.length) {
      badge.textContent = demandes.length;
      badge.classList.remove('hidden');
    } else badge.classList.add('hidden');
  } catch (e) { /* silencieux */ }
}

// ======================= 4. CERTIFICATS =======================
async function loadCertificats() {
  content.innerHTML = `
    <div class="card card-pad mb-3">
      <input id="search-cert" placeholder="🔍 Rechercher par étudiant, formation ou numéro…"
        style="width:100%;padding:12px 16px;background:var(--bg-soft);border:2px solid transparent;border-radius:12px;color:var(--text);outline:none">
    </div>
    <div id="certificats-list"><div class="spinner"></div></div>`;
  document.getElementById('search-cert').addEventListener('input', debounce(refreshCertificats, 300));
  await refreshCertificats();
}

async function refreshCertificats() {
  const q = document.getElementById('search-cert')?.value || '';
  try {
    const { certificats } = await api(`/admin/certificats${q ? `?q=${encodeURIComponent(q)}` : ''}`);
    document.getElementById('certificats-list').innerHTML = !certificats.length
      ? '<div class="card empty"><div class="big">🎓</div><p>Aucun certificat délivré pour le moment.</p></div>'
      : `<div class="table-wrap"><table>
          <thead><tr><th>Étudiant</th><th>Formation</th><th>Numéro</th><th>Délivré le</th><th>Actions</th></tr></thead>
          <tbody>${certificats.map((c) => `
            <tr>
              <td><strong>${esc(c.prenom)} ${esc(c.nom)}</strong><br><span class="muted" style="font-size:.82rem">${esc(c.email)}</span></td>
              <td>${esc(c.formation)}</td>
              <td><span class="badge badge-primary">${esc(c.numero)}</span></td>
              <td style="font-size:.85rem">${formatDate(c.date_delivrance)}</td>
              <td>
                <div class="flex" style="gap:6px">
                  <a class="btn btn-ghost btn-sm" href="/certificat.html?id=${c.id}" target="_blank">👁</a>
                  <button class="btn btn-danger btn-sm" onclick="deleteCertificat(${c.id})">🗑</button>
                </div>
              </td>
            </tr>`).join('')}</tbody></table></div>`;
  } catch (e) {
    document.getElementById('certificats-list').innerHTML = `<div class="form-error">❌ ${esc(e.message)}</div>`;
  }
}

async function deleteCertificat(id) {
  if (!confirm('Supprimer ce certificat ?')) return;
  try {
    const r = await api(`/admin/certificats/${id}`, { method: 'DELETE' });
    toast(r.message, 'success');
    refreshCertificats();
  } catch (e) { toast(e.message, 'error'); }
}

// ======================= 5. FORMATIONS =======================
let categoriesList = [];

async function loadFormations() {
  content.innerHTML = `
    <div class="between mb-3">
      <p class="muted">Crée, modifie ou supprime des formations. Chaque nouvelle formation est générée avec 10 cours, 10 quiz et un examen final.</p>
      <button class="btn btn-primary" onclick="editFormation()">➕ Nouvelle formation</button>
    </div>
    <div id="formations-list"><div class="spinner"></div></div>`;
  try {
    const cat = await api('/public/categories');
    categoriesList = cat.categories;
  } catch (e) { categoriesList = []; }
  await refreshFormations();
}

async function refreshFormations() {
  try {
    const { formations } = await api('/admin/formations');
    document.getElementById('formations-list').innerHTML = `<div class="table-wrap"><table>
      <thead><tr><th>Formation</th><th>Catégorie</th><th>Niveau</th><th>Cours</th><th>Inscrits</th><th>Visible</th><th>Actions</th></tr></thead>
      <tbody>${formations.map((f) => `
        <tr>
          <td><strong>${esc(f.titre)}</strong><br><span class="muted" style="font-size:.82rem">${esc(f.enseignant || '')} • ${f.duree_heures} h</span></td>
          <td>${esc(f.categorie || '—')}</td>
          <td>${esc(f.niveau)}</td>
          <td><span class="badge badge-primary">${f.nb_cours}</span></td>
          <td><span class="badge badge-info">${f.nb_inscrits}</span></td>
          <td>${f.is_published ? '<span class="badge badge-success">Oui</span>' : '<span class="badge badge-danger">Non</span>'}</td>
          <td>
            <div class="flex" style="gap:6px">
              <button class="btn btn-ghost btn-sm" title="Modifier les cours" onclick="editCourses(${f.id}, '${esc(f.titre).replace(/'/g, "\\'")}')">📖</button>
              <button class="btn btn-outline btn-sm" title="Modifier" onclick='editFormation(${JSON.stringify(f)})'>✏️</button>
              <button class="btn btn-danger btn-sm" title="Supprimer" onclick="deleteFormation(${f.id}, '${esc(f.titre).replace(/'/g, "\\'")}')">🗑</button>
            </div>
          </td>
        </tr>`).join('')}</tbody></table></div>`;
  } catch (e) {
    document.getElementById('formations-list').innerHTML = `<div class="form-error">❌ ${esc(e.message)}</div>`;
  }
}

function editFormation(f = null) {
  openModal(f ? 'Modifier la formation' : '➕ Nouvelle formation', `
    <div class="form-group"><label>Titre *</label><input id="f-titre" value="${f ? esc(f.titre) : ''}" placeholder="Ex : Développement Web Complet"></div>
    <div class="form-row">
      <div class="form-group"><label>Catégorie</label>
        <select id="f-categorie">
          <option value="">— Choisir —</option>
          ${categoriesList.map((c) => `<option value="${c.id}" ${f && f.categorie_id === c.id ? 'selected' : ''}>${c.icone} ${esc(c.nom)}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>Niveau</label>
        <select id="f-niveau">
          ${['Débutant', 'Intermédiaire', 'Avancé'].map((n) => `<option ${f && f.niveau === n ? 'selected' : ''}>${n}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="form-group"><label>Description</label><textarea id="f-desc">${f ? esc(f.description || '') : ''}</textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Durée (heures)</label><input id="f-duree" type="number" min="1" value="${f ? f.duree_heures : 20}"></div>
      <div class="form-group"><label>Enseignant</label><input id="f-enseignant" value="${f ? esc(f.enseignant || '') : ''}" placeholder="Nom de l'enseignant"></div>
    </div>
    <div class="form-group"><label>Image (URL, facultatif)</label><input id="f-image" value="${f ? esc(f.image_url || '') : ''}" placeholder="https://…"></div>
    ${f ? `<div class="form-group"><label>Visibilité</label>
      <select id="f-visible">
        <option value="true" ${f.is_published ? 'selected' : ''}>Publiée (visible au catalogue)</option>
        <option value="false" ${!f.is_published ? 'selected' : ''}>Masquée</option>
      </select></div>` : ''}
    <button class="btn btn-primary btn-block" onclick="saveFormation(${f ? f.id : 'null'})">
      ${f ? 'Enregistrer' : 'Créer la formation (10 cours + quiz + examen générés)'}
    </button>`);
}

async function saveFormation(id) {
  const body = {
    titre: document.getElementById('f-titre').value,
    categorie_id: document.getElementById('f-categorie').value || null,
    description: document.getElementById('f-desc').value,
    duree_heures: document.getElementById('f-duree').value,
    niveau: document.getElementById('f-niveau').value,
    enseignant: document.getElementById('f-enseignant').value,
    image_url: document.getElementById('f-image').value
  };
  if (!body.titre.trim()) { toast('Le titre est obligatoire.', 'error'); return; }
  try {
    let r;
    if (id) {
      const vis = document.getElementById('f-visible');
      if (vis) body.is_published = vis.value === 'true';
      r = await api(`/admin/formations/${id}`, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      toast('Création de la formation et de ses 10 cours…', 'info');
      r = await api('/admin/formations', { method: 'POST', body: JSON.stringify(body) });
    }
    toast(r.message, 'success');
    closeModal();
    refreshFormations();
  } catch (e) { toast(e.message, 'error'); }
}

async function deleteFormation(id, titre) {
  if (!confirm(`Supprimer « ${titre} » ? Tous ses cours, quiz, examens et inscriptions associées seront effacés.`)) return;
  try {
    const r = await api(`/admin/formations/${id}`, { method: 'DELETE' });
    toast(r.message, 'success');
    refreshFormations();
  } catch (e) { toast(e.message, 'error'); }
}

// --------- Édition des cours d'une formation ---------
async function editCourses(formationId, titre) {
  openModal(`📖 Cours de « ${titre} »`, '<div class="spinner"></div>');
  try {
    const { courses } = await api(`/admin/formations/${formationId}/courses`);
    document.getElementById('modal-body').innerHTML = courses.map((c) => `
      <div class="course-row">
        <div class="course-num">${c.numero}</div>
        <div style="flex:1"><strong style="font-size:.92rem">${esc(c.titre)}</strong></div>
        <button class="btn btn-outline btn-sm" onclick="editCourse(${c.id})">✏️ Modifier</button>
      </div>`).join('') +
      '<p class="muted mt-2" style="font-size:.85rem">Modifie le titre, le contenu, la vidéo YouTube ou le PDF de chaque cours.</p>';
    window._coursesCache = courses;
  } catch (e) {
    document.getElementById('modal-body').innerHTML = `<div class="form-error">❌ ${esc(e.message)}</div>`;
  }
}

function editCourse(courseId) {
  const c = (window._coursesCache || []).find((x) => x.id === courseId);
  if (!c) return;
  openModal(`Modifier le cours ${c.numero}`, `
    <div class="form-group"><label>Titre</label><input id="c-titre" value="${esc(c.titre)}"></div>
    <div class="form-group"><label>Contenu du cours (HTML autorisé)</label>
      <textarea id="c-contenu" style="min-height:200px">${esc(c.contenu || '')}</textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Vidéo YouTube (URL)</label>
        <input id="c-video" value="${esc(c.video_url || '')}" placeholder="https://youtu.be/…"></div>
      <div class="form-group"><label>Support PDF (URL)</label>
        <input id="c-pdf" value="${esc(c.pdf_url || '')}" placeholder="https://…/support.pdf"></div>
    </div>
    <div class="form-group"><label>Durée (minutes)</label><input id="c-duree" type="number" min="5" value="${c.duree_minutes}"></div>
    <button class="btn btn-primary btn-block" onclick="saveCourse(${c.id})">Enregistrer le cours</button>`);
}

async function saveCourse(id) {
  try {
    const r = await api(`/admin/courses/${id}`, {
      method: 'PUT',
      body: JSON.stringify({
        titre: document.getElementById('c-titre').value,
        contenu: document.getElementById('c-contenu').value,
        video_url: document.getElementById('c-video').value || null,
        pdf_url: document.getElementById('c-pdf').value || null,
        duree_minutes: document.getElementById('c-duree').value
      })
    });
    toast(r.message, 'success');
    closeModal();
  } catch (e) { toast(e.message, 'error'); }
}

// ====================== 6. PROGRESSION ======================
async function loadProgression() {
  try {
    const { progression } = await api('/admin/progression');
    document.getElementById('content').innerHTML = !progression.length
      ? '<div class="card empty"><div class="big">📈</div><p>Aucune inscription pour le moment.</p></div>'
      : `<div class="table-wrap"><table>
          <thead><tr><th>Étudiant</th><th>Formation</th><th>Progression</th><th>Certificat</th><th>Dernière activité</th><th>Dernière connexion</th></tr></thead>
          <tbody>${progression.map((p) => `
            <tr>
              <td><strong>${esc(p.prenom)} ${esc(p.nom)}</strong><br><span class="muted" style="font-size:.82rem">${esc(p.email)}</span></td>
              <td>${esc(p.formation)}</td>
              <td style="min-width:160px">
                <div class="between"><span style="font-size:.8rem">${p.cours_termines}/${p.total_cours} cours</span><strong style="font-size:.82rem;color:var(--primary)">${p.progression} %</strong></div>
                <div class="progress mt-1"><span style="width:${p.progression}%"></span></div>
              </td>
              <td>${p.certificat ? '<span class="badge badge-success">🎓 Oui</span>' : '<span class="muted">—</span>'}</td>
              <td style="font-size:.83rem">${p.derniere_activite ? formatDateTime(p.derniere_activite) : '<span class="muted">Jamais</span>'}</td>
              <td style="font-size:.83rem">${p.last_login ? formatDateTime(p.last_login) : '<span class="muted">Jamais</span>'}</td>
            </tr>`).join('')}</tbody></table></div>`;
  } catch (e) {
    content.innerHTML = `<div class="form-error">❌ ${esc(e.message)}</div>`;
  }
}

// ------------------------- Modales & utils -------------------------
function openModal(title, bodyHTML) {
  modalRoot.innerHTML = `
    <div class="modal-backdrop" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        <div class="modal-head">
          <h3 id="modal-title">${title}</h3>
          <button class="modal-close" onclick="closeModal()">✕</button>
        </div>
        <div class="modal-body" id="modal-body">${bodyHTML}</div>
      </div>
    </div>`;
}
function closeModal() { modalRoot.innerHTML = ''; }

function debounce(fn, ms) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

// ---------------------------- Init ----------------------------
refreshDemandeCount();
loadDashboard();
