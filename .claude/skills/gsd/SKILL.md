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

Collect data from ALL available sources in parallel where possible. For each source, normalize into this format:

```typescript
interface ActivityItem {
  id: string;        // IMPORTANT: must match the patterns below for deduplication
  source: string;    // github, slack, jira, gmail, calendar, linear
  type: string;      // see types below
  title: string;
  description?: string;
  url?: string;
  timestamp: string; // ISO 8601
  metadata: Record<string, unknown>;
}
```

### GitHub (via `gh` CLI)

Run these commands and parse the JSON output:

```bash
# PRs authored
gh pr list --author @me --search "created:>=YYYY-MM-DD" --json number,title,url,state,createdAt,mergedAt --limit 100

# PRs where you were a reviewer
gh pr list --search "reviewed-by:@me created:>=YYYY-MM-DD" --json number,title,url,createdAt --limit 100

# Recent commits (from events API)
gh api "/users/$(gh api user --jq .login)/events?per_page=100" --jq '[.[] | select(.type == "PushEvent")]'
```

**ID patterns:**
- PRs: `github-pr-{pr.number}` (use number from the repo context)
- Commits: `github-commit-{sha}`
- Issues: `github-issue-{issue.number}`

**Types:** `pr_created`, `pr_merged`, `pr_reviewed`, `commit`, `issue_created`

### Slack (via MCP)

**Step 1: Search messages**

Use `slack_search_public_and_private` with query `from:me after:YYYY-MM-DD before:YYYY-MM-DD`. Paginate through all results using the cursor.

**Step 2: Fetch thread context**

