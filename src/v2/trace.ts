import * as express from "express";

import { TraceParent, getTraceParent, traceContext } from "../common/trace";
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
    let traceParent: TraceParent | undefined;
    if (args.length === 1) {
      traceParent = getTraceParent(args[0]);
    } else {
      traceParent = getTraceParent(args[0].headers);
    }
    if (!traceParent) {
      return handler.apply(null, args);
    }
    traceContext.run(traceParent, handler, ...args);
  };
}
