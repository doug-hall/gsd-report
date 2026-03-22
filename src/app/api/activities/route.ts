import { NextRequest, NextResponse } from 'next/server';
import { ActivitySource } from '@/lib/types';
import { fetchAllActivities } from '@/lib/services/normalizer';
import { getActivities, upsertActivities } from '@/lib/services/db-activities';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const start = searchParams.get('start');
  const end = searchParams.get('end');
  const sourcesParam = searchParams.get('sources');
  const refresh = searchParams.get('refresh') === 'true';

  if (!start || !end) {
    return NextResponse.json(
      { error: 'Missing required query params: start, end' },
      { status: 400 }
    );
  }

  const dateRange = { start, end };

  // If not refreshing, try to serve from database first
  if (!refresh) {
    try {
      const cached = await getActivities(dateRange);
      if (cached.length > 0) {
        return NextResponse.json({ activities: cached, errors: [], fromCache: true });
      }
    } catch {
      // DB not available, fall through to live fetch
    }
  }

  // Fetch from source APIs
  const sources = sourcesParam
    ? (sourcesParam.split(',') as ActivitySource[])
    : undefined;

  const { activities, errors } = await fetchAllActivities(dateRange, sources);

  // Persist to database
  if (activities.length > 0) {
    try {
      await upsertActivities(activities);
    } catch {
      // DB write failed — still return the activities
    }
  }

  return NextResponse.json({ activities, errors, fromCache: false });
}
