// ==================================================================
//  TWEADUP — Page cours : contenu pédagogique, vidéo, ressource PDF,
//  quiz de 10 questions (corrigé par le serveur), navigation
// ==================================================================

requireRole('etudiant');

const courseId = new URLSearchParams(window.location.search).get('id');
const content = document.getElementById('content');
let quizData = null;
let courseData = null;

(async function init() {
  const t = localStorage.getItem('tweadup_theme') || 'light';
  document.querySelectorAll('[data-theme-icon]').forEach((el) => { el.textContent = t === 'dark' ? '☀️' : '🌙'; });

  if (!courseId) {
    content.innerHTML = '<div class="form-error">❌ Cours non précisé.</div>';
    return;
  }
  try {
    const data = await api(`/learn/courses/${courseId}`);
    courseData = data;
    render(data);
  } catch (e) {
    content.innerHTML = `<div class="card empty"><div class="big">🔒</div><p>${esc(e.message)}</p>
      <a class="btn btn-primary mt-3" href="/dashboard.html">Retour à mon espace</a></div>`;
  }
})();

function render({ course, quiz, progression, navigation }) {
  document.title = `${course.titre} — Tweadup`;
  document.getElementById('back-link').href = `/formation.html?id=${course.formation_id}`;
  quizData = quiz;

  const embed = youtubeEmbed(course.video_url);
  const dejaFait = progression && progression.completed;

  content.innerHTML = `
    <div class="card card-pad mb-3">
      <div class="between">
        <span class="badge badge-primary">${esc(course.formation_titre)}</span>
        <span class="muted" style="font-size:.85rem">Cours ${course.numero} • ⏱ ${course.duree_minutes} min</span>
      </div>
      <div class="course-content mt-2">${course.contenu || ''}</div>
      ${course.pdf_url ? `
        <a class="btn btn-outline btn-sm" href="${esc(course.pdf_url)}" target="_blank" rel="noopener">
          📄 Télécharger le support PDF
        </a>` : ''}
    </div>

    ${embed ? `
      <h3 class="mb-2">🎬 Vidéo du cours</h3>
      <div class="video-wrap mb-3">
        <iframe src="${embed}" title="Vidéo du cours"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen loading="lazy"></iframe>
      </div>` : ''}

    ${quiz ? `
      <div class="card card-pad" id="quiz-card">
        <div class="between mb-2">
          <h3>🧠 Quiz du cours</h3>
          <span class="badge badge-warning">${quiz.score_min} % minimum pour débloquer la suite</span>
        </div>
        ${dejaFait ? `<div class="form-success">✅ Cours déjà validé (meilleur score : ${progression.quiz_score} %). Tu peux refaire le quiz pour t'entraîner.</div>` : ''}
        <form id="quiz-form">
          ${quiz.questions.map((q, i) => `
            <div class="quiz-q" data-qid="${q.id}">
              <h4>${i + 1}. ${esc(q.question)}</h4>
              ${q.answers.map((a) => `
                <label class="quiz-opt" data-aid="${a.id}">
                  <input type="radio" name="q${q.id}" value="${a.id}" required>
                  <span>${esc(a.texte)}</span>
                </label>`).join('')}
            </div>`).join('')}
          <div id="quiz-result"></div>
          <button type="submit" class="btn btn-primary btn-lg btn-block" id="quiz-submit">Valider mes réponses</button>
        </form>
      </div>` : `
      <div class="card card-pad">
        <p class="muted">Pas de quiz pour ce cours.</p>
      </div>`}

    <div class="between mt-3">
      ${navigation.precedent
        ? `<a class="btn btn-outline" href="/cours.html?id=${navigation.precedent.id}">← Cours précédent</a>`
        : '<span></span>'}
      ${navigation.suivant
        ? `<a class="btn btn-outline hidden" id="next-btn" href="/cours.html?id=${navigation.suivant.id}">Cours suivant →</a>`
        : `<a class="btn btn-outline hidden" id="next-btn" href="/formation.html?id=${course.formation_id}">Voir l'examen →</a>`}
    </div>`;

  if (navigation.suivant || true) {
    const nb = document.getElementById('next-btn');
    if (dejaFait && nb) nb.classList.remove('hidden');
  }

  if (quiz) {
    document.getElementById('quiz-form').addEventListener('submit', submitQuiz);
  }
}

async function submitQuiz(e) {
  e.preventDefault();
  const btn = document.getElementById('quiz-submit');
  const resultBox = document.getElementById('quiz-result');

  const answers = {};
  quizData.questions.forEach((q) => {
    const checked = document.querySelector(`input[name="q${q.id}"]:checked`);
    if (checked) answers[q.id] = parseInt(checked.value, 10);
  });
  if (Object.keys(answers).length < quizData.questions.length) {
    resultBox.innerHTML = '<div class="form-error">⚠️ Réponds à toutes les questions avant de valider.</div>';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Correction…';
  try {
    const r = await api(`/learn/courses/${courseId}/quiz`, {
      method: 'POST',
      body: JSON.stringify({ answers })
    });

    // Affiche la correction renvoyée par le serveur
    document.querySelectorAll('.quiz-q').forEach((qEl) => {
      const qid = qEl.dataset.qid;
      const bonneId = r.corrections[qid];
      qEl.querySelectorAll('.quiz-opt').forEach((opt) => {
        const aid = parseInt(opt.dataset.aid, 10);
        const checked = opt.querySelector('input').checked;
        if (aid === bonneId) opt.classList.add('correct');
        else if (checked) opt.classList.add('wrong');
      });
    });

    resultBox.innerHTML = r.reussi
      ? `<div class="form-success">🎉 Bravo ! Score : <strong>${r.bonnes}/${r.total} (${r.score} %)</strong> — le cours suivant est débloqué.</div>`
      : `<div class="form-error">Score : <strong>${r.bonnes}/${r.total} (${r.score} %)</strong> — il faut ${r.score_min} % minimum. Revois le cours puis réessaie !</div>`;

    if (r.reussi) {
      const nb = document.getElementById('next-btn');
      if (nb) {
        nb.classList.remove('hidden');
        nb.className = 'btn btn-success';
        nb.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      toast(`Quiz réussi avec ${r.score} % ! Cours suivant débloqué 🎉`, 'success');
    }
    btn.textContent = 'Repasser le quiz';
    btn.disabled = false;
  } catch (err) {
    resultBox.innerHTML = `<div class="form-error">❌ ${esc(err.message)}</div>`;
    btn.disabled = false;
    btn.textContent = 'Valider mes réponses';
  }
}
