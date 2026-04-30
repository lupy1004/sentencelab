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

module.exports = db;
