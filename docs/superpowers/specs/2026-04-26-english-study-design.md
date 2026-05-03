# Eng-cha — Design Spec

**Date:** 2026-04-26 (updated 2026-05-03)
**Status:** IMPLEMENTED

---

## Overview

A personal web app for Korean speakers who want to practice saying specific English sentences. The core loop: type a Korean sentence → get English translation → hear it → save it → quiz yourself later → practice pronunciation.

---

## Problem

Translation tools (Papago, ChatGPT) give you the English but have nowhere to practice it. You translate, then forget. This app closes that loop with a save → review → quiz → pronunciation practice cycle built around *your own* sentences, not pre-made content.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Backend | Node.js + Express |
| Translation | MyMemory free API (no API key required) |
| TTS | Browser Web Speech API (`window.speechSynthesis`) |
| Speech-to-Text | OpenAI Whisper (`whisper-1`) via `openai` SDK |
| Auth | `express-session` + `bcryptjs` |
| Database | SQLite via `better-sqlite3` |
| Frontend | Single-page HTML, vanilla JS + Pretendard font |

API keys stay server-side. Frontend never touches credentials.

---

## Visual Design

- **Background:** `#eef1f6` (soft blue-gray)
- **Cards:** `rgba(255,255,255,0.65)` glass with `backdrop-filter: blur(8px)`
- **Accent / buttons:** `#2563eb`
- **Font:** `Pretendard` (CDN), falling back to `-apple-system, sans-serif`
- **Layout:** Phone-frame shell (`max-width: 430px`, centered on desktop)

---

## Layout — Single-Page, 5 Tabs (Bottom Navigation)

```
┌─────────────────────────────┐
│  Eng-cha                    │  ← Header (app name + char badge)
│  내가 말하고 싶은 문장을 영어로  │
├─────────────────────────────┤
│                             │
│       Tab content           │
│                             │
├──────┬──────┬──────┬──────┬─┤
│ 번역 │내 문장│ 퀴즈 │ 발음 │프│  ← Bottom nav
└──────┴──────┴──────┴──────┴─┘
```

The header shows a character badge (emoji + level) that pops an XP tooltip on tap.

---

## Authentication

Before accessing the app, users must log in or register. A full-screen overlay covers the app until authenticated.

**Endpoints:**
```
POST /api/auth/register   { username, password } → { id, username, character }
POST /api/auth/login      { username, password } → { id, username, character }
POST /api/auth/logout     → { ok: true }
GET  /api/auth/me         → { id, username, character }
GET  /api/auth/stats      → { totalSentences, quizRight, quizWrong, pronPracticed }
```

**Rules:** username 2–20 chars, password min 4 chars. Sessions last 7 days.

All `/api/sentences` and `/api/transcribe` routes require auth (401 if not).

---

## Character / XP System

Users level up a character by studying. There are 6 levels:

| Level | Emoji | Title | XP needed |
|---|---|---|---|
| 1 | 🥚 | 알 | 0 |
| 2 | 🐣 | 병아리 | 100 |
| 3 | 🐥 | 닭 | 250 |
| 4 | 🦊 | 여우 | 500 |
| 5 | 🐯 | 호랑이 | 1000 |
| 6 | 🦁 | 사자 | 2000 |

**XP rewards:**
- 문장 저장: +3 XP
- 퀴즈 정답: +5 XP
- 발음 신기록: +1 XP per 5 score points (max +10 XP)

Character info is returned in API responses on save, quiz result, and pronunciation score update.

---

## Tab 1: 번역 (Translation)

**Flow:**
1. User types Korean sentence in textarea
2. Clicks "번역하기 →" (or presses Enter)
3. English result appears below with:
   - **▶ 듣기** — plays via Web Speech API (`en-US`, rate 0.9)
   - **↺ 반복** — toggle; loops audio until clicked again (for shadowing)
   - **저장** — saves Korean + English pair to SQLite
4. After saving, textarea clears and result hides

**Translation backend:** MyMemory free API
```
GET https://api.mymemory.translated.net/get?q={korean}&langpair=ko|en
```

**Error handling:**
- API failure → inline error below textarea, input kept
- TTS: uses `window.speechSynthesis` only; toast if unavailable

---

## Tab 2: 내 문장 (My Sentences)

**Features:**
- Paginated list (20 per page) of all saved sentences (user-scoped)
- Each card shows: Korean | English | ▶ 듣기 | 삭제
- **한국어 가리기** toggle — `filter: blur(5px)` on Korean text
- **영어 가리기** toggle — `filter: blur(5px)` on English text
- **인라인 수정**: double-click English text → text becomes input → Enter/blur to save, Escape to cancel
- Delete with confirmation

---

## Tab 3: 퀴즈 (Quiz)

**Setup screen:**
- Mode selector: `KR → EN` or `EN → KR`
- Question count selector: 10 / 20 / 30 / 전체

