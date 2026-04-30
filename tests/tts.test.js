const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DB_PATH = ':memory:';

const fakeAudio = Buffer.from('fake-mp3-data');

mock.module('@google-cloud/text-to-speech', {
  namedExports: {
    TextToSpeechClient: class {
      async synthesizeSpeech() {
        return [{ audioContent: fakeAudio }];
      }
    },
  },
});

const app = require('../server');

test('POST /api/tts returns audio/mpeg', async () => {
  const res = await request(app).post('/api/tts').send({ text: 'Hello world' });
  assert.equal(res.status, 200);
  assert.ok(res.headers['content-type'].includes('audio/mpeg'));
});

test('POST /api/tts returns 400 when text is missing', async () => {
  const res = await request(app).post('/api/tts').send({});
  assert.equal(res.status, 400);
});
