const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH === ':memory:'
  ? ':memory:'
  : process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : path.join(__dirname, 'sentences.db');

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS sentences (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    korean     TEXT NOT NULL,
    english    TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// v2 migration: add best_score for pronunciation tracking
try {
  db.exec('ALTER TABLE sentences ADD COLUMN best_score INTEGER DEFAULT 0');
} catch (_) {
  // column already exists — ok
}

module.exports = db;
