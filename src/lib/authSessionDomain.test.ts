import { describe, expect, it } from 'vitest';
import { isAuthSessionMissingUserError } from './authSessionDomain';

describe('authSessionDomain', () => {
  it('recognizes a deleted Supabase auth user from an Auth error', () => {
    expect(
      isAuthSessionMissingUserError(new Error('User from sub claim in JWT does not exist')),
    ).toBe(true);
  });

  it('recognizes the profile foreign-key failure returned by PostgREST', () => {
    expect(
      isAuthSessionMissingUserError({
        code: '23503',
        message: 'insert or update on table "profiles" violates foreign key constraint "profiles_id_fkey"',
        details: 'Key (id)=(stale-user) is not present in table "users".',
      }),
    ).toBe(true);
  });

  it('does not treat unrelated database or network failures as a missing user', () => {
    expect(
      isAuthSessionMissingUserError({
        code: '23503',
        message: 'insert on table "players" violates foreign key constraint "players_report_id_fkey"',
      }),
    ).toBe(false);
    expect(isAuthSessionMissingUserError(new Error('Network request failed'))).toBe(false);
  });
});
