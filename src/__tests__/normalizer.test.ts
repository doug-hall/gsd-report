import { describe, it, expect, vi } from 'vitest';
import { ActivityItem } from '@/lib/types';

// Mock all source fetchers — factories must not reference outer variables
vi.mock('@/lib/services/github', () => ({
  fetchGitHubActivities: vi.fn().mockResolvedValue([
    { id: 'github-1', source: 'github', type: 'commit', title: 'GH commit', timestamp: '2026-03-20T10:00:00Z', metadata: {} },
  ] satisfies ActivityItem[]),
}));
vi.mock('@/lib/services/linear', () => ({
  fetchLinearActivities: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/lib/services/jira', () => ({
  fetchJiraActivities: vi.fn().mockResolvedValue([
    { id: 'jira-1', source: 'jira', type: 'issue_created', title: 'Jira issue', timestamp: '2026-03-20T14:00:00Z', metadata: {} },
  ] satisfies ActivityItem[]),
}));
vi.mock('@/lib/services/slack', () => ({
  fetchSlackActivities: vi.fn().mockResolvedValue([
    { id: 'slack-1', source: 'slack', type: 'message_sent', title: 'Slack msg', timestamp: '2026-03-20T12:00:00Z', metadata: {} },
  ] satisfies ActivityItem[]),
}));
vi.mock('@/lib/services/calendar', () => ({
  fetchCalendarActivities: vi.fn().mockResolvedValue([]),
}));
vi.mock('@/lib/services/gmail', () => ({
  fetchGmailActivities: vi.fn().mockResolvedValue([]),
}));

import { fetchAllActivities } from '@/lib/services/normalizer';

const dateRange = { start: '2026-03-15T00:00:00Z', end: '2026-03-22T23:59:59Z' };

describe('fetchAllActivities', () => {
  it('merges activities from all sources', async () => {
    const { activities, errors } = await fetchAllActivities(dateRange);

    expect(errors).toEqual([]);
    expect(activities).toHaveLength(3);
    expect(activities.map((a) => a.source)).toEqual(
      expect.arrayContaining(['github', 'jira', 'slack'])
    );
  });

  it('sorts activities by timestamp descending', async () => {
    const { activities } = await fetchAllActivities(dateRange);

    for (let i = 1; i < activities.length; i++) {
      expect(new Date(activities[i - 1].timestamp).getTime())
        .toBeGreaterThanOrEqual(new Date(activities[i].timestamp).getTime());
    }
  });

  it('filters to requested sources only', async () => {
    const { activities } = await fetchAllActivities(dateRange, ['github']);

    expect(activities).toHaveLength(1);
    expect(activities[0].source).toBe('github');
  });

  it('collects errors without blocking other sources', async () => {
    const { fetchJiraActivities } = await import('@/lib/services/jira');
    vi.mocked(fetchJiraActivities).mockRejectedValueOnce(new Error('Jira auth failed'));

    const { activities, errors } = await fetchAllActivities(dateRange);

    expect(activities.length).toBeGreaterThan(0);
    expect(errors).toContain('Jira auth failed');
  });
});
