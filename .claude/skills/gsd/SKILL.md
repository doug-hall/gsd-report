---
description: Collect work activity from all connected services, analyze productivity themes, and populate the GSD Report dashboard.
user-invocable: true
---

# GSD Report Generator

Collect activity data from connected services, analyze it for productivity themes, and save the results to the GSD Report dashboard.

## Arguments

The user may provide a date range. Examples:
- `/gsd` — defaults to last 7 days
- `/gsd last 2 weeks`
- `/gsd 2026-03-01 to 2026-03-15`
- `/gsd last month`

Parse the date range from the arguments. If no arguments, use the last 7 days from today.

## Step 1: Determine Date Range

Calculate the start and end dates based on the user's input. Format dates as needed for each service's query format.

## Step 2: Collect Activities

Collect data from ALL available sources. Skip any source you don't have access to. For each source, normalize into this format:

```typescript
interface ActivityItem {
  id: string;        // IMPORTANT: must match the patterns below for deduplication
  source: string;    // github, slack, jira, gmail, calendar, linear, claude-code, codex, copilot
  type: string;      // see types below
  title: string;
  description?: string;
  url?: string;
  timestamp: string; // ISO 8601
  private?: boolean; // If true, included in analysis but hidden from dashboard display
  metadata: Record<string, unknown>;
}
```

---

### GitHub (via `gh` CLI)

Run these commands and parse the JSON output:

```bash
# PRs merged by me (searches across ALL repos/orgs)
gh search prs --author=@me --merged-at="YYYY-MM-DD..YYYY-MM-DD" --json number,title,url,repository,closedAt --limit 50

# PRs where you were a reviewer
gh search prs --reviewed-by=@me --merged-at="YYYY-MM-DD..YYYY-MM-DD" --json number,title,url,repository,closedAt --limit 50

# Recent commits (from events API)
gh api "/users/$(gh api user --jq .login)/events?per_page=100" --jq '[.[] | select(.type == "PushEvent")]'
```

**Important:** Use `gh search prs` (not `gh pr list`) to find PRs across all repos. `gh pr list` only searches the current repo. For merged PRs, use `--merged-at` with a date range. For each merged PR, set `type` to `pr_merged`. For reviewed PRs that you didn't author, set `type` to `pr_reviewed`.

**ID patterns:** `github-pr-{repo.nameWithOwner}-{number}`, `github-commit-{sha}`, `github-issue-{number}`
**Types:** `pr_created`, `pr_merged`, `pr_reviewed`, `commit`, `issue_created`

---

### Slack

**Goal:** Search for messages the user sent in the date range, fetch full thread context for threaded messages, and mark DMs/private channels as private.

**What to do:**
1. Search for messages sent by the current user between the start and end dates
2. For each message that's part of a thread, fetch the full thread conversation and store it in `metadata.threadContext` (as "Author: message" lines, capped at ~2000 chars)
3. Store `metadata.threadParticipants` (list of user IDs/names) and `metadata.threadMessageCount`

**How to access Slack** (use whichever method your platform supports):
- MCP tools: `slack_search_public_and_private` for search, `slack_read_thread` for thread context
- Slack API: `search.messages` with a user token, `conversations.replies` for threads
- Any other Slack integration available to you

**Privacy:** DMs, group DMs, and private channels must have `"private": true` set on the activity. Determine privacy from the channel name — DMs typically show as "DM with ..." or "Group DM with ...", and private channels are indicated in the results. When in doubt, mark as private.

**ID pattern:** `slack-{message.ts}-{channel.id}`
**Types:** `message_sent`, `thread_reply`

---

### Jira

**Goal:** Find issues assigned to the current user that were updated within the date range.

**What to do:**
- Query with JQL: `assignee = currentUser() AND updated >= "YYYY-MM-DD" AND updated <= "YYYY-MM-DD" ORDER BY updated DESC`
- Determine type based on dates: `issue_created` if created in range, `issue_resolved` if resolved in range, `issue_updated` otherwise

