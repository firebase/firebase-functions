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
import {
  DeploymentOptions,
  ScheduleRetryConfig,
} from '../function-configuration';

/** @hidden */
export const provider = 'google.pubsub';
/** @hidden */
export const service = 'pubsub.googleapis.com';

/**
 * Registers a Cloud Function triggered when a Google Cloud Pub/Sub message
 * is sent to a specified topic.
 *
 * @param topic The Pub/Sub topic to watch for message events.
 * @return Pub/Sub topic builder interface.
 */
export function topic(topic: string) {
  return _topicWithOptions(topic, {});
}

/** @hidden */
export function _topicWithOptions(
  topic: string,
  options: DeploymentOptions
): TopicBuilder {
  if (topic.indexOf('/') !== -1) {
    throw new Error('Topic name may not have a /');
  }

  return new TopicBuilder(() => {
    if (!process.env.GCLOUD_PROJECT) {
      throw new Error('process.env.GCLOUD_PROJECT is not set.');
    }
    return `projects/${process.env.GCLOUD_PROJECT}/topics/${topic}`;
  }, options);
}

/**
 * The Google Cloud Pub/Sub topic builder.
 *
 * Access via [`functions.pubsub.topic()`](providers_pubsub_.html#topic).
 */
export class TopicBuilder {
  /** @hidden */
  constructor(
    private triggerResource: () => string,
    private options: DeploymentOptions
  ) {}

  /**
   * Event handler that fires every time a Cloud Pub/Sub message is
   * published.
   *
   * @param handler Event handler that runs every time a Cloud Pub/Sub message
   *   is published.
   * @return A Cloud Function that you can export and deploy.
   */
  onPublish(
    handler: (message: Message, context: EventContext) => PromiseLike<any> | any
  ): CloudFunction<Message> {
    return makeCloudFunction({
      handler,
      provider,
      service,
      triggerResource: this.triggerResource,
      eventType: 'topic.publish',
      dataConstructor: (raw) => new Message(raw.data),
      options: this.options,
    });
  }
}

/**
 * Registers a Cloud Function to run at specified times.
 *
 * @param schedule The schedule, in Unix Crontab or AppEngine syntax.
 * @return ScheduleBuilder interface.
 */
export function schedule(schedule: string): ScheduleBuilder {
  return _scheduleWithOptions(schedule, {});
}

/** @hidden */
export function _scheduleWithOptions(
  schedule: string,
  options: DeploymentOptions
): ScheduleBuilder {
  const triggerResource = () => {
    if (!process.env.GCLOUD_PROJECT) {
      throw new Error('process.env.GCLOUD_PROJECT is not set.');
    }
    // The CLI will append the correct topic name based on region and function name
    return `projects/${process.env.GCLOUD_PROJECT}/topics`;
  };
  return new ScheduleBuilder(triggerResource, {
    ...options,
    schedule: { schedule },
  });
}

/**
 * The builder for scheduled functions, which are powered by
 * Google Pub/Sub and Cloud Scheduler. Describes the Cloud Scheduler
 * job that is deployed to trigger a scheduled function at the provided
 * frequency. For more information, see
 * [Schedule functions](/docs/functions/schedule-functions).
 *
 * Access via [`functions.pubsub.schedule()`](providers_pubsub_.html#schedule).
 */
export class ScheduleBuilder {
  /** @hidden */
  constructor(
    private triggerResource: () => string,
    private options: DeploymentOptions
  ) {}

  retryConfig(config: ScheduleRetryConfig): ScheduleBuilder {
    this.options.schedule.retryConfig = config;
    return this;
  }

  timeZone(timeZone: string): ScheduleBuilder {
    this.options.schedule.timeZone = timeZone;
    return this;
  }

  /**
   * Event handler for scheduled functions. Triggered whenever the associated
   * scheduler job sends a Pub/Sub message.
   *
   * @param handler Handler that fires whenever the associated
   *   scheduler job sends a Pub/Sub message.
   * @return A Cloud Function that you can export and deploy.
   */
  onRun(handler: (context: EventContext) => PromiseLike<any> | any) {
    const cloudFunction = makeCloudFunction({
      contextOnlyHandler: handler,
      provider,
      service,
      triggerResource: this.triggerResource,
      eventType: 'topic.publish',
      options: this.options,
      labels: { 'deployment-scheduled': 'true' },
    });
    return cloudFunction;
  }
}

/**
 * Interface representing a Google Cloud Pub/Sub message.
 *
 * @param data Payload of a Pub/Sub message.
 */
export class Message {
  /**
   * The data payload of this message object as a base64-encoded string.
   */
  readonly data: string;

  /**
   * User-defined attributes published with the message, if any.
   */
  readonly attributes: { [key: string]: string };

  /** @hidden */
  private _json: any;

  constructor(data: any) {
    [this.data, this.attributes, this._json] = [
      data.data,
      data.attributes || {},
      data.json,
    ];
  }

  /**
   * The JSON data payload of this message object, if any.
   */
  get json(): any {
    if (typeof this._json === 'undefined') {
      this._json = JSON.parse(new Buffer(this.data, 'base64').toString('utf8'));
    }

    return this._json;
  }

  /**
   * Returns a JSON-serializable representation of this object.
   *
   * @return A JSON-serializable representation of this object.
   */
  toJSON(): any {
    return {
      data: this.data,
      attributes: this.attributes,
    };
  }
}
