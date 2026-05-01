const express = require('express');
const multer = require('multer');
const { Readable } = require('stream');
const requireAuth = require('../middleware/requireAuth');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });

module.exports = function () {
  const router = express.Router();

  router.post('/', requireAuth, upload.single('audio'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'audio file is required' });

    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: 'OPENAI_API_KEY is not configured' });
    }

    const { default: OpenAI } = require('openai');
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const audioStream = Readable.from(req.file.buffer);
    audioStream.path = 'audio.webm';

    const transcription = await client.audio.transcriptions.create({
      file: audioStream,
      model: 'whisper-1',
      language: 'ko',
    });

    res.json({ korean: transcription.text });
  });

  return router;
};
