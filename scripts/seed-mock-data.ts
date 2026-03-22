/**
 * Seeds the database with realistic mock data for screenshots/demos.
 * Run with: npx tsx scripts/seed-mock-data.ts
 */

const activities = [
  // GitHub commits
  ...['payment-service', 'user-dashboard', 'api-gateway', 'design-system', 'mobile-app'].flatMap((repo, ri) =>
    Array.from({ length: 4 + ri }, (_, i) => ({
      id: `github-commit-${repo}-${i}`,
      source: 'github',
      type: 'commit',
      title: `Push to acme/${repo} (${['main', 'feat/checkout-v2', 'fix/auth-redirect', 'refactor/api-layer', 'feat/dark-mode'][i % 5]})`,
      url: `https://github.com/acme/${repo}/commit/abc${ri}${i}`,
      timestamp: new Date(2026, 2, 15 + Math.floor(i * 1.5), 9 + i * 2, i * 15).toISOString(),
      metadata: { repo: `acme/${repo}`, branch: ['main', 'feat/checkout-v2', 'fix/auth-redirect'][i % 3] },
    }))
  ),

  // Slack messages (public)
  ...[
    { ch: 'engineering', title: 'Shipped the new checkout flow to staging, ready for QA', ts: 16 },
    { ch: 'engineering', title: 'FYI: API response times are back to normal after the cache fix', ts: 17 },
    { ch: 'proj-checkout-v2', title: 'Updated the Stripe integration to support 3D Secure', ts: 15 },
    { ch: 'proj-checkout-v2', title: 'Here are the load test results from the new payment flow', ts: 18 },
    { ch: 'dev-platform', title: 'Deployed the new CI pipeline config, build times down ~40%', ts: 16 },
    { ch: 'dev-platform', title: 'RFC: Proposing we migrate to Turborepo for the monorepo', ts: 19 },
    { ch: 'design-eng', title: 'New component variants are published to the design system', ts: 17 },
    { ch: 'incidents', title: 'Post-mortem for the March 18 latency spike is up for review', ts: 20 },
  ].map((m, i) => ({
    id: `slack-${1710000000 + i * 1000}-C${i}`,
    source: 'slack',
    type: 'message_sent' as const,
    title: m.title,
    description: `#${m.ch}`,
    timestamp: new Date(2026, 2, m.ts, 10 + i, 30).toISOString(),
    metadata: { channel: m.ch, isPrivate: false },
  })),

  // Slack DMs (private)
  ...[
    { title: 'Sounds good, I will review the PR this afternoon', ts: 16 },
    { title: 'Can you take a look at the migration plan when you get a chance?', ts: 17 },
    { title: 'Thanks for the help debugging that auth issue', ts: 18 },
    { title: 'Agreed, lets sync on the roadmap tomorrow', ts: 19 },
    { title: 'Confirmed, the deploy looks clean in production', ts: 20 },
  ].map((m, i) => ({
    id: `slack-dm-${i}`,
    source: 'slack',
    type: 'message_sent' as const,
    title: m.title,
    description: 'DM',
    timestamp: new Date(2026, 2, m.ts, 14 + i, 0).toISOString(),
    private: true,
    metadata: { channel: 'DM', isPrivate: true },
  })),

  // Jira issues
  ...[
    { key: 'ENG-1042', summary: 'Implement Stripe 3D Secure for checkout v2', status: 'Done', type: 'issue_resolved' },
    { key: 'ENG-1038', summary: 'API gateway rate limiting not applied to webhooks', status: 'Done', type: 'issue_resolved' },
    { key: 'ENG-1045', summary: 'Migrate payment-service to Node 22', status: 'Done', type: 'issue_resolved' },
    { key: 'ENG-1050', summary: 'Design system: add dark mode token support', status: 'In Progress', type: 'issue_updated' },
    { key: 'ENG-1033', summary: 'Reduce P95 latency on /api/orders endpoint', status: 'Done', type: 'issue_resolved' },
    { key: 'ONCALL-89', summary: 'Post-mortem: March 18 latency spike', status: 'Done', type: 'issue_resolved' },
  ].map((j, i) => ({
    id: `jira-${j.key}`,
    source: 'jira',
    type: j.type,
    title: `${j.key}: ${j.summary}`,
    url: `https://acme.atlassian.net/browse/${j.key}`,
    timestamp: new Date(2026, 2, 16 + i, 11, 0).toISOString(),
    metadata: { key: j.key, status: j.status, project: 'Engineering' },
  })),

  // Calendar events
  ...[
    { title: 'Engineering Standup', dur: 30, att: 8, day: 16 },
    { title: 'Sprint Planning', dur: 60, att: 6, day: 16 },
    { title: '1:1 with Sarah (Manager)', dur: 30, att: 2, day: 17 },
    { title: 'Checkout v2 Design Review', dur: 45, att: 5, day: 17 },
    { title: 'Engineering Standup', dur: 30, att: 8, day: 18 },
    { title: 'Architecture Review: API Gateway', dur: 60, att: 7, day: 18 },
    { title: '1:1 with Alex', dur: 30, att: 2, day: 18 },
    { title: 'Engineering Standup', dur: 30, att: 8, day: 19 },
    { title: 'Incident Review: March 18 Latency', dur: 45, att: 12, day: 19 },
    { title: 'Platform Team Retro', dur: 30, att: 5, day: 19 },
    { title: 'Engineering Standup', dur: 30, att: 8, day: 20 },
    { title: '1:1 with Jordan', dur: 30, att: 2, day: 20 },
    { title: 'Demo Day', dur: 60, att: 15, day: 20 },
    { title: 'CS146S Study Group', dur: 40, att: 6, day: 20 },
  ].map((c, i) => ({
    id: `calendar-mock-${i}`,
    source: 'calendar',
    type: 'meeting_attended',
    title: c.title,
    timestamp: new Date(2026, 2, c.day, 9 + (i % 6), 0).toISOString(),
    metadata: { durationMinutes: c.dur, attendeeCount: c.att },
  })),

  // Gmail
  ...[
    { subj: 'Accepted: Sprint Planning', to: 'Sarah Kim', day: 16 },
    { subj: 'Accepted: Checkout v2 Design Review', to: 'Product Team', day: 17 },
    { subj: 'Accepted: Architecture Review', to: 'Platform Team', day: 18 },
    { subj: 'Re: API Gateway Migration Timeline', to: 'Alex Chen', day: 18 },
    { subj: 'Accepted: Demo Day', to: 'Engineering', day: 19 },
  ].map((g, i) => ({
    id: `gmail-mock-${i}`,
    source: 'gmail',
    type: 'email_sent',
    title: g.subj,
    description: `To: ${g.to}`,
    timestamp: new Date(2026, 2, g.day, 8 + i, 30).toISOString(),
    metadata: { to: g.to },
  })),

  // Claude Code sessions
  ...[
    { project: 'payment-service', title: 'Implement Stripe 3D Secure integration', prompts: 24, tools: 12, dur: 145 },
    { project: 'api-gateway', title: 'Debug rate limiting bypass on webhook endpoints', prompts: 15, tools: 8, dur: 90 },
    { project: 'design-system', title: 'Add dark mode token support across all components', prompts: 18, tools: 10, dur: 120 },
    { project: 'infra', title: 'Optimize CI pipeline config for faster builds', prompts: 8, tools: 6, dur: 45 },
  ].map((c, i) => ({
    id: `claude-code-mock-${i}`,
    source: 'claude-code',
    type: 'ai_conversation',
    title: `${c.project}: ${c.title}`,
    description: `${c.prompts} prompts, ${c.tools} tools used, ${c.dur} min`,
    timestamp: new Date(2026, 2, 16 + i, 10, 0).toISOString(),
    metadata: { project: c.project, promptCount: c.prompts, durationMinutes: c.dur },
  })),

  // Codex sessions
  ...[
    { project: 'payment-service', title: 'Scaffold webhook event handlers', model: 'gpt-5.4', tokens: 842000, dur: 65 },
    { project: 'mobile-app', title: 'Set up React Native navigation stack', model: 'gpt-5.4', tokens: 1200000, dur: 90 },
    { project: 'api-gateway', title: 'Add OpenTelemetry tracing middleware', model: 'gpt-5.4', tokens: 560000, dur: 40 },
  ].map((c, i) => ({
    id: `codex-mock-${i}`,
    source: 'codex',
    type: 'ai_conversation',
    title: `${c.project}: ${c.title}`,
    description: `Model: ${c.model}, ${c.tokens.toLocaleString()} tokens, ${c.dur} min`,
    timestamp: new Date(2026, 2, 17 + i, 14, 0).toISOString(),
    metadata: { project: c.project, model: c.model, tokensUsed: c.tokens, durationMinutes: c.dur },
  })),
];

