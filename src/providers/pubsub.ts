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
  Schedule,
  ScheduleRetryConfig,
} from '../function-configuration';

/** @internal */
export const provider = 'google.pubsub';
/** @internal */
export const service = 'pubsub.googleapis.com';

/** Select Cloud Pub/Sub topic to listen to.
 * @param topic Name of Pub/Sub topic, must belong to the same project as the function.
 */
export function topic(topic: string) {
  return _topicWithOpts(topic, {});
}

/** @internal */
export function _topicWithOpts(
  topic: string,
  opts: DeploymentOptions
): TopicBuilder {
  if (topic.indexOf('/') !== -1) {
    throw new Error('Topic name may not have a /');
  }

  return new TopicBuilder(() => {
    if (!process.env.GCLOUD_PROJECT) {
      throw new Error('process.env.GCLOUD_PROJECT is not set.');
    }
    return `projects/${process.env.GCLOUD_PROJECT}/topics/${topic}`;
  }, opts);
}

export function schedule(schedule: string): ScheduleBuilder {
  return _scheduleWithOpts(schedule, {});
}

export class ScheduleBuilder {
  private _opts: DeploymentOptions;

  /** @internal */
  constructor(private schedule: Schedule, private opts: DeploymentOptions) {
    this._opts = { schedule, ...opts };
  }

  retryConfig(config: ScheduleRetryConfig): ScheduleBuilder {
    this._opts.schedule.retryConfig = config;
    return this;
  }

  timeZone(timeZone: string): ScheduleBuilder {
    this._opts.schedule.timeZone = timeZone;
    return this;
  }

  onRun(handler: (context: EventContext) => PromiseLike<any> | any) {
    const triggerResource = () => {
      if (!process.env.GCLOUD_PROJECT) {
        throw new Error('process.env.GCLOUD_PROJECT is not set.');
      }
      return `projects/${process.env.GCLOUD_PROJECT}/topics`; // The CLI will append the correct topic name based on region and function name
    };
    const cloudFunction = makeCloudFunction({
      contextOnlyHandler: handler,
      provider,
      service,
      triggerResource,
      eventType: 'topic.publish',
      opts: this._opts,
      labels: { 'deployment-scheduled': 'true' },
    });
    return cloudFunction;
  }
}

/** @internal */
export function _scheduleWithOpts(
  schedule: string,
  opts: DeploymentOptions
): ScheduleBuilder {
  return new ScheduleBuilder({ schedule }, opts);
}

/** Builder used to create Cloud Functions for Google Pub/Sub topics. */
export class TopicBuilder {
  /** @internal */
  constructor(
    private triggerResource: () => string,
    private opts: DeploymentOptions
  ) {}

  /** Handle a Pub/Sub message that was published to a Cloud Pub/Sub topic */
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
      opts: this.opts,
    });
  }
}

/**
 * A Pub/Sub message.
 *
 * This class has an additional .json helper which will correctly deserialize any
 * message that was a JSON object when published with the JS SDK. .json will throw
 * if the message is not a base64 encoded JSON string.
 */
export class Message {
  readonly data: string;
  readonly attributes: { [key: string]: string };
  private _json: any;

  constructor(data: any) {
    [this.data, this.attributes, this._json] = [
      data.data,
      data.attributes || {},
      data.json,
    ];
  }

  get json(): any {
    if (typeof this._json === 'undefined') {
      this._json = JSON.parse(new Buffer(this.data, 'base64').toString('utf8'));
    }

    return this._json;
  }

  toJSON(): any {
    return {
      data: this.data,
      attributes: this.attributes,
    };
  }
}
