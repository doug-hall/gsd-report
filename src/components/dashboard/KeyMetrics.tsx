'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { KeyMetrics as KeyMetricsType } from '@/lib/types';

interface Props {
  metrics: KeyMetricsType;
}

const METRIC_CARDS = [
  { key: 'totalActivities' as const, label: 'Total Activities', icon: '⚡' },
  { key: 'prsMerged' as const, label: 'PRs Merged', icon: '🔀' },
  { key: 'commitsAuthored' as const, label: 'Commits', icon: '💻' },
  { key: 'issuesClosed' as const, label: 'Issues Closed', icon: '✅' },
  { key: 'meetingsAttended' as const, label: 'Meetings', icon: '📅' },
  { key: 'meetingHours' as const, label: 'Meeting Hours', icon: '⏱️' },
  { key: 'messagesSent' as const, label: 'Messages Sent', icon: '💬' },
  { key: 'emailsSent' as const, label: 'Emails Sent', icon: '📧' },
  { key: 'aiConversations' as const, label: 'AI Sessions', icon: '🤖' },
];

export function KeyMetrics({ metrics }: Props) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {METRIC_CARDS.map(({ key, label, icon }) => (
        <Card key={key}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {icon} {label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {key === 'meetingHours' ? metrics[key].toFixed(1) : metrics[key]}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
