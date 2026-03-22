import { NextRequest, NextResponse } from 'next/server';
import { AnalysisResult, DateRange } from '@/lib/types';
import { getReport, getReports, saveReport } from '@/lib/services/db-activities';

export async function GET(request: NextRequest) {
  try {
    const idParam = request.nextUrl.searchParams.get('id');

    if (idParam) {
      const id = parseInt(idParam, 10);
      if (isNaN(id)) {
        return NextResponse.json({ error: 'Invalid report id' }, { status: 400 });
      }
      const report = await getReport(id);
      if (!report) {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      }
      return NextResponse.json(report);
    }

    const reports = await getReports();
    return NextResponse.json({ reports });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch reports';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { dateRange, analysis, activityCount } = body as {
      dateRange: DateRange;
      analysis: AnalysisResult;
      activityCount: number;
    };

    if (!dateRange || !analysis || activityCount == null) {
      return NextResponse.json(
        { error: 'Missing required fields: dateRange, analysis, activityCount' },
        { status: 400 }
      );
    }

    const result = await saveReport(dateRange, analysis, activityCount);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save report';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
