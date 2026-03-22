import { ActivityItem, DateRange } from '../types';
import { getGoogleAccessToken } from './google-auth';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';

export async function fetchCalendarActivities(dateRange: DateRange): Promise<ActivityItem[]> {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) return [];

  const params = new URLSearchParams({
    timeMin: new Date(dateRange.start).toISOString(),
    timeMax: new Date(dateRange.end).toISOString(),
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '250',
  });

  const res = await fetch(`${CALENDAR_API}/calendars/primary/events?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error(`Google Calendar API error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  const activities: ActivityItem[] = [];

  for (const event of data.items || []) {
    // Skip all-day events and cancelled events
    if (!event.start?.dateTime || event.status === 'cancelled') continue;
    // Skip events the user declined
    const selfAttendee = event.attendees?.find((a: { self?: boolean }) => a.self);
    if (selfAttendee?.responseStatus === 'declined') continue;

    const startTime = new Date(event.start.dateTime);
    const endTime = new Date(event.end?.dateTime || event.start.dateTime);
    const durationMinutes = (endTime.getTime() - startTime.getTime()) / 60_000;

    activities.push({
      id: `calendar-${event.id}`,
      source: 'calendar',
      type: 'meeting_attended',
      title: event.summary || '(No title)',
      description: event.description ? event.description.slice(0, 200) : undefined,
      url: event.htmlLink,
      timestamp: event.start.dateTime,
      metadata: {
        durationMinutes,
        attendeeCount: event.attendees?.length || 1,
        isRecurring: !!event.recurringEventId,
        organizer: event.organizer?.email,
      },
    });
  }

  return activities;
}
