import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchClubRosterSeedApi } from './clubRosterApi';

vi.mock('./supabase', () => ({ supabase: { auth: {
  getSession: async () => ({ data: { session: { access_token: 'qa-token' } } }),
} } }));
afterEach(() => vi.unstubAllGlobals());

describe('club roster API response validation', () => {
  it.each(['<html>SPA fallback</html>', 'null'])('rejects a successful non-API response: %s', async body => {
    vi.stubGlobal('window', { location: { origin: 'https://example.test' } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(body, { status: 200 })));
    await expect(fetchClubRosterSeedApi()).rejects.toThrow('club roster API returned an invalid response');
  });
  it('returns a valid seed', async () => {
    vi.stubGlobal('window', { location: { origin: 'https://example.test' } });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ players: [], teams: [] })));
    await expect(fetchClubRosterSeedApi()).resolves.toEqual({ players: [], teams: [] });
  });
});
