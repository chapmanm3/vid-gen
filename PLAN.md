# YouTube Video Generator - Project Plan

## Overview
A Node.js service that automates YouTube video creation: topic research → script generation → voiceover + video assembly.

---

## Architecture Decisions

### 1. Framework
- **Options**: Express, Fastify, Hono, Koa
- **Status**: DECIDED
- **Decision**: Express - largest training data, most examples, predictable patterns, AI-assisted development works best with it

### 2. Database
- **Options**: PostgreSQL, SQLite, MongoDB
- **Status**: DECIDED
- **Decision**: SQLite - zero ops, single file, sufficient for v1 single-instance setup, easy migration to Postgres later

### 3. Queue System
- **Options**: BullMQ (Redis), in-memory queue, AWS SQS
- **Status**: DECIDED
- **Decision**: In-memory queue - zero setup, sufficient for v1, scalable to BullMQ later

### 4. LLM Provider (Script Generation)
- **Options**: OpenAI (GPT-4o), Anthropic (Claude), Groq, Ollama (local)
- **Status**: DECIDED
- **Decision**: OpenAI GPT-4o-mini - cheap, fast, good quality, easy to swap to Claude later if needed

### 5. Text-to-Speech Provider
- **Options**: ElevenLabs, Google Cloud TTS, OpenAI TTS, Azure TTS
- **Status**: DECIDED
- **Decision**: OpenAI TTS - shared API key with LLM, good quality, cheap (~$0.15-0.30/video)

### 6. Visual Asset Source
- **Options**: Pexels API, Pixabay API, AI-generated (Stability/DALL-E), screen recordings
- **Status**: DECIDED
- **Decision**: Wikimedia Commons (historical images) + Pexels (b-roll/footage) - free, good coverage for history niche

### 7. Video Assembly
- **Options**: FFmpeg (direct), fluent-ffmpeg, Remotion
- **Status**: DECIDED
- **Decision**: fluent-ffmpeg - programmatic control without raw FFmpeg commands, well-documented

### 8. File Storage
- **Options**: Local filesystem, AWS S3, Cloudflare R2, Supabase Storage
- **Status**: DECIDED
- **Decision**: Local filesystem - zero setup, fast, sufficient for v1, upgrade to R2/S3 later

### 9. Topic Research Sources
- **Options**: YouTube Data API, Google Trends API, Reddit API, Twitter/X API, RSS feeds
- **Status**: DECIDED
- **Decision**: Wikipedia API (structured history data) + Reddit (trending/untold stories) - free, good coverage, community-voted interest signals

### 10. Deployment
- **Options**: Docker, Railway, Render, AWS, VPS
- **Status**: DEFERRED
- **Decision**: Local for v1, revisit when ready for production hosting

---

## Phase Breakdown (Test → Commit per unit)

### Phase 1: Project Setup & Foundation

**1.1 Project initialization**
- [ ] Initialize npm project, install Express + TypeScript + dependencies
- [ ] Configure tsconfig.json, add basic src/index.ts
- [ ] Test: `npm run build` succeeds, `npm start` starts server
- [ ] Commit: "chore: initialize project with Express and TypeScript"

**1.2 Database setup**
- [ ] Install better-sqlite3, create database module
- [ ] Define schema: jobs table (id, status, topic, script, videoPath, createdAt, updatedAt)
- [ ] Test: database module creates tables on init, can insert/select jobs
- [ ] Commit: "feat: add SQLite database with jobs schema"

**1.3 In-memory job queue**
- [ ] Create queue module with: enqueue, dequeue, getStatus, updateStatus
- [ ] Test: enqueue job → returns id, getStatus returns correct state, updateStatus persists
- [ ] Commit: "feat: add in-memory job queue"

**1.4 Base API routes**
- [ ] Create Express routes: GET /health, GET /api/jobs/:id
- [ ] Test: /health returns 200, GET /api/jobs/:id returns job status from DB
- [ ] Commit: "feat: add base API routes"

