import { ActivityItem, AnalysisResult } from '@/lib/types';

export function makeActivity(overrides: Partial<ActivityItem> = {}): ActivityItem {
  return {
    id: 'test-1',
    source: 'github',
    type: 'commit',
    title: 'Test commit',
    timestamp: '2026-03-20T12:00:00Z',
    metadata: {},
    ...overrides,
  };
}

export function makeAnalysis(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    themes: [],
    categories: [],
    narrative: 'Test narrative',
    executiveSummary: {
      headline: 'Test headline',
      accomplishments: ['Did a thing'],
      impact: ['Made impact'],
      leadership: ['Led something'],
      body: 'Test body',
    },
    insights: ['Test insight'],
    metrics: {
      totalActivities: 1,
      prsMerged: 0,
      issuesClosed: 0,
      meetingsAttended: 0,
      meetingHours: 0,
      messagesSent: 0,
      emailsSent: 0,
      commitsAuthored: 1,
      aiConversations: 0,
    },
    ...overrides,
  };
}
