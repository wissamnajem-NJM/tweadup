// ==================================================================
//  TWEADUP — Génération du contenu pédagogique
//  (cours, quiz de 10 questions, examen final de 50 questions)
//  Utilisé par scripts/seed.js ET par l'API admin (création de
//  formation). Tout le contenu généré est modifiable ensuite.
// ==================================================================

// Mélange Fisher-Yates
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Titres de cours génériques (formations créées par l'admin)
function defaultTopics(titre) {
  return [
    `Introduction à ${titre}`,
    `Les fondamentaux de ${titre}`,
    `Les concepts clés de ${titre}`,
    `${titre} en pratique — partie 1`,
    `${titre} en pratique — partie 2`,
    `Techniques avancées de ${titre}`,
    `Outils et bonnes pratiques de ${titre}`,
    `Étude de cas réelle en ${titre}`,
    `Erreurs fréquentes et dépannage en ${titre}`,
    `Projet final : ${titre}`
  ];
}

// Mot-clé principal d'un titre de cours (partie avant ":")
function keyword(topic) {
  return topic.split(':')[0].trim();
}

function lowerFirst(s) {
  return s.charAt(0).toLowerCase() + s.slice(1);
}

// ------------------------------------------------------------------
//  Contenu HTML d'un cours
// ------------------------------------------------------------------
function buildCourseContent(formationTitre, topic, numero) {
  const kw = keyword(topic);
  const kwLow = lowerFirst(kw);
  return `
<h2>${topic}</h2>
<p class="lead">Bienvenue dans le cours n°${numero} de la formation <strong>${formationTitre}</strong>. Dans ce chapitre, tu vas découvrir <strong>${kwLow}</strong>, comprendre son rôle dans ton parcours et l'appliquer à travers des exemples concrets.</p>

<h3>🎯 Objectifs du cours</h3>
<ul>
  <li>Comprendre les notions fondamentales de ${kwLow}</li>
  <li>Savoir appliquer ${kwLow} dans un cas d'usage réel</li>
  <li>Identifier les erreurs fréquentes et adopter les bonnes pratiques</li>
</ul>

<h3>1. Introduction</h3>
<p>${kw} est une étape essentielle de la formation <strong>${formationTitre}</strong>. Que tu sois totalement débutant ou déjà à l'aise avec les bases, ce cours te donne une méthode claire pour progresser : comprendre le concept, observer un exemple, puis pratiquer toi-même. Prends le temps de lire chaque section et de refaire les exemples : c'est en pratiquant que l'on retient durablement.</p>

<h3>2. Les notions essentielles</h3>
<p>Retiens ces points clés concernant ${kwLow} :</p>
<ul>
  <li><strong>La définition</strong> : comprends ce que recouvre exactement ${kwLow} et à quoi il sert dans un projet réel.</li>
  <li><strong>Le vocabulaire</strong> : chaque domaine possède ses termes techniques. Note-les et réutilise-les dans tes propres mots.</li>
  <li><strong>La logique</strong> : ${kwLow} ne s'apprend pas par cœur, il se comprend. Cherche toujours le « pourquoi » derrière chaque notion.</li>
  <li><strong>Les liens avec les autres cours</strong> : les notions de ce chapitre seront réutilisées dans les cours suivants de la formation.</li>
</ul>

<h3>3. Mise en pratique</h3>
<p>La pratique est la partie la plus importante. Pendant ce cours :</p>
<ol>
  <li>Lis attentivement l'exemple présenté et reproduis-le étape par étape.</li>
  <li>Modifie les paramètres de l'exemple pour observer ce qui change.</li>
  <li>Crée ta propre variante : c'est le meilleur test de compréhension.</li>
  <li>Termine par la vidéo du cours, qui illustre ${kwLow} en situation réelle.</li>
</ol>

<h3>4. Erreurs fréquentes</h3>
<p>Les débutants commettent souvent les mêmes erreurs avec ${kwLow} : vouloir aller trop vite, copier du code ou des méthodes sans les comprendre, et négliger la pratique régulière. Prends le réflexe inverse : avance par petites étapes, vérifie chaque notion acquise et n'hésite pas à revenir en arrière si un point reste flou.</p>

<h3>📝 Résumé</h3>
<p>Dans ce cours, tu as découvert ${kwLow} : sa définition, ses notions essentielles, sa mise en pratique et les erreurs à éviter. Ces acquis sont indispensables pour la suite de la formation <strong>${formationTitre}</strong>. Regarde maintenant la vidéo du cours pour approfondir, puis passe le quiz : il te faut au moins <strong>70&nbsp;%</strong> pour débloquer le cours suivant.</p>
`.trim();
}

// ------------------------------------------------------------------
//  Quiz d'un cours : 10 questions, 4 réponses, 1 correcte
// ------------------------------------------------------------------
function buildQuiz(formationTitre, topic) {
  const kw = keyword(topic);
  const kwLow = lowerFirst(kw);

  const q = (question, correct, wrongs) => ({
    question,
    answers: [{ texte: correct, is_correct: true },
              ...wrongs.map(w => ({ texte: w, is_correct: false }))]
  });

  return [
    q(`Quel est l'objectif principal du cours « ${topic} » ?`,
      `Acquérir les notions essentielles de ${kwLow} et savoir les mettre en pratique`,
      [`Mémoriser par cœur sans chercher à comprendre`,
       `Découvrir un sujet sans aucun lien avec ${formationTitre}`,
       `Finaliser un projet complet sans passer par la théorie`]),

    q(`Parmi ces affirmations sur ${kwLow}, laquelle est correcte ?`,
      `${kw} est une étape clé du parcours « ${formationTitre} »`,
      [`${kw} est une notion facultative que l'on peut ignorer`,
       `${kw} n'est utilisé que par les experts, jamais par les débutants`,
       `${kw} ne sert jamais dans un projet réel`]),

    q(`Quelle est la meilleure façon d'aborder ce cours ?`,
      `Suivre les explications pas à pas puis refaire les exemples soi-même`,
      [`Lire rapidement le résumé sans pratiquer`,
       `Sauter directement au quiz sans étudier le contenu`,
       `Regarder la vidéo en accéléré sans prendre de notes`]),

    q(`Que faut-il faire AVANT de passer au cours suivant ?`,
      `Obtenir au moins 70 % au quiz de ce cours`,
      [`Attendre une autorisation de l'administrateur`,
       `Terminer tous les autres cours de la formation`,
       `Regarder obligatoirement la vidéo deux fois`]),

    q(`Quelle erreur de débutant faut-il éviter avec ${kwLow} ?`,
      `Vouloir tout apprendre d'un coup sans pratiquer régulièrement`,
      [`Prendre des notes pendant l'apprentissage`,
       `Refaire les exemples du cours`,
       `Revenir sur un point qui n'est pas clair`]),

    q(`Pourquoi ${kwLow} est-il important dans « ${formationTitre} » ?`,
      `Parce qu'il fait partie des compétences de base attendues dans ce domaine`,
      [`Parce qu'il permet d'éviter d'apprendre les autres notions`,
       `Parce qu'il remplace totalement la pratique sur projets`,
       `Parce qu'il donne directement le certificat final`]),

    q(`Tu bloques sur un point du cours. Que faut-il faire en priorité ?`,
      `Reprendre la partie concernée, refaire l'exemple et revoir la vidéo du cours`,
      [`Abandonner la formation`,
       `Passer au hasard au cours suivant`,
       `Chercher les réponses du quiz sans travailler`]),

    q(`Quel est le rôle de la vidéo associée à ce cours ?`,
      `Illustrer et approfondir les notions vues dans le contenu`,
      [`Remplacer totalement la lecture du cours`,
       `Servir uniquement de pause entre deux cours`,
       `Donner directement les réponses du quiz`]),

    q(`Comment vérifier que tu as bien compris ${kwLow} ?`,
      `En réussissant le quiz et en réexpliquant la notion avec tes propres mots`,
      [`En lisant le cours une seule fois rapidement`,
       `En mémorisant les réponses du quiz`,
       `En évitant les exercices pratiques`]),

    q(`À la fin de ce cours, tu dois être capable de…`,
      `Expliquer ${kwLow} et l'appliquer dans un cas concret simple`,
      [`Créer une application complète sans aucune aide`,
       `Enseigner ${kwLow} à un expert du domaine`,
       `Réussir l'examen final sans aucune révision`])
  ];
}

// ------------------------------------------------------------------
//  Examen final : 50 questions = 5 questions tirées de chaque cours
// ------------------------------------------------------------------
function buildExam(coursesWithQuizzes) {
  const examQuestions = [];
  for (const c of coursesWithQuizzes) {
    const picked = shuffle(c.quiz).slice(0, 5);
    for (const q of picked) {
      examQuestions.push({ question: q.question, answers: q.answers });
    }
  }
  return shuffle(examQuestions);
}

module.exports = { shuffle, defaultTopics, keyword, buildCourseContent, buildQuiz, buildExam };
