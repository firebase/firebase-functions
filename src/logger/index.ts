// The MIT License (MIT)
//
// Copyright (c) 2017 Firebase
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { format } from "util";
import { traceContext } from "../common/trace";

import { CONSOLE_SEVERITY, UNPATCHED_CONSOLE } from "./common";

/**
 * `LogSeverity` indicates the detailed severity of the log entry. See [LogSeverity](https://cloud.google.com/logging/docs/reference/v2/rest/v2/LogEntry#logseverity).
 * @public
 */
export type LogSeverity =
  | "DEBUG"
  | "INFO"
  | "NOTICE"
  | "WARNING"
  | "ERROR"
  | "CRITICAL"
  | "ALERT"
  | "EMERGENCY";

/**
 * `LogEntry` represents a [structured Cloud Logging](https://cloud.google.com/logging/docs/structured-logging)
 * entry. All keys aside from `severity` and `message` are
 * included in the `jsonPayload` of the logged entry.
 * @public
 */
export interface LogEntry {
  severity: LogSeverity;
  message?: string;
  [key: string]: any;
}

/** @internal */
function removeCircular(obj: any, refs: any[] = []): any {
  if (typeof obj !== "object" || !obj) {
    return obj;
  }
  // If the object defines its own toJSON, prefer that.
  if (obj.toJSON) {
    return obj.toJSON();
  }
  if (refs.includes(obj)) {
    return "[Circular]";
  } else {
    refs.push(obj);
  }
  let returnObj: any;
  if (Array.isArray(obj)) {
    returnObj = new Array(obj.length);
  } else {
    returnObj = {};
  }
  for (const k in obj) {
    if (refs.includes(obj[k])) {
      returnObj[k] = "[Circular]";
    } else {
      returnObj[k] = removeCircular(obj[k], refs);
    }
  }
  refs.pop();
  return returnObj;
}

/**
 * Writes a `LogEntry` to `stdout`/`stderr` (depending on severity).
 * @param entry - The `LogEntry` including severity, message, and any additional structured metadata.
 * @public
 */
export function write(entry: LogEntry) {
  const ctx = traceContext.getStore();
  if (ctx?.traceId) {
    entry[
      "logging.googleapis.com/trace"
    ] = `projects/${process.env.GCLOUD_PROJECT}/traces/${ctx.traceId}`;
  }

  UNPATCHED_CONSOLE[CONSOLE_SEVERITY[entry.severity]](JSON.stringify(removeCircular(entry)));
}

/**
 * Writes a `DEBUG` severity log. If the last argument provided is a plain object,
 * it is added to the `jsonPayload` in the Cloud Logging entry.
 * @param args - Arguments, concatenated into the log message with space separators.
 * @public
 */
export function debug(...args: any[]) {
  write(entryFromArgs("DEBUG", args));
}

/**
 * Writes an `INFO` severity log. If the last argument provided is a plain object,
 * it is added to the `jsonPayload` in the Cloud Logging entry.
 * @param args - Arguments, concatenated into the log message with space separators.
 * @public
 */
export function log(...args: any[]) {
  write(entryFromArgs("INFO", args));
}

/**
 * Writes an `INFO` severity log. If the last argument provided is a plain object,
 * it is added to the `jsonPayload` in the Cloud Logging entry.
 * @param args - Arguments, concatenated into the log message with space separators.
 * @public
 */
export function info(...args: any[]) {
  write(entryFromArgs("INFO", args));
}

/**
 * Writes a `WARNING` severity log. If the last argument provided is a plain object,
 * it is added to the `jsonPayload` in the Cloud Logging entry.
 * @param args - Arguments, concatenated into the log message with space separators.
 * @public
 */
export function warn(...args: any[]) {
  write(entryFromArgs("WARNING", args));
}

/**
 * Writes an `ERROR` severity log. If the last argument provided is a plain object,
 * it is added to the `jsonPayload` in the Cloud Logging entry.
 * @param args - Arguments, concatenated into the log message with space separators.
 * @public
 */
export function error(...args: any[]) {
  write(entryFromArgs("ERROR", args));
}

/** @hidden */
function entryFromArgs(severity: LogSeverity, args: any[]): LogEntry {
  let entry = {};
  const lastArg = args[args.length - 1];
  if (lastArg && typeof lastArg === "object" && lastArg.constructor === Object) {
    entry = args.pop();
  }

  // mimic `console.*` behavior, see https://nodejs.org/api/console.html#console_console_log_data_args
  let message = format(...args);
  if (severity === "ERROR" && !args.find((arg) => arg instanceof Error)) {
    message = new Error(message).stack || message;
  }
  const out: LogEntry = {
    ...entry,
    severity,
  };
  if (message) {
    out.message = message;
  }
  return out;
}
