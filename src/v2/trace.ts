import { AsyncLocalStorage } from 'async_hooks';
import * as express from 'express';

import { CloudEvent } from './core';

const traceContext = new AsyncLocalStorage<TraceParent>();

const TRACE_PARENT_REGEX = new RegExp(
  '^(?<version>[\\da-f]{2})-' +
    '(?<traceId>[\\da-f]{32})-' +
    '(?<parentId>[\\da-f]{16})-' +
    '(?<flag>[\\da-f]{2})$'
);

interface TraceParent {
  version: string;
  traceId: string;
  parentId: string;
  flag: string;
}

function getTraceParent(carrier: any): TraceParent | undefined {
  const traceParent = carrier?.['traceparent'];
  if (!traceParent) {
    return;
  }
  const matches = TRACE_PARENT_REGEX.exec(traceParent);
  if (!matches || !matches.groups) {
    return;
  }
  const { version, traceId, parentId, flag } = matches.groups;
  return { version, traceId, parentId, flag };
}

type HttpsFunction = (
  req: express.Request,
  res: express.Response
) => void | Promise<void>;
type CloudEventFunction<T> = (raw: CloudEvent<T>) => any | Promise<any>;

/**
 * Wraps v2 handler with trace context.
 * @param handler
 */
export function wrapTraceContext(handler: HttpsFunction): HttpsFunction;
export function wrapTraceContext<T>(
  handler: CloudEventFunction<T>
): CloudEventFunction<T>;
export function wrapTraceContext(
  handler: HttpsFunction | CloudEventFunction<unknown>
): HttpsFunction | CloudEventFunction<unknown> {
  return (...args) => {
    let traceParent: TraceParent | undefined;
    if (args.length == 1) {
      traceParent = getTraceParent(arguments[0]);
    } else {
      traceParent = getTraceParent(arguments[0].headers);
    }
    if (!traceParent) {
      return handler.apply(null, args);
    }
    traceContext.run(traceParent, handler, ...args);
  };
}
