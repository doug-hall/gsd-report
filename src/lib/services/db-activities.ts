import { prisma } from '@/lib/db';
import { ActivityItem, AnalysisResult, DateRange } from '@/lib/types';

export async function upsertActivities(items: ActivityItem[]): Promise<number> {
  let count = 0;

  // Batch upserts in chunks to avoid overwhelming the DB
  const chunkSize = 50;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const results = await prisma.$transaction(
      chunk.map((item) =>
        prisma.activity.upsert({
          where: { sourceId: item.id },
          create: {
            sourceId: item.id,
            source: item.source,
            type: item.type,
            title: item.title,
            description: item.description ?? null,
            url: item.url ?? null,
            timestamp: new Date(item.timestamp),
            metadata: { ...item.metadata, _private: item.private ?? false } as never,
          },
          update: {
            title: item.title,
            description: item.description ?? null,
            url: item.url ?? null,
            type: item.type,
            metadata: { ...item.metadata, _private: item.private ?? false } as never,
          },
        })
      )
    );
    count += results.length;
  }

  return count;
}

export async function getActivities(dateRange: DateRange): Promise<ActivityItem[]> {
  const rows = await prisma.activity.findMany({
    where: {
      timestamp: {
        gte: new Date(dateRange.start),
        lte: new Date(dateRange.end),
      },
    },
    orderBy: { timestamp: 'desc' },
  });

  return rows.map((row) => {
    const meta = row.metadata as Record<string, unknown>;
    const isPrivate = meta._private === true;
    const { _private, ...metadata } = meta;
    void _private;
    return {
      id: row.sourceId,
      source: row.source as ActivityItem['source'],
      type: row.type as ActivityItem['type'],
      title: row.title,
      description: row.description ?? undefined,
      url: row.url ?? undefined,
      timestamp: row.timestamp.toISOString(),
      private: isPrivate || undefined,
      metadata,
    };
  });
}

export async function saveReport(
  dateRange: DateRange,
  analysis: AnalysisResult,
  activityCount: number
): Promise<{ id: number }> {
  const startDate = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);

  const data = {
    narrative: analysis.narrative,
    themes: JSON.parse(JSON.stringify(analysis.themes)),
    categories: JSON.parse(JSON.stringify(analysis.categories)),
    executiveSummary: analysis.executiveSummary ? JSON.parse(JSON.stringify(analysis.executiveSummary)) : null,
    insights: JSON.parse(JSON.stringify(analysis.insights)),
    metrics: JSON.parse(JSON.stringify(analysis.metrics)),
    activityCount,
  };

  // Find existing report for the same date range and update it, or create new
  const existing = await prisma.report.findFirst({
    where: { startDate, endDate },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    const report = await prisma.report.update({
      where: { id: existing.id },
      data,
    });
    return { id: report.id };
  }

  const report = await prisma.report.create({
    data: { startDate, endDate, ...data },
  });

  return { id: report.id };
}

export interface ReportSummary {
  id: number;
  startDate: string;
  endDate: string;
  activityCount: number;
  createdAt: string;
}

export async function getReports(limit = 20): Promise<ReportSummary[]> {
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      startDate: true,
      endDate: true,
      activityCount: true,
      createdAt: true,
    },
  });

  return reports.map((r) => ({
    id: r.id,
    startDate: r.startDate.toISOString(),
    endDate: r.endDate.toISOString(),
    activityCount: r.activityCount,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getReport(id: number): Promise<{
  analysis: AnalysisResult;
  dateRange: DateRange;
  activityCount: number;
  createdAt: string;
} | null> {
  const report = await prisma.report.findUnique({ where: { id } });
  if (!report) return null;

  return {
    analysis: {
      narrative: report.narrative,
      themes: report.themes as unknown as AnalysisResult['themes'],
      categories: report.categories as unknown as AnalysisResult['categories'],
      executiveSummary: (report.executiveSummary as unknown as AnalysisResult['executiveSummary']) ?? { headline: '', accomplishments: [], impact: [], leadership: [], body: '' },
      insights: report.insights as unknown as AnalysisResult['insights'],
      metrics: report.metrics as unknown as AnalysisResult['metrics'],
    },
    dateRange: {
      start: report.startDate.toISOString(),
      end: report.endDate.toISOString(),
    },
    activityCount: report.activityCount,
    createdAt: report.createdAt.toISOString(),
  };
}
