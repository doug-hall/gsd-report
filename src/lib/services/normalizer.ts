import { ActivityItem, ActivitySource, DateRange } from '../types';
import { fetchGitHubActivities } from './github';
import { fetchLinearActivities } from './linear';
import { fetchJiraActivities } from './jira';
import { fetchSlackActivities } from './slack';
import { fetchCalendarActivities } from './calendar';
import { fetchGmailActivities } from './gmail';

const SOURCE_FETCHERS: Record<ActivitySource, (dateRange: DateRange) => Promise<ActivityItem[]>> = {
  github: fetchGitHubActivities,
  linear: fetchLinearActivities,
  jira: fetchJiraActivities,
  slack: fetchSlackActivities,
  calendar: fetchCalendarActivities,
  gmail: fetchGmailActivities,
  'claude-code': async () => [], // Collected via /gsd skill, not API
  codex: async () => [], // Collected via /gsd skill, not API
  copilot: async () => [], // Collected via /gsd skill, not API
};

export async function fetchAllActivities(
  dateRange: DateRange,
  sources?: ActivitySource[]
): Promise<{ activities: ActivityItem[]; errors: string[] }> {
  const activeSources = sources || (Object.keys(SOURCE_FETCHERS) as ActivitySource[]);

  const results = await Promise.allSettled(
    activeSources.map(async (source) => {
      const fetcher = SOURCE_FETCHERS[source];
      const items = await fetcher(dateRange);
      return { source, items };
    })
  );

  const activities: ActivityItem[] = [];
  const errors: string[] = [];

  for (const result of results) {
    if (result.status === 'fulfilled') {
      activities.push(...result.value.items);
    } else {
      const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
      errors.push(reason);
    }
  }

  // Sort by timestamp descending (most recent first)
  activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return { activities, errors };
}
