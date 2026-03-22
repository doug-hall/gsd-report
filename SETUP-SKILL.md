# GSD Report - Skill-Based Setup Guide

This guide walks you through setting up the GSD Report using the **Claude Code `/gsd` skill** approach. Instead of configuring API keys for each service, you use Claude Code's existing MCP integrations and local AI chat history to collect data. Claude Code acts as both the data collector and the analyst.

This is the recommended approach if you already use Claude Code with MCP integrations connected.

## How It Works

```
You run /gsd in Claude Code
  -> Claude Code collects data from 9 sources via MCP tools, gh CLI, and local files
  -> Claude Code analyzes the data inline (no external API call needed)
  -> Results are saved to your PostgreSQL database via the Next.js app's API
  -> You view the report at http://localhost:3000
```

## Prerequisites

- **Claude Code** installed (see https://claude.ai/claude-code)
- **Node.js** 20+ and **npm**
- **PostgreSQL** 15+ installed locally (Homebrew: `brew install postgresql@18`)

---

## Step 1: Clone and Install

```bash
git clone <your-repo-url> gsd-report
cd gsd-report
npm install
```

## Step 2: Set Up PostgreSQL

1. Start PostgreSQL:
   ```bash
   brew services start postgresql@18
   ```

2. Create the database:
   ```bash
   createdb gsd_report
   ```

3. Set your database connection string in `.env`:
   ```
   DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/gsd_report?schema=public"
   ```
   Replace `YOUR_USERNAME` with your macOS username (run `whoami` to check).

4. Run the database migration:
   ```bash
   npx prisma migrate dev --name init
   ```

## Step 3: Connect Data Sources

The `/gsd` skill pulls from up to 9 sources. Each is optional — the skill skips any that aren't available.

### Automatic (no setup needed)

These sources work out of the box if you use these tools:

| Source | What's collected | Requirement |
|--------|-----------------|-------------|
| **Claude Code** | Conversation sessions, prompts, tools used, duration | You use Claude Code (data is in `~/.claude/projects/`) |
| **Codex** | Conversation sessions, models, tokens, projects | You use Codex (data is in `~/.codex/state_5.sqlite`) |
| **GitHub Copilot** | CLI sessions and VS Code chat sessions | You use Copilot CLI (`~/.copilot/`) or VS Code Copilot |

### GitHub (via `gh` CLI)

The skill uses the `gh` CLI to fetch your GitHub activity (commits, PRs, issues).

1. Install the GitHub CLI if you don't have it:
   ```bash
   brew install gh
   ```

2. Authenticate:
   ```bash
   gh auth login
   ```

That's it — no API token needed in `.env`.

### Slack (via MCP)

The skill uses the Slack MCP integration in Claude Code to search your messages and read thread context.

1. In Claude Code, go to **Settings** (or `/settings`)
2. Connect the **Slack** MCP integration
3. Authorize it with your Slack workspace

The skill will search your sent messages, fetch full thread context for threaded conversations, and mark DMs/private channels as private (included in analysis but hidden from the dashboard display).

### Jira (via MCP)

1. In Claude Code, connect the **Atlassian** MCP integration
2. Authorize it with your Atlassian account

The skill queries your assigned Jira issues using JQL.

### Gmail (via MCP)

1. In Claude Code, connect the **Gmail** MCP integration
2. Authorize it with your Google account

The skill searches for emails you've sent in the date range (subject lines and metadata only, not email body content).

### Google Calendar (via MCP)

1. In Claude Code, connect the **Google Calendar** MCP integration
2. Authorize it with your Google account

The skill lists your calendar events, filters out all-day events and declined invitations, and calculates meeting hours.

### Linear (via MCP)

1. In Claude Code, connect the **Linear** MCP integration
2. Authorize it with your Linear account

The skill queries issues assigned to you that were updated in the date range.

---

## Step 4: Start the App

```bash
npm run dev
```

The app needs to be running when you execute the `/gsd` skill, because the skill saves data by POSTing to the app's API endpoints.

## Step 5: Generate Your First Report

Open Claude Code from the `gsd-report` project directory and run:

```
/gsd
```

This will:
1. Collect activity from the last 7 days across all connected sources
2. Analyze themes, categories, and productivity patterns
3. Generate an executive summary suitable for performance reviews
4. Save everything to the database
5. Print a summary in your terminal

### Custom Date Ranges

```
/gsd last 2 weeks
/gsd last month
/gsd 2026-03-01 to 2026-03-15
```

### View the Report

Open [http://localhost:3000](http://localhost:3000) to see your full dashboard with:
- Key metrics (commits, issues closed, meetings, AI sessions, etc.)
- Executive summary (for sharing with managers/HR)
- AI-generated narrative and insights
- Work theme breakdown with pie chart
- Activity-over-time bar chart
- Per-source activity details
- Chronological activity timeline (private messages excluded from display)

---

## Re-Running Reports

You can run `/gsd` as often as you like for the same date range:

- **Activities are deduplicated** — each activity has a unique source ID, so re-runs upsert rather than duplicate
- **Reports are updated in place** — re-running for the same date range updates the existing report rather than creating a new one
- **New sources are additive** — if you connect a new MCP integration after your first run, just run `/gsd` again and the new data will be merged in

---

## Privacy

- **DMs and private Slack channels** are included in the analysis (theme discovery, metrics) but are never displayed in the dashboard timeline or source details
- **Email bodies** are never collected — only subject lines and metadata
- **Calendar event descriptions** are truncated to 200 characters
- **AI conversation content** is not stored — only session metadata (project, duration, tools used, prompt count)
- **All data stays local** — stored in your local PostgreSQL database. Nothing is sent to external services except through the MCP integrations you've already authorized.

---

## Troubleshooting

### "Unknown skill: gsd"
Restart Claude Code. Skills are loaded at startup.

### Skill can't save to database
Make sure the Next.js dev server is running (`npm run dev`) before executing `/gsd`. The skill POSTs data to `http://localhost:3000/api/`.

### PostgreSQL connection error
Check that PostgreSQL is running (`brew services list`) and that your `DATABASE_URL` in `.env` includes your username:
```
DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/gsd_report?schema=public"
```

### Missing data from a source
The skill skips sources that aren't available. Check:
- **GitHub**: Run `gh auth status` to verify CLI authentication
- **Slack/Jira/Gmail/Calendar/Linear**: Verify the MCP integration is connected in Claude Code settings
- **Claude Code/Codex/Copilot**: These read local files — verify the directories exist (`~/.claude/projects/`, `~/.codex/state_5.sqlite`, `~/.copilot/session-state/`)

### "No activities found"
The date range might not overlap with any activity. Try a wider range:
```
/gsd last month
```