For each message that is part of a thread (indicated by a `thread_ts` in the result, or context showing it's a reply), use `slack_read_thread` to fetch the full thread conversation. This gives much richer context for the analysis — the user's message alone often doesn't capture the full topic being discussed.

When calling `slack_read_thread`, pass the channel ID and the thread's parent timestamp (`thread_ts`). Include the full thread text in the activity's metadata as `threadContext` — a condensed summary or the key messages from the thread.

Even for non-threaded messages, if the search result includes context messages around it, incorporate those into the activity description for better thematic analysis.

**Step 3: Build activities**

For each message, create an activity with:
- **title**: The user's message text (truncated to 120 chars)
- **description**: For threaded messages, include a brief summary of the thread topic and key participants. For channel messages, include the channel name.
- **metadata.threadContext**: The full thread conversation (all messages) as a single string. This is used by the analysis to understand context but is never displayed directly. Keep each thread message as "Author: message" on separate lines, truncated to ~2000 chars total per thread.
- **metadata.threadParticipants**: List of other people in the thread
- **metadata.threadMessageCount**: Total messages in the thread

**Privacy:** DMs, group DMs, and private channels must have `"private": true` set on the activity. This ensures they are included in the analysis (theme discovery, metrics) but never displayed in the dashboard timeline or source details. Determine privacy from the channel name — DMs typically show as "DM with ..." or "Group DM with ...", and private channels are indicated in the search results. When in doubt, mark as private.

**ID pattern:** `slack-{message.ts}-{channel.id}`
**Types:** `message_sent`, `thread_reply`

### Jira (via MCP)

Use `searchJiraIssuesUsingJql` with JQL: `assignee = currentUser() AND updated >= "YYYY-MM-DD" AND updated <= "YYYY-MM-DD" ORDER BY updated DESC`

**ID pattern:** `jira-{issue.key}`
**Types:** `issue_created` (if created in range), `issue_resolved` (if resolved in range), `issue_updated` (otherwise)

### Linear (via MCP)

Use `list_issues` to find issues assigned to the current user that were updated within the date range.

**ID pattern:** `linear-created-{issue.id}`, `linear-completed-{issue.id}`, or `linear-updated-{issue.id}`
**Types:** `task_created`, `task_completed`, `task_updated`

### Gmail (via MCP)

Use `gmail_search_messages` with query `from:me after:YYYY/MM/DD before:YYYY/MM/DD` for sent emails.

**ID pattern:** `gmail-sent-{message.id}`
**Types:** `email_sent`

### Google Calendar (via MCP)

Use `gcal_list_events` with `timeMin` and `timeMax` set to the date range. Filter out:
- All-day events (no `dateTime` in start)
- Declined events
- Cancelled events

**ID pattern:** `calendar-{event.id}`
**Types:** `meeting_attended`
**Metadata:** Include `durationMinutes` (calculated from start/end times), `attendeeCount`

### Claude Code (via local JSONL files)

Read conversation history from `~/.claude/projects/`. Each project directory contains `.jsonl` files — one per conversation session.

**How to collect:**

1. List all project directories in `~/.claude/projects/`
2. For each project, read the `.jsonl` files
3. Each line is a JSON object. Filter to lines where `timestamp` falls within the date range
4. Extract conversation sessions — group by `sessionId` field
5. For each session in range, create ONE activity summarizing the conversation:
   - Parse the project name from the directory name (e.g., `-Users-douglashall-code-v0-fedora` → `fedora`)
   - Count user messages (lines with `"type": "user"` that have a `message` field)
   - Count tool uses from assistant messages (content blocks with `"type": "tool_use"`)
   - Extract the first user message as the conversation topic/title
   - Note which tools were used (Read, Write, Edit, Bash, MCP tools, etc.)
   - Calculate duration from first to last timestamp in the session

**Reading the JSONL format:**
```python
# Each line is JSON with structure:
# { "type": "user"|"assistant"|"file-history-snapshot", "timestamp": "ISO", "sessionId": "uuid", "message": {...}, "cwd": "/path/to/project" }
#
# User messages: message.content is a string (the user's prompt)
# Assistant messages: message.content is an array of blocks:
#   - { "type": "text", "text": "..." }
#   - { "type": "tool_use", "name": "Bash", "input": {...} }
```

Use the Bash tool to run a Python script that reads the JSONL files and extracts session summaries. Example:

```bash
python3 -c "
import json, os, glob
from datetime import datetime

projects_dir = os.path.expanduser('~/.claude/projects')
start = 'YYYY-MM-DDTHH:MM:SS'  # fill in
end = 'YYYY-MM-DDTHH:MM:SS'    # fill in
activities = []

for proj in os.listdir(projects_dir):
    proj_path = os.path.join(projects_dir, proj)
    if not os.path.isdir(proj_path):
        continue
    # Derive readable project name
    proj_name = proj.split('-code-')[-1].replace('-', '/') if '-code-' in proj else proj

    for jf in glob.glob(os.path.join(proj_path, '*.jsonl')):
        sessions = {}
        with open(jf) as f:
            for line in f:
                obj = json.loads(line)
                ts = obj.get('timestamp', '')
                if not ts or ts < start or ts > end:
                    continue
                sid = obj.get('sessionId', os.path.basename(jf))
                if sid not in sessions:
                    sessions[sid] = {'first_ts': ts, 'last_ts': ts, 'user_msgs': [], 'tools': set(), 'msg_count': 0}
                s = sessions[sid]
                s['last_ts'] = ts
                s['msg_count'] += 1
                if obj.get('type') == 'user' and 'message' in obj:
                    content = obj['message'].get('content', '')
                    if isinstance(content, str) and len(content.strip()) > 5:
                        # Strip XML tags from skill invocations
                        clean = content.split('\n')[0][:150]
                        s['user_msgs'].append(clean)
                elif obj.get('type') == 'assistant' and 'message' in obj:
                    content = obj['message'].get('content', [])
                    if isinstance(content, list):
                        for block in content:
                            if isinstance(block, dict) and block.get('type') == 'tool_use':
                                s['tools'].add(block.get('name', ''))

        for sid, s in sessions.items():
            if not s['user_msgs']:
                continue
            first_prompt = s['user_msgs'][0]
            duration_min = (datetime.fromisoformat(s['last_ts'].replace('Z','')) - datetime.fromisoformat(s['first_ts'].replace('Z',''))).total_seconds() / 60
            activities.append({
                'id': f'claude-code-{sid}',
                'source': 'claude-code',
                'type': 'ai_conversation',
                'title': f'{proj_name}: {first_prompt}',
                'description': f'{len(s[\"user_msgs\"])} prompts, {len(s[\"tools\"])} tools used, {int(duration_min)} min',
                'timestamp': s['first_ts'],
                'metadata': {
                    'project': proj_name,
                    'sessionId': sid,
                    'promptCount': len(s['user_msgs']),
                    'toolsUsed': sorted(s['tools']),
                    'durationMinutes': round(duration_min, 1),
                    'messageCount': s['msg_count']
                }
            })

print(json.dumps(activities, indent=2))
"
```

**ID pattern:** `claude-code-{sessionId}`
**Types:** `ai_conversation`
**Metadata:** Include `project`, `sessionId`, `promptCount`, `toolsUsed`, `durationMinutes`, `messageCount`

### Codex (via local SQLite database)

Read conversation history from the Codex SQLite database at `~/.codex/state_5.sqlite`. The `threads` table contains rich metadata for every Codex session.

**How to collect:**

Use the Bash tool to run a SQLite query:

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

For each thread row, create an activity:
- **title**: Use the `title` column (Codex auto-generates a summary title)
- **description**: First 150 chars of `first_user_message`, plus model used
- **project**: Extract from `cwd` (e.g., `/Users/douglashall/code/v0/fedora` → `fedora`)
- **timestamp**: Convert `created_at` from Unix epoch to ISO 8601
- **duration**: Calculate from `updated_at - created_at`
- **metadata**: Include `project`, `model`, `tokensUsed`, `gitBranch`, `durationMinutes`, `source`

**ID pattern:** `codex-{thread.id}`
**Types:** `ai_conversation`

### GitHub Copilot (via local files)

Collect from two local sources: Copilot CLI sessions and VS Code Copilot chat sessions.

#### Copilot CLI sessions (`~/.copilot/session-state/`)

Each session directory contains a `workspace.yaml` with metadata and `events.jsonl` with full turn-by-turn history.

**How to collect:**

Use the Bash tool to run a Python script:

```bash
python3 -c "
import os, json, re
from datetime import datetime

sessions_dir = os.path.expanduser('~/.copilot/session-state')
start = 'YYYY-MM-DDTHH:MM:SS'  # fill in
end = 'YYYY-MM-DDTHH:MM:SS'    # fill in
activities = []

for sid in os.listdir(sessions_dir):
    ws_path = os.path.join(sessions_dir, sid, 'workspace.yaml')
    if not os.path.exists(ws_path):
        continue
    # Parse workspace.yaml (simple key: value)
    ws = {}
    with open(ws_path) as f:
        for line in f:
            m = re.match(r'^(\w+):\s*(.*)', line.strip())
            if m:
                ws[m.group(1)] = m.group(2)
    created = ws.get('created_at', '')
    if created < start or created > end:
        continue

    # Count user messages and extract first prompt from events
    events_path = os.path.join(sessions_dir, sid, 'events.jsonl')
    user_msgs = []
    tools = set()
    if os.path.exists(events_path):
        with open(events_path) as f:
            for line in f:
                obj = json.loads(line)
                if obj.get('type') == 'user.message':
                    content = obj.get('data', {}).get('content', '')
                    if content and len(content.strip()) > 3:
                        user_msgs.append(content[:150])
                elif obj.get('type') == 'tool.execution_start':
                    tools.add(obj.get('data', {}).get('toolName', ''))

    if not user_msgs:
        continue

    updated = ws.get('updated_at', created)
    try:
        dur = (datetime.fromisoformat(updated.replace('Z','')) - datetime.fromisoformat(created.replace('Z',''))).total_seconds() / 60
    except:
        dur = 0

    cwd = ws.get('cwd', '')
    project = cwd.split('/')[-1] if cwd else ''

    activities.append({
        'id': f'copilot-cli-{sid}',
        'source': 'copilot',
        'type': 'ai_conversation',
        'title': f'{project}: {ws.get(\"summary\", user_msgs[0][:80])}',
        'description': f'{len(user_msgs)} prompts, {len(tools)} tools, {int(dur)} min',
        'timestamp': created,
        'metadata': {
            'project': project,
            'repository': ws.get('repository', ''),
            'gitBranch': ws.get('branch', ''),
            'sessionId': sid,
            'promptCount': len(user_msgs),
            'toolsUsed': sorted(tools),
            'durationMinutes': round(dur, 1),
            'interface': 'cli'
        }
    })

print(json.dumps(activities, indent=2))
"
```

#### VS Code Copilot chat sessions (`state.vscdb`)

Chat session metadata is stored in SQLite databases per workspace.

**How to collect:**

Use the Bash tool to run a Python script:

```bash
python3 -c "
import os, sqlite3, json
from datetime import datetime

ws_dir = os.path.expanduser('~/Library/Application Support/Code/User/workspaceStorage')
start_ms = int(datetime.fromisoformat('YYYY-MM-DD').timestamp() * 1000)  # fill in
end_ms = int(datetime.fromisoformat('YYYY-MM-DD').timestamp() * 1000)    # fill in
activities = []

for d in os.listdir(ws_dir):
    db_path = os.path.join(ws_dir, d, 'state.vscdb')
    if not os.path.exists(db_path):
        continue
    try:
        conn = sqlite3.connect(db_path)
        cur = conn.cursor()

        # Get project name
        wj_path = os.path.join(ws_dir, d, 'workspace.json')
        project = ''
        if os.path.exists(wj_path):
            with open(wj_path) as f:
                wj = json.load(f)
                folder = wj.get('folder', '')
                project = folder.split('/')[-1] if folder else ''

        # Get session index
        cur.execute(\"SELECT value FROM ItemTable WHERE key = 'chat.ChatSessionStore.index'\")
        row = cur.fetchone()
        if not row:
            conn.close()
            continue

        data = json.loads(row[0])
        for sid, s in data.get('entries', {}).items():
            if s.get('isEmpty', True):
                continue
            created = s.get('timing', {}).get('created', 0)
            last_msg = s.get('lastMessageDate', 0)
            if not ((created >= start_ms and created <= end_ms) or (last_msg >= start_ms and last_msg <= end_ms)):
                continue

            ts = datetime.fromtimestamp(created/1000).isoformat() + 'Z' if created else ''
            activities.append({
                'id': f'copilot-vscode-{sid}',
                'source': 'copilot',
                'type': 'ai_conversation',
                'title': f'{project}: {s.get(\"title\", \"untitled\")}',
                'description': 'VS Code Copilot chat session',
                'timestamp': ts,
                'metadata': {
                    'project': project,
                    'sessionId': sid,
                    'interface': 'vscode'
                }
            })

        conn.close()
    except Exception:
        pass

print(json.dumps(activities, indent=2))
"
```

**ID patterns:**
- CLI sessions: `copilot-cli-{sessionId}`
- VS Code sessions: `copilot-vscode-{sessionId}`

**Types:** `ai_conversation`

## Step 3: Analyze the Data

You ARE Claude — analyze the collected activities directly. Produce the following structured analysis:

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
    impact: string[];       // 2-4 bullets on business/team impact (risk reduction, velocity, strategic goals)
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

- If a source's MCP tool is not available, skip it and note it in the output
- If `gh` CLI is not authenticated, skip GitHub and note it
- Always continue with whatever sources are available
- Never fail completely — partial data is still valuable