**1.5 Environment config**
- [ ] Create config module with zod validation for env vars
- [ ] Create .env.example with required vars (OPENAI_API_KEY, REDDIT_CLIENT_ID, etc.)
- [ ] Test: config loads correctly, missing vars throw clear errors
- [ ] Commit: "feat: add environment config with validation"

---

### Phase 2: Topic Research Module

**2.1 Wikipedia API client**
- [ ] Create Wikipedia module: fetch random history topics, search by keyword
- [ ] Test: returns valid topic objects (title, summary, url, date)
- [ ] Commit: "feat: add Wikipedia API client for topic fetching"

**2.2 Reddit API client**
- [ ] Create Reddit module: fetch posts from r/History, r/UnresolvedMysteries, etc.
- [ ] Test: returns valid topic objects (title, score, url, subreddit)
- [ ] Commit: "feat: add Reddit API client for trending topics"

**2.3 Topic scoring algorithm**
- [ ] Create scorer: inputs topic metadata, outputs score (0-100)
- [ ] Factors: Reddit engagement, topic novelty (vs recent topics), Wikipedia page views
- [ ] Test: scoring produces consistent results, edge cases handled
- [ ] Commit: "feat: add topic scoring algorithm"

**2.4 Topic API endpoints**
- [ ] GET /api/topics → returns ranked topic list
- [ ] POST /api/topics/select → picks topic, stores in DB
- [ ] Test: endpoints return correct data, selection persists
- [ ] Commit: "feat: add topic research API endpoints"

---

### Phase 3: Script Generation Module

**3.1 Script structure definition**
- [ ] Define TypeScript types: Script, ScriptSegment (type, text, duration, visualCue)
- [ ] Define segment types: hook, intro, body, conclusion, cta
- [ ] Test: types compile, validation schema works
- [ ] Commit: "feat: define script data structures and validation"

**3.2 LLM prompt templates**
- [ ] Create prompt templates for each segment type
- [ ] Include history/facts style guidelines in system prompt
- [ ] Test: prompts generate valid responses with mock LLM
- [ ] Commit: "feat: add LLM prompt templates for history scripts"

**3.3 OpenAI integration**
- [ ] Create OpenAI client module (chat completions)
- [ ] Implement structured output parsing (JSON from LLM)
- [ ] Test: can generate script from topic, output matches schema
- [ ] Commit: "feat: add OpenAI GPT-4o-mini integration"

**3.4 Script generation endpoint**
- [ ] POST /api/scripts/generate → accepts topicId, returns structured script
- [ ] Store script in DB linked to job
- [ ] Test: full flow from topic → script generation → storage
- [ ] Commit: "feat: add script generation API endpoint"

---

### Phase 4: Voice Generation Module

**4.1 OpenAI TTS client**
- [ ] Create TTS module: textToSpeech(text, voice) → audio buffer
- [ ] Test: generates valid .mp3 from text input
- [ ] Commit: "feat: add OpenAI TTS client"

**4.2 Script-to-audio pipeline**
- [ ] Split script into segments, generate audio per segment
- [ ] Concatenate segments into single audio file
- [ ] Test: given a script, produces single audio file with correct total duration
- [ ] Commit: "feat: add script-to-audio pipeline"

**4.3 Voice configuration**
- [ ] Add voice selection to config (alloy, echo, nova, etc.)
- [ ] Test: different voices produce different audio files
- [ ] Commit: "feat: add voice configuration options"

**4.4 Voice generation endpoint**
- [ ] POST /api/voice/generate → accepts scriptId, returns audio file path
- [ ] Test: endpoint generates audio, file exists on disk
- [ ] Commit: "feat: add voice generation API endpoint"

---

### Phase 5: Visual Asset Module

**5.1 Wikimedia Commons client**
- [ ] Create module: search images by topic keywords
- [ ] Test: returns valid image objects (url, title, license, dimensions)
- [ ] Commit: "feat: add Wikimedia Commons API client"

**5.2 Pexels API client**
- [ ] Create module: search videos by keywords
- [ ] Test: returns valid video objects (url, duration, dimensions)
- [ ] Commit: "feat: add Pexels API client"

