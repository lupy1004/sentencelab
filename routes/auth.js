const express = require('express');
const bcrypt = require('bcryptjs');
const { grantXp, characterInfo } = require('../db');

module.exports = function (db) {
  const router = express.Router();

  function getCharacter(userId) {
    let char = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(userId);
    if (!char) {
      db.prepare('INSERT INTO characters (user_id, xp, level) VALUES (?, 0, 1)').run(userId);
      char = db.prepare('SELECT * FROM characters WHERE user_id = ?').get(userId);
    }
    return characterInfo(char.xp);
  }

  router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }
    if (username.length < 2 || username.length > 20) {
      return res.status(400).json({ error: 'username must be 2–20 characters' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'password must be at least 4 characters' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (existing) return res.status(409).json({ error: '이미 사용 중인 아이디예요' });

    const hash = await bcrypt.hash(password, 10);
    const result = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(username, hash);
    const userId = result.lastInsertRowid;

    db.prepare('INSERT INTO characters (user_id, xp, level) VALUES (?, 0, 1)').run(userId);

    req.session.userId = userId;
    req.session.username = username;

    res.status(201).json({ id: userId, username, character: getCharacter(userId) });
  });

  router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'username and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
    if (!user) return res.status(401).json({ error: '아이디 또는 비밀번호가 틀렸어요' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: '아이디 또는 비밀번호가 틀렸어요' });

    req.session.userId = user.id;
    req.session.username = user.username;

    res.json({ id: user.id, username: user.username, character: getCharacter(user.id) });
  });

  router.post('/logout', (req, res) => {
    req.session.destroy(() => res.json({ ok: true }));
  });

  router.get('/me', (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(req.session.userId);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    res.json({ ...user, character: getCharacter(user.id) });
  });

  router.get('/stats', (req, res) => {
    if (!req.session?.userId) return res.status(401).json({ error: 'Unauthorized' });
    try {
      const userId = req.session.userId;
      const total = db.prepare('SELECT COUNT(*) as c FROM sentences WHERE user_id = ?').get(userId).c;
      const quiz = db.prepare('SELECT COALESCE(SUM(quiz_right),0) as r, COALESCE(SUM(quiz_wrong),0) as w FROM sentences WHERE user_id = ?').get(userId);
      const pronPracticed = db.prepare('SELECT COUNT(*) as c FROM sentences WHERE user_id = ? AND best_score > 0').get(userId).c;
      res.json({ totalSentences: total, quizRight: quiz.r, quizWrong: quiz.w, pronPracticed });
    } catch (e) {
      console.error('stats error:', e);
      res.status(500).json({ error: 'stats query failed' });
    }
  });

  return router;
};
