function collectErrorText(error: unknown) {
  if (!error) return '';

  if (typeof error === 'string') {
    return error;
  }

  if (error instanceof Error) {
    const cause = 'cause' in error ? collectErrorText(error.cause) : '';
    return [error.name, error.message, cause].filter(Boolean).join(' ');
  }

  if (typeof error === 'object') {
    const record = error as Record<string, unknown>;
    return ['code', 'message', 'details', 'hint', 'status', 'statusText', 'error_description']
      .map((key) => record[key])
      .filter((value): value is string | number => typeof value === 'string' || typeof value === 'number')
      .join(' ');
  }

  return String(error);
}

export function isAuthSessionMissingUserError(error: unknown) {
  const errorText = collectErrorText(error);
  const errorCode =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code || '')
      : '';

  if (/user from sub claim in jwt does not exist/i.test(errorText)) {
    return true;
  }

  if (/profiles_id_fkey/i.test(errorText)) {
    return true;
  }

  return (
    errorCode === '23503' &&
    /(?:profiles?|auth\.users|table ["']?users["']?|not present in table ["']?users["']?)/i.test(errorText)
  );
}
