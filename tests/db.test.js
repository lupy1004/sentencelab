const { test } = require('node:test');
const assert = require('node:assert/strict');

process.env.DB_PATH = ':memory:';
const db = require('../db');

test('sentences table exists', () => {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='sentences'")
    .get();
  assert.equal(row.name, 'sentences');
});

test('insert and retrieve a sentence', () => {
  const result = db
    .prepare("INSERT INTO sentences (korean, english) VALUES ('안녕', 'Hello')")
    .run();
  assert.ok(result.lastInsertRowid > 0);

  const row = db.prepare('SELECT * FROM sentences WHERE id = ?').get(result.lastInsertRowid);
  assert.equal(row.korean, '안녕');
  assert.equal(row.english, 'Hello');
});
