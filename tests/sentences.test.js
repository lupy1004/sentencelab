const { test, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.DB_PATH = ':memory:';
const app = require('../server');

// Use a persistent agent to maintain the session cookie across requests
const agent = request.agent(app);

before(async () => {
  await agent
    .post('/api/auth/register')
    .send({ username: 'testuser', password: 'testpass' });
});

test('GET /api/sentences returns empty list', async () => {
  const res = await agent.get('/api/sentences');
  assert.equal(res.status, 200);
  assert.deepEqual(res.body, { data: [], total: 0 });
});

test('POST /api/sentences creates a sentence', async () => {
  const res = await agent
    .post('/api/sentences')
    .send({ korean: '나는 학생이야', english: 'I am a student' });
  assert.equal(res.status, 201);
  assert.equal(res.body.korean, '나는 학생이야');
  assert.equal(res.body.english, 'I am a student');
  assert.ok(res.body.id);
});

test('POST /api/sentences returns 400 when missing fields', async () => {
  const res = await agent.post('/api/sentences').send({ korean: '안녕' });
  assert.equal(res.status, 400);
});

test('PATCH /api/sentences/:id updates english', async () => {
  const created = await agent
    .post('/api/sentences')
    .send({ korean: '좋은 아침', english: 'Good morning' });

  const res = await agent
    .patch(`/api/sentences/${created.body.id}`)
    .send({ english: 'Good morning!' });
  assert.equal(res.status, 200);
  assert.equal(res.body.english, 'Good morning!');
});

test('DELETE /api/sentences/:id removes sentence', async () => {
  const created = await agent
    .post('/api/sentences')
    .send({ korean: '잘 자', english: 'Good night' });

  const res = await agent.delete(`/api/sentences/${created.body.id}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
});

test('GET /api/sentences with pagination', async () => {
  for (let i = 0; i < 5; i++) {
    await agent
      .post('/api/sentences')
      .send({ korean: `문장 ${i}`, english: `Sentence ${i}` });
  }

  const res = await agent.get('/api/sentences?page=1&limit=3');
  assert.equal(res.status, 200);
  assert.equal(res.body.data.length, 3);
  assert.ok(res.body.total >= 5);
});

test('GET /api/sentences returns 401 without auth', async () => {
  const res = await request(app).get('/api/sentences');
  assert.equal(res.status, 401);
});
