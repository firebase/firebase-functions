import {CloudFunction, makeCloudFunction} from './base';
import { Event } from '../event';

/** @internal */
export const provider = 'cloud.pubsub';

/** Handle events on a Cloud Pub/Sub topic. */
export function topic(topic: string): TopicBuilder {
  if (topic.indexOf('/') !== -1) {
    throw new Error('Topic name may not have a /');
  }

  return new TopicBuilder(`projects/${process.env.GCLOUD_PROJECT}/topics/${topic}`);
}

/** Builder used to create Cloud Functions for Google Pub/Sub topics. */
export class TopicBuilder {

  /** @internal */
  constructor(private resource: string) { }

  /** Handle a Pub/Sub message that was published to a Cloud Pub/Sub topic */
  onPublish(handler: (event: Event<Message>) => PromiseLike<any> | any): CloudFunction {
    return makeCloudFunction({
      provider, handler,
      resource: this.resource,
      eventType: 'topic.publish',
      dataConstructor: (raw) => new Message(raw.data),
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
  readonly attributes: {[key: string]: string };
  private _json: any;

  constructor(data: any) {
    [this.data, this.attributes, this._json] =
      [data.data, data.attributes || {}, data.json];
  }

  get json(): any {
    if (typeof this._json === 'undefined') {
      this._json = JSON.parse(
        new Buffer(this.data, 'base64').toString('utf8')
      );
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