**How to access Jira:**
- MCP tools: `searchJiraIssuesUsingJql`
- Jira REST API: `/rest/api/3/search` with Basic Auth
- Any other Jira/Atlassian integration available to you

**ID pattern:** `jira-{issue.key}`
**Types:** `issue_created`, `issue_resolved`, `issue_updated`

---

### Linear

**Goal:** Find issues assigned to the current user that were updated within the date range.

**How to access Linear:**
- MCP tools: `list_issues` with assignee filter
- Linear GraphQL API
- Any other Linear integration available to you

**ID pattern:** `linear-created-{issue.id}`, `linear-completed-{issue.id}`, `linear-updated-{issue.id}`
**Types:** `task_created`, `task_completed`, `task_updated`

---

### Gmail

**Goal:** Find emails sent by the user in the date range. Collect subject lines and metadata only (never email body content).

**How to access Gmail:**
- MCP tools: `gmail_search_messages` with query `from:me after:YYYY/MM/DD before:YYYY/MM/DD`
- Gmail API: `users.messages.list` with query, then `users.messages.get` with `format=metadata`
- Any other Gmail integration available to you

**ID pattern:** `gmail-sent-{message.id}`
**Types:** `email_sent`

---

### Google Calendar

**Goal:** List calendar events in the date range. Filter out all-day events, declined events, and cancelled events.

**What to collect:** Event title, start/end times, attendee count. Calculate `durationMinutes` from start/end.

**How to access Google Calendar:**
- MCP tools: `gcal_list_events` with `timeMin` and `timeMax`
- Google Calendar API: `events.list` on the primary calendar
- Any other Calendar integration available to you

**ID pattern:** `calendar-{event.id}`
**Types:** `meeting_attended`
**Metadata:** Include `durationMinutes`, `attendeeCount`

---

### Claude Code (via local JSONL files)

Read conversation history from `~/.claude/projects/`. Each project directory contains `.jsonl` files — one per conversation session.

**How to collect:**

Run a Python script that:
1. Lists all project directories in `~/.claude/projects/`
2. Reads each `.jsonl` file, filtering lines where `timestamp` falls within the date range
3. Groups by `sessionId` field
4. For each session: extracts the first user message as the title, counts user messages and tool uses, calculates duration

**JSONL format:**
```
{ "type": "user"|"assistant", "timestamp": "ISO", "sessionId": "uuid", "message": {...} }
User messages: message.content is a string
Assistant messages: message.content is an array with { "type": "tool_use", "name": "..." } blocks
```

**ID pattern:** `claude-code-{sessionId}`
**Types:** `ai_conversation`
**Metadata:** `project`, `sessionId`, `promptCount`, `toolsUsed`, `durationMinutes`

---

### Codex (via local SQLite database)

Read from `~/.codex/state_5.sqlite`, `threads` table.

```bash
sqlite3 ~/.codex/state_5.sqlite "
  SELECT id, title, cwd, created_at, updated_at, tokens_used, model,
         first_user_message, git_branch, source
  FROM threads
  WHERE created_at >= strftime('%s','YYYY-MM-DD')
    AND created_at <= strftime('%s','YYYY-MM-DD')
  ORDER BY created_at DESC
"
```

Convert `created_at`/`updated_at` from Unix epoch. Extract project name from `cwd`.

**ID pattern:** `codex-{thread.id}`
**Types:** `ai_conversation`
**Metadata:** `project`, `model`, `tokensUsed`, `gitBranch`, `durationMinutes`

---

### GitHub Copilot (via local files)

Collect from two local sources:

#### Copilot CLI sessions (`~/.copilot/session-state/`)

Each session has `workspace.yaml` (metadata) and `events.jsonl` (turn-by-turn history). Parse `workspace.yaml` for `created_at`, `updated_at`, `summary`, `cwd`, `repository`, `branch`. Count `user.message` and `tool.execution_start` events from `events.jsonl`.

#### VS Code Copilot chat sessions

