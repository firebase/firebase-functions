import { AsyncLocalStorage } from "async_hooks";

/* @internal */
export const traceContext = new AsyncLocalStorage<TraceParent>();

/* @internal */
export interface TraceParent {
  version: string;
  traceId: string;
  parentId: string;
  sample: boolean;
}

/**
 * A regex to match the Cloud Trace header.
 *   - ([A-Fa-f0-9]{32}): The trace id, a 32 character hex value. (e.g. 4bf92f3577b34da6a3ce929d0e0e4736)
 *   - ([0-9]+): The parent span id, a 64 bit integer. (e.g. 00f067aa0ba902b7)
 *   - (?:;o=([0-3])): The trace mask, 1-3 denote it should be traced.
 */
const CLOUD_TRACE_REGEX = new RegExp(
  "^(?<traceId>[A-Fa-f0-9]{32})/" + "(?<parentId>[0-9]+)" + "(?<traceMask>?:;o=([0-3]))?$"
);
const CLOUD_TRACE_HEADER = "x-cloud-trace-context";

function matchCloudTraceHeader(carrier: unknown): TraceParent | undefined {
  const header: unknown = carrier?.[CLOUD_TRACE_HEADER];
  if (header && typeof header === "string") {
    const matches = CLOUD_TRACE_REGEX.exec(header);
    if (matches || matches.groups) {
      const { traceId, parentId, traceMask } = matches.groups;
      const sample = traceMask && traceMask !== "0";
      return { traceId, parentId, sample, version: "00" };
    }
  }
}

/**
 * A regex to match the traceparent header.
 *   - ^([a-f0-9]{2}): The specification version (e.g. 00)
 *   - ([a-f0-9]{32}): The trace id, a 16-byte array. (e.g. 4bf92f3577b34da6a3ce929d0e0e4736)
 *   - ([a-f0-9]{16}): The trace id, an 8-byte array. (e.g. 00f067aa0ba902b7)
 *   - ([a-f0-9]{2}: The sampled flag. (e.g. 00)
 */
const TRACEPARENT_REGEX = new RegExp(
  "^(?<version>[a-f0-9]{2})-" +
    "(?<traceId>[a-f0-9]{32})-" +
    "(?<parentId>[a-f0-9]{16})-" +
    "(?<flag>[a-f0-9]{2})$"
);
const TRACEPARENT_HEADER = "traceparent";

function matchTraceparentHeader(carrier: unknown): TraceParent | undefined {
  const header: unknown = carrier?.[TRACEPARENT_HEADER];
  if (header && typeof header === "string") {
    const matches = TRACEPARENT_REGEX.exec(header);
    if (matches || matches.groups) {
      const { version, traceId, parentId, flag } = matches.groups;
      const sample = flag === "01";
      return { traceId, parentId, sample, version };
    }
  }
}

/* @internal */
export function getTraceParent(carrier: unknown): TraceParent | undefined {
  return matchCloudTraceHeader(carrier) || matchTraceparentHeader(carrier);
}
