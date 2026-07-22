-- ==================================================================
--  TWEADUP — Schéma complet de la base de données (Neon PostgreSQL)
--  ATTENTION : ce script RECRÉE toutes les tables.
--  Les anciennes données des tables Tweadup seront effacées.
-- ==================================================================

BEGIN;

-- Suppression propre (dans l'ordre inverse des dépendances)
DROP TABLE IF EXISTS contact_messages CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS certificates CASCADE;
DROP TABLE IF EXISTS exam_attempts CASCADE;
DROP TABLE IF EXISTS progress CASCADE;
DROP TABLE IF EXISTS enrollments CASCADE;
DROP TABLE IF EXISTS enrollment_requests CASCADE;
DROP TABLE IF EXISTS exam_answers CASCADE;
DROP TABLE IF EXISTS exam_questions CASCADE;
DROP TABLE IF EXISTS final_exams CASCADE;
DROP TABLE IF EXISTS quiz_answers CASCADE;
DROP TABLE IF EXISTS quiz_questions CASCADE;
DROP TABLE IF EXISTS quizzes CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS formations CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- ------------------------------------------------------------------
-- Rôles et utilisateurs
-- ------------------------------------------------------------------
CREATE TABLE roles (
  id   SERIAL PRIMARY KEY,
  nom  VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  role_id       INTEGER NOT NULL REFERENCES roles(id),
  nom           VARCHAR(100) NOT NULL,
  prenom        VARCHAR(100) NOT NULL,
  email         VARCHAR(190) UNIQUE NOT NULL,
  telephone     VARCHAR(30),
  pays          VARCHAR(100),
  password_hash TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login    TIMESTAMPTZ
);

CREATE TABLE profiles (
  user_id   INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  photo_url TEXT,
  bio       TEXT
);

-- ------------------------------------------------------------------
-- Catalogue
-- ------------------------------------------------------------------
CREATE TABLE categories (
  id    SERIAL PRIMARY KEY,
  nom   VARCHAR(100) UNIQUE NOT NULL,
  slug  VARCHAR(120) UNIQUE NOT NULL,
  icone VARCHAR(10) NOT NULL DEFAULT '📚'
);

CREATE TABLE formations (
  id           SERIAL PRIMARY KEY,
  categorie_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  titre        VARCHAR(200) NOT NULL,
  slug         VARCHAR(220) UNIQUE NOT NULL,
  description  TEXT,
  image_url    TEXT,
  duree_heures INTEGER NOT NULL DEFAULT 20,
  niveau       VARCHAR(50) NOT NULL DEFAULT 'Débutant',
  enseignant   VARCHAR(120),
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE courses (
  id            SERIAL PRIMARY KEY,
  formation_id  INTEGER NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  numero        INTEGER NOT NULL,
  titre         VARCHAR(200) NOT NULL,
  contenu       TEXT,
  video_url     TEXT,
  pdf_url       TEXT,
  duree_minutes INTEGER NOT NULL DEFAULT 45,
  UNIQUE (formation_id, numero)
);

-- ------------------------------------------------------------------
-- Quiz de cours (10 questions, 4 réponses, 1 correcte)
-- ------------------------------------------------------------------
CREATE TABLE quizzes (
  id        SERIAL PRIMARY KEY,
  course_id INTEGER UNIQUE NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  score_min INTEGER NOT NULL DEFAULT 70
);

CREATE TABLE quiz_questions (
  id       SERIAL PRIMARY KEY,
  quiz_id  INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL
);

CREATE TABLE quiz_answers (
  id          SERIAL PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES quiz_questions(id) ON DELETE CASCADE,
  texte       TEXT NOT NULL,
  is_correct  BOOLEAN NOT NULL DEFAULT FALSE
);

-- ------------------------------------------------------------------
-- Examen final (50 questions, minuterie, score min 70 %)
-- ------------------------------------------------------------------
CREATE TABLE final_exams (
  id            SERIAL PRIMARY KEY,
  formation_id  INTEGER UNIQUE NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  duree_minutes INTEGER NOT NULL DEFAULT 60,
  score_min     INTEGER NOT NULL DEFAULT 70
);

CREATE TABLE exam_questions (
  id       SERIAL PRIMARY KEY,
  exam_id  INTEGER NOT NULL REFERENCES final_exams(id) ON DELETE CASCADE,
  question TEXT NOT NULL
);

CREATE TABLE exam_answers (
  id          SERIAL PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES exam_questions(id) ON DELETE CASCADE,
  texte       TEXT NOT NULL,
  is_correct  BOOLEAN NOT NULL DEFAULT FALSE
);

-- ------------------------------------------------------------------
-- Inscriptions, demandes et progression
-- ------------------------------------------------------------------
CREATE TABLE enrollment_requests (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  formation_id INTEGER NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  statut       VARCHAR(20) NOT NULL DEFAULT 'en_attente'
               CHECK (statut IN ('en_attente','acceptee','refusee')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  traitee_le   TIMESTAMPTZ
);

CREATE TABLE enrollments (
  id               SERIAL PRIMARY KEY,
  user_id          INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  formation_id     INTEGER NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  date_inscription TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  termine          BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE (user_id, formation_id)
);

CREATE TABLE progress (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id    INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  quiz_score   INTEGER,
  completed    BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  UNIQUE (user_id, course_id)
);

CREATE TABLE exam_attempts (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exam_id    INTEGER NOT NULL REFERENCES final_exams(id) ON DELETE CASCADE,
  score      INTEGER NOT NULL,
  reussi     BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------
-- Certificats et notifications
-- ------------------------------------------------------------------
CREATE TABLE certificates (
  id                SERIAL PRIMARY KEY,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  formation_id      INTEGER NOT NULL REFERENCES formations(id) ON DELETE CASCADE,
  numero            VARCHAR(30) UNIQUE NOT NULL,
  code_verification VARCHAR(64) UNIQUE NOT NULL,
  date_delivrance   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, formation_id)
);

CREATE TABLE notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(50) NOT NULL DEFAULT 'info',
  titre      VARCHAR(200) NOT NULL,
  message    TEXT,
  lu         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE contact_messages (
  id         SERIAL PRIMARY KEY,
  nom        VARCHAR(150),
  email      VARCHAR(190),
  sujet      VARCHAR(200),
  message    TEXT,
  lu         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------
-- Index (requêtes fréquentes)
-- ------------------------------------------------------------------
CREATE INDEX idx_users_email          ON users(email);
CREATE INDEX idx_formations_categorie ON formations(categorie_id);
CREATE INDEX idx_courses_formation    ON courses(formation_id);
CREATE INDEX idx_quiz_questions_quiz  ON quiz_questions(quiz_id);
CREATE INDEX idx_quiz_answers_q       ON quiz_answers(question_id);
CREATE INDEX idx_exam_questions_exam  ON exam_questions(exam_id);
CREATE INDEX idx_exam_answers_q       ON exam_answers(question_id);
CREATE INDEX idx_requests_user        ON enrollment_requests(user_id);
CREATE INDEX idx_requests_statut      ON enrollment_requests(statut);
CREATE INDEX idx_enrollments_user     ON enrollments(user_id);
CREATE INDEX idx_progress_user        ON progress(user_id);
CREATE INDEX idx_notifications_user   ON notifications(user_id, lu);

-- Rôles de base
INSERT INTO roles (nom) VALUES ('etudiant'), ('admin');

COMMIT;
