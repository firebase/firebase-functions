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
import { ManifestEndpoint } from '../../runtime/manifest';
import * as options from '../options';
import { HttpsFunction } from './https';

/** @hidden */
interface ScheduleArgs {
  schedule: string;
  timeZone?: string;
  retryCount?: number;
  maxRetryDuration?: string;
  minBackoffDuration?: string;
  maxBackoffDuration?: string;
  maxDoublings?: number;
  opts: options.GlobalOptions;
}

/**
 *
 */
export interface ScheduleFunction extends HttpsFunction {
  run(data: express.Request): void | Promise<void>;
}

/**
 *
 */
export interface ScheduleOptions extends options.GlobalOptions {
  schedule: string;
  timeZone?: string;
  retryCount?: number;
  maxRetryDuration?: string;
  minBackoffDuration?: string;
  maxBackoffDuration?: string;
  maxDoublings?: number;
}

/**
 *
 * @param schedule
 * @param handler
 * @returns
 */
export function onSchedule(
  schedule: string,
  handler: (req: express.Request) => void | Promise<void>
): ScheduleFunction;

/**
 *
 * @param opts
 * @param handler
 * @returns
 */
export function onSchedule(
  opts: ScheduleOptions,
  handler: (req: express.Request) => void | Promise<void>
): ScheduleFunction;

/**
 *
 * @param args
 * @param handler
 * @returns
 */
export function onSchedule(
  args: string | ScheduleOptions,
  handler: (req: express.Request) => void | Promise<void>
): ScheduleFunction {
  const separatedOpts = getOpts(args);

  const func: any = async (
    req: express.Request,
    res: express.Response
  ): Promise<void> => {
    await handler(req);

    res.status(200);
    res.setHeader('Content-Type', 'application/json');
    res.send();
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

      'deployment-scheduled': 'true', // maybe delete this??
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
  // convertIfPresent(
  //   ep.scheduleTrigger,
  //   separatedOpts.opts,
  //   'invoker',
  //   'invoker',
  //   convertInvoker
  // );
  func.__endpoint = ep;

  return func;
}

/** @internal */
export function getOpts(args: string | ScheduleOptions): ScheduleArgs {
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
