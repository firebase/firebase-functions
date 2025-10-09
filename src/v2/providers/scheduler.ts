// The MIT License (MIT)
//
// Copyright (c) 2022 Firebase
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

import * as express from "express";

import { copyIfPresent } from "../../common/encoding";
import { ResetValue } from "../../common/options";
import { timezone } from "../../common/timezone";
import {
  initV2Endpoint,
  initV2ScheduleTrigger,
  ManifestEndpoint,
  ManifestRequiredAPI,
} from "../../runtime/manifest";
import { HttpsFunction } from "./https";
import { wrapTraceContext } from "../trace";
import { Expression } from "../../params";
import * as logger from "../../logger";
import * as options from "../options";
import { withInit } from "../../common/onInit";

/** @hidden */
interface SeparatedOpts {
  schedule: string | Expression<string>;
  timeZone?: timezone | Expression<string> | ResetValue;
  retryConfig?: {
    retryCount?: number | Expression<number> | ResetValue;
    maxRetrySeconds?: number | Expression<number> | ResetValue;
    minBackoffSeconds?: number | Expression<number> | ResetValue;
    maxBackoffSeconds?: number | Expression<number> | ResetValue;
    maxDoublings?: number | Expression<number> | ResetValue;
  };
  attemptDeadline?: string | Expression<string> | ResetValue;
  opts: options.GlobalOptions;
}

/** @internal */
export function getOpts(args: string | ScheduleOptions): SeparatedOpts {
  if (typeof args === "string") {
    return {
      schedule: args,
      opts: {} as options.GlobalOptions,
    };
  }
  
  return {
    schedule: args.schedule,
    timeZone: args.timeZone,
    retryConfig: {
      retryCount: args.retryCount,
      maxRetrySeconds: args.maxRetrySeconds,
      minBackoffSeconds: args.minBackoffSeconds,
      maxBackoffSeconds: args.maxBackoffSeconds,
      maxDoublings: args.maxDoublings,
    },
    attemptDeadline: args.attemptDeadline,
    opts: args as options.GlobalOptions,
  };
}

/**
 * Interface representing a ScheduleEvent that is passed to the function handler.
 */
export interface ScheduledEvent {
  /**
   * The Cloud Scheduler job name.
   * Populated via the X-CloudScheduler-JobName header.
   *
   * If invoked manually, this field is undefined.
   */
  jobName?: string;

  /**
   * For Cloud Scheduler jobs specified in the unix-cron format,
   * this is the job schedule time in RFC3339 UTC "Zulu" format.
   * Populated via the X-CloudScheduler-ScheduleTime header.
   *
   * If the schedule is manually triggered, this field will be
   * the function execution time.
   */
  scheduleTime: string;
}

/** The Cloud Function type for Schedule triggers. */
export interface ScheduleFunction extends HttpsFunction {
  __requiredAPIs?: ManifestRequiredAPI[];
  run(data: ScheduledEvent): void | Promise<void>;
}

/** Options that can be set on a Schedule trigger. */
export interface ScheduleOptions extends options.GlobalOptions {
  /** The schedule, in Unix Crontab or AppEngine syntax. */
  schedule: string;

  /** The timezone that the schedule executes in. */
  timeZone?: timezone | Expression<string> | ResetValue;

  /** The number of retry attempts for a failed run. */
  retryCount?: number | Expression<number> | ResetValue;

  /** The time limit for retrying. */
  maxRetrySeconds?: number | Expression<number> | ResetValue;

  /** The minimum time to wait before retying. */
  minBackoffSeconds?: number | Expression<number> | ResetValue;

  /** The maximum time to wait before retrying. */
  maxBackoffSeconds?: number | Expression<number> | ResetValue;

  /** The time between will double max doublings times. */
  maxDoublings?: number | Expression<number> | ResetValue;

  /**
   * The deadline for each job attempt, specified as a duration string (e.g. "600s").
   * See: https://cloud.google.com/scheduler/docs/reference/rest/v1/projects.locations.jobs#Job
   */
  attemptDeadline?: string | Expression<string> | ResetValue;
}

/**
 * Handler for scheduled functions. Triggered whenever the associated
 * scheduler job sends a http request.
 * @param schedule - The schedule, in Unix Crontab or AppEngine syntax.
 * @param handler - A function to execute when triggered.
 * @returns A function that you can export and deploy.
 */
export function onSchedule(
  schedule: string,
  handler: (event: ScheduledEvent) => void | Promise<void>
): ScheduleFunction;

/**
 * Handler for scheduled functions. Triggered whenever the associated
 * scheduler job sends a http request.
 * @param options - Options to set on scheduled functions.
 * @param handler - A function to execute when triggered.
 * @returns A function that you can export and deploy.
 */
export function onSchedule(
  options: ScheduleOptions,
  handler: (event: ScheduledEvent) => void | Promise<void>
): ScheduleFunction;

/**
 * Handler for scheduled functions. Triggered whenever the associated
 * scheduler job sends a http request.
 * @param args - Either a schedule or an object containing function options.
 * @param handler - A function to execute when triggered.
 * @returns A function that you can export and deploy.
 */
export function onSchedule(
  args: string | ScheduleOptions,
  handler: (event: ScheduledEvent) => void | Promise<void>
): ScheduleFunction {
  const separatedOpts = getOpts(args);

  const httpFunc = async (req: express.Request, res: express.Response): Promise<any> => {
    const event: ScheduledEvent = {
      jobName: req.header("X-CloudScheduler-JobName") || undefined,
      scheduleTime: req.header("X-CloudScheduler-ScheduleTime") || new Date().toISOString(),
    };
    try {
      await handler(event);
      res.status(200).send();
    } catch (err) {
      logger.error((err as Error).message);
      res.status(500).send();
    }
  };
  const func: any = wrapTraceContext(withInit(httpFunc));
  func.run = handler;

  const globalOpts = options.getGlobalOptions();
  const baseOptsEndpoint = options.optionsToEndpoint(globalOpts);
  const specificOptsEndpoint = options.optionsToEndpoint(separatedOpts.opts);

  const ep: ManifestEndpoint = {
    ...initV2Endpoint(globalOpts, separatedOpts.opts),
    platform: "gcfv2",
    ...baseOptsEndpoint,
    ...specificOptsEndpoint,
    labels: {
      ...baseOptsEndpoint?.labels,
      ...specificOptsEndpoint?.labels,
    },
    scheduleTrigger: initV2ScheduleTrigger(separatedOpts.schedule, globalOpts, separatedOpts.opts),
  };

  copyIfPresent(ep.scheduleTrigger, separatedOpts, "timeZone");
  copyIfPresent(ep.scheduleTrigger, separatedOpts, "attemptDeadline");
  copyIfPresent(
    ep.scheduleTrigger.retryConfig,
    separatedOpts.retryConfig,
    "retryCount",
    "maxRetrySeconds",
    "minBackoffSeconds",
    "maxBackoffSeconds",
    "maxDoublings",
  );
  func.__endpoint = ep;

  func.__requiredAPIs = [
    {
      api: "cloudscheduler.googleapis.com",
      reason: "Needed for scheduled functions.",
    },
  ];

  return func;
}
