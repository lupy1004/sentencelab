require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const app = express();
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'eng-cha-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
}));
app.use(express.static(path.join(__dirname, 'public')));

const db = require('./db');
app.use('/api/auth', require('./routes/auth')(db));
app.use('/api/sentences', require('./routes/sentences')(db));
app.use('/api/translate', require('./routes/translate')());
app.use('/api/transcribe', require('./routes/transcribe')());

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Eng-cha running on http://localhost:${PORT}`));
}
