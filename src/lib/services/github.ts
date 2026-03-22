import { ActivityItem, DateRange } from '../types';

const GITHUB_API = 'https://api.github.com';

async function githubFetch(path: string, token: string) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  return res.json();
}

export async function fetchGitHubActivities(dateRange: DateRange): Promise<ActivityItem[]> {
  const token = process.env.GITHUB_TOKEN;
  const username = process.env.GITHUB_USERNAME;
  if (!token || !username) return [];

  const activities: ActivityItem[] = [];
  const since = dateRange.start;
  const until = dateRange.end;

  // Fetch PRs authored
  const prsAuthored = await githubFetch(
    `/search/issues?q=author:${username}+type:pr+created:${since}..${until}&per_page=100&sort=created`,
    token
  );
  for (const pr of prsAuthored.items || []) {
    const isMerged = pr.pull_request?.merged_at != null;
    activities.push({
      id: `github-pr-${pr.id}`,
      source: 'github',
      type: isMerged ? 'pr_merged' : 'pr_created',
      title: pr.title,
      description: `${pr.repository_url.split('/').slice(-2).join('/')}#${pr.number}`,
      url: pr.html_url,
      timestamp: pr.created_at,
      metadata: { state: pr.state, merged: isMerged, number: pr.number },
    });
  }

  // Fetch PRs reviewed
  const prsReviewed = await githubFetch(
    `/search/issues?q=reviewed-by:${username}+type:pr+created:${since}..${until}+-author:${username}&per_page=100&sort=created`,
    token
  );
  for (const pr of prsReviewed.items || []) {
    activities.push({
      id: `github-review-${pr.id}`,
      source: 'github',
      type: 'pr_reviewed',
      title: `Reviewed: ${pr.title}`,
      description: `${pr.repository_url.split('/').slice(-2).join('/')}#${pr.number}`,
      url: pr.html_url,
      timestamp: pr.created_at,
      metadata: { number: pr.number },
    });
  }

  // Fetch recent events (commits, issue comments, etc.)
  const events = await githubFetch(
    `/users/${username}/events?per_page=100`,
    token
  );
  for (const event of events || []) {
    const eventDate = event.created_at;
    if (eventDate < since || eventDate > until) continue;

    if (event.type === 'PushEvent') {
      for (const commit of event.payload.commits || []) {
        activities.push({
          id: `github-commit-${commit.sha}`,
          source: 'github',
          type: 'commit',
          title: commit.message.split('\n')[0],
          description: event.repo.name,
          url: `https://github.com/${event.repo.name}/commit/${commit.sha}`,
          timestamp: eventDate,
          metadata: { sha: commit.sha, repo: event.repo.name },
        });
      }
    } else if (event.type === 'IssuesEvent' && event.payload.action === 'opened') {
      activities.push({
        id: `github-issue-${event.payload.issue.id}`,
        source: 'github',
        type: 'issue_created',
        title: event.payload.issue.title,
        description: event.repo.name,
        url: event.payload.issue.html_url,
        timestamp: eventDate,
        metadata: { number: event.payload.issue.number },
      });
    }
  }

  return activities;
}
