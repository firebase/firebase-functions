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
import { Message } from "../v2/providers/pubsub";

export interface DirectorOptions {
  type?: "upgrade" | "downgrade";

  /**
   * Override the generation-sniffing behavior. For testing only.
   * @internal
   */
  generation?: "1" | "2";
}

type EventTime = EventContext | CloudEvent<unknown> | Date;

export class Director {
  private cutoffTimeMs: number;
  private options: DirectorOptions;

  constructor(cutoff: Date | string, options?: DirectorOptions) {
    if (cutoff instanceof Date) {
      this.cutoffTimeMs = cutoff.getTime();
    } else if (typeof cutoff === "string" && cutoff.trim().length > 0) {
      this.cutoffTimeMs = Date.parse(cutoff);
    } else {
      throw new Error(
        "Director constructor requires a valid cutoff Date, ISO 8601 string, or string parameter."
      );
    }
    if (Number.isNaN(this.cutoffTimeMs)) {
      throw new Error(`Invalid timestamp: ${String(cutoff)}`);
    }

    this.options = options ?? {};
    this.options.type ??= "upgrade";
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
   *
   * N.B: This function is async to leave room for implementing dynamic
   * health-checking of the fallover function if that turns out to be a
   * desired feature.
   */
  async shouldProcess(eventTime: EventTime): Promise<boolean> {
    const isV2Env = this.isV2Env(eventTime);
    const isAfterCutoff = this.eventTimestampMs(eventTime) > this.cutoffTimeMs;
    const envShouldRunAfterCutoff =
      (this.options.type === "upgrade" && isV2Env) ||
      (this.options.type === "downgrade" && !isV2Env);
    return Promise.resolve(isAfterCutoff ? envShouldRunAfterCutoff : !envShouldRunAfterCutoff);
  }

  private isV2Env(eventTime: EventTime): boolean {
    if (typeof this.options.generation !== "undefined") {
      return this.options.generation === "2";
    }
    if (this.isCloudEvent(eventTime)) {
      return true;
    }
    return typeof process.env.K_CONFIGURATION !== "undefined";
  }

  /**
   * Extracts the canonical time a v1/v2 event was triggered at.
   * Simple except in the case of v2 pubSub functions, since the event
   * timestamp is the Eventarc envelope time and we have to read the
   * event payload for the triggering time.
   */
  private eventTimestampMs(eventTime: EventTime): number {
    if (eventTime instanceof Date) {
      return eventTime.getTime();
    } else if (this.isCloudEvent(eventTime)) {
      const triggeredAt =
        eventTime.type === "google.cloud.pubsub.topic.v1.messagePublished"
          ? this.v2PubSubTime(eventTime)
          : eventTime.time;
      return Date.parse(triggeredAt);
    } else {
      return Date.parse(eventTime.timestamp);
    }
  }

  private v2PubSubTime(pubSubEvent: CloudEvent<unknown>): string {
    const eventData = pubSubEvent.data as Message<unknown>;
    return eventData.publishTime;
  }

  /**
   * Returns whether shouldProcess() was called with a CloudEvent from v2
   * or an EventContext from v1 or a raw Date (testing code?)
   */
  private isCloudEvent(
    input: EventContext | CloudEvent<unknown> | Date
  ): input is CloudEvent<unknown> {
    return !(input instanceof Date) && (input as CloudEvent<unknown>).specversion === "1.0";
  }
}
