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
import { logger } from '../..';
import { copyIfPresent } from '../../common/encoding';
import { timezone } from '../../common/timezone';
import { ManifestEndpoint } from '../../runtime/manifest';
import * as options from '../options';
import { HttpsFunction } from './https';

/** @hidden */
interface ScheduleArgs {
  schedule: timezone;
  timeZone?: string;
  retryCount?: number;
  maxRetryDuration?: string;
  minBackoffDuration?: string;
  maxBackoffDuration?: string;
  maxDoublings?: number;
  opts: options.GlobalOptions;
}

/** The Cloud Function type for Schedule triggers. */
export interface ScheduleFunction extends HttpsFunction {
  run(data: express.Request): void | Promise<void>;
}

/** Options that can be set on a Schedule trigger. */
export interface ScheduleOptions extends options.GlobalOptions {
  schedule: timezone;
  timeZone?: string;
  retryCount?: number;
  maxRetryDuration?: string;
  minBackoffDuration?: string;
  maxBackoffDuration?: string;
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
  schedule: timezone,
  handler: (req: express.Request) => void | Promise<void>
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
  handler: (req: express.Request) => void | Promise<void>
): ScheduleFunction;

/**
 * Handler for scheduled functions. Triggered whenever the associated
 * scheduler job sends a http request.
 * @param args - Either a schedule or an object containing function options.
 * @param handler - A function to execute when triggered.
 * @returns A function that you can export and deploy.
 */
export function onSchedule(
  args: timezone | ScheduleOptions,
  handler: (req: express.Request) => void | Promise<void>
): ScheduleFunction {
  const separatedOpts = getOpts(args);

  const func: any = async (
    req: express.Request,
    res: express.Response
  ): Promise<void> => {
    try {
      await handler(req);
    } catch (err) {
      logger.warn((err as Error).message);
    }

    res.setHeader('Content-Type', 'application/json');
    res.status(200).send();
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
    },
  };
  copyIfPresent(ep.scheduleTrigger, separatedOpts, 'timeZone');
  copyIfPresent(
    ep.scheduleTrigger.retryConfig,
    separatedOpts,
    'retryCount',
    'maxRetryDuration',
    'minBackoffDuration',
    'maxBackoffDuration',
    'maxDoublings'
  );
  // TODO(colerogers): add invoker to scheduleTrigger
  // and the container contract if we want to
  // support enterprise customers and change the
  // behavior of using the default compute service agent as
  // the function invoker from cloud scheduler.
  func.__endpoint = ep;

  func.__requiredAPIs = [
    {
      api: 'cloudscheduler.googleapis.com',
      reason: 'Needed for scheduled functions.',
    },
  ];

  return func;
}

/** @internal */
export function getOpts(args: timezone | ScheduleOptions): ScheduleArgs {
  if (typeof args === 'string') {
    return {
      schedule: args,
      opts: {},
    };
  }
  const scheduleArgs: Partial<ScheduleArgs> = {
    schedule: args.schedule,
    timeZone: args.timeZone,
    retryCount: args.retryCount,
    maxRetryDuration: args.maxRetryDuration,
    minBackoffDuration: args.minBackoffDuration,
    maxBackoffDuration: args.maxBackoffDuration,
    maxDoublings: args.maxDoublings,
  };
  const opts = { ...args };
  delete (opts as any).schedule;
  delete (opts as any).timeZone;
  delete (opts as any).retryCount;
  delete (opts as any).maxRetryDuration;
  delete (opts as any).minBackoffDuration;
  delete (opts as any).maxBackoffDuration;
  delete (opts as any).maxDoublings;

  scheduleArgs.opts = opts;
  return scheduleArgs as ScheduleArgs;
}
