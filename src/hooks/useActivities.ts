'use client';

import { useState, useCallback } from 'react';
import { ActivityItem, DateRange } from '@/lib/types';

export function useActivities() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchActivities = useCallback(async (dateRange: DateRange) => {
    setLoading(true);
    setErrors([]);
    try {
      const params = new URLSearchParams({ start: dateRange.start, end: dateRange.end });
      const res = await fetch(`/api/activities?${params}`);
      if (!res.ok) throw new Error(`Failed to fetch activities: ${res.statusText}`);
      const data = await res.json();
      setActivities(data.activities);
      setErrors(data.errors || []);
      return data.activities as ActivityItem[];
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch activities';
      setErrors([message]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { activities, errors, loading, fetchActivities };
}
