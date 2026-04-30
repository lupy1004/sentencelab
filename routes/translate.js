const express = require('express');

module.exports = function () {
  const router = express.Router();

  router.post('/', async (req, res) => {
    const { korean } = req.body;
    if (!korean || !korean.trim()) {
      return res.status(400).json({ error: 'korean text is required' });
    }

    try {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(korean.trim())}&langpair=ko|en`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.responseStatus !== 200) {
        throw new Error(data.responseDetails || 'Translation failed');
      }

      res.json({ english: data.responseData.translatedText });
    } catch (err) {
      console.error('Translation error:', err);
      res.status(500).json({ error: 'Translation failed' });
    }
  });

  return router;
};
