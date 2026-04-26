# English Study Site — Design Spec

**Date:** 2026-04-26  
**Status:** APPROVED

---

## Overview

A personal web app for Korean speakers who want to practice saying specific English sentences. The core loop: type a Korean sentence → get English translation → hear it → save it → quiz yourself later.

---

## Problem

Translation tools (Papago, ChatGPT) give you the English but have nowhere to practice it. You translate, then forget. This app closes that loop with a save → review → quiz cycle built around *your own* sentences, not pre-made content.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Backend | Node.js + Express |
| Translation | Claude API (`claude-haiku-4-5`) |
| TTS | Google Cloud TTS (`en-US-Neural2-F`) |
| Database | SQLite via `better-sqlite3` |
| Frontend | Single-page HTML, vanilla JS |

API keys stay server-side. Frontend never touches credentials.

---

## Visual Design

- **Background:** `#dbeafe` solid (sky blue) — no gradient
- **Cards:** `rgba(255,255,255,0.65)` glass with `backdrop-filter: blur(8px)`
- **Accent / buttons:** `#2563eb`
- **Tab active state:** white pill, `color: #1d4ed8`
- **Font:** system `-apple-system, sans-serif`

---

## Layout — Single-Page, 3 Tabs

```
┌─────────────────────────────┐
│  ✏️ SentenceLab              │  ← Header (app name)
│  내가 말하고 싶은 문장을 영어로  │
├──────┬──────────┬────────────┤
│ 번역 │  내 문장  │    퀴즈    │  ← Tab bar
├─────────────────────────────┤
│                             │
│       Tab content           │
│                             │
└─────────────────────────────┘
```

---

## Tab 1: 번역 (Translation)

**Flow:**
1. User types Korean sentence in textarea
2. Clicks "번역하기 →"
3. English result appears below with:
   - **▶ 듣기** — plays Google Cloud TTS audio (MP3 blob URL)
   - **🔁 반복** — toggle; loops audio continuously until clicked again (for shadowing)
   - **💾 저장** — saves Korean + English pair to SQLite
4. After saving, textarea clears and ready for next sentence

**Translation prompt (Claude haiku):**
```
Translate the following Korean sentence into natural, conversational English.
Return ONLY the English translation, nothing else.

Korean: {input}
```

**Error handling:**
- API failure → show inline error, keep Korean input so user can retry
- TTS failure → fall back to `window.speechSynthesis`, toast if that also fails

---

## Tab 2: 내 문장 (My Sentences)

**Features:**
- Paginated list (20 per page) of all saved sentences
- Each row shows: Korean | English | ▶ 듣기 | ✏️ 수정 | 삭제
- **한국어 가리기** toggle — hides Korean column (`filter: blur(6px)`, text still takes space)
- **영어 가리기** toggle — hides English column
- **인라인 수정**: double-click English text to edit → Enter or blur to save, Escape to cancel
- Delete with confirmation

---

## Tab 3: 퀴즈 (Quiz)

**Mode selector** (top of tab):
- `🇰🇷 → 🇺🇸 모드`: shows Korean, quiz on English recall
- `🇺🇸 → 🇰🇷 모드`: shows English, quiz on Korean recall

**Quiz flow:**
1. Show one sentence (front side only — the prompt language)
2. User thinks of the answer
3. Tap card to reveal the other side
4. **▶ 듣기** button appears on reveal (for English side)
5. Tap **✓ 알았어** or **✗ 몰랐어** to advance
6. Sentences shuffle randomly each session
7. Quiz results are NOT stored in v1 (spaced repetition → v2)
8. Progress counter shown: `3 / 12`

---

## API Endpoints

```
POST /api/translate
  body:    { korean: string }
  returns: { english: string }

POST /api/tts
  body:    { text: string }
  returns: audio/mpeg (MP3 buffer)
  note:    Frontend receives as ArrayBuffer → Blob URL → new Audio(url).play()

GET /api/sentences?page=1&limit=20
  returns: { data: [{ id, korean, english, created_at }], total: number }

POST /api/sentences
  body:    { korean: string, english: string }
  returns: { id, korean, english, created_at }

PATCH /api/sentences/:id
  body:    { english: string }
  returns: updated sentence object

DELETE /api/sentences/:id
  returns: { ok: true }
```

---

## Project Structure

```
english-study/
  server.js                 ← Express entry point, static file serving
  .env                      ← ANTHROPIC_API_KEY, GOOGLE_APPLICATION_CREDENTIALS, PORT
  routes/
    translate.js            ← POST /api/translate (Claude API)
    tts.js                  ← POST /api/tts (Google Cloud TTS)
    sentences.js            ← CRUD for saved sentences
  db.js                     ← better-sqlite3 setup + schema migration
  public/
    index.html              ← Single-file frontend (HTML + CSS + JS)
  package.json
```

---

## Environment Variables

```
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_APPLICATION_CREDENTIALS=C:\absolute\path\to\gcp-key.json
PORT=3000
```

---

## Database Schema

```sql
CREATE TABLE sentences (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  korean     TEXT NOT NULL,
  english    TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## Error Handling

| Scenario | Behavior |
|---|---|
| Claude API failure | Inline error below textarea, input kept |
| Google TTS failure | Fall back to `window.speechSynthesis` |
| Both TTS fail | Toast: "음성 재생 실패" |
| SQLite write error | Toast: "저장 실패", log to console |

---

## Windows Setup Notes

`better-sqlite3` requires native compilation. Before `npm install`:
1. Install Python 3.x
2. Run: `npm install --global windows-build-tools`
3. Then `npm install`

`GOOGLE_APPLICATION_CREDENTIALS` must be an **absolute path**.

**Google Cloud TTS cost:** First 1M characters/month free. ~500 sentences × 100 chars = 50k chars — well within the free tier.

---

## Roadmap

| Version | Features |
|---|---|
| **v1 (now)** | Translate + TTS + Save + Hide toggles + Quiz (자기평가) |
| **v2** | Character level-up system, spaced repetition quiz, cloud deploy |
| **v3** | Voice input + pronunciation correction (Whisper API) |

---

## Success Criteria

Use it every day for 2 weeks. Have 30+ sentences saved. Be able to recall them in conversation without looking them up.
