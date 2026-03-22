'use client';

import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ActivityItem, ActivitySource } from '@/lib/types';
import { SOURCE_COLORS, SOURCE_LABELS } from '@/lib/constants';
import { format, parseISO } from 'date-fns';

interface Props {
  activities: ActivityItem[];
}

export function ActivityChart({ activities }: Props) {
  const chartData = useMemo(() => {
    const byDay = new Map<string, Record<string, number>>();

    for (const activity of activities) {
      const day = format(parseISO(activity.timestamp), 'MMM d');
      const existing = byDay.get(day) || {};
      existing[activity.source] = (existing[activity.source] || 0) + 1;
      byDay.set(day, existing);
    }

    return Array.from(byDay.entries())
      .map(([day, counts]) => ({ day, ...counts }))
      .reverse(); // chronological order
  }, [activities]);

  const activeSources = useMemo(() => {
    const sources = new Set<ActivitySource>();
    for (const activity of activities) sources.add(activity.source);
    return Array.from(sources);
  }, [activities]);

  if (chartData.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <XAxis dataKey="day" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--popover)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                color: 'var(--popover-foreground)',
              }}
            />
            <Legend />
            {activeSources.map((source) => (
              <Bar
                key={source}
                dataKey={source}
                name={SOURCE_LABELS[source]}
                fill={SOURCE_COLORS[source]}
                stackId="stack"
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
