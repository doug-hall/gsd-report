import { ActivitySource } from './types';

export const SOURCE_COLORS: Record<ActivitySource, string> = {
  github: '#24292e',
  slack: '#4a154b',
  jira: '#0052cc',
  gmail: '#ea4335',
  calendar: '#4285f4',
  linear: '#5e6ad2',
  'claude-code': '#d97706',
  codex: '#10a37f',
  copilot: '#6e40c9',
};

export const SOURCE_LABELS: Record<ActivitySource, string> = {
  github: 'GitHub',
  slack: 'Slack',
  jira: 'Jira',
  gmail: 'Gmail',
  calendar: 'Google Calendar',
  linear: 'Linear',
  'claude-code': 'Claude Code',
  codex: 'Codex',
  copilot: 'GitHub Copilot',
};

export const DATE_PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 2 weeks', days: 14 },
  { label: 'Last month', days: 30 },
] as const;