**5.3 Visual matching logic**
- [ ] Match script segments to relevant visuals using keywords
- [ ] Fallback logic: prefer images, use video b-roll for transitions
- [ ] Test: given script segments, returns appropriate visual assets
- [ ] Commit: "feat: add visual matching logic"

**5.4 Asset download & caching**
- [ ] Download assets to local storage, cache by URL hash
- [ ] Test: downloads files, skips cached assets, returns local paths
- [ ] Commit: "feat: add asset download and caching"

**5.5 Visual asset endpoint**
- [ ] POST /api/visuals/generate → accepts scriptId, returns visual plan with local paths
- [ ] Test: endpoint returns complete visual plan for all segments
- [ ] Commit: "feat: add visual asset API endpoint"

---

### Phase 6: Video Assembly Module

**6.1 FFmpeg setup & validation**
- [ ] Install fluent-ffmpeg, verify FFmpeg is available
- [ ] Create video module with basic test (generate 1s blank video)
- [ ] Test: FFmpeg runs, produces valid .mp4
- [ ] Commit: "feat: set up fluent-ffmpeg with validation"

**6.2 Image-to-video with Ken Burns effect**
- [ ] Create function: image + duration → video with pan/zoom
- [ ] Test: produces smooth motion video from static image
- [ ] Commit: "feat: add Ken Burns effect for image-to-video"

**6.3 Audio track integration**
- [ ] Merge voiceover audio with video segments
- [ ] Test: video has synced audio, correct duration
- [ ] Commit: "feat: add voiceover audio track to video"

**6.4 Background music with ducking**
- [ ] Add background music track at lower volume
- [ ] Implement ducking (reduce music during voiceover)
- [ ] Test: music is audible but doesn't overpower voice
- [ ] Commit: "feat: add background music with ducking"

**6.5 Subtitle generation & burning**
- [ ] Generate SRT file from script segments + timestamps
- [ ] Burn subtitles into video
- [ ] Test: video has readable captions synced to voice
- [ ] Commit: "feat: add subtitle generation and burning"

**6.6 Full video render**
- [ ] Combine all: visuals + voice + music + subtitles → final 1080p video
- [ ] Test: produces complete watchable video matching script length
- [ ] Commit: "feat: add full video render pipeline"

---

### Phase 7: End-to-End Pipeline Integration

**7.1 Pipeline orchestrator**
- [ ] Create orchestrator: runs phases 2→6 in sequence
- [ ] Each step updates job status in DB
- [ ] Test: orchestrator runs all steps, updates status correctly
- [ ] Commit: "feat: add pipeline orchestrator"

**7.2 Video creation endpoint**
- [ ] POST /api/videos → accepts { topic?, keywords? }, returns jobId
- [ ] Runs pipeline asynchronously via job queue
- [ ] Test: endpoint returns jobId, job progresses through stages
- [ ] Commit: "feat: add video creation endpoint"

**7.3 Job status endpoint**
- [ ] GET /api/videos/:jobId → returns full job state with progress
- [ ] Include video file path when complete
- [ ] Test: returns accurate status at each pipeline stage
- [ ] Commit: "feat: add job status endpoint with progress tracking"

**7.4 Error handling & retries**
- [ ] Add retry logic for failed API calls (OpenAI, Pexels)
- [ ] Update job status to "failed" with error message on unrecoverable errors
- [ ] Test: retries transient failures, reports permanent failures
- [ ] Commit: "feat: add error handling and retry logic"

---

### Phase 8: Polish & Testing

**8.1 Request validation**
- [ ] Add zod schemas for all request bodies and params
- [ ] Return 400 with clear error messages on invalid input
- [ ] Test: invalid requests return proper errors
- [ ] Commit: "feat: add request validation with zod"

**8.2 Logging**
- [ ] Add structured logging (pino/winston)
- [ ] Log pipeline progress, errors, API calls
- [ ] Test: logs are structured and useful for debugging
- [ ] Commit: "feat: add structured logging"

**8.3 Integration tests**
- [ ] Write tests for each module with mocked external APIs
- [ ] Write end-to-end test with mocked services
- [ ] Test: all tests pass
- [ ] Commit: "test: add integration tests for all modules"

