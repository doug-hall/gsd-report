'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ExecutiveSummary as ExecutiveSummaryType } from '@/lib/types';

interface Props {
  summary: ExecutiveSummaryType;
}

export function ExecutiveSummary({ summary }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Executive Summary</CardTitle>
        <p className="text-sm text-muted-foreground">
          For performance reviews, promotion discussions, and stakeholder updates
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-lg font-semibold">{summary.headline}</p>

        <div className="prose prose-sm dark:prose-invert max-w-none">
          {summary.body.split('\n\n').map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        <Separator />

        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <h4 className="font-semibold text-sm mb-2">Key Accomplishments</h4>
            <ul className="space-y-1.5">
              {summary.accomplishments.map((item, i) => (
                <li key={i} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-primary shrink-0">-</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Business Impact</h4>
            <ul className="space-y-1.5">
              {summary.impact.map((item, i) => (
                <li key={i} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-primary shrink-0">-</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-2">Leadership & Collaboration</h4>
            <ul className="space-y-1.5">
              {summary.leadership.map((item, i) => (
                <li key={i} className="text-sm text-muted-foreground flex gap-2">
                  <span className="text-primary shrink-0">-</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
