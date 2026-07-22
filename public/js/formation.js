// ==================================================================
//  TWEADUP — Page formation : liste des 10 cours, verrouillage
//  progressif, progression, accès examen final et certificat
// ==================================================================

requireRole('etudiant');

const formationId = new URLSearchParams(window.location.search).get('id');
const content = document.getElementById('content');

(async function init() {
  const t = localStorage.getItem('tweadup_theme') || 'light';
  document.querySelectorAll('[data-theme-icon]').forEach((el) => { el.textContent = t === 'dark' ? '☀️' : '🌙'; });

  if (!formationId) {
    content.innerHTML = '<div class="form-error">❌ Formation non précisée.</div>';
    return;
  }
  try {
    const data = await api(`/formations/${formationId}`);
    render(data);
  } catch (e) {
    content.innerHTML = `<div class="card empty"><div class="big">⚠️</div><p>${esc(e.message)}</p>
      <a class="btn btn-primary mt-3" href="/dashboard.html">Retour</a></div>`;
  }
})();

function render({ formation, inscrit, ma_demande, cours, progression, examen }) {
  document.title = `${formation.titre} — Tweadup`;

  const demandeInfo = !inscrit ? `
    <div class="card card-pad mb-3" style="border-left:4px solid var(--warning)">
      <strong>🔒 Formation non accessible</strong>
      <p class="muted mt-1">
        ${ma_demande === 'en_attente'
          ? 'Ta demande d\'inscription est en attente de traitement par l\'administrateur.'
          : ma_demande === 'refusee'
            ? 'Ta demande a été refusée. Contacte l\'administrateur pour plus d\'informations.'
            : 'Tu dois demander l\'inscription depuis le catalogue pour accéder aux cours.'}
      </p>
      <a class="btn btn-primary btn-sm mt-2" href="/dashboard.html">Aller au catalogue</a>
    </div>` : '';

  const examenBlock = inscrit ? `
    <div class="card card-pad mt-3" style="border:2px solid ${examen.deja_reussi ? 'var(--success)' : 'var(--primary)'}">
      <div class="between">
        <div>
          <h3>${examen.deja_reussi ? '🎓 Examen réussi !' : '🏁 Examen final'}</h3>
          <p class="muted mt-1">
            ${examen.deja_reussi
              ? 'Félicitations, ton certificat est disponible.'
              : examen.disponible
                ? `50 questions • ${examen.duree_minutes} minutes • ${examen.score_min} % minimum pour réussir.`
                : `Termine les 10 cours pour débloquer l'examen final (50 questions, ${examen.score_min} % minimum).`}
          </p>
        </div>
        ${examen.deja_reussi
          ? `<a class="btn btn-success" href="/certificat.html?id=${examen.certificat_id}">Voir mon certificat</a>`
          : examen.disponible
            ? `<a class="btn btn-primary" href="/examen.html?id=${formation.id}">Passer l'examen →</a>`
            : `<button class="btn btn-outline" disabled>🔒 Verrouillé</button>`}
      </div>
    </div>` : '';

  content.innerHTML = `
    <div class="card mb-3" style="overflow:hidden">
      ${coverHTML(formation, 'card-cover')}
      <div class="card-pad">
        <span class="badge badge-primary">${formation.icone || '📚'} ${esc(formation.categorie || '')}</span>
        <h2 class="mt-1">${esc(formation.titre)}</h2>
        <p class="muted mt-1">${esc(formation.description || '')}</p>
        <div class="formation-meta mt-2">
          <span>⏱ ${formation.duree_heures} heures</span>
          <span>📈 ${esc(formation.niveau)}</span>
          <span>👨‍🏫 ${esc(formation.enseignant || 'Équipe Tweadup')}</span>
          <span>📖 ${cours.length} cours</span>
        </div>
        ${inscrit ? `
          <div class="between mt-3">
            <span class="muted">Ta progression</span>
            <strong style="color:var(--primary)">${progression} %</strong>
          </div>
          <div class="progress mt-1"><span style="width:${progression}%"></span></div>` : ''}
      </div>
    </div>

    ${demandeInfo}

    <h3 class="mb-2 mt-3">📖 Programme de la formation</h3>
    ${cours.map((c) => `
      <div class="course-row ${c.completed ? 'done' : ''} ${c.unlocked ? '' : 'locked'}">
        <div class="course-num">${c.completed ? '✓' : c.numero}</div>
        <div style="flex:1">
          <strong>${esc(c.titre)}</strong><br>
          <span class="muted" style="font-size:.83rem">
            ⏱ ${c.duree_minutes} min
            ${c.quiz_score != null ? ` • Meilleur score au quiz : <strong>${c.quiz_score} %</strong>` : ''}
          </span>
        </div>
        ${!inscrit ? '<span class="badge badge-warning">🔒</span>'
          : c.completed ? `<a class="btn btn-ghost btn-sm" href="/cours.html?id=${c.id}">Revoir</a>`
          : c.unlocked ? `<a class="btn btn-primary btn-sm" href="/cours.html?id=${c.id}">${c.numero === 1 && progression === 0 ? 'Commencer' : 'Continuer'} →</a>`
          : '<span class="badge badge-warning">🔒 Quiz précédent requis</span>'}
      </div>`).join('')}

    ${examenBlock}`;
}
