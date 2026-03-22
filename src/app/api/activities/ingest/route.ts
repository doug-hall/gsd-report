import { NextRequest, NextResponse } from 'next/server';
import { ActivityItem } from '@/lib/types';
import { upsertActivities } from '@/lib/services/db-activities';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { activities } = body as { activities: ActivityItem[] };

    if (!activities || !Array.isArray(activities)) {
      return NextResponse.json(
        { error: 'Missing required field: activities (array)' },
        { status: 400 }
      );
    }

    const upserted = await upsertActivities(activities);
    return NextResponse.json({ upserted });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Ingestion failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
