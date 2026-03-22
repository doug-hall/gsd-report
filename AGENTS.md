<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# GSD Report — Agent Instructions

This repository contains a personal productivity dashboard. It has two agent skills that any AI coding agent can run.

## Available Skills

### `/setup` — Initial App Setup

**Skill file:** [.claude/skills/setup/SKILL.md](.claude/skills/setup/SKILL.md)

Interactively walks through setting up the app: checking prerequisites (Node, PostgreSQL), installing dependencies, creating the database, running migrations, and verifying the app starts. Run this first.

### `/gsd` — Generate a Productivity Report

**Skill file:** [.claude/skills/gsd/SKILL.md](.claude/skills/gsd/SKILL.md)

Collects work activity from up to 9 data sources, analyzes it for themes and productivity patterns, and saves the results to the dashboard. Accepts an optional date range argument (defaults to last 7 days).

## For Non-Claude-Code Agents

If you are Codex, GitHub Copilot, or another AI agent, read the skill files linked above and follow their instructions. The skills are written to be agent-agnostic:

- **Shell commands** (GitHub via `gh` CLI, database via `psql`/`sqlite3`, local file reads via `python3`) work with any agent that can execute commands.
- **Service integrations** (Slack, Jira, Gmail, Calendar, Linear) require access to those services. Use whatever integration you have available — MCP tools, built-in connectors, API tokens, or CLI tools. The skill describes _what data to fetch_ and _what format to return_; use whichever method your platform supports.
- **Analysis** — any LLM agent can analyze the collected activities. The skill includes the exact JSON schema to produce.
- **Saving results** — POST to `http://localhost:3000/api/activities/ingest` and `http://localhost:3000/api/reports` (the Next.js app must be running).

## Project Structure

```
src/
├── app/
│   ├── page.tsx                          # Dashboard page
│   └── api/
│       ├── activities/route.ts           # GET activities from DB
│       ├── activities/ingest/route.ts    # POST activities to DB
│       ├── analyze/route.ts              # POST activities for Claude API analysis
│       └── reports/route.ts              # GET/POST reports
├── components/dashboard/                 # All dashboard UI components
├── lib/
│   ├── types.ts                          # Core TypeScript types
│   ├── db.ts                             # Prisma client
│   ├── services/                         # Data source fetchers + DB service
│   └── analysis/claude.ts                # Claude API analysis (direct API mode)
└── __tests__/                            # Unit tests (vitest)
```

## Key Commands

```bash
npm run dev        # Start dev server (required for /gsd skill)
npm test           # Run tests
npm run build      # Production build
npm run lint       # Lint
```
