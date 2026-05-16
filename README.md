# YouTube Video Generator

Automated YouTube video generation service for history/facts content. Generates 8-10 minute videos from topic research through final video assembly.

## Quick Start

```bash
npm install
cp .env.example .env
# Add your OPENAI_API_KEY to .env
npm run dev
```

## API Endpoints

### Generate a Video (End-to-End)
```bash
POST /api/videos
{ "topic": "Fall of the Roman Empire" }
# Returns: { "jobId": "...", "status": "queued" }

GET /api/videos/:jobId
# Returns: { "status": "completed", "videoPath": "/path/to/video.mp4" }
```

### Individual Pipeline Steps

```bash
# Get topic suggestions
GET /api/topics
GET /api/topics/search?q=rome

# Select a topic for video generation
POST /api/topics/select
{ "topic": "Battle of Hastings" }

# Generate script
POST /api/scripts/generate
{ "jobId": "...", "topic": "Battle of Hastings" }

# Generate voiceover
POST /api/voice/generate
{ "jobId": "..." }

# Fetch visuals
POST /api/visuals/generate
{ "jobId": "..." }

# Render final video
POST /api/video/render
{ "jobId": "..." }
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENAI_API_KEY` | Yes | - | OpenAI API key (scripts + TTS) |
| `PEXELS_API_KEY` | No | - | Pexels API key for video b-roll |
| `PORT` | No | 3000 | Server port |
| `OPENAI_TTS_VOICE` | No | alloy | Voice: alloy, echo, fable, onyx, nova, shimmer |
| `OPENAI_TTS_MODEL` | No | tts-1 | tts-1 or tts-1-hd |
| `OPENAI_TTS_SPEED` | No | 1.0 | 0.25 to 4.0 |

## Pipeline

```
Topic Research → Script Generation → Voiceover → Visuals → Video Assembly
   (Wiki+Reddit)    (GPT-4o-mini)     (TTS)     (Wikimedia+Pexels)  (FFmpeg)
```

## Tech Stack

- **Runtime**: Node.js + Express + TypeScript
- **Database**: SQLite (better-sqlite3)
- **LLM**: OpenAI GPT-4o-mini
- **TTS**: OpenAI TTS
- **Visuals**: Wikimedia Commons + Pexels
- **Video**: fluent-ffmpeg
- **Testing**: Vitest

## Tests

```bash
npm test          # Run once
npm run test:watch # Watch mode
```

154 tests across 28 test files.
