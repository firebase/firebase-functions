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

import * as express from 'express';
import { copyIfPresent } from '../../common/encoding';
import { timezone } from '../../common/timezone';
import * as logger from '../../logger';
import { ManifestEndpoint, ManifestRequiredAPI } from '../../runtime/manifest';
import * as options from '../options';
import { HttpsFunction } from './https';

/** @hidden */
interface ScheduleArgs {
  schedule: string;
  timeZone?: timezone;
  retryCount?: number;
  maxRetrySeconds?: number;
  minBackoffSeconds?: number;
  maxBackoffSeconds?: number;
  maxDoublings?: number;
  opts: options.GlobalOptions;
}

/** @internal */
export function getOpts(args: string | ScheduleOptions): ScheduleArgs {
  if (typeof args === 'string') {
    return {
      schedule: args,
      opts: {} as options.GlobalOptions,
    };
  }
  return {
    schedule: args.schedule,
    timeZone: args.timeZone,
    retryCount: args.retryCount,
    maxRetrySeconds: args.maxRetrySeconds,
    minBackoffSeconds: args.minBackoffSeconds,
    maxBackoffSeconds: args.maxBackoffSeconds,
    maxDoublings: args.maxDoublings,
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
   */
  jobName: string;

  /**
   * For Cloud Scheduler jobs specified in the unix-cron format,
   * this is the job schedule time in RFC3339 UTC "Zulu" format.
   * Populated via the X-CloudScheduler-ScheduleTime header.
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
  timeZone?: timezone;

  /** The number of retry attempts for a failed run. */
  retryCount?: number;

  /** The time limit for retrying. */
  maxRetrySeconds?: number;

  /** The minimum time to wait before retying. */
  minBackoffSeconds?: number;

  /** The maximum time to wait before retrying. */
  maxBackoffSeconds?: number;

  /** The time between will double max doublings times. */
  maxDoublings?: number;
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
  handler: (req: ScheduledEvent) => void | Promise<void>
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
  handler: (req: ScheduledEvent) => void | Promise<void>
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
  handler: (req: ScheduledEvent) => void | Promise<void>
): ScheduleFunction {
  const separatedOpts = getOpts(args);

  const func: any = async (
    req: express.Request,
    res: express.Response
  ): Promise<any> => {
    const event: ScheduledEvent = {
      jobName: req.header('X-CloudScheduler-JobName') || '',
      scheduleTime: req.header('X-CloudScheduler-ScheduleTime') || '',
    };
    try {
      await handler(event);
      res.status(200).send();
    } catch (err) {
      logger.error((err as Error).message);
      res.status(500).send();
    }
  };
  func.run = handler;

  const baseOptsEndpoint = options.optionsToEndpoint(
    options.getGlobalOptions()
  );
  const specificOptsEndpoint = options.optionsToEndpoint(separatedOpts.opts);

  const ep: ManifestEndpoint = {
    platform: 'gcfv2',
    ...baseOptsEndpoint,
    ...specificOptsEndpoint,
    labels: {
      ...baseOptsEndpoint?.labels,
      ...specificOptsEndpoint?.labels,
    },
    scheduleTrigger: {
      schedule: separatedOpts.schedule,
      retryConfig: {},
    },
  };
  copyIfPresent(ep.scheduleTrigger, separatedOpts, 'timeZone');
  copyIfPresent(
    ep.scheduleTrigger.retryConfig,
    separatedOpts,
    'retryCount',
    'maxRetrySeconds',
    'minBackoffSeconds',
    'maxBackoffSeconds',
    'maxDoublings'
  );
  func.__endpoint = ep;

  func.__requiredAPIs = [
    {
      api: 'cloudscheduler.googleapis.com',
      reason: 'Needed for scheduled functions.',
    },
  ];

  return func;
}
