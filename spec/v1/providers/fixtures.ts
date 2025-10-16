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
import { ManifestEndpoint } from "../../../src/runtime/manifest";
import * as functions from "../../../src/v1";
import * as options from "../../../src/v2/options";

export const MINIMIAL_TASK_QUEUE_TRIGGER: ManifestEndpoint["taskQueueTrigger"] = {
  rateLimits: {
    maxConcurrentDispatches: functions.RESET_VALUE,
    maxDispatchesPerSecond: functions.RESET_VALUE,
  },
  retryConfig: {
    maxAttempts: functions.RESET_VALUE,
    maxBackoffSeconds: functions.RESET_VALUE,
    maxDoublings: functions.RESET_VALUE,
    maxRetrySeconds: functions.RESET_VALUE,
    minBackoffSeconds: functions.RESET_VALUE,
  },
};

export const MINIMAL_SCHEDULE_TRIGGER: ManifestEndpoint["scheduleTrigger"] = {
  schedule: "",
  timeZone: options.RESET_VALUE,
  retryConfig: {
    retryCount: options.RESET_VALUE,
    maxRetryDuration: options.RESET_VALUE,
    maxBackoffDuration: options.RESET_VALUE,
    minBackoffDuration: options.RESET_VALUE,
    maxDoublings: options.RESET_VALUE,
  },
  attemptDeadline: options.RESET_VALUE,
};
