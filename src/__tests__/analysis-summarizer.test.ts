import { describe, it, expect } from 'vitest';

// Replicate the summarizeActivities logic from claude.ts (it's not exported)
function summarizeActivities(activities: { timestamp: string; source: string; type: string; title: string }[]) {
  const grouped = new Map<string, { count: number; types: Set<string>; titles: string[] }>();

  for (const activity of activities) {
    const day = activity.timestamp.split('T')[0];
    const key = `${day}|${activity.source}`;
    const existing = grouped.get(key);

    if (existing) {
      existing.count++;
      existing.types.add(activity.type);
      if (existing.titles.length < 5) existing.titles.push(activity.title);
    } else {
      grouped.set(key, {
        count: 1,
        types: new Set([activity.type]),
        titles: [activity.title],
      });
    }
  }

  return Array.from(grouped.entries()).map(([key, data]) => {
    const [day, source] = key.split('|');
    return {
      day,
      source,
      count: data.count,
      types: Array.from(data.types),
      sampleTitles: data.titles,
    };
  });
}

describe('summarizeActivities', () => {
  it('groups activities by day and source', () => {
    const activities = [
      { id: '1', source: 'github', type: 'commit', timestamp: '2026-03-20T10:00:00Z', title: 'commit 1' },
      { id: '2', source: 'github', type: 'commit', timestamp: '2026-03-20T14:00:00Z', title: 'commit 2' },
      { id: '3', source: 'slack', type: 'message_sent', timestamp: '2026-03-20T12:00:00Z', title: 'msg 1' },
      { id: '4', source: 'github', type: 'pr_created', timestamp: '2026-03-19T09:00:00Z', title: 'pr 1' },
    ];

    const result = summarizeActivities(activities);

    expect(result).toHaveLength(3);

    const githubMar20 = result.find((r) => r.day === '2026-03-20' && r.source === 'github');
    expect(githubMar20).toBeDefined();
    expect(githubMar20!.count).toBe(2);
    expect(githubMar20!.sampleTitles).toEqual(['commit 1', 'commit 2']);

    const slackMar20 = result.find((r) => r.day === '2026-03-20' && r.source === 'slack');
    expect(slackMar20).toBeDefined();
    expect(slackMar20!.count).toBe(1);
  });

  it('collects unique types per group', () => {
    const activities = [
      { source: 'github', type: 'commit', timestamp: '2026-03-20T10:00:00Z', title: 'a' },
      { source: 'github', type: 'pr_created', timestamp: '2026-03-20T14:00:00Z', title: 'b' },
      { source: 'github', type: 'commit', timestamp: '2026-03-20T16:00:00Z', title: 'c' },
    ];

    const result = summarizeActivities(activities);

    expect(result[0].types).toHaveLength(2);
    expect(result[0].types).toContain('commit');
    expect(result[0].types).toContain('pr_created');
  });

  it('limits sample titles to 5', () => {
    const activities = Array.from({ length: 10 }, (_, i) => ({
      source: 'github', type: 'commit', timestamp: '2026-03-20T10:00:00Z', title: `title ${i}`,
    }));

    const result = summarizeActivities(activities);

    expect(result[0].count).toBe(10);
    expect(result[0].sampleTitles).toHaveLength(5);
  });

  it('handles claude-code source with hyphenated name', () => {
    const activities = [
      { source: 'claude-code', type: 'ai_conversation', timestamp: '2026-03-20T10:00:00Z', title: 'session' },
    ];

    const result = summarizeActivities(activities);

    expect(result[0].source).toBe('claude-code');
    expect(result[0].day).toBe('2026-03-20');
  });
});
