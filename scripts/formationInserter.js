// ==================================================================
//  TWEADUP — Insertion groupée du contenu d'une formation
//  (10 cours + 10 quiz de 10 questions + examen de 50 questions)
//  Requêtes INSERT … VALUES multi-lignes : ~7 requêtes par
//  formation au lieu de ~700. Partagé par seed.js et admin.js.
// ==================================================================
const { buildCourseContent, buildQuiz, buildExam } = require('./contentGen');

// Construit un INSERT multi-lignes paramétré
// rowsArrays : tableau de lignes (valeurs dans l'ordre des colonnes)
function bulkInsert(table, columns, rowsArrays, returning = '') {
  const values = [];
  const rows = rowsArrays.map((row) => {
    const placeholders = row.map((v) => {
      values.push(v);
      return `$${values.length}`;
    });
    return `(${placeholders.join(',')})`;
  });
  return {
    text: `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${rows.join(', ')}${returning}`,
    values
  };
}

async function insertFormationContent(client, formationId, titre, topics, videos = []) {
  const n = topics.length;
  const nums = [];
  const quizzesData = [];

  // 1) Les cours (1 requête)
  const courseRows = [];
  for (let i = 0; i < n; i++) {
    nums.push(i + 1);
    courseRows.push([
      formationId,
      i + 1,
      topics[i],
      buildCourseContent(titre, topics[i], i + 1),
      videos.length ? `https://youtu.be/${videos[i % videos.length]}` : null,
      45
    ]);
    quizzesData.push(buildQuiz(titre, topics[i]));
  }
  const coursesRes = await client.query(
    bulkInsert('courses',
      ['formation_id', 'numero', 'titre', 'contenu', 'video_url', 'duree_minutes'],
      courseRows, ' RETURNING id, numero'));
  const courseIdByNum = {};
  for (const r of coursesRes.rows) courseIdByNum[r.numero] = r.id;

  // 2) Les quiz (1 requête)
  const quizRes = await client.query(
    bulkInsert('quizzes', ['course_id'],
      nums.map((x) => [courseIdByNum[x]]), ' RETURNING id, course_id'));
  const quizIdByCourse = {};
  for (const r of quizRes.rows) quizIdByCourse[r.course_id] = r.id;

  // 3) Les questions de quiz (1 requête)
  const questionRows = [];
  for (let i = 0; i < n; i++) {
    const quizId = quizIdByCourse[courseIdByNum[nums[i]]];
    for (const q of quizzesData[i]) questionRows.push([quizId, q.question]);
  }
  const qRes = await client.query(
    bulkInsert('quiz_questions', ['quiz_id', 'question'], questionRows, ' RETURNING id'));
  const questionIds = qRes.rows.map((r) => r.id); // ordre d'insertion conservé

  // 4) Les réponses de quiz (1 requête)
  const answerRows = [];
  let idx = 0;
  for (let i = 0; i < n; i++) {
    for (const q of quizzesData[i]) {
      const qid = questionIds[idx++];
      for (const a of q.answers) answerRows.push([qid, a.texte, a.is_correct]);
    }
  }
  await client.query(
    bulkInsert('quiz_answers', ['question_id', 'texte', 'is_correct'], answerRows));

  // 5) L'examen final (3 requêtes)
  const examId = (await client.query(
    'INSERT INTO final_exams (formation_id) VALUES ($1) RETURNING id',
    [formationId])).rows[0].id;

  const exam = buildExam(quizzesData.map((quiz) => ({ quiz })));
  const eRes = await client.query(
    bulkInsert('exam_questions', ['exam_id', 'question'],
      exam.map((q) => [examId, q.question]), ' RETURNING id'));
  const eIds = eRes.rows.map((r) => r.id);

  const examAnswerRows = [];
  for (let i = 0; i < exam.length; i++) {
    for (const a of exam[i].answers) examAnswerRows.push([eIds[i], a.texte, a.is_correct]);
  }
  await client.query(
    bulkInsert('exam_answers', ['question_id', 'texte', 'is_correct'], examAnswerRows));
}

module.exports = { insertFormationContent };
