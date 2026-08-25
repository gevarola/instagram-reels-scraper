# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## What This Is

**Social Media AI** — a tool that helps create viral Instagram Reels by analyzing competitor content. It scrapes competitors' recent videos, identifies the most viral ones, analyzes them with AI (video understanding + content breakdown), and generates new adapted video concepts for a given brand.

---

## How to Run

```bash
cd app
npm install
npm run dev
# Open http://localhost:3000
```

**Required environment variables** (in `.env` at project root):
- `APIFY_API_TOKEN` — Apify Instagram scraper
- `GEMINI_API_KEY` — Google Gemini video analysis
- `ANTHROPIC_API_KEY` — Claude concept generation
- `POSTGRES_URL` — database (see below); on Vercel, run `vercel env pull` to get it locally

---

## Tech Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** components
- **Postgres** (Vercel/Neon) for data storage, via `lib/db.ts`
- **Apify** — Instagram scraping
- **Google Gemini 2.0 Flash** — Video analysis (upload + multimodal)
- **Claude Sonnet** — New concept generation

### Why Postgres, not the `data/*.csv` files

The app originally stored everything in `data/*.csv`. That works for local dev but
breaks in production: Vercel's deployed serverless functions run on a
**read-only filesystem**. The CSVs were bundled into the function so API routes
could *read* them, but every `fs.writeFileSync` from a live pipeline run on the
deployed site was silently discarded — the site could serve whatever was last
committed to git, but a client clicking "Run Pipeline" on the live URL could
never actually save new data. `data/*.csv` are no longer read by the app; they're
kept in the repo only as the source migrated into Postgres by
`app/scripts/migrate-csv-to-postgres.mjs`.

---

## How The System Works

### Pipeline Overview

The pipeline is split into two stages so that AI cost (Gemini + Claude) is only
spent on videos someone actually chooses to look at, instead of every scraped
video up front.

**Stage 1 — Run Pipeline (`/run`, `lib/pipeline.ts`): scrape and save, no AI**

1. **Input** — Select a config and parameters (max videos per creator, days lookback) via the Run page
2. **Load Config** — Retrieve analysis prompt, new concepts prompt, and creator list from Postgres
3. **Scrape** — For each competitor creator, scrape recent Instagram Reels via Apify
4. **Filter** — Keep every reel posted within the lookback window (no per-creator top-K cutoff — if 10 creators each posted 10 reels this month, all 100 get saved)
5. **Save** — Insert metrics-only rows (views, likes, comments, thumbnail, link) into the `videos` table, skipping posts already saved from a prior run (unique constraint on `link`). `analysis`/`newConcepts` are left blank.

**Stage 2 — Analyze on demand (Videos page, `/api/videos/analyze`)**

1. The Videos page lists everything from the `videos` table sorted by views (most viral first, per creator).
2. A video with no analysis yet shows an **"Analyze with AI"** button instead of Analysis/Concepts.
3. Clicking it re-scrapes that one post via Apify (the original `videoUrl` is a signed CDN link that expires in hours, so it can't be stored and reused later), downloads the video, uploads it to Gemini, analyzes it (Concept, Hook, Retention, Reward, Script), then sends that analysis to Claude for adapted concepts — and writes both back into that video's row.

### Two Customizable Prompts Per Config

- **Analysis Instruction** — How Gemini should break down the video
- **New Concepts Instruction** — How Claude should adapt the reference for the brand

---

## Workspace Structure

```
.
├── CLAUDE.md                              # This file
├── .env                                   # API keys (not committed)
├── app/                                   # Next.js application
│   ├── src/
│   │   ├── app/                           # Pages and API routes
│   │   │   ├── page.tsx                   # Dashboard
│   │   │   ├── videos/page.tsx            # Videos browser with thumbnails
│   │   │   ├── run/page.tsx               # Pipeline runner with live progress
│   │   │   ├── configs/page.tsx           # Config management
│   │   │   ├── creators/page.tsx          # Creator management
│   │   │   └── api/                       # API routes (configs, creators, videos, pipeline)
│   │   ├── lib/                           # Core logic
│   │   │   ├── pipeline.ts               # Pipeline orchestration
│   │   │   ├── apify.ts                  # Apify scraper client
│   │   │   ├── gemini.ts                 # Gemini video analysis client
│   │   │   ├── claude.ts                 # Claude concept generation client
│   │   │   ├── db.ts                     # Postgres read/write functions
│   │   │   └── types.ts                  # TypeScript interfaces
│   │   └── components/                    # UI components (shadcn + custom)
│   ├── scripts/
│   │   └── migrate-csv-to-postgres.mjs   # One-time import of data/*.csv into Postgres
│   └── package.json
├── data/                                  # Legacy CSVs — no longer read by the app
│   ├── configs.csv                        # (migrated into Postgres, kept for reference)
│   ├── creators.csv
│   └── videos.csv
├── context/                               # Background context for Claude
├── plans/                                 # Implementation plans
└── .claude/commands/                      # Slash commands (prime, create-plan, implement)
```

---

## App Pages

| Page | Path | Description |
|------|------|-------------|
| Dashboard | `/` | Summary stats, recent videos |
| Videos | `/videos` | Browse results with thumbnails, expandable analysis & concepts |
| Run Pipeline | `/run` | Select config, set params, run with live progress streaming |
| Configs | `/configs` | CRUD for pipeline configs (prompts, categories) |
| Creators | `/creators` | CRUD for competitor Instagram accounts |

---

## Commands

### /prime
Initialize a new session with full context awareness.

### /create-plan [request]
Create a detailed implementation plan in `plans/`.

### /implement [plan-path]
Execute a plan step by step.

---

## Critical Instruction: Maintain This File

After any change to the workspace, ask:
1. Does this change add new functionality?
2. Does it modify the workspace structure documented above?
3. Should a new command be listed?
4. Does context/ need updates?

If yes, update the relevant sections.

---

## Session Workflow

1. **Start**: Run `/prime` to load context
2. **Work**: Use commands or direct Claude with tasks
3. **Plan changes**: Use `/create-plan` before significant additions
4. **Execute**: Use `/implement` to execute plans
5. **Maintain**: Claude updates CLAUDE.md and context/ as the workspace evolves
