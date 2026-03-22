'use client';

import { format, parseISO } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ReportSummary } from '@/lib/services/db-activities';

interface Props {
  reports: ReportSummary[];
  loading: boolean;
  onSelect: (id: number) => void;
  activeReportId?: number | null;
}

export function ReportHistory({ reports, loading, onSelect, activeReportId }: Props) {
  if (loading || reports.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Past Reports</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {reports.map((report) => {
            const start = format(parseISO(report.startDate), 'MMM d');
            const end = format(parseISO(report.endDate), 'MMM d');
            const created = format(parseISO(report.createdAt), 'MMM d, h:mma');
            const isActive = activeReportId === report.id;

            return (
              <Button
                key={report.id}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                className="text-xs"
                onClick={() => onSelect(report.id)}
              >
                {start} – {end} ({report.activityCount} activities, {created})
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
