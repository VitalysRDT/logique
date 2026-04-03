import { neon } from "@neondatabase/serverless";
import { questions } from "./questions";
import { questionsActualite } from "./questions-actualite";

async function seed() {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    console.error("DATABASE_URL manquant dans .env.local");
    process.exit(1);
  }

  const sql = neon(DATABASE_URL);

  console.log("Creation de la table questions...");
  await sql`
    CREATE TABLE IF NOT EXISTS questions (
      id              SERIAL PRIMARY KEY,
      difficulty      SMALLINT NOT NULL CHECK (difficulty BETWEEN 1 AND 10),
      category        VARCHAR(30) NOT NULL,
      type            VARCHAR(10) NOT NULL DEFAULT 'text',
      text            TEXT NOT NULL,
      choices         JSONB NOT NULL,
      correct_index   SMALLINT NOT NULL,
      explanation     TEXT NOT NULL,
      svg_config      JSONB,
      time_limit      SMALLINT NOT NULL DEFAULT 15,
      quiz_type       VARCHAR(20) NOT NULL DEFAULT 'logique'
    )
  `;

  // Ajouter la colonne quiz_type si elle n'existe pas (migration)
  await sql`
    ALTER TABLE questions ADD COLUMN IF NOT EXISTS quiz_type VARCHAR(20) NOT NULL DEFAULT 'logique'
  `;

  // Index pour filtrer par quiz_type
  await sql`
    CREATE INDEX IF NOT EXISTS idx_questions_quiz_type ON questions(quiz_type)
  `;

  console.log("Creation de la table games...");
  await sql`
    CREATE TABLE IF NOT EXISTS games (
      id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      room_code       VARCHAR(6) NOT NULL,
      player_count    SMALLINT NOT NULL,
      total_questions SMALLINT NOT NULL,
      quiz_type       VARCHAR(20) NOT NULL DEFAULT 'logique',
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      finished_at     TIMESTAMPTZ
    )
  `;

  await sql`
    ALTER TABLE games ADD COLUMN IF NOT EXISTS quiz_type VARCHAR(20) NOT NULL DEFAULT 'logique'
  `;

  console.log("Creation de la table game_players...");
  await sql`
    CREATE TABLE IF NOT EXISTS game_players (
      id              SERIAL PRIMARY KEY,
      game_id         UUID REFERENCES games(id),
      player_name     VARCHAR(50) NOT NULL,
      final_score     INTEGER NOT NULL DEFAULT 0,
      correct_answers SMALLINT NOT NULL DEFAULT 0,
      rank            SMALLINT NOT NULL
    )
  `;

  console.log("Suppression des anciennes questions...");
  await sql`DELETE FROM questions`;

  console.log("Insertion des questions de logique...");
  for (const q of questions) {
    await sql`
      INSERT INTO questions (difficulty, category, type, text, choices, correct_index, explanation, svg_config, time_limit, quiz_type)
      VALUES (${q.difficulty}, ${q.category}, ${q.type}, ${q.text}, ${JSON.stringify(q.choices)}, ${q.correct_index}, ${q.explanation}, ${q.svg_config ? JSON.stringify(q.svg_config) : null}, ${q.time_limit}, 'logique')
    `;
  }
  console.log(`${questions.length} questions de logique inserees.`);

  console.log("Insertion des questions d'actualite 2025...");
  for (const q of questionsActualite) {
    await sql`
      INSERT INTO questions (difficulty, category, type, text, choices, correct_index, explanation, svg_config, time_limit, quiz_type)
      VALUES (${q.difficulty}, ${q.category}, ${q.type}, ${q.text}, ${JSON.stringify(q.choices)}, ${q.correct_index}, ${q.explanation}, ${q.svg_config ? JSON.stringify(q.svg_config) : null}, ${q.time_limit}, 'actualite')
    `;
  }
  console.log(`${questionsActualite.length} questions d'actualite inserees.`);

  console.log(`Total : ${questions.length + questionsActualite.length} questions inserees avec succes !`);
  process.exit(0);
}

seed().catch((err) => {
  console.error("Erreur seed:", err);
  process.exit(1);
});
