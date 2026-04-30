const express = require('express');

module.exports = function () {
  const router = express.Router();

  router.post('/', async (req, res) => {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'text is required' });
    }

    try {
      const textToSpeech = require('@google-cloud/text-to-speech');
      const client = new textToSpeech.TextToSpeechClient();

      const [response] = await client.synthesizeSpeech({
        input: { text: text.trim() },
        voice: { languageCode: 'en-US', name: 'en-US-Neural2-F' },
        audioConfig: { audioEncoding: 'MP3' },
      });

      res.set('Content-Type', 'audio/mpeg');
      res.send(response.audioContent);
    } catch (err) {
      console.error('TTS error:', err);
      res.status(500).json({ error: 'TTS failed' });
    }
  });

  return router;
};
