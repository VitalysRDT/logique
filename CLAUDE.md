# CLAUDE.md - Logique

## Project Overview

Logique is a multiplayer logic quiz game built with Next.js. Players answer 100 logic questions of varying difficulty (1-10) across 7 categories. The game supports two modes:

- **Party Mode ("Soirée")**: Host displays questions on a shared screen (TV/PC), players use phones as controllers via QR codes
- **Remote Mode ("À distance")**: Each player has their own screen

All UI text, commentary, and narration are in **French**.

## Tech Stack

- **Framework**: Next.js 16 (App Router) with Turbopack for dev
- **Language**: TypeScript (strict mode)
- **Styling**: Tailwind CSS 4 via `@tailwindcss/postcss`
- **Animation**: Framer Motion
- **Validation**: Zod
- **Database**: Neon (serverless PostgreSQL)
- **Cache/State**: Upstash Redis (REST API)
- **TTS**: Cartesia API (French voice "Benoit", sonic-turbo model)
- **Deployment**: Vercel

## Commands

```bash
npm run dev          # Dev server with Turbopack
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run db:seed      # Seed database: npx tsx src/lib/seed.ts
```

No test framework is configured.

## Project Structure

```
src/
├── app/                      # Next.js pages & API routes
│   ├── api/
│   │   ├── game/create/      # POST - host creates a game
│   │   ├── game/join/        # POST - player joins a game
│   │   ├── game/[roomCode]/
│   │   │   ├── state/        # GET  - poll game state (304 support)
│   │   │   ├── answer/       # POST - submit answer
│   │   │   ├── control/      # POST - host controls (start/begin/next/end)
│   │   │   └── ready/        # POST - player ready, auto-advance when all ready
│   │   └── tts/              # POST - text-to-speech via Cartesia
│   ├── play/                 # Player game page (remote mode)
│   ├── screen/               # Host screen page (party mode)
│   ├── page.tsx              # Home page
│   ├── layout.tsx            # Root layout
│   └── globals.css           # Global styles
├── hooks/
│   ├── useGameState.ts       # Polls /state every 300ms with version-based 304 caching
│   ├── useGameActions.ts     # API call wrappers (answer, control, ready)
│   ├── useTimer.ts           # requestAnimationFrame-based countdown
│   └── useAudio.ts           # TTS queue management with client-side caching
└── lib/
    ├── db.ts                 # Neon PostgreSQL connection
    ├── redis.ts              # Upstash Redis connection
    ├── types.ts              # Shared TypeScript types
    ├── questions.ts          # 100 hardcoded logic questions
    ├── room-code.ts          # 4-letter room code generator (consonants only)
    ├── scoring.ts            # Points = difficulty × 100 × speedMultiplier (0.25–1.0)
    ├── commentary.ts         # French narration text generation
    ├── parse.ts              # JSON parsing helpers (Upstash auto-deserialize workaround)
    └── seed.ts               # Database seeding script
```

## Architecture

### Real-time State via Redis Polling

The game is stateless on the server side. All game state lives in Redis with 2-hour TTL:

- `room:{code}:state` - Game status, current question index, timing
- `room:{code}:players` - Player names, scores, streaks
- `room:{code}:scores` - Sorted set for leaderboard
- `room:{code}:answers:{qIndex}` - Answers per question
- `room:{code}:ready` - Ready status set
- `room:{code}:version` - Incremented on state changes (enables 304 responses)

Clients poll `/api/game/[roomCode]/state` every 300ms. The server returns `304 Not Modified` when the version hasn't changed.

### Game Flow

`home` → `waiting` (players join) → `intro` (animated rules, voiced) → `playing` (question + countdown) → `reveal` (correct answer, scores) → `leaderboard` → next question or `finished`

### Authentication

No auth framework. Players are identified by a token generated at join time, stored in `sessionStorage`. The token is validated on answer/ready submissions.

## Environment Variables

```
DATABASE_URL=            # Neon PostgreSQL connection string
UPSTASH_REDIS_REST_URL=  # Upstash Redis REST endpoint
UPSTASH_REDIS_REST_TOKEN=# Upstash Redis auth token
CARTESIA_API_KEY=        # Cartesia TTS API key
```

## Key Conventions

- **Path alias**: `@/*` maps to `./src/*`
- **Client components**: Must use `"use client"` directive explicitly
- **API responses**: Always use `NextResponse.json()` with proper status codes
- **Error handling**: All API routes use try/catch; client uses safe JSON parsing
- **Language**: All user-facing strings are in French
- **Commit messages**: Written in French, prefixed with `feat:`, `fix:`, etc.
- **SVG puzzles**: Some questions include visual SVG configs (PatternSequence, OddOneOut, GridLogic, BalanceScale) rendered client-side
