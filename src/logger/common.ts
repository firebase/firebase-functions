// Determine if structured logs are supported (node >= 10). If something goes wrong,
// assume no since unstructured is safer.
/** @hidden */
export const SUPPORTS_STRUCTURED_LOGS =
  parseInt(process.versions?.node?.split('.')?.[0] || '8', 10) >= 10;

// Map LogSeverity types to their equivalent `console.*` method.
/** @hidden */
export const CONSOLE_SEVERITY: {
  [severity: string]: 'debug' | 'info' | 'warn' | 'error';
} = {
  DEBUG: 'debug',
  INFO: 'info',
  NOTICE: 'info',
  WARNING: 'warn',
  ERROR: 'error',
  CRITICAL: 'error',
  ALERT: 'error',
  EMERGENCY: 'error',
};

// safely preserve unpatched console.* methods in case of compat require
/** @hidden */
export const UNPATCHED_CONSOLE = {
  debug: console.debug,
  info: console.info,
  log: console.log,
  warn: console.warn,
  error: console.error,
};
