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

import {
  CloudFunction,
  EventContext,
  makeCloudFunction,
} from '../cloud-functions';
import { DeploymentOptions } from '../function-configuration';

/** @hidden */
export const provider = 'google.firebase.crashlytics';
/** @hidden */
export const service = 'fabric.io';

/**
 * Registers a Cloud Function to handle Crashlytics issue events.
 *
 * @returns Crashlytics issue event builder interface.
 */
export function issue() {
  return _issueWithOptions({});
}

/** @hidden */
export function _issueWithOptions(options: DeploymentOptions) {
  return new IssueBuilder(() => {
    if (!process.env.GCLOUD_PROJECT) {
      throw new Error('process.env.GCLOUD_PROJECT is not set.');
    }
    return 'projects/' + process.env.GCLOUD_PROJECT;
  }, options);
}

/** The Firebase Crashlytics issue builder interface. */
export class IssueBuilder {
  /** @hidden */
  constructor(
    private triggerResource: () => string,
    private options: DeploymentOptions
  ) {}

  /** @hidden */
  onNewDetected(handler: any): Error {
    throw new Error('"onNewDetected" is now deprecated, please use "onNew"');
  }

  /**
   * Event handler that fires every time a new issue occurs in a project.
   *
   * @param handler Event handler that fires every time a new issue event occurs.
   * @example
   * ```javascript
   * exports.postOnNewIssue = functions.crashlytics.issue().onNew(event => {
   *   const { data } = event;
   *   issueId = data.issueId;
   *   issueTitle =  data.issueTitle;
   *   const slackMessage = ` There's a new issue (${issueId}) ` +
   *       `in your app - ${issueTitle}`;
   *   return notifySlack(slackMessage).then(() => {
   *     functions.logger.info(`Posted new issue ${issueId} successfully to Slack`);
   *   });
   * });
   * ```
   */
  onNew(
    handler: (issue: Issue, context: EventContext) => PromiseLike<any> | any
  ): CloudFunction<Issue> {
    return this.onEvent(handler, 'issue.new');
  }

  /**
   * Event handler that fires every time a regressed issue reoccurs in a project.
   *
   * @param handler Event handler that fires every time a regressed issue event occurs.
   */
  onRegressed(
    handler: (issue: Issue, context: EventContext) => PromiseLike<any> | any
  ): CloudFunction<Issue> {
    return this.onEvent(handler, 'issue.regressed');
  }

  /**
   * Event handler that fires every time a velocity alert occurs in a project.
   *
   * @param handler handler that fires every time a velocity alert issue event occurs.
   */
  onVelocityAlert(
    handler: (issue: Issue, context: EventContext) => PromiseLike<any> | any
  ): CloudFunction<Issue> {
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
      options: this.options,
    });
  }
}

/**
 * Interface representing a Firebase Crashlytics event that was logged for a specific issue.
 */
export interface Issue {
  /** Crashlytics-provided issue ID. */
  issueId: string;

  /** Crashlytics-provided issue title. */
  issueTitle: string;

  /** AppInfo interface describing the App. */
  appInfo: AppInfo;

  /**
   * UTC when the issue occurred in ISO8601 standard representation.
   *
   * Example: 1970-01-17T10:52:15.661-08:00
   */
  createTime: string;

  /**
   * UTC When the issue was closed in ISO8601 standard representation.
   *
   * Example: 1970-01-17T10:52:15.661-08:00
   */
  resolvedTime?: string;

  /** Information about the velocity alert, like number of crashes and percentage of users affected by the issue. */
  velocityAlert?: VelocityAlert;
}

/** Interface representing Firebase Crashlytics VelocityAlert data. */
export interface VelocityAlert {
  /**
   * The percentage of sessions which have been impacted by this issue.
   *
   * Example: .04
   */
  crashPercentage: number;

  /** The number of crashes that this issue has caused. */
  crashes: number;
}

/** Interface representing Firebase Crashlytics AppInfo data. */
export interface AppInfo {
  /**
   * The app's name.
   *
   * Example: "My Awesome App".
   */
  appName: string;

  /** The app's platform.
   *
   * Examples: "android", "ios".
   */
  appPlatform: string;

  /** Unique application identifier within an app store, either the Android package name or the iOS bundle id. */
  appId: string;

  /**
   * The app's version name.
   *
   * Examples: "1.0", "4.3.1.1.213361", "2.3 (1824253)", "v1.8b22p6".
   */
  latestAppVersion: string;
}
