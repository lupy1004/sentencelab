require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const db = require('./db');
app.use('/api/sentences', require('./routes/sentences')(db));
app.use('/api/translate', require('./routes/translate')());

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Eng-cha running on http://localhost:${PORT}`));
}
