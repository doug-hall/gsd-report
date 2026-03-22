import { ActivityItem, DateRange } from '../types';

export async function fetchJiraActivities(dateRange: DateRange): Promise<ActivityItem[]> {
  const baseUrl = process.env.JIRA_BASE_URL;
  const email = process.env.JIRA_EMAIL;
  const apiToken = process.env.JIRA_API_TOKEN;
  if (!baseUrl || !email || !apiToken) return [];

  const auth = Buffer.from(`${email}:${apiToken}`).toString('base64');
  const startDate = dateRange.start.split('T')[0];
  const endDate = dateRange.end.split('T')[0];

  const jql = `assignee = currentUser() AND updated >= "${startDate}" AND updated <= "${endDate}" ORDER BY updated DESC`;
  const res = await fetch(
    `${baseUrl}/rest/api/3/search?jql=${encodeURIComponent(jql)}&maxResults=100&fields=summary,status,issuetype,created,updated,resolutiondate,project`,
    {
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: 'application/json',
      },
    }
  );

  if (!res.ok) throw new Error(`Jira API error: ${res.status} ${res.statusText}`);
  const data = await res.json();
  const activities: ActivityItem[] = [];

  for (const issue of data.issues || []) {
    const fields = issue.fields;
    const isResolved = fields.resolutiondate != null;
    const isNew = fields.created >= dateRange.start;

    let type: 'issue_created' | 'issue_resolved' | 'issue_updated';
    if (isResolved && fields.resolutiondate >= dateRange.start) {
      type = 'issue_resolved';
    } else if (isNew) {
      type = 'issue_created';
    } else {
      type = 'issue_updated';
    }

    activities.push({
      id: `jira-${issue.key}`,
      source: 'jira',
      type,
      title: `${issue.key}: ${fields.summary}`,
      url: `${baseUrl}/browse/${issue.key}`,
      timestamp: type === 'issue_resolved' ? fields.resolutiondate : fields.updated,
      metadata: {
        key: issue.key,
        status: fields.status?.name,
        issueType: fields.issuetype?.name,
        project: fields.project?.name,
      },
    });
  }

  return activities;
}
