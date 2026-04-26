import { prisma, productionPrisma } from '@/lib/db';
import { PrismaClient } from '@/generated/prisma/client';
import { ActivityItem, AnalysisResult, DateRange } from '@/lib/types';

async function upsertActivitiesTo(db: InstanceType<typeof PrismaClient>, items: ActivityItem[]): Promise<number> {
  let count = 0;

  const chunkSize = 50;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const results = await db.$transaction(
      chunk.map((item) =>
        db.activity.upsert({
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
      ),
      // Default Prisma transaction timeout is 5s, which is tight for a 50-row
      // upsert against a remote database (e.g. dual-write to production).
      { maxWait: 10_000, timeout: 30_000 }
    );
    count += results.length;
  }

  return count;
}

export async function upsertActivities(items: ActivityItem[]): Promise<number> {
  const count = await upsertActivitiesTo(prisma, items);

  if (productionPrisma) {
    await upsertActivitiesTo(productionPrisma, items).catch((err) => {
      console.error('Failed to replicate activities to production:', err);
    });
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

async function saveReportTo(
  db: InstanceType<typeof PrismaClient>,
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

  const existing = await db.report.findFirst({
    where: { startDate, endDate },
    orderBy: { createdAt: 'desc' },
  });

  if (existing) {
    const report = await db.report.update({
      where: { id: existing.id },
      data,
    });
    return { id: report.id };
  }

  const report = await db.report.create({
    data: { startDate, endDate, ...data },
  });

  return { id: report.id };
}

export async function saveReport(
  dateRange: DateRange,
  analysis: AnalysisResult,
  activityCount: number
): Promise<{ id: number }> {
  const result = await saveReportTo(prisma, dateRange, analysis, activityCount);

  if (productionPrisma) {
    await saveReportTo(productionPrisma, dateRange, analysis, activityCount).catch((err) => {
      console.error('Failed to replicate report to production:', err);
    });
  }

  return result;
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
