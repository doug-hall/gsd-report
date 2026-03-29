import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma — factory must be self-contained (no outer variable references)
vi.mock('@/lib/db', () => {
  const mockPrisma = {
    activity: {
      upsert: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
    },
    report: {
      create: vi.fn().mockResolvedValue({ id: 1 }),
      update: vi.fn().mockResolvedValue({ id: 1 }),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
    },
    $transaction: vi.fn().mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops)),
  };
  return { prisma: mockPrisma, productionPrisma: null };
});

import { prisma } from '@/lib/db';
import {
  upsertActivities,
  getActivities,
  saveReport,
  getReports,
  getReport,
} from '@/lib/services/db-activities';

const mockPrisma = vi.mocked(prisma, true);

function makeActivity(overrides: Record<string, unknown> = {}) {
  return {
    id: 'test-1',
    source: 'github' as const,
    type: 'commit' as const,
    title: 'Test commit',
    timestamp: '2026-03-20T12:00:00Z',
    metadata: {},
    ...overrides,
  };
}

function makeAnalysis() {
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
      totalActivities: 1, prsMerged: 0, issuesClosed: 0,
      meetingsAttended: 0, meetingHours: 0, messagesSent: 0,
      emailsSent: 0, commitsAuthored: 1, aiConversations: 0,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('upsertActivities', () => {
  it('upserts activities in batches', async () => {
    const activities = [0, 1, 2].map((i) => makeActivity({ id: `test-${i}`, title: `Activity ${i}` }));

    const count = await upsertActivities(activities);

    expect(count).toBe(3);
    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('stores the private flag in metadata._private', async () => {
    await upsertActivities([makeActivity({ id: 'private-1', private: true, metadata: { channel: 'DM' } })]);

    const upsertCall = mockPrisma.activity.upsert.mock.calls[0][0];
    expect(upsertCall.create.metadata._private).toBe(true);
    expect(upsertCall.update.metadata._private).toBe(true);
  });

  it('defaults _private to false when not set', async () => {
    await upsertActivities([makeActivity({ id: 'public-1' })]);

    const upsertCall = mockPrisma.activity.upsert.mock.calls[0][0];
    expect(upsertCall.create.metadata._private).toBe(false);
  });

  it('batches in chunks of 50', async () => {
    const activities = Array.from({ length: 120 }, (_, i) => makeActivity({ id: `batch-${i}` }));

    await upsertActivities(activities);

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(3);
  });
});

describe('getActivities', () => {
  it('restores the private flag from metadata._private', async () => {
    mockPrisma.activity.findMany.mockResolvedValueOnce([
      {
        id: 1, sourceId: 'slack-123', source: 'slack', type: 'message_sent',
        title: 'DM message', description: null, url: null,
        timestamp: new Date('2026-03-20T12:00:00Z'),
        metadata: { channel: 'DM', _private: true },
        createdAt: new Date(), updatedAt: new Date(),
      },
    ]);

    const activities = await getActivities({ start: '2026-03-15', end: '2026-03-22' });

    expect(activities[0].private).toBe(true);
    expect(activities[0].metadata).not.toHaveProperty('_private');
  });

  it('returns undefined for private when _private is false', async () => {
    mockPrisma.activity.findMany.mockResolvedValueOnce([
      {
        id: 2, sourceId: 'github-123', source: 'github', type: 'commit',
        title: 'Public commit', description: null, url: null,
        timestamp: new Date('2026-03-20T12:00:00Z'),
        metadata: { repo: 'test', _private: false },
        createdAt: new Date(), updatedAt: new Date(),
      },
    ]);

    const activities = await getActivities({ start: '2026-03-15', end: '2026-03-22' });

    expect(activities[0].private).toBeUndefined();
  });
});

describe('saveReport', () => {
  it('creates a new report when none exists', async () => {
    mockPrisma.report.findFirst.mockResolvedValueOnce(null);

    const result = await saveReport({ start: '2026-03-15', end: '2026-03-22' }, makeAnalysis(), 10);

    expect(result).toEqual({ id: 1 });
    expect(mockPrisma.report.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.report.update).not.toHaveBeenCalled();
  });

  it('updates existing report for the same date range', async () => {
    mockPrisma.report.findFirst.mockResolvedValueOnce({ id: 5 });

    await saveReport({ start: '2026-03-15', end: '2026-03-22' }, makeAnalysis(), 10);

    expect(mockPrisma.report.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 5 } })
    );
    expect(mockPrisma.report.create).not.toHaveBeenCalled();
  });

  it('stores executiveSummary when present', async () => {
    mockPrisma.report.findFirst.mockResolvedValueOnce(null);

    await saveReport({ start: '2026-03-15', end: '2026-03-22' }, makeAnalysis(), 5);

    const createCall = mockPrisma.report.create.mock.calls[0][0];
    const stored = JSON.parse(JSON.stringify(createCall.data.executiveSummary));
    expect(stored.headline).toBe('Test headline');
  });
});

describe('getReport', () => {
  it('returns null for non-existent report', async () => {
    mockPrisma.report.findUnique.mockResolvedValueOnce(null);
    expect(await getReport(999)).toBeNull();
  });

  it('returns a default executiveSummary when not stored', async () => {
    mockPrisma.report.findUnique.mockResolvedValueOnce({
      id: 1, narrative: 'Test', themes: [], categories: [],
      executiveSummary: null, insights: [], metrics: { totalActivities: 0 },
      startDate: new Date('2026-03-15'), endDate: new Date('2026-03-22'),
      activityCount: 0, createdAt: new Date(),
    });

    const result = await getReport(1);

    expect(result!.analysis.executiveSummary).toEqual({
      headline: '', accomplishments: [], impact: [], leadership: [], body: '',
    });
  });
});

describe('getReports', () => {
  it('converts dates to ISO strings', async () => {
    mockPrisma.report.findMany.mockResolvedValueOnce([
      {
        id: 1, startDate: new Date('2026-03-15T00:00:00Z'),
        endDate: new Date('2026-03-22T00:00:00Z'),
        activityCount: 50, createdAt: new Date('2026-03-22T18:00:00Z'),
      },
    ]);

    const reports = await getReports();

    expect(reports).toHaveLength(1);
    expect(reports[0].startDate).toContain('2026-03-15');
    expect(typeof reports[0].createdAt).toBe('string');
  });
});
