import { AsyncLocalStorage } from 'async_hooks';

export const traceContext = new AsyncLocalStorage<TraceParent>();

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

export function getTraceParent(carrier: any): TraceParent | undefined {
  const traceParent = carrier['traceparent'];
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
