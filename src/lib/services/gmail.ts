import { ActivityItem, DateRange } from '../types';
import { getGoogleAccessToken } from './google-auth';

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

export async function fetchGmailActivities(dateRange: DateRange): Promise<ActivityItem[]> {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) return [];

  const afterDate = dateRange.start.split('T')[0].replace(/-/g, '/');
  const beforeDate = dateRange.end.split('T')[0].replace(/-/g, '/');

  const activities: ActivityItem[] = [];

  // Fetch sent emails
  const sentQuery = `from:me after:${afterDate} before:${beforeDate}`;
  const sentRes = await fetch(
    `${GMAIL_API}/messages?q=${encodeURIComponent(sentQuery)}&maxResults=100`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!sentRes.ok) throw new Error(`Gmail API error: ${sentRes.status}`);
  const sentData = await sentRes.json();

  // Fetch metadata for each message (batch of subject + date)
  for (const msg of sentData.messages || []) {
    const metaRes = await fetch(
      `${GMAIL_API}/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=To&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!metaRes.ok) continue;
    const meta = await metaRes.json();

    const headers = meta.payload?.headers || [];
    const subject = headers.find((h: { name: string }) => h.name === 'Subject')?.value || '(No subject)';
    const to = headers.find((h: { name: string }) => h.name === 'To')?.value || '';
    const date = headers.find((h: { name: string }) => h.name === 'Date')?.value;

    activities.push({
      id: `gmail-sent-${msg.id}`,
      source: 'gmail',
      type: 'email_sent',
      title: subject,
      description: `To: ${to.split(',')[0]}`,
      timestamp: date ? new Date(date).toISOString() : new Date().toISOString(),
      metadata: { to, messageId: msg.id },
    });
  }

  // Fetch received emails
  const receivedQuery = `to:me after:${afterDate} before:${beforeDate} -from:me`;
  const recvRes = await fetch(
    `${GMAIL_API}/messages?q=${encodeURIComponent(receivedQuery)}&maxResults=100`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (recvRes.ok) {
    const recvData = await recvRes.json();
    for (const msg of recvData.messages || []) {
      const metaRes = await fetch(
        `${GMAIL_API}/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!metaRes.ok) continue;
      const meta = await metaRes.json();

      const headers = meta.payload?.headers || [];
      const subject = headers.find((h: { name: string }) => h.name === 'Subject')?.value || '(No subject)';
      const from = headers.find((h: { name: string }) => h.name === 'From')?.value || '';
      const date = headers.find((h: { name: string }) => h.name === 'Date')?.value;

      activities.push({
        id: `gmail-recv-${msg.id}`,
        source: 'gmail',
        type: 'email_received',
        title: subject,
        description: `From: ${from.split('<')[0].trim()}`,
        timestamp: date ? new Date(date).toISOString() : new Date().toISOString(),
        metadata: { from, messageId: msg.id },
      });
    }
  }

  return activities;
}
