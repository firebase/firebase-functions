// Determine if structured logs are supported (node >= 10). If something goes wrong,
import { format } from 'util';

// safely preserve unpatched console.* methods in case of compat require
const unpatchedConsole = {
  debug: console.debug,
  info: console.info,
  log: console.log,
  warn: console.warn,
  error: console.error,
};

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

export function log(entry: LogEntry) {
  output(entry);
}

export function debug(...args: any[]) {
  output(payloadFromArgs('DEBUG', args));
}

export function info(...args: any[]) {
  output(payloadFromArgs('INFO', args));
}

export function warn(...args: any[]) {
  output(payloadFromArgs('WARNING', args));
}

export function error(...args: any[]) {
  output(payloadFromArgs('ERROR', args));
}

function payloadFromArgs(severity: LogSeverity, args: any[]): LogEntry {
  let payload = {};
  const lastArg = args[args.length - 1];
  if (typeof lastArg == 'object' && lastArg.constructor == Object) {
    payload = args.pop();
  }
  return Object.assign({}, payload, {
    severity,
    // mimic `console.*` behavior, see https://nodejs.org/api/console.html#console_console_log_data_args
    message: format.apply(null, args),
  });
}

function output(payload: LogEntry): void {
  if (SUPPORTS_STRUCTURED_LOGS) {
    unpatchedConsole[CONSOLE_SEVERITY[payload.severity]](
      JSON.stringify(payload)
    );
  } else {
    let message = payload.message || '';
    const jsonPayload: { [key: string]: any } = {};
    let jsonKeyCount = 0;
    for (const k in payload) {
      if (!['severity', 'message'].includes(k)) {
        jsonKeyCount++;
        jsonPayload[k] = payload[k];
      }
    }
    if (jsonKeyCount > 0) {
      message = `${message} ${JSON.stringify(jsonPayload, null, 2)}`;
    }
    unpatchedConsole[CONSOLE_SEVERITY[payload.severity]](message);
  }
}
