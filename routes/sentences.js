const express = require('express');

module.exports = function (db) {
  const router = express.Router();

  router.get('/', (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const total = db.prepare('SELECT COUNT(*) as count FROM sentences').get().count;
    const data = db
      .prepare('SELECT * FROM sentences ORDER BY created_at DESC LIMIT ? OFFSET ?')
      .all(limit, offset);

    res.json({ data, total });
  });

  router.post('/', (req, res) => {
    const { korean, english } = req.body;
    if (!korean || !english) {
      return res.status(400).json({ error: 'korean and english are required' });
    }

    const result = db
      .prepare('INSERT INTO sentences (korean, english) VALUES (?, ?)')
      .run(korean.trim(), english.trim());

    const row = db.prepare('SELECT * FROM sentences WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(row);
  });

  router.patch('/:id', (req, res) => {
    const { english } = req.body;
    if (!english) {
      return res.status(400).json({ error: 'english is required' });
    }

    const result = db
      .prepare('UPDATE sentences SET english = ? WHERE id = ?')
      .run(english.trim(), req.params.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    const row = db.prepare('SELECT * FROM sentences WHERE id = ?').get(req.params.id);
    res.json(row);
  });

  router.delete('/:id', (req, res) => {
    const result = db.prepare('DELETE FROM sentences WHERE id = ?').run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ ok: true });
  });

  return router;
};
