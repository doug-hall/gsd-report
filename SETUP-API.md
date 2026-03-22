# GSD Report - Direct API Setup Guide

This guide covers the **Direct API** approach to generating reports. In this mode, the Next.js app fetches data from each service's API using tokens you configure, then sends the collected data to the Claude API for analysis. Everything happens through the web dashboard.

> **Looking for the simpler approach?** If you use Claude Code with MCP integrations, see **[SETUP-SKILL.md](./SETUP-SKILL.md)** instead. The skill-based approach requires less configuration — no API tokens for Slack, Jira, Gmail, Calendar, or Linear, and no Anthropic API key. It also collects data from 3 additional sources (Claude Code, Codex, and GitHub Copilot chat history) that aren't available in direct API mode.

## Choosing an Approach

| | Direct API (this guide) | Claude Code Skill ([SETUP-SKILL.md](./SETUP-SKILL.md)) |
|---|---|---|
| **How it works** | Dashboard fetches data from APIs, Claude API analyzes it | Claude Code collects data via MCP + local files, analyzes inline |
| **Data sources** | GitHub, Slack, Jira, Gmail, Calendar, Linear (6) | All 6 above + Claude Code, Codex, Copilot (9) |
| **Auth setup** | API tokens/keys for each service in `.env.local` | MCP integrations in Claude Code + `gh` CLI |
| **Analysis** | Requires Anthropic API key + credits | Uses your Claude Code subscription (no extra cost) |
| **Usage** | Select date range in the web dashboard | Run `/gsd` in Claude Code terminal |
| **Slack thread context** | Not included | Full thread conversations fetched via MCP |
| **Private message handling** | DMs/private channels marked private automatically | Same — included in analysis, hidden from display |
| **Best for** | Automated/scheduled reports, no Claude Code dependency | Interactive use, richer data, simpler setup |

You can use both approaches together. They write to the same database and deduplicate by activity ID.

---

## Step 1: Install and Configure

```bash
git clone <your-repo-url> gsd-report
cd gsd-report
npm install
cp .env.local.example .env.local
```

Edit `.env.local` with the values from the sections below.

---

## Step 2: PostgreSQL (Required)

The app stores activities and reports in PostgreSQL.

### Local development

1. Install PostgreSQL if you don't have it:
   ```bash
   brew install postgresql@18
   ```

2. Start PostgreSQL:
   ```bash
   brew services start postgresql@18
   ```

3. Create the database:
   ```bash
   createdb gsd_report
   ```

4. Set the connection string in `.env`:
   ```
   DATABASE_URL="postgresql://YOUR_USERNAME@localhost:5432/gsd_report?schema=public"
   ```
   Replace `YOUR_USERNAME` with your macOS username (run `whoami` to check).

5. Run the migration:
   ```bash
   npx prisma migrate dev --name init
   ```

### Vercel / Production

Use Vercel Postgres or any hosted PostgreSQL. Set `DATABASE_URL` in your Vercel environment variables.

---

## Step 3: Claude API (Required)

The Claude API powers the AI analysis that discovers themes, generates the narrative summary, and writes the executive summary.

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign in or create an account
3. Navigate to **API Keys** in the left sidebar
4. Click **Create Key**, give it a name like "gsd-report"
5. Copy the key (starts with `sk-ant-`)

```
ANTHROPIC_API_KEY=sk-ant-...
```

> **Billing:** You'll need credits on your Anthropic account. Each report analysis costs roughly $0.01-0.05 depending on activity volume.

---

## Step 4: Data Sources (all optional)

Configure as many or as few as you like. Missing keys are silently skipped.

### GitHub

Provides: PRs created/reviewed/merged, commits, issues opened.

