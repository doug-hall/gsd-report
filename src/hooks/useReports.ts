'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnalysisResult, DateRange } from '@/lib/types';
import { ReportSummary } from '@/lib/services/db-activities';

export interface FullReport {
  analysis: AnalysisResult;
  dateRange: DateRange;
  activityCount: number;
  createdAt: string;
}

export function useReports() {
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/reports');
      if (!res.ok) return;
      const data = await res.json();
      setReports(data.reports || []);
    } catch {
      // DB may not be available
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReport = useCallback(async (id: number): Promise<FullReport | null> => {
    try {
      const res = await fetch(`/api/reports?id=${id}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return { reports, loading, fetchReports, loadReport };
}
