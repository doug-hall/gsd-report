'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Theme } from '@/lib/types';
import { ThemePieChart } from '@/components/charts/ThemePieChart';

interface Props {
  themes: Theme[];
}

const THEME_COLORS = [
  'hsl(221, 83%, 53%)',
  'hsl(262, 83%, 58%)',
  'hsl(338, 80%, 55%)',
  'hsl(25, 95%, 53%)',
  'hsl(142, 71%, 45%)',
  'hsl(47, 96%, 53%)',
  'hsl(199, 89%, 48%)',
];

export function ThemeBreakdown({ themes }: Props) {
  const chartData = themes.map((theme, i) => ({
    name: theme.name,
    value: theme.activityCount,
    fill: THEME_COLORS[i % THEME_COLORS.length],
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Work Themes</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            {themes.map((theme, i) => (
              <div key={theme.name} className="flex items-start gap-3">
                <div
                  className="w-3 h-3 rounded-full mt-1.5 shrink-0"
                  style={{ backgroundColor: THEME_COLORS[i % THEME_COLORS.length] }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{theme.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {theme.activityCount}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{theme.description}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center">
            <ThemePieChart data={chartData} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