const analysis = {
  themes: [
    {
      name: 'Checkout v2 Launch',
      description: 'Implemented Stripe 3D Secure, built webhook handlers, and shipped the new payment flow to staging with load testing validation.',
      activityCount: 22,
      activityIds: [],
    },
    {
      name: 'API Gateway Hardening',
      description: 'Fixed webhook rate limiting bypass, added OpenTelemetry tracing, and reduced P95 latency on the orders endpoint.',
      activityCount: 15,
      activityIds: [],
    },
    {
      name: 'Platform & CI/CD Improvements',
      description: 'Optimized CI pipeline reducing build times by ~40%. Proposed Turborepo migration RFC for the monorepo.',
      activityCount: 10,
      activityIds: [],
    },
    {
      name: 'Design System Evolution',
      description: 'Added dark mode token support across all components and published new component variants.',
      activityCount: 8,
      activityIds: [],
    },
    {
      name: 'Incident Response & Reliability',
      description: 'Led post-mortem for the March 18 latency spike, identified root cause in cache invalidation, and deployed the fix.',
      activityCount: 6,
      activityIds: [],
    },
  ],
  categories: [
    { category: 'Feature Development', count: 28, percentage: 28, sources: ['github'] },
    { category: 'AI-Assisted Development', count: 7, percentage: 7, sources: ['claude-code', 'codex'] },
    { category: 'Communication', count: 13, percentage: 13, sources: ['slack'] },
    { category: 'Meetings', count: 14, percentage: 14, sources: ['calendar'] },
    { category: 'Project Management', count: 6, percentage: 6, sources: ['jira'] },
    { category: 'Email', count: 5, percentage: 5, sources: ['gmail'] },
  ],
  narrative: 'This was a high-impact week centered on launching the checkout v2 payment flow and strengthening API infrastructure. The Stripe 3D Secure integration was completed and shipped to staging, with load testing confirming the new flow handles 3x current peak traffic. A critical rate limiting bypass on webhook endpoints was identified and patched, and P95 latency on the orders endpoint was reduced through targeted query optimization.\n\nPlatform improvements included a CI pipeline overhaul that cut build times by approximately 40%, benefiting every team shipping code through the monorepo. A Turborepo migration RFC was proposed to further improve the development experience. The design system received dark mode token support, enabling downstream apps to adopt dark mode without individual implementation effort.\n\nThe week also included incident response work following the March 18 latency spike. A thorough post-mortem identified cache invalidation as the root cause, and the fix was deployed and verified in production. AI-assisted development continued to be a force multiplier, with 7 sessions across Claude Code and Codex used for everything from implementing the Stripe integration to scaffolding webhook handlers and adding observability middleware.',
  executiveSummary: {
    headline: 'Delivered the checkout v2 payment integration and critical API infrastructure improvements while driving platform-wide build performance gains.',
    accomplishments: [
      'Completed and staged the Stripe 3D Secure integration (ENG-1042), enabling the checkout v2 launch with verified support for 3x peak traffic.',
      'Identified and resolved a webhook rate limiting bypass (ENG-1038) that could have allowed abuse of payment notification endpoints.',
      'Reduced P95 latency on the /api/orders endpoint (ENG-1033) through query optimization, improving checkout completion rates.',
      'Overhauled CI pipeline configuration, reducing build times by ~40% across all repositories in the monorepo.',
      'Led the post-mortem for the March 18 latency incident (ONCALL-89), identified root cause, and deployed the fix.',
    ],
    impact: [
      'The checkout v2 payment flow unblocks the revenue team\'s Q2 goal of expanding into markets requiring 3D Secure compliance (EU, UK, India).',
      'CI build time reduction from ~8 minutes to ~5 minutes saves approximately 15 engineer-hours per week across the 30-person engineering team.',
      'The rate limiting fix closes a potential abuse vector on payment webhook endpoints before the checkout v2 public launch.',
    ],
    leadership: [
      'Authored and circulated the Turborepo migration RFC, gathering feedback from 4 teams and building consensus for the Q2 platform roadmap.',
      'Led the March 18 incident post-mortem with 12 attendees, establishing new cache invalidation monitoring and runbook updates.',
      'Mentored Alex on OpenTelemetry instrumentation patterns through pair programming and 1:1 sessions.',
    ],
    body: 'This week demonstrated strong execution across multiple workstreams with clear business impact. The completion of the Stripe 3D Secure integration represents a critical enabler for international expansion, directly supporting the revenue team\'s Q2 objectives. The work required careful coordination with the payments infrastructure and thorough load testing to ensure production readiness.\n\nBeyond feature delivery, significant contributions were made to platform reliability and developer experience. The CI pipeline optimization delivers compounding time savings across the entire engineering organization, while the webhook rate limiting fix proactively addresses a security concern ahead of the checkout v2 public launch. The incident post-mortem leadership and subsequent monitoring improvements demonstrate a commitment to operational excellence.\n\nNotably, AI-assisted development tools were leveraged effectively throughout the week, with 7 sessions used to accelerate implementation of the Stripe integration, scaffold webhook handlers, and add observability instrumentation. This approach, combined with active mentorship and RFC-driven collaboration, reflects a working style that amplifies both individual output and team velocity.',
  },
  insights: [
    'Closed 5 out of 6 Jira issues this week, including a critical security fix (ENG-1038) and a performance optimization (ENG-1033).',
    'AI-assisted development sessions averaged 85 minutes each, with the longest (Stripe integration) spanning 145 minutes and 24 prompts.',
    'Commit activity spanned 5 repositories, with payment-service and api-gateway receiving the most attention.',
    'Meeting load was healthy at ~8.8 hours across 14 meetings, with a good balance of standups, 1:1s, and cross-functional reviews.',
    'The CI pipeline improvement has an estimated ROI of ~15 engineer-hours saved per week across the team.',
  ],
  metrics: {
    totalActivities: activities.length,
    prsMerged: 3,
    issuesClosed: 5,
    meetingsAttended: 14,
    meetingHours: 8.8,
    messagesSent: 13,
    emailsSent: 5,
    commitsAuthored: 28,
    aiConversations: 7,
  },
};

async function seed() {
  const ingestRes = await fetch('http://localhost:3000/api/activities/ingest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activities }),
  });
  const ingestData = await ingestRes.json();
  console.log(`Ingested: ${ingestData.upserted} activities`);

  const reportRes = await fetch('http://localhost:3000/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      dateRange: { start: '2026-03-15T00:00:00Z', end: '2026-03-22T23:59:59Z' },
      analysis,
      activityCount: activities.length,
    }),
  });
  const reportData = await reportRes.json();
  console.log(`Report saved: id=${reportData.id}`);
  console.log('\nOpen http://localhost:3000 to view the dashboard');
}

seed().catch(console.error);
