'use client';

import { useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ActivityItem, ActivitySource } from '@/lib/types';
import { SOURCE_LABELS } from '@/lib/constants';

interface Props {
  activities: ActivityItem[];
}

export function SourceSummary({ activities }: Props) {
  const bySource = useMemo(() => {
    const grouped = new Map<ActivitySource, ActivityItem[]>();
    for (const activity of activities) {
      if (activity.private) continue;
      const list = grouped.get(activity.source) || [];
      list.push(activity);
      grouped.set(activity.source, list);
    }
    return grouped;
  }, [activities]);

  const sources = Array.from(bySource.keys());
  if (sources.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>By Source</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={sources[0]}>
          <TabsList>
            {sources.map((source) => (
              <TabsTrigger key={source} value={source}>
                {SOURCE_LABELS[source]} ({bySource.get(source)?.length || 0})
              </TabsTrigger>
            ))}
          </TabsList>
          {sources.map((source) => {
            const items = bySource.get(source) || [];
            const typeCounts = new Map<string, number>();
            for (const item of items) {
              typeCounts.set(item.type, (typeCounts.get(item.type) || 0) + 1);
            }

            return (
              <TabsContent key={source} value={source}>
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {Array.from(typeCounts.entries()).map(([type, count]) => (
                      <Badge key={type} variant="outline">
                        {type.replace(/_/g, ' ')}: {count}
                      </Badge>
                    ))}
                  </div>
                  <div className="space-y-1 max-h-64 overflow-y-auto">
                    {items.slice(0, 20).map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm py-1">
                        <span className="text-muted-foreground text-xs shrink-0 w-16">
                          {new Date(item.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        {item.url ? (
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline truncate">
                            {item.title}
                          </a>
                        ) : (
                          <span className="truncate">{item.title}</span>
                        )}
                      </div>
                    ))}
                    {items.length > 20 && (
                      <p className="text-xs text-muted-foreground pt-1">
                        ...and {items.length - 20} more
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </CardContent>
    </Card>
  );
}
