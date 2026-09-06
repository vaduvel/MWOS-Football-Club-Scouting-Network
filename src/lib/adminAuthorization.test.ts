import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { requireAdminUser } from '../../netlify/functions/_shared.js';

const mocks = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));

describe('server admin authorization', () => {
  const user = { id: 'qa-user', user_metadata: { role: 'admin' } };
  const event = { headers: { authorization: 'Bearer test-token' } };
  let roleResult: { data: unknown[]; error: null | { message: string } };
  let from: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_ANON_KEY', 'test-anon');
    roleResult = { data: [], error: null };
    from = vi.fn((table: string) => {
      if (table !== 'user_roles') throw new Error('Editable profiles must not authorize admins');
      return { select: () => ({ eq: async () => roleResult }) };
    });
    mocks.createClient.mockReturnValue({
      from,
      auth: { getUser: async () => ({ data: { user }, error: null }) },
    });
  });
  afterEach(() => vi.unstubAllEnvs());

  it('rejects forged admin metadata without an assigned admin role', async () => {
    expect((await requireAdminUser(event)).error?.statusCode).toBe(403);
    expect(from).toHaveBeenCalledWith('user_roles');
  });
  it('rejects a technical director assignment', async () => {
    roleResult.data = [{ roles: { slug: 'technical_director' } }];
    expect((await requireAdminUser(event)).error?.statusCode).toBe(403);
  });
  it.each([{ slug: 'admin' }, [{ slug: 'admin' }]])('accepts an assigned admin join: %j', async (roles) => {
    roleResult.data = [{ roles }];
    expect((await requireAdminUser(event)).user).toEqual(user);
  });
  it('fails closed on a role lookup error', async () => {
    roleResult.error = { message: 'Role lookup unavailable' };
    expect((await requireAdminUser(event)).error?.statusCode).toBe(500);
  });
  it('requires authentication', async () => {
    expect((await requireAdminUser({ headers: {} })).error?.statusCode).toBe(401);
  });
});
