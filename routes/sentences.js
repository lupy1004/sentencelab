const express = require('express');
const requireAuth = require('../middleware/requireAuth');
const { grantXp } = require('../db');

module.exports = function (db) {
  const router = express.Router();
  router.use(requireAuth);

  router.get('/', (req, res) => {
    const userId = req.session.userId;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const total = db.prepare('SELECT COUNT(*) as count FROM sentences WHERE user_id = ?').get(userId).count;
    const data = db
      .prepare('SELECT * FROM sentences WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(userId, limit, offset);

    res.json({ data, total });
  });

  router.post('/', (req, res) => {
    const userId = req.session.userId;
    const { korean, english } = req.body;
    if (!korean || !english) {
      return res.status(400).json({ error: 'korean and english are required' });
    }

    const result = db
      .prepare('INSERT INTO sentences (korean, english, user_id) VALUES (?, ?, ?)')
      .run(korean.trim(), english.trim(), userId);

    const row = db.prepare('SELECT * FROM sentences WHERE id = ?').get(result.lastInsertRowid);
    const character = grantXp(userId, 3);

    res.status(201).json({ ...row, character });
  });

  router.patch('/:id', (req, res) => {
    const userId = req.session.userId;
    const { english, best_score, quiz_result } = req.body;
    if (!english && best_score === undefined && quiz_result === undefined) {
      return res.status(400).json({ error: 'english, best_score, or quiz_result is required' });
    }

    const id = req.params.id;
    const existing = db.prepare('SELECT * FROM sentences WHERE id = ? AND user_id = ?').get(id, userId);
    if (!existing) return res.status(404).json({ error: 'Not found' });

    let character = null;

    if (english) {
      db.prepare('UPDATE sentences SET english = ? WHERE id = ?').run(english.trim(), id);
    }
    if (best_score !== undefined && best_score > (existing.best_score || 0)) {
      db.prepare('UPDATE sentences SET best_score = ? WHERE id = ?').run(best_score, id);
      character = grantXp(userId, Math.min(Math.floor(best_score / 5), 10));
    }
    if (quiz_result === 'right') {
      db.prepare('UPDATE sentences SET quiz_right = quiz_right + 1 WHERE id = ?').run(id);
      character = grantXp(userId, 5);
    } else if (quiz_result === 'wrong') {
      db.prepare('UPDATE sentences SET quiz_wrong = quiz_wrong + 1 WHERE id = ?').run(id);
    }

    const row = db.prepare('SELECT * FROM sentences WHERE id = ?').get(id);
    res.json({ ...row, character });
  });

  router.delete('/:id', (req, res) => {
    const userId = req.session.userId;
    const result = db.prepare('DELETE FROM sentences WHERE id = ? AND user_id = ?').run(req.params.id, userId);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ ok: true });
  });

  return router;
};
