'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ActivityItem, ActivitySource } from '@/lib/types';
import { SOURCE_LABELS, SOURCE_COLORS } from '@/lib/constants';

interface Props {
  activities: ActivityItem[];
}

const PAGE_SIZE = 50;

export function ActivityTimeline({ activities }: Props) {
  const [sourceFilter, setSourceFilter] = useState<ActivitySource | 'all'>('all');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const publicActivities = useMemo(() => activities.filter((a) => !a.private), [activities]);

  const filtered = useMemo(() => {
    if (sourceFilter === 'all') return publicActivities;
    return publicActivities.filter((a) => a.source === sourceFilter);
  }, [publicActivities, sourceFilter]);

  const sources = useMemo(() => {
    const set = new Set<ActivitySource>();
    for (const a of activities) set.add(a.source);
    return Array.from(set);
  }, [activities]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Activity Timeline</CardTitle>
          <span className="text-sm text-muted-foreground">{filtered.length} activities</span>
        </div>
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Button
            size="sm"
            variant={sourceFilter === 'all' ? 'default' : 'outline'}
            onClick={() => setSourceFilter('all')}
            className="h-7 text-xs"
          >
            All
          </Button>
          {sources.map((source) => (
            <Button
              key={source}
              size="sm"
              variant={sourceFilter === source ? 'default' : 'outline'}
              onClick={() => setSourceFilter(source)}
              className="h-7 text-xs"
            >
              {SOURCE_LABELS[source]}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
          {filtered.slice(0, visibleCount).map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 py-1.5 border-b border-border/50 last:border-0"
            >
              <div
                className="w-2 h-2 rounded-full mt-2 shrink-0"
                style={{ backgroundColor: SOURCE_COLORS[activity.source] }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {activity.url ? (
                    <a
                      href={activity.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm hover:underline truncate"
                    >
                      {activity.title}
                    </a>
                  ) : (
                    <span className="text-sm truncate">{activity.title}</span>
                  )}
                  <Badge variant="outline" className="text-[10px] shrink-0">
                    {activity.type.replace(/_/g, ' ')}
                  </Badge>
                </div>
                {activity.description && (
                  <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                )}
              </div>
              <span className="text-xs text-muted-foreground shrink-0">
                {new Date(activity.timestamp).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </span>
            </div>
          ))}
        </div>
        {filtered.length > visibleCount && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2"
            onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
          >
            Show more ({filtered.length - visibleCount} remaining)
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
