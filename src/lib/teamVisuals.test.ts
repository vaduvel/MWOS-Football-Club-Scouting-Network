import { describe, expect, it } from 'vitest';

import { getTeamVisualTone } from './teamVisuals';

describe('getTeamVisualTone', () => {
  it('assigns stable visual tones for common MWOS teams', () => {
    expect(getTeamVisualTone('U17').accentClass).toContain('bg-blue');
    expect(getTeamVisualTone('u15').accentClass).toContain('bg-teal');
    expect(getTeamVisualTone('First Team').accentClass).toContain('bg-indigo');
  });

  it('falls back to a neutral slate tone for unknown teams', () => {
    expect(getTeamVisualTone('Queens Development').accentClass).toContain('bg-slate');
  });
});