1. Go to [github.com/settings/tokens](https://github.com/settings/tokens)
2. Click **Generate new token** -> **Fine-grained token** (recommended)
3. Set a name like "gsd-report" and an expiration
4. Under **Repository access**, select "All repositories" (or specific ones you want tracked)
5. Under **Permissions -> Repository**, grant **Read-only** access to:
   - Issues
   - Pull requests
   - Contents
6. Click **Generate token** and copy it

```
GITHUB_TOKEN=github_pat_...
GITHUB_USERNAME=your-github-username
```

### Slack

Provides: Messages sent, channel activity, thread participation.

You'll need a Slack user token, which requires creating a Slack app in your workspace.

1. Go to [api.slack.com/apps](https://api.slack.com/apps) and click **Create New App** -> **From scratch**
2. Name it "GSD Report" and select your workspace
3. In the left sidebar, go to **OAuth & Permissions**
4. Under **User Token Scopes**, add:
   - `search:read` -- to search your messages
   - `channels:history` -- to fetch thread replies
   - `groups:history` -- to fetch private channel thread replies
   - `im:history` -- to fetch DM thread replies
   - `mpim:history` -- to fetch group DM thread replies
5. Scroll up and click **Install to Workspace**, then **Allow**
6. Copy the **User OAuth Token** (starts with `xoxp-`)

To find your Slack User ID:
1. Open Slack, click your profile picture -> **Profile**
2. Click the **...** (more) menu -> **Copy member ID**

```
SLACK_USER_TOKEN=xoxp-...
SLACK_USER_ID=U0XXXXXXX
```

> **Note:** You must be a workspace admin or have permission to install apps. If not, ask your workspace admin to approve the app.

### Jira / Atlassian

Provides: Issues created, updated, and resolved.

1. Go to [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Click **Create API token**
3. Give it a label like "gsd-report" and click **Create**
4. Copy the token

```
JIRA_BASE_URL=https://yourcompany.atlassian.net
JIRA_EMAIL=your-email@company.com
JIRA_API_TOKEN=your-api-token
```

> **JIRA_BASE_URL** is your Atlassian site URL -- check your browser's address bar when you're logged into Jira.

### Google (Gmail + Calendar)

Provides: Emails sent/received (subject lines only), meetings attended.

Google APIs require OAuth 2.0. You'll do a one-time setup to get a refresh token.

#### Create a Google Cloud project

1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Create a new project (e.g., "GSD Report")
3. In the left sidebar, go to **APIs & Services** -> **Enabled APIs & Services**
4. Click **+ Enable APIs and Services** and enable:
   - **Gmail API**
   - **Google Calendar API**

#### Create OAuth credentials

1. Go to **APIs & Services** -> **Credentials**
2. Click **+ Create Credentials** -> **OAuth client ID**
3. If prompted, configure the **OAuth consent screen** first:
   - User type: **External** (or Internal if using Google Workspace)
   - Fill in app name "GSD Report" and your email
   - Add scopes: `gmail.readonly` and `calendar.readonly`
   - Add yourself as a test user
4. Back in Credentials, create an **OAuth client ID**:
   - Application type: **Web application**
   - Add `http://localhost:3000` as an authorized redirect URI
5. Copy the **Client ID** and **Client Secret**

#### Get a refresh token

Run this URL in your browser (replace `YOUR_CLIENT_ID`):

```
https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:3000&response_type=code&scope=https://www.googleapis.com/auth/gmail.readonly%20https://www.googleapis.com/auth/calendar.readonly&access_type=offline&prompt=consent
```

1. Sign in and grant access
2. You'll be redirected to `http://localhost:3000?code=AUTHORIZATION_CODE`
3. Copy the `code` parameter from the URL
4. Exchange it for a refresh token by running:

```bash
curl -X POST https://oauth2.googleapis.com/token \
  -d "code=AUTHORIZATION_CODE" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "redirect_uri=http://localhost:3000" \
  -d "grant_type=authorization_code"
```

5. Copy the `refresh_token` from the JSON response

```
GOOGLE_CLIENT_ID=123456789-xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
GOOGLE_REFRESH_TOKEN=1//0xxxxx...
```

> **Important:** The refresh token is only returned on the first authorization. If you need a new one, revoke access at [myaccount.google.com/permissions](https://myaccount.google.com/permissions) and repeat with `prompt=consent`.

### Linear

Provides: Issues created, updated, and completed.

1. Go to [linear.app/settings/api](https://linear.app/settings/api)
2. Under **Personal API keys**, click **Create key**
3. Give it a label like "gsd-report"
4. Copy the key

```
LINEAR_API_KEY=lin_api_...
```

---

## Step 5: Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), select a date range, and your report will be generated. Only sources with valid API keys will be queried -- missing keys are silently skipped.

If a source fails (e.g., expired token), you'll see an error banner at the top of the dashboard while other sources continue to work. Reports are saved to the database and accessible from the report history.
