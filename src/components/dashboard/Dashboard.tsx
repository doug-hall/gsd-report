'use client';

import { useCallback, useState } from 'react';
import { ActivityItem, AnalysisResult, DateRange } from '@/lib/types';
import { useActivities } from '@/hooks/useActivities';
import { useAnalysis } from '@/hooks/useAnalysis';
import { useReports } from '@/hooks/useReports';
import { DateRangeSelector } from './DateRangeSelector';
import { ReportHistory } from './ReportHistory';
import { KeyMetrics } from './KeyMetrics';
import { ExecutiveSummary } from './ExecutiveSummary';
import { NarrativeSummary } from './NarrativeSummary';
import { ThemeBreakdown } from './ThemeBreakdown';
import { ActivityChart } from './ActivityChart';
import { SourceSummary } from './SourceSummary';
import { ActivityTimeline } from './ActivityTimeline';
import { LoadingState } from './LoadingState';
import { Separator } from '@/components/ui/separator';

export function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange | null>(null);
  const [activeReportId, setActiveReportId] = useState<number | null>(null);
  const [reportActivities, setReportActivities] = useState<ActivityItem[] | null>(null);
  const [reportAnalysis, setReportAnalysis] = useState<AnalysisResult | null>(null);
  const { activities: liveActivities, errors: fetchErrors, loading: fetchLoading, fetchActivities } = useActivities();
  const { analysis: liveAnalysis, loading: analyzeLoading, error: analyzeError, analyze } = useAnalysis();
  const { reports, loading: reportsLoading, fetchReports, loadReport } = useReports();

  // Use report data if viewing a saved report, otherwise use live data
  const activities = reportActivities ?? liveActivities;
  const analysis = reportAnalysis ?? liveAnalysis;

  const handleRangeChange = useCallback(async (range: DateRange) => {
    // Clear any loaded report
    setActiveReportId(null);
    setReportActivities(null);
    setReportAnalysis(null);
    setDateRange(range);

    const items = await fetchActivities(range);
    if (items.length > 0) {
      analyze(items, range);
    }
    // Refresh report list after generating new data
    fetchReports();
  }, [fetchActivities, analyze, fetchReports]);

  const handleReportSelect = useCallback(async (id: number) => {
    setActiveReportId(id);
    const report = await loadReport(id);
    if (report) {
      setDateRange(report.dateRange);
      setReportAnalysis(report.analysis);
      // Load activities from DB for this date range
      try {
        const res = await fetch(`/api/activities?start=${report.dateRange.start}&end=${report.dateRange.end}`);
        if (res.ok) {
          const data = await res.json();
          setReportActivities(data.activities);
        }
      } catch {
        setReportActivities([]);
      }
    }
  }, [loadReport]);

  const loading = fetchLoading || analyzeLoading;
  const hasData = activities.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">GSD Report</h1>
        <p className="text-muted-foreground mt-1">Your personal productivity dashboard</p>
      </div>

      <DateRangeSelector onRangeChange={handleRangeChange} loading={loading} />

      <ReportHistory
        reports={reports}
        loading={reportsLoading}
        onSelect={handleReportSelect}
        activeReportId={activeReportId}
      />

      {fetchErrors.length > 0 && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
          <p className="text-sm font-medium text-destructive">Some sources had errors:</p>
          <ul className="text-sm text-destructive/80 mt-1">
            {fetchErrors.map((err, i) => (
              <li key={i}>• {err}</li>
            ))}
          </ul>
        </div>
      )}

      {analyzeError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3">
          <p className="text-sm text-destructive">Analysis error: {analyzeError}</p>
        </div>
      )}

      {!dateRange && !loading && reports.length === 0 && (
        <div className="text-center py-20">
          <p className="text-lg text-muted-foreground">Select a date range to generate your report</p>
          <p className="text-sm text-muted-foreground mt-1">
            Or run <code className="bg-muted px-1.5 py-0.5 rounded text-xs">/gsd</code> in Claude Code to collect data
          </p>
        </div>
      )}

      {loading && <LoadingState />}

      {!loading && hasData && (
        <>
          {analysis && (
            <>
              <KeyMetrics metrics={analysis.metrics} />
              <Separator />
              {analysis.executiveSummary && (
                <ExecutiveSummary summary={analysis.executiveSummary} />
              )}
              <NarrativeSummary narrative={analysis.narrative} insights={analysis.insights} />
              <ThemeBreakdown themes={analysis.themes} />
            </>
          )}

          <ActivityChart activities={activities} />
          <SourceSummary activities={activities} />
          <ActivityTimeline activities={activities} />
        </>
      )}

      {!loading && dateRange && !hasData && (
        <div className="text-center py-20">
          <p className="text-lg text-muted-foreground">No activities found for this period</p>
          <p className="text-sm text-muted-foreground mt-1">
            Make sure your API keys are configured in .env.local or run <code className="bg-muted px-1.5 py-0.5 rounded text-xs">/gsd</code> in Claude Code
          </p>
        </div>
      )}
    </div>
  );
}
