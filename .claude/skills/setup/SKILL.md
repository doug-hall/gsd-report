---
description: Walk through setting up the GSD Report app, checking prerequisites, installing dependencies, configuring the database, and getting everything running.
user-invocable: true
---

# GSD Report Setup

Interactively set up the GSD Report app for use with the Claude Code `/gsd` skill. Check prerequisites, install what's missing, configure the database, and get the app running.

## Philosophy

- Check before installing — don't reinstall things that already work
- Ask the user only when you need input
- Provide clear progress updates at each step
- If something fails, explain what went wrong and offer to help fix it

## Step 1: Check Prerequisites

Run these checks in parallel and report the results:

### Node.js
```bash
node --version
```
Require v20+. If missing or too old, tell the user to install via `brew install node` or nvm.

### npm
```bash
npm --version
```
Should come with Node. Just verify it's present.

### PostgreSQL
```bash
which psql && psql --version
```
If not installed, offer to install it:
```bash
brew install postgresql@18
```

Check if PostgreSQL is running:
```bash
pg_isready
```
If not running, offer to start it:
```bash
brew services start postgresql@18
```

### GitHub CLI (optional)
```bash
gh --version && gh auth status
```
If not installed or not authenticated, note it as optional — needed only for GitHub data collection in the `/gsd` skill. Offer to help install and authenticate:
```bash
brew install gh
gh auth login
```

Report a summary:
```
Prerequisites:
  Node.js 22.x    ✓
  npm 11.x        ✓
  PostgreSQL 18   ✓ (running)
  GitHub CLI       ✓ (authenticated as user)
```

If any required prerequisite (Node, npm, PostgreSQL) is missing, help the user install it before proceeding.

## Step 2: Install Dependencies

Check if `node_modules` exists:
```bash
ls node_modules/.package-lock.json
```

If needed:
```bash
npm install
```

## Step 3: Configure Database

### Check if the database exists
```bash
psql -U $(whoami) -d gsd_report -c "SELECT 1" 2>&1
```

If the database doesn't exist, create it:
```bash
createdb gsd_report
```

### Check/create the `.env` file
Read the `.env` file. If it doesn't exist or has a placeholder `DATABASE_URL`, create it with the correct connection string using the current OS username:

```bash
whoami
```

Write to `.env`:
```
DATABASE_URL="postgresql://USERNAME@localhost:5432/gsd_report?schema=public"
```

### Run migrations
Check if migrations are up to date:
```bash
npx prisma migrate status
```

If migrations need to be applied:
```bash
npx prisma migrate dev
```

## Step 4: Check Data Sources

Check which data sources are available and report their status.

### Automatic sources (no setup needed)
Check for local data from AI coding tools:

```bash
# Claude Code
ls ~/.claude/projects/ 2>/dev/null | head -5

# Codex
ls ~/.codex/state_5.sqlite 2>/dev/null

# GitHub Copilot
ls ~/.copilot/session-state/ 2>/dev/null | head -5
```

### MCP integrations
Tell the user which MCP integrations the `/gsd` skill can use and suggest they connect them in Claude Code settings:

- **Slack** — for messages, thread context, and channel activity
- **Atlassian (Jira)** — for issues created, updated, and resolved
- **Gmail** — for sent email subject lines and metadata
- **Google Calendar** — for meetings attended and time spent
- **Linear** — for issues and project tracking

These are all optional. The skill skips any that aren't connected.

## Step 5: Start and Verify

Start the dev server in the background:
```bash
npm run dev
```

Wait a few seconds, then verify the API responds:
```bash
curl -s http://localhost:3000/api/reports
```

If it returns JSON (even `{"reports":[]}`), the app is working.

## Step 6: Summary

Print a summary of what was set up, adjusting based on what was actually found:

```
GSD Report is ready!

  App:        http://localhost:3000
  Database:   postgresql://username@localhost:5432/gsd_report

  Data sources available:
    GitHub CLI     ✓ authenticated
    Claude Code    ✓ local history found
    Codex          ✓ local history found
    Copilot        ✓ local history found
    Slack          → connect MCP in Claude Code settings
    Jira           → connect MCP in Claude Code settings
    Gmail          → connect MCP in Claude Code settings
    Calendar       → connect MCP in Claude Code settings
    Linear         → connect MCP in Claude Code settings

  Next steps:
    1. Connect any MCP integrations you want in Claude Code settings
    2. Run /gsd to generate your first report
    3. Open http://localhost:3000 to view it
```

## Error Handling

- If PostgreSQL can't connect, check if the service is running and suggest `brew services start postgresql@18`
- If migrations fail, show the error and suggest `npx prisma migrate reset` (with user confirmation since it drops data)
- If `npm install` fails, suggest clearing node_modules and retrying
- If the dev server port 3000 is already in use, tell the user and suggest killing the existing process
- Never silently skip errors — always tell the user what happened and what to do
