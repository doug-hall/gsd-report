import { ActivityItem, DateRange } from '../types';

const SLACK_API = 'https://slack.com/api';

async function slackFetch(method: string, params: Record<string, string>, token: string) {
  const url = new URL(`${SLACK_API}/${method}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Slack API error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  if (!data.ok) throw new Error(`Slack API error: ${data.error}`);
  return data;
}

interface ThreadMessage {
  user: string;
  text: string;
  ts: string;
}

async function fetchThreadContext(
  channelId: string,
  threadTs: string,
  token: string
): Promise<{ context: string; participants: string[]; messageCount: number } | null> {
  try {
    const data = await slackFetch('conversations.replies', {
      channel: channelId,
      ts: threadTs,
      limit: '50',
    }, token);

    const messages: ThreadMessage[] = data.messages || [];
    if (messages.length <= 1) return null;

    const participants = new Set<string>();
    const lines: string[] = [];
    let totalLen = 0;

    for (const msg of messages) {
      if (msg.user) participants.add(msg.user);
      const clean = (msg.text || '').replace(/<[^>]+>/g, '').replace(/\n/g, ' ').trim();
      if (clean && totalLen < 2000) {
        const line = `${msg.user || 'unknown'}: ${clean}`;
        lines.push(line);
        totalLen += line.length;
      }
    }

    return {
      context: lines.join('\n'),
      participants: Array.from(participants),
      messageCount: messages.length,
    };
  } catch {
    return null;
  }
}

export async function fetchSlackActivities(dateRange: DateRange): Promise<ActivityItem[]> {
  const token = process.env.SLACK_USER_TOKEN;
  const userId = process.env.SLACK_USER_ID;
  if (!token || !userId) return [];

  const activities: ActivityItem[] = [];

  // Search messages sent by the user
  const afterDate = dateRange.start.split('T')[0];
  const beforeDate = dateRange.end.split('T')[0];
  const query = `from:<@${userId}> after:${afterDate} before:${beforeDate}`;

  const data = await slackFetch('search.messages', {
    query,
    count: '100',
    sort: 'timestamp',
    sort_dir: 'desc',
  }, token);

  for (const match of data.messages?.matches || []) {
    const threadTs = match.thread_ts;
    const isThreadReply = threadTs && threadTs !== match.ts;
    const channelName = match.channel?.name || 'unknown';
    const channelId = match.channel?.id || 'unknown';
    const isDM = channelName.startsWith('mpdm-') || channelName === 'unknown' || !channelName.startsWith('#') && match.channel?.is_im;
    const isPrivate = isDM || match.channel?.is_private || match.channel?.is_mpim;

    // Fetch full thread context if this message is part of a thread
    let threadContext: string | undefined;
    let threadParticipants: string[] | undefined;
    let threadMessageCount: number | undefined;

    if (threadTs && channelId !== 'unknown') {
      const thread = await fetchThreadContext(channelId, threadTs, token);
      if (thread) {
        threadContext = thread.context;
        threadParticipants = thread.participants;
        threadMessageCount = thread.messageCount;
      }
    }

    const description = threadContext
      ? `#${channelName} (thread, ${threadMessageCount} messages)`
      : `#${channelName}`;

    activities.push({
      id: `slack-${match.ts}-${channelId}`,
      source: 'slack',
      type: isThreadReply ? 'thread_reply' : 'message_sent',
      title: truncate(match.text || '(no text)', 120),
      description,
      url: match.permalink,
      timestamp: new Date(parseFloat(match.ts) * 1000).toISOString(),
      private: isPrivate,
      metadata: {
        channel: channelName,
        channelId,
        isThread: !!isThreadReply,
        isPrivate,
        ...(threadContext && { threadContext }),
        ...(threadParticipants && { threadParticipants }),
        ...(threadMessageCount && { threadMessageCount }),
      },
    });
  }

  return activities;
}

function truncate(text: string, maxLen: number): string {
  // Strip Slack formatting
  const clean = text.replace(/<[^>]+>/g, '').replace(/\n/g, ' ').trim();
  if (clean.length <= maxLen) return clean;
  return clean.slice(0, maxLen - 3) + '...';
}
