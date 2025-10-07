import * as express from "express";

import { extractTraceContext, TraceContext, traceContext } from "../common/trace";
import { CloudEvent } from "./core";

type HttpsFunction = (req: express.Request, res: express.Response) => void | Promise<void>;
type CloudEventFunction<T> = (raw: CloudEvent<T>) => any | Promise<any>;

/**
 * Wraps v2 handler with trace context.
 * @param handler
 *
 * @internal
 */
export function wrapTraceContext(handler: HttpsFunction): HttpsFunction;
export function wrapTraceContext<T>(handler: CloudEventFunction<T>): CloudEventFunction<T>;
export function wrapTraceContext(
  handler: HttpsFunction | CloudEventFunction<unknown>
): HttpsFunction | CloudEventFunction<unknown> {
  return (...args) => {
    let traceParent: TraceContext | undefined;
    if (args.length === 1) {
      traceParent = extractTraceContext(args[0]);
    } else {
      traceParent = extractTraceContext(args[0].headers);
    }
    if (!traceParent) {
      // eslint-disable-next-line prefer-spread
      return handler.apply(null, args);
    }
    return traceContext.run(traceParent, handler, ...args);
  };
}
