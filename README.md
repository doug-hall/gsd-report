# GSD Report

**Get Stuff Done** -- A personal productivity dashboard that pulls your work activity from across your tools, uses AI to discover themes and patterns, and generates reports you can use for self-reflection, standups, and performance reviews.

![GSD Report Dashboard](docs/screenshot.png)

## What It Does

GSD Report collects your activity from up to 9 data sources, analyzes it for common themes and productivity patterns, and presents everything in a visual dashboard:

- **Key metrics** -- commits, issues closed, meetings attended, messages sent, AI sessions
- **Executive summary** -- accomplishments, business impact, and leadership highlights written for managers and HR
- **Work themes** -- AI-discovered topics with activity counts and a breakdown chart
- **Narrative summary** -- a prose overview of your week with key insights
- **Activity timeline** -- chronological feed with source filtering (private messages excluded)
- **Per-source details** -- tabbed view of activity from each connected service

## Data Sources

| Source | What's collected |
|--------|-----------------|
| **GitHub** | Commits, PRs created/reviewed/merged, issues |
| **Slack** | Messages sent, thread context, channel participation |
| **Jira** | Issues created, updated, resolved |
| **Gmail** | Emails sent (subject lines only) |
| **Google Calendar** | Meetings attended, duration, attendee count |
| **Linear** | Issues created, updated, completed |
| **Claude Code** | Conversation sessions, tools used, projects worked on |
| **Codex** | Sessions, models used, tokens consumed, projects |
| **GitHub Copilot** | CLI sessions and VS Code chat sessions |

## Quick Start (Recommended)

The fastest way to get started is with the **Claude Code skill** approach. If you use Claude Code with MCP integrations, you can generate a full report with a single command -- no API keys needed for most sources.

### Prerequisites

- [Claude Code](https://claude.ai/claude-code) with MCP integrations (Slack, Jira, Gmail, Calendar, Linear)
- [GitHub CLI](https://cli.github.com/) authenticated (`gh auth login`)
- PostgreSQL (`brew install postgresql@18 && brew services start postgresql@18`)
- Node.js 20+

### Setup

```bash
# Clone and install
git clone <your-repo-url> gsd-report
cd gsd-report
npm install

# Create and configure the database
createdb gsd_report
echo 'DATABASE_URL="postgresql://'"$(whoami)"'@localhost:5432/gsd_report?schema=public"' > .env
npx prisma migrate dev --name init

# Start the app
npm run dev
```

### Generate a Report

In Claude Code, from the project directory:

```
/gsd              # Last 7 days
/gsd last 2 weeks # Last 2 weeks
/gsd last month   # Last 30 days
```

Then open [http://localhost:3000](http://localhost:3000) to view your dashboard.

## Setup Guides

| Guide | Approach | Best for |
|-------|----------|----------|
| **[SETUP-SKILL.md](./SETUP-SKILL.md)** | Claude Code `/gsd` skill collects data via MCP integrations and local files, analyzes inline | Most users -- simpler setup, more data sources, no API costs |
| **[SETUP-API.md](./SETUP-API.md)** | Next.js app fetches from APIs directly, Claude API analyzes | Automated/scheduled reports without Claude Code |

Both approaches write to the same database and can be used together.

## Tech Stack

- **Next.js 15** (App Router) + TypeScript
- **PostgreSQL** + Prisma ORM
- **Tailwind CSS** + shadcn/ui
- **Recharts** for charts
- **Anthropic SDK** (for direct API mode analysis)

## Privacy

- DMs and private Slack channels are included in the AI analysis but never displayed in the dashboard
- Email bodies are never collected -- only subject lines and metadata
- AI conversation content is not stored -- only session metadata (project, duration, tools used)
- All data stays in your local PostgreSQL database

## Development

```bash
npm run dev        # Start dev server
npm test           # Run tests
npm run build      # Production build
npm run lint       # Lint
```
