'use client';

import { useState } from 'react';
import { subDays, format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { DateRange } from '@/lib/types';
import { DATE_PRESETS } from '@/lib/constants';

interface Props {
  onRangeChange: (range: DateRange) => void;
  loading?: boolean;
}

export function DateRangeSelector({ onRangeChange, loading }: Props) {
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  function selectPreset(days: number, index: number) {
    setActivePreset(index);
    const end = new Date();
    const start = subDays(end, days);
    onRangeChange({
      start: start.toISOString(),
      end: end.toISOString(),
    });
  }

  function applyCustomRange() {
    if (!customStart || !customEnd) return;
    setActivePreset(null);
    onRangeChange({
      start: new Date(customStart).toISOString(),
      end: new Date(customEnd + 'T23:59:59').toISOString(),
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {DATE_PRESETS.map((preset, i) => (
        <Button
          key={preset.days}
          variant={activePreset === i ? 'default' : 'outline'}
          size="sm"
          onClick={() => selectPreset(preset.days, i)}
          disabled={loading}
        >
          {preset.label}
        </Button>
      ))}
      <div className="flex items-center gap-2 ml-2">
        <input
          type="date"
          value={customStart}
          onChange={(e) => setCustomStart(e.target.value)}
          className="border rounded-md px-2 py-1 text-sm bg-background"
          max={format(new Date(), 'yyyy-MM-dd')}
        />
        <span className="text-muted-foreground text-sm">to</span>
        <input
          type="date"
          value={customEnd}
          onChange={(e) => setCustomEnd(e.target.value)}
          className="border rounded-md px-2 py-1 text-sm bg-background"
          max={format(new Date(), 'yyyy-MM-dd')}
        />
        <Button size="sm" variant="outline" onClick={applyCustomRange} disabled={loading || !customStart || !customEnd}>
          Apply
        </Button>
      </div>
    </div>
  );
}
