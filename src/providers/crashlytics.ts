// The MIT License (MIT)
//
// Copyright (c) 2017 Firebase
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

import { makeCloudFunction, CloudFunction, EventContext } from '../cloud-functions';

/** @internal */
export const provider = 'google.firebase.crashlytics';
/** @internal */
export const service = 'fabric.io';

/** 
 * Handle events related to Crashlytics issues. An issue in Crashlytics is an 
 * aggregation of crashes which have a shared root cause.
 */
export function issue() {
  return new IssueBuilder(() => {
    if (!process.env.GCLOUD_PROJECT) {
      throw new Error('process.env.GCLOUD_PROJECT is not set.');
    }
    return 'projects/' + process.env.GCLOUD_PROJECT;
  });
}

/** Builder used to create Cloud Functions for Crashlytics issue events. */
export class IssueBuilder {
  /** @internal */
  constructor(private triggerResource: () => string) { }

  /** @internal */
  onNewDetected(handler: any): Error {
    throw new Error('"onNewDetected" is now deprecated, please use "onNew"');
  }

  /** Handle Crashlytics New Issue events. */
  onNew(handler: (issue: Issue, context: EventContext) => PromiseLike<any> | any): CloudFunction<Issue> {
    return this.onEvent(handler, 'issue.new');
  }

  /** Handle Crashlytics Regressed Issue events. */
  onRegressed(handler: (issue: Issue, context: EventContext) => PromiseLike<any> | any): CloudFunction<Issue> {
    return this.onEvent(handler, 'issue.regressed');
  }

  /** Handle Crashlytics Velocity Alert events. */
  onVelocityAlert(handler: (issue: Issue, context: EventContext) => PromiseLike<any> | any): CloudFunction<Issue> {
    return this.onEvent(handler, 'issue.velocityAlert');
  }

  private onEvent(
    handler: (issue: Issue, context: EventContext) => PromiseLike<any> | any,
    eventType: string
  ): CloudFunction<Issue> {
    return makeCloudFunction({
      handler,
      provider,
      eventType,
      service,
      legacyEventType: `providers/firebase.crashlytics/eventTypes/${eventType}`,
      triggerResource: this.triggerResource,
    });
  }
}

/**
 * Interface representing a Crashlytics issue event that was logged for a specific issue.
 */
export interface Issue {
  /** Fabric Issue ID. */
  issueId: string;

  /** Issue title. */
  issueTitle: string;

  /** App information. */
  appInfo: AppInfo;

  /** When the issue was created (ISO8601 time stamp). */
  createTime: string;

  /** When the issue was resolved, if the issue has been resolved (ISO8601 time stamp). */
  resolvedTime?: string;

  /** Contains details about the velocity alert, if this event was triggered by a velocity alert. */
  velocityAlert?: VelocityAlert;
}

export interface VelocityAlert {
  /** The percentage of sessions which have been impacted by this issue. Example: .04 */
  crashPercentage: number;

  /** The number of crashes that this issue has caused. */
  crashes: number;
}

/**
 * Interface representing the application where this issue occurred.
 */
export interface AppInfo {
  /** The app's name. Example: "My Awesome App". */
  appName: string;

  /** The app's platform. Examples: "android", "ios". */
  appPlatform: string;

  /** Unique application identifier within an app store, either the Android package name or the iOS bundle id. */
  appId: string;

  /**
   *  The latest app version which is affected by the issue.
   *  Examples: "1.0", "4.3.1.1.213361", "2.3 (1824253)", "v1.8b22p6".
   */
  latestAppVersion: string;
}