**Quiz flow:**
1. Show front of flashcard (3D flip animation)
2. Tap card to reveal the back
3. **▶ 듣기** button on English back side
4. Tap **✓ 알았어** (+5 XP) or **✗ 몰랐어** to advance
5. Sentences shuffle randomly each session
6. Quiz results stored in DB (`quiz_right` / `quiz_wrong` per sentence)
7. Progress counter shown: `3 / 12`

---

## Tab 4: 발음 연습 (Pronunciation Practice)

**Flow:**
1. Select a saved sentence from the list
2. Practice panel opens:
   - Shows the English sentence as target
   - **▶ 발음 듣기** — plays via Web Speech API
   - Round record button — tap to start/stop recording
3. After recording stops, audio sent to `/api/transcribe` (OpenAI Whisper)
4. Score calculated client-side: word-level overlap between target and transcription
5. Score shown (0–100), words colored green (match) or red/strikethrough (miss)
6. Best score stored per sentence (`best_score` column)
7. New record → XP granted

---

## Tab 5: 프로필 (Profile)

- Character card: emoji, title, level, XP progress bar
- XP guide: lists how to earn XP
- Activity stats grid: 저장한 문장 / 퀴즈 정답 / 퀴즈 오답 / 발음 연습
- Account section: username + 로그아웃 button

---

## API Endpoints

```
POST /api/auth/register       body: { username, password }
POST /api/auth/login          body: { username, password }
POST /api/auth/logout
GET  /api/auth/me
GET  /api/auth/stats

POST /api/translate
  body:    { korean: string }
  returns: { english: string }

GET /api/sentences?page=1&limit=20
  returns: { data: [{ id, korean, english, best_score, quiz_right, quiz_wrong, created_at }], total }

POST /api/sentences
  body:    { korean: string, english: string }
  returns: { ...sentence, character }   ← includes XP update

PATCH /api/sentences/:id
  body:    { english? } | { best_score? } | { quiz_result: 'right'|'wrong' }
  returns: { ...sentence, character }

DELETE /api/sentences/:id
  returns: { ok: true }

POST /api/transcribe          multipart/form-data: audio file
  returns: { korean: string } ← Whisper transcription (language: ko)
```

All sentence routes require authentication.

---

## Project Structure

```
englishStudySite/
  server.js                   ← Express entry point; session middleware
  db.js                       ← better-sqlite3 setup, schema migration, XP helpers
  .env                        ← secrets (not committed)
  .env.example                ← template
  middleware/
    requireAuth.js            ← 401 guard for protected routes
  routes/
    auth.js                   ← /api/auth/* (register/login/logout/me/stats)
    translate.js              ← POST /api/translate (MyMemory API)
    transcribe.js             ← POST /api/transcribe (OpenAI Whisper)
    sentences.js              ← CRUD /api/sentences
    tts.js                    ← (unused — kept for reference; TTS moved to browser)
  public/
    index.html                ← SPA frontend (5 tabs)
  tests/
    db.test.js
    sentences.test.js
    translate.test.js
    tts.test.js
  package.json
```

---

## Environment Variables (`.env`)

```
SESSION_SECRET=any-long-random-string
OPENAI_API_KEY=sk-...          # for pronunciation transcription (Whisper)
PORT=3000
DB_PATH=sentences.db
```

`ANTHROPIC_API_KEY` and `GOOGLE_APPLICATION_CREDENTIALS` are no longer used.

---

## Database Schema

```sql
CREATE TABLE users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  username   TEXT NOT NULL UNIQUE,
  password   TEXT NOT NULL,          -- bcrypt hash
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE characters (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
  level   INTEGER DEFAULT 1,
  xp      INTEGER DEFAULT 0
);

CREATE TABLE sentences (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  korean     TEXT NOT NULL,
  english    TEXT NOT NULL,
  best_score INTEGER DEFAULT 0,      -- best pronunciation score (0–100)
  quiz_right INTEGER DEFAULT 0,
  quiz_wrong INTEGER DEFAULT 0,
  user_id    INTEGER REFERENCES users(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Error Handling

| Scenario | Behavior |
|---|---|
| MyMemory API failure | Inline error below textarea, input kept |
| Web Speech API unavailable | Toast: "음성 재생 실패" |
| Whisper transcription error | Toast shown |
| SQLite write error | Toast: "저장 실패", log to console |
| Unauthenticated request | 401 → redirect to login overlay |

---

## Windows Setup Notes

`better-sqlite3` requires native compilation. Before `npm install`:
1. Install Python 3.x
2. Install Visual Studio Build Tools with "Desktop development with C++" workload

---

## Roadmap

| Version | Features |
|---|---|
| **v1 (shipped)** | Translate + Web TTS + Save + Hide toggles + Quiz (자기평가) |
| **v2 (shipped)** | Auth + Character XP system + Pronunciation practice (Whisper) + Profile |
| **v3** | Voice input for translation, cloud deploy |

---

## Success Criteria

Use it every day for 2 weeks. Have 30+ sentences saved. Be able to recall them in conversation without looking them up.