**8.4 Full pipeline test**
- [ ] Run full pipeline with real APIs on a test topic
- [ ] Verify output video meets quality standards
- [ ] Document any manual fixes needed
- [ ] Commit: "test: run full pipeline end-to-end test"

---

## Phase Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Topics) ──┐
                    ↓
Phase 3 (Scripts) ←─┘
    ↓
Phase 4 (Voice) ──┐
                  ↓
Phase 5 (Visuals)─┘
    ↓
Phase 6 (Assembly)
    ↓
Phase 7 (Integration)
    ↓
Phase 8 (Polish)
```

Phases 4 and 5 can be built in parallel after Phase 3, since they both depend on the script output but not each other.

---

## Project Structure (Proposed)
```
youtube-video-generator/
├── src/
│   ├── topics/          # Topic research module
│   ├── scripts/         # Script generation module
│   ├── voice/           # TTS module
│   ├── visuals/         # Visual asset module
│   ├── video/           # FFmpeg assembly module
│   ├── upload/          # YouTube upload module (optional)
│   ├── queue/           # Job queue definitions
│   ├── storage/         # File storage abstraction
│   └── index.ts         # Entry point
├── prompts/             # LLM prompt templates
├── config/              # Configuration files
├── tests/
└── package.json
```

---

## API Design (Draft)

```
POST /api/videos
  - Input: { niche?, keywords?, style? }
  - Output: { jobId }

GET /api/videos/:jobId
  - Output: { status, topic, script, videoUrl? }

GET /api/topics
  - Output: [{ topic, score, source }]
```

---

## Open Questions
1. ~~What niche(s) should we target first?~~ → History/Facts
2. ~~Should videos be short-form (Shorts) or long-form?~~ → Long-form (8-12 min)
3. ~~Do we need a web UI or API-only?~~ → API-first, UI later
4. ~~What's the target video length?~~ → 8-10 min
5. ~~Should we support multiple languages?~~ → English only (v1)
6. ~~Budget considerations for paid APIs?~~ → Balanced (~$1-2/video), scalable

---

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-05-15 | Niche: History/Facts | Evergreen content, no time pressure, straightforward visual sourcing, easier to validate pipeline |
| 2026-05-15 | Format: Long-form (8-12 min, 16:9) | Primary goal is monetization; long-form has better ad revenue and watch time |
| 2026-05-15 | Interface: API-first, UI later | Faster to build pipeline, add dashboard once video generation is proven |
| 2026-05-15 | Target length: 8-10 min | Minimum for mid-roll ads, easier to validate pipeline, good depth for history content |
| 2026-05-15 | Language: English only (v1) | Simpler pipeline, single TTS voice set, largest audience, multi-language as v2 feature |
| 2026-05-15 | Budget: Balanced (~$1-2/video), scalable | Good quality for monetization, ability to upgrade providers later as revenue grows |
| 2026-05-15 | Framework: Express | Largest training data, most examples, AI-assisted development works best |
| 2026-05-15 | Database: SQLite | Zero ops, single file, sufficient for v1, easy migration to Postgres later |
| 2026-05-15 | Queue: In-memory | Zero setup, sufficient for v1, scalable to BullMQ later |
| 2026-05-15 | LLM: OpenAI GPT-4o-mini | Cheap, fast, good quality, easy to swap to Claude later |
| 2026-05-15 | TTS: OpenAI TTS | Shared API key with LLM, good quality, cheap (~$0.15-0.30/video) |
| 2026-05-15 | Visuals: Wikimedia Commons + Pexels | Free, historical images + b-roll footage, good coverage for history niche |
| 2026-05-15 | Video Assembly: fluent-ffmpeg | Programmatic control, well-documented, avoids raw FFmpeg command complexity |
| 2026-05-15 | File Storage: Local filesystem | Zero setup, fast, sufficient for v1, upgrade to R2/S3 later |
| 2026-05-15 | Topic Research: Wikipedia API + Reddit | Free, structured history data + community-voted interest signals |
| 2026-05-15 | Deployment: Local (v1) | Defer hosting decision until production-ready |
