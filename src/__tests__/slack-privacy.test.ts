import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Must set env before importing the module
vi.stubEnv('SLACK_USER_TOKEN', 'xoxp-test');
vi.stubEnv('SLACK_USER_ID', 'U12345');

import { fetchSlackActivities } from '@/lib/services/slack';

function mockSlackResponse(matches: Record<string, unknown>[]) {
  // First call: search.messages
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      ok: true,
      messages: { matches },
    }),
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

const dateRange = { start: '2026-03-15T00:00:00Z', end: '2026-03-22T23:59:59Z' };

describe('Slack privacy detection', () => {
  it('marks DM channels as private', async () => {
    mockSlackResponse([
      {
        ts: '1710000000.000',
        text: 'Hello',
        channel: { id: 'D123', name: 'unknown', is_im: true },
      },
    ]);

    const activities = await fetchSlackActivities(dateRange);

    expect(activities).toHaveLength(1);
    expect(activities[0].private).toBe(true);
    expect(activities[0].metadata.isPrivate).toBe(true);
  });

  it('marks mpdm channels as private', async () => {
    mockSlackResponse([
      {
        ts: '1710000001.000',
        text: 'Group chat',
        channel: { id: 'G123', name: 'mpdm-user1-user2-1', is_mpim: true },
      },
    ]);

    const activities = await fetchSlackActivities(dateRange);

    expect(activities[0].private).toBe(true);
  });

  it('marks private channels as private', async () => {
    mockSlackResponse([
      {
        ts: '1710000002.000',
        text: 'Secret stuff',
        channel: { id: 'C123', name: 'secret-channel', is_private: true },
      },
    ]);

    const activities = await fetchSlackActivities(dateRange);

    expect(activities[0].private).toBe(true);
  });

  it('does not mark public channels as private', async () => {
    mockSlackResponse([
      {
        ts: '1710000003.000',
        text: 'Public message',
        channel: { id: 'C456', name: 'dev-guild-ai' },
      },
    ]);

    const activities = await fetchSlackActivities(dateRange);

    expect(activities[0].private).toBeFalsy();
  });

  it('returns empty array when no tokens configured', async () => {
    vi.stubEnv('SLACK_USER_TOKEN', '');
    vi.stubEnv('SLACK_USER_ID', '');

    // Re-import to get fresh module with empty env
    vi.resetModules();
    const { fetchSlackActivities: freshFetch } = await import('@/lib/services/slack');
    const activities = await freshFetch(dateRange);

    expect(activities).toEqual([]);

    // Restore
    vi.stubEnv('SLACK_USER_TOKEN', 'xoxp-test');
    vi.stubEnv('SLACK_USER_ID', 'U12345');
  });
});

describe('Slack thread context', () => {
  it('fetches thread replies when thread_ts is present', async () => {
    // search.messages response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        messages: {
          matches: [
            {
              ts: '1710000010.000',
              thread_ts: '1710000005.000',
              text: 'My reply',
              channel: { id: 'C789', name: 'dev' },
            },
          ],
        },
      }),
    });

    // conversations.replies response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ok: true,
        messages: [
          { user: 'U001', text: 'Original question', ts: '1710000005.000' },
          { user: 'U12345', text: 'My reply', ts: '1710000010.000' },
          { user: 'U002', text: 'Thanks!', ts: '1710000015.000' },
        ],
      }),
    });

    const activities = await fetchSlackActivities(dateRange);

    expect(activities).toHaveLength(1);
    expect(activities[0].type).toBe('thread_reply');
    expect(activities[0].metadata.threadMessageCount).toBe(3);
    expect(activities[0].metadata.threadParticipants).toEqual(
      expect.arrayContaining(['U001', 'U12345', 'U002'])
    );
    expect(activities[0].metadata.threadContext).toContain('U001: Original question');
  });
});
