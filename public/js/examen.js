// ==================================================================
//  TWEADUP — Examen final : 50 questions, minuterie, protection
//  anti-copie (clic droit, sélection, copier-coller désactivés),
//  correction 100 % côté serveur
// ==================================================================

requireRole('etudiant');

const formationId = new URLSearchParams(window.location.search).get('id');
const content = document.getElementById('content');
let questions = [];
let secondsLeft = 0;
let timerInterval = null;
let finished = false;

// --------- Protections anti-triche (côté client) ---------
['contextmenu', 'copy', 'cut', 'selectstart'].forEach((evt) =>
  document.addEventListener(evt, (e) => e.preventDefault()));
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'u', 's', 'p'].includes(e.key.toLowerCase())) {
    e.preventDefault();
  }
});
window.addEventListener('beforeunload', (e) => {
  if (!finished) { e.preventDefault(); e.returnValue = ''; }
});

(async function init() {
  if (!formationId) {
    content.innerHTML = '<div class="form-error">❌ Formation non précisée.</div>';
    return;
  }
  try {
    const data = await api(`/learn/formations/${formationId}/exam`);
    questions = data.questions;
    secondsLeft = (data.exam.duree_minutes || 60) * 60;
    renderIntro(data);
  } catch (e) {
    content.innerHTML = `<div class="card empty"><div class="big">🔒</div><p>${esc(e.message)}</p>
      <a class="btn btn-primary mt-3" href="/formation.html?id=${formationId}">Retour à la formation</a></div>`;
  }
})();

function renderIntro({ exam, formation_titre }) {
  content.innerHTML = `
    <div class="card card-pad text-center" style="max-width:640px;margin:40px auto">
      <div style="font-size:3.4rem">🏁</div>
      <h2 class="mt-1">Examen final</h2>
      <p class="muted mt-1">${esc(formation_titre)}</p>
      <div class="grid grid-3 mt-3 mb-3">
        <div><div style="font-size:1.6rem;font-weight:900;color:var(--primary)">${questions.length}</div><div class="muted">questions</div></div>
        <div><div style="font-size:1.6rem;font-weight:900;color:var(--primary)">${exam.duree_minutes} min</div><div class="muted">minuterie</div></div>
        <div><div style="font-size:1.6rem;font-weight:900;color:var(--primary)">${exam.score_min} %</div><div class="muted">pour réussir</div></div>
      </div>
      <p class="muted" style="font-size:.88rem">
        ⚠️ L'examen est chronométré et se termine automatiquement à la fin du temps.
        Les questions et les réponses sont mélangées. La correction est effectuée par le serveur.
      </p>
      <button class="btn btn-primary btn-lg btn-block mt-3" onclick="startExam()">Commencer l'examen</button>
    </div>`;
}

function startExam() {
  renderExam();
  timerInterval = setInterval(tick, 1000);
}

function renderExam() {
  content.innerHTML = `
    <div class="exam-timer">
      <div>
        <strong>🏁 Examen final</strong><br>
        <span class="muted" style="font-size:.82rem"><span id="answered">0</span>/${questions.length} questions répondues</span>
      </div>
      <div class="time" id="timer">--:--</div>
    </div>

    <form id="exam-form">
      ${questions.map((q, i) => `
        <div class="quiz-q" data-qid="${q.id}">
          <h4>${i + 1}. ${esc(q.question)}</h4>
          ${q.answers.map((a) => `
            <label class="quiz-opt">
              <input type="radio" name="q${q.id}" value="${a.id}">
              <span>${esc(a.texte)}</span>
            </label>`).join('')}
        </div>`).join('')}
      <button type="submit" class="btn btn-danger btn-lg btn-block" id="exam-submit">
        Terminer et envoyer mes réponses
      </button>
    </form>`;

  document.querySelectorAll('#exam-form input[type=radio]').forEach((r) => {
    r.addEventListener('change', () => {
      const answered = new Set(
        [...document.querySelectorAll('#exam-form input[type=radio]:checked')].map((x) => x.name)
      ).size;
      document.getElementById('answered').textContent = answered;
    });
  });

  document.getElementById('exam-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const answered = document.querySelectorAll('#exam-form input[type=radio]:checked').length;
    if (answered < questions.length &&
        !confirm(`Tu n'as répondu qu'à ${answered}/${questions.length} questions. Envoyer quand même ?`)) {
      return;
    }
    submitExam();
  });
  tick();
}

function tick() {
  if (secondsLeft <= 0) {
    clearInterval(timerInterval);
    toast('⏰ Temps écoulé ! Envoi automatique de l\'examen.', 'error');
    submitExam();
    return;
  }
  const m = Math.floor(secondsLeft / 60);
  const s = secondsLeft % 60;
  const el = document.getElementById('timer');
  if (el) {
    el.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    el.classList.toggle('danger', secondsLeft < 300);
  }
  secondsLeft--;
}

async function submitExam() {
  if (finished) return;
  finished = true;
  clearInterval(timerInterval);

  const answers = {};
  questions.forEach((q) => {
    const checked = document.querySelector(`input[name="q${q.id}"]:checked`);
    if (checked) answers[q.id] = parseInt(checked.value, 10);
  });

  content.innerHTML = '<div class="spinner"></div><p class="text-center muted">Correction en cours par le serveur…</p>';
  try {
    const r = await api(`/learn/formations/${formationId}/exam`, {
      method: 'POST',
      body: JSON.stringify({ answers })
    });
    renderResult(r);
  } catch (e) {
    finished = false;
    content.innerHTML = `<div class="card empty"><div class="big">⚠️</div><p>${esc(e.message)}</p>
      <button class="btn btn-primary mt-3" onclick="location.reload()">Réessayer</button></div>`;
  }
}

function renderResult(r) {
  const pct = r.score;
  content.innerHTML = `
    <div class="card card-pad text-center" style="max-width:640px;margin:40px auto">
      <div style="font-size:3.4rem">${r.reussi ? '🎉' : '😕'}</div>
      <h2 class="mt-1">${r.reussi ? 'Examen réussi !' : 'Examen non réussi'}</h2>
      <div style="font-size:3rem;font-weight:900;color:${r.reussi ? 'var(--success)' : 'var(--danger)'}">${pct} %</div>
      <p class="muted">${r.bonnes}/${r.total} bonnes réponses • ${r.score_min} % requis</p>
      ${r.reussi
        ? `<p class="mt-2">Félicitations ! Ton certificat professionnel a été généré automatiquement.</p>
           <div class="flex mt-3" style="justify-content:center;flex-wrap:wrap">
             ${r.certificat ? `<a class="btn btn-success btn-lg" href="/certificat.html?id=${r.certificat.id}">🎓 Voir mon certificat</a>` : ''}
             <a class="btn btn-outline" href="/dashboard.html">Mon espace</a>
           </div>`
        : `<p class="mt-2">Revois les cours de la formation puis retente ta chance. Tu peux repasser l'examen autant de fois que nécessaire.</p>
           <div class="flex mt-3" style="justify-content:center;flex-wrap:wrap">
             <a class="btn btn-primary" href="/formation.html?id=${formationId}">Réviser les cours</a>
             <button class="btn btn-outline" onclick="location.reload()">Repasser l'examen</button>
           </div>`}
    </div>`;
}
