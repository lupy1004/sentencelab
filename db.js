const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH === ':memory:'
  ? ':memory:'
  : process.env.DB_PATH
    ? path.resolve(process.env.DB_PATH)
    : path.join(__dirname, 'sentences.db');

const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    username   TEXT NOT NULL UNIQUE,
    password   TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS characters (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
    level   INTEGER DEFAULT 1,
    xp      INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS sentences (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    korean     TEXT NOT NULL,
    english    TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// v2 migration: add best_score for pronunciation tracking
try { db.exec('ALTER TABLE sentences ADD COLUMN best_score INTEGER DEFAULT 0'); } catch (_) {}

// v3 migration: add quiz tracking columns
try { db.exec('ALTER TABLE sentences ADD COLUMN quiz_right INTEGER DEFAULT 0'); } catch (_) {}
try { db.exec('ALTER TABLE sentences ADD COLUMN quiz_wrong INTEGER DEFAULT 0'); } catch (_) {}

// v4 migration: add user ownership
try { db.exec('ALTER TABLE sentences ADD COLUMN user_id INTEGER REFERENCES users(id)'); } catch (_) {}

// Level thresholds: index = level (1-based), value = XP needed to reach that level
const LEVEL_THRESHOLDS = [0, 0, 100, 250, 500, 1000, 2000];
const LEVEL_META = [
  null,
  { emoji: '🥚', title: '알' },
  { emoji: '🐣', title: '병아리' },
  { emoji: '🐥', title: '닭' },
  { emoji: '🦊', title: '여우' },
  { emoji: '🐯', title: '호랑이' },
  { emoji: '🦁', title: '사자' },
];
const MAX_LEVEL = 6;

function xpToLevel(xp) {
  let level = 1;
  for (let l = MAX_LEVEL; l >= 1; l--) {
    if (xp >= LEVEL_THRESHOLDS[l]) { level = l; break; }
  }
  return level;
}

function characterInfo(xp) {
  const level = xpToLevel(xp);
  const meta = LEVEL_META[level];
  const currentLevelXp = LEVEL_THRESHOLDS[level];
  const nextLevelXp = level < MAX_LEVEL ? LEVEL_THRESHOLDS[level + 1] : null;
  return { level, xp, currentLevelXp, nextLevelXp, emoji: meta.emoji, title: meta.title };
}

function grantXp(userId, amount) {
  let char = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(userId);
  if (!char) {
    db.prepare('INSERT INTO characters (user_id, xp, level) VALUES (?, 0, 1)').run(userId);
    char = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(userId);
  }
  const prevLevel = xpToLevel(char.xp);
  const newXp = char.xp + amount;
  const newLevel = xpToLevel(newXp);
  db.prepare('UPDATE characters SET xp = ?, level = ? WHERE user_id = ?').run(newXp, newLevel, userId);
  return { ...characterInfo(newXp), leveledUp: newLevel > prevLevel };
}

module.exports = db;
module.exports.grantXp = grantXp;
module.exports.characterInfo = characterInfo;
