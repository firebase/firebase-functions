// The MIT License (MIT)
//
// Copyright (c) 2026 Firebase
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

import type { EventContext } from "../v1/cloud-functions";
import type { CloudEvent } from "../v2/core";

export interface DirectorOptions {
  type?: "upgrade" | "downgrade";
}

export class Director {
  private cutoffTimeMs: number;
  private options: DirectorOptions;

  constructor(cutoff: Date | string, options?: DirectorOptions) {
    if (cutoff instanceof Date) {
      this.cutoffTimeMs = cutoff.getTime();
    } else if (typeof cutoff === "string" && cutoff.trim().length > 0) {
      this.cutoffTimeMs = Date.parse(cutoff);
    } else {
      throw new Error("Director constructor requires a valid cutoff Date or ISO 8601 string.");
    }
    if (Number.isNaN(this.cutoffTimeMs)) {
      throw new Error(`Invalid timestamp: ${String(cutoff)}`);
    }
    this.options = options ?? { type: "upgrade" };
  }

  /**
   * Determines whether or not a Function instance should continue executing
   * in the context of switching over between simultaneously executing v1/v2
   * Functions.
   *
   * The decision is based on whether the current environment is GCF v1 or v2,
   * the programmed cutoff time, and whether the migration is an upgrade or
   * downgrade.
   *
   * We recommend passing EventContext (when upgrading from V1) or CloudEvent
   * (when downgrading for v2) or a timestamp otherwise extracted from the
   * underlying event. Wall-clock time can result in double processing or
   * unprocessed events.
   */
  shouldProcess(eventTime: EventContext | CloudEvent<unknown> | Date): boolean {
    const isV2Env = this.isV2Env();
    const isAfterCutoff = this.eventTimestampMs(eventTime) > this.cutoffTimeMs;
    const envShouldRunAfterCutoff =
      (this.options.type === "upgrade" && isV2Env) ||
      (this.options.type === "downgrade" && !isV2Env);
    return isAfterCutoff ? envShouldRunAfterCutoff : !envShouldRunAfterCutoff;
  }

  private isV2Env(): boolean {
    return typeof process.env.K_CONFIGURATION !== "undefined";
  }

  private eventTimestampMs(eventTime: EventContext | CloudEvent<unknown> | Date): number {
    if (eventTime instanceof Date) {
      return eventTime.getTime();
    } else if (this.isCloudEvent(eventTime)) {
      return Date.parse(eventTime.time);
    } else {
      return Date.parse(eventTime.timestamp);
    }
  }

  private isCloudEvent(input: CloudEvent<unknown> | EventContext): input is CloudEvent<unknown> {
    return (input as CloudEvent<unknown>).specversion === "1.0";
  }
}
