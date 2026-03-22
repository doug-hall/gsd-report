import { ActivityItem, DateRange } from '../types';

const LINEAR_API = 'https://api.linear.app/graphql';

async function linearQuery(query: string, variables: Record<string, unknown>, apiKey: string) {
  const res = await fetch(LINEAR_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Linear API error: ${res.status} ${res.statusText}`);
  const json = await res.json();
  if (json.errors) throw new Error(`Linear GraphQL error: ${json.errors[0].message}`);
  return json.data;
}

export async function fetchLinearActivities(dateRange: DateRange): Promise<ActivityItem[]> {
  const apiKey = process.env.LINEAR_API_KEY;
  if (!apiKey) return [];

  const query = `
    query($after: DateTime!, $before: DateTime!) {
      viewer {
        assignedIssues(
          filter: { updatedAt: { gte: $after, lte: $before } }
          first: 100
          orderBy: updatedAt
        ) {
          nodes {
            id
            identifier
            title
            description
            url
            createdAt
            updatedAt
            completedAt
            state { name type }
            project { name }
            team { name }
          }
        }
        createdIssues(
          filter: { createdAt: { gte: $after, lte: $before } }
          first: 100
          orderBy: createdAt
        ) {
          nodes {
            id
            identifier
            title
            url
            createdAt
            state { name type }
            project { name }
            team { name }
          }
        }
      }
    }
  `;

  const data = await linearQuery(query, { after: dateRange.start, before: dateRange.end }, apiKey);
  const activities: ActivityItem[] = [];
  const seenIds = new Set<string>();

  // Created issues
  for (const issue of data.viewer.createdIssues.nodes || []) {
    seenIds.add(issue.id);
    activities.push({
      id: `linear-created-${issue.id}`,
      source: 'linear',
      type: 'task_created',
      title: `${issue.identifier}: ${issue.title}`,
      url: issue.url,
      timestamp: issue.createdAt,
      metadata: { identifier: issue.identifier, state: issue.state?.name, project: issue.project?.name, team: issue.team?.name },
    });
  }

  // Assigned issues (updated in range)
  for (const issue of data.viewer.assignedIssues.nodes || []) {
    if (seenIds.has(issue.id)) continue;

    const isCompleted = issue.state?.type === 'completed' || issue.state?.type === 'done';
    activities.push({
      id: `linear-${isCompleted ? 'completed' : 'updated'}-${issue.id}`,
      source: 'linear',
      type: isCompleted ? 'task_completed' : 'task_updated',
      title: `${issue.identifier}: ${issue.title}`,
      url: issue.url,
      timestamp: issue.completedAt || issue.updatedAt,
      metadata: { identifier: issue.identifier, state: issue.state?.name, project: issue.project?.name, team: issue.team?.name },
    });
  }

  return activities;
}
