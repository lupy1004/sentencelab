const { test, mock } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DB_PATH = ':memory:';

// Mock @google-cloud/translate before requiring server
const mockTranslate = mock.fn(async (text, lang) => ['Hello']);

mock.module('@google-cloud/translate', {
  namedExports: {
    v2: {
      Translate: class {
        translate = mockTranslate;
      },
    },
  },
});

const app = require('../server');

test('POST /api/translate returns english', async () => {
  const res = await request(app).post('/api/translate').send({ korean: '안녕하세요' });
  assert.equal(res.status, 200);
  assert.equal(res.body.english, 'Hello');
});

test('POST /api/translate returns 400 when korean is missing', async () => {
  const res = await request(app).post('/api/translate').send({});
  assert.equal(res.status, 400);
});
