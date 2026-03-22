'use client';

import { useState, useCallback } from 'react';
import { ActivityItem, AnalysisResult, DateRange } from '@/lib/types';

export function useAnalysis() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (activities: ActivityItem[], dateRange: DateRange) => {
    if (activities.length === 0) {
      setAnalysis(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activities, dateRange }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Analysis failed: ${res.statusText}`);
      }
      const data = await res.json();
      setAnalysis(data.analysis);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { analysis, loading, error, analyze };
}
