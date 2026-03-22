import { NextRequest, NextResponse } from 'next/server';
import { ActivityItem, DateRange } from '@/lib/types';
import { analyzeActivities } from '@/lib/analysis/claude';
import { saveReport } from '@/lib/services/db-activities';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { activities, dateRange } = body as { activities: ActivityItem[]; dateRange: DateRange };

    if (!activities || !dateRange) {
      return NextResponse.json(
        { error: 'Missing required fields: activities, dateRange' },
        { status: 400 }
      );
    }

    if (activities.length === 0) {
      return NextResponse.json(
        { error: 'No activities to analyze' },
        { status: 400 }
      );
    }

    const analysis = await analyzeActivities(activities, dateRange);

    // Persist the report to database
    let reportId: number | null = null;
    try {
      const result = await saveReport(dateRange, analysis, activities.length);
      reportId = result.id;
    } catch {
      // DB write failed — still return the analysis
    }

    return NextResponse.json({ analysis, reportId });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Analysis failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
