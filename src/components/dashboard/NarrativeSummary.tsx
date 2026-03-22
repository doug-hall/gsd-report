'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  narrative: string;
  insights: string[];
}

export function NarrativeSummary({ narrative, insights }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          {narrative.split('\n\n').map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>
        {insights.length > 0 && (
          <div>
            <h4 className="font-semibold text-sm mb-2">Key Insights</h4>
            <ul className="space-y-1">
              {insights.map((insight, i) => (
                <li key={i} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-primary shrink-0">•</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
