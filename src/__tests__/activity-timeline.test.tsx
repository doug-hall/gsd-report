import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline';
import { ActivityItem } from '@/lib/types';

function makeActivity(overrides: Partial<ActivityItem> = {}): ActivityItem {
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

const publicGithub = makeActivity({ id: 'pub-1', source: 'github', title: 'Public commit' });
const publicSlack = makeActivity({ id: 'pub-2', source: 'slack', type: 'message_sent', title: 'Public channel message' });
const privateDM = makeActivity({ id: 'priv-1', source: 'slack', type: 'message_sent', title: 'Secret DM content', private: true });
const privateChannel = makeActivity({ id: 'priv-2', source: 'slack', type: 'message_sent', title: 'Private channel talk', private: true });

describe('ActivityTimeline', () => {
  it('renders public activities', () => {
    render(<ActivityTimeline activities={[publicGithub, publicSlack]} />);

    expect(screen.getByText('Public commit')).toBeInTheDocument();
    expect(screen.getByText('Public channel message')).toBeInTheDocument();
  });

  it('hides private activities from the timeline', () => {
    render(<ActivityTimeline activities={[publicGithub, privateDM, privateChannel]} />);

    expect(screen.getByText('Public commit')).toBeInTheDocument();
    expect(screen.queryByText('Secret DM content')).not.toBeInTheDocument();
    expect(screen.queryByText('Private channel talk')).not.toBeInTheDocument();
  });

  it('shows correct count excluding private activities', () => {
    render(<ActivityTimeline activities={[publicGithub, publicSlack, privateDM, privateChannel]} />);

    expect(screen.getByText('2 activities')).toBeInTheDocument();
  });

  it('still shows source filter buttons for sources with private activities', () => {
    render(<ActivityTimeline activities={[publicGithub, privateDM]} />);

    // Slack should appear as a filter button because the source exists in the full list
    expect(screen.getByText('Slack')).toBeInTheDocument();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
  });

  it('shows empty state when filtering to a source with only private activities', async () => {
    render(<ActivityTimeline activities={[publicGithub, privateDM]} />);

    // Click the Slack filter
    await userEvent.click(screen.getByText('Slack'));

    // Count should show 0 since the only Slack activity is private
    expect(screen.getByText('0 activities')).toBeInTheDocument();
  });
});
