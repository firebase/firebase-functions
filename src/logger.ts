import { format } from 'util';

// safely preserve unpatched console.* methods in case of compat require
const unpatchedConsole = {
  debug: console.debug,
  info: console.info,
  log: console.log,
  warn: console.warn,
  error: console.error,
};

// Determine if structured logs are supported (node >= 10). If something goes wrong,
// assume no since unstructured is safer.
const SUPPORTS_STRUCTURED_LOGS =
  parseInt(process.versions?.node?.split('.')?.[0] || '8', 10) >= 10;

// Map LogSeverity types to their equivalent `console.*` method.
const CONSOLE_SEVERITY: {
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

/**
 * LogSeverity indicates the detailed severity of the log entry. See [Cloud Logging docs](https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#logseverity) for more.
 */
export type LogSeverity =
  | 'DEBUG'
  | 'INFO'
  | 'NOTICE'
  | 'WARNING'
  | 'ERROR'
  | 'CRITICAL'
  | 'ALERT'
  | 'EMERGENCY';

/**
 * LogEntry represents a structured Cloud Logging entry. All keys aside from `severity` and `message` are
 * included in the `jsonPayload` of the logged entry.
 */
export interface LogEntry {
  severity: LogSeverity;
  message?: string;
  [key: string]: any;
}

/**
 * Writes a LogEntry to `stdout`/`stderr` (depending on severity).
 * @param entry The LogEntry including severity, message, and any additional structured metadata.
 */
export function write(entry: LogEntry) {
  if (SUPPORTS_STRUCTURED_LOGS) {
    unpatchedConsole[CONSOLE_SEVERITY[entry.severity]](JSON.stringify(entry));
    return;
  }

  let message = entry.message || '';
  const jsonPayload: { [key: string]: any } = {};
  let jsonKeyCount = 0;
  for (const k in entry) {
    if (!['severity', 'message'].includes(k)) {
      jsonKeyCount++;
      jsonPayload[k] = entry[k];
    }
  }
  if (jsonKeyCount > 0) {
    message = `${message} ${JSON.stringify(jsonPayload, null, 2)}`;
  }
  unpatchedConsole[CONSOLE_SEVERITY[entry.severity]](message);
}

/**
 * Writes a `DEBUG` severity log. If the last argument provided is a plain object,
 * it will be added to the `jsonPayload` in the Cloud Logging entry.
 * @param args Arguments, concatenated into the log message with space separators.
 */
export function debug(...args: any[]) {
  write(entryFromArgs('DEBUG', args));
}

/**
 * Writes an `INFO` severity log. If the last argument provided is a plain object,
 * it will be added to the `jsonPayload` in the Cloud Logging entry.
 * @param args Arguments, concatenated into the log message with space separators.
 */
export function log(...args: any[]) {
  write(entryFromArgs('INFO', args));
}

/**
 * Writes an `INFO` severity log. If the last argument provided is a plain object,
 * it will be added to the `jsonPayload` in the Cloud Logging entry.
 * @param args Arguments, concatenated into the log message with space separators.
 */
export function info(...args: any[]) {
  write(entryFromArgs('INFO', args));
}

/**
 * Writes a `WARNING` severity log. If the last argument provided is a plain object,
 * it will be added to the `jsonPayload` in the Cloud Logging entry.
 * @param args Arguments, concatenated into the log message with space separators.
 */
export function warn(...args: any[]) {
  write(entryFromArgs('WARNING', args));
}

/**
 * Writes an `ERROR` severity log. If the last argument provided is a plain object,
 * it will be added to the `jsonPayload` in the Cloud Logging entry.
 * @param args Arguments, concatenated into the log message with space separators.
 */
export function error(...args: any[]) {
  write(entryFromArgs('ERROR', args));
}

function entryFromArgs(severity: LogSeverity, args: any[]): LogEntry {
  let entry = {};
  const lastArg = args[args.length - 1];
  if (typeof lastArg == 'object' && lastArg.constructor == Object) {
    entry = args.pop();
  }
  return Object.assign({}, entry, {
    severity,
    // mimic `console.*` behavior, see https://nodejs.org/api/console.html#console_console_log_data_args
    message: format.apply(null, args),
  });
}
