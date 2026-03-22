import { describe, it, expect } from 'vitest';
import { SOURCE_COLORS, SOURCE_LABELS } from '@/lib/constants';
import type { ActivitySource } from '@/lib/types';

describe('constants', () => {
  const allSources: ActivitySource[] = [
    'github', 'slack', 'jira', 'gmail', 'calendar', 'linear',
    'claude-code', 'codex', 'copilot',
  ];

  it('has a color for every source', () => {
    for (const source of allSources) {
      expect(SOURCE_COLORS[source]).toBeDefined();
      expect(SOURCE_COLORS[source]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('has a label for every source', () => {
    for (const source of allSources) {
      expect(SOURCE_LABELS[source]).toBeDefined();
      expect(SOURCE_LABELS[source].length).toBeGreaterThan(0);
    }
  });
});