Read `state.vscdb` SQLite databases from `~/Library/Application Support/Code/User/workspaceStorage/*/`. Query key `chat.ChatSessionStore.index` from `ItemTable` for session titles and timestamps.

**ID patterns:** `copilot-cli-{sessionId}`, `copilot-vscode-{sessionId}`
**Types:** `ai_conversation`
**Metadata:** `project`, `promptCount`, `toolsUsed`, `durationMinutes`, `interface` (cli/vscode)

---

## Step 3: Analyze the Data

Analyze the collected activities and produce the following structured JSON. You are an AI — perform this analysis directly.

```typescript
interface AnalysisResult {
  themes: Array<{
    name: string;           // e.g., "API Migration Project"
    description: string;    // 1-2 sentence description
    activityCount: number;
    activityIds: string[];  // IDs of related activities
  }>;
  categories: Array<{
    category: string;       // e.g., "Code Review", "Communication"
    count: number;
    percentage: number;     // of total activities
    sources: string[];      // which sources contributed
  }>;
  narrative: string;        // 2-3 paragraph productivity summary
  executiveSummary: {
    headline: string;       // Single compelling sentence summarizing the period's value
    accomplishments: string[]; // 3-5 concrete, outcome-oriented bullets with action verbs
    impact: string[];       // 2-4 bullets on business/team impact
    leadership: string[];   // 2-3 bullets on cross-team collaboration, mentoring, knowledge sharing
    body: string;           // 2-3 paragraph professional summary in third person for performance review docs
  };
  insights: string[];       // 3-5 key observations
  metrics: {
    totalActivities: number;
    prsMerged: number;
    issuesClosed: number;
    meetingsAttended: number;
    meetingHours: number;   // sum of durationMinutes / 60
    messagesSent: number;
    emailsSent: number;
    commitsAuthored: number;
    aiConversations: number;  // count of AI sessions (Claude Code + Codex + Copilot)
  };
}
```

Identify 3-7 themes. Be specific — reference actual project names, PR titles, issue keys. The narrative should read like a professional productivity summary.

For the executiveSummary:
- **headline**: Frame the period's work in terms of value delivered, not tasks completed.
- **accomplishments**: Use action verbs (Delivered, Launched, Resolved, Architected). Include specific Jira keys and project names. Focus on outcomes.
- **impact**: How did this work reduce risk, unblock others, improve velocity, reduce tech debt, or advance strategic goals? Quantify where possible.
- **leadership**: Highlight cross-team collaboration, mentoring, knowledge sharing, process improvements, or tooling adoption that goes beyond individual contribution.
- **body**: Written in third person, suitable for a performance review document. Emphasize outcomes, strategic alignment, and scope of influence. Do not include raw metrics or activity counts — focus on the narrative of impact and value delivered. Never reference private Slack messages or DMs.

## Step 4: Save to Database

The Next.js app must be running at `http://localhost:3000`. Save the data with two API calls:

### Ingest activities:
```bash
curl -s -X POST http://localhost:3000/api/activities/ingest \
  -H 'Content-Type: application/json' \
  -d '{"activities": [<the collected activities array>]}'
```

### Save the report:
```bash
curl -s -X POST http://localhost:3000/api/reports \
  -H 'Content-Type: application/json' \
  -d '{"dateRange": {"start": "<ISO date>", "end": "<ISO date>"}, "analysis": <the analysis object>, "activityCount": <number>}'
```

If the curl commands fail (e.g., app not running), write the data to a temporary JSON file at `data/pending-report.json` and tell the user to start the dev server and re-run.

## Step 5: Report to User

After saving, provide a brief summary:
- Date range covered
- Number of activities collected per source
- Top 3 themes identified
- Link: "View your full report at http://localhost:3000"

## Error Handling

- If a source's integration is not available, skip it and note it in the output
- If `gh` CLI is not authenticated, skip GitHub and note it
- If a local file/database doesn't exist, skip that source
- Always continue with whatever sources are available
- Never fail completely — partial data is still valuable
