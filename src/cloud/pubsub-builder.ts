import { FunctionBuilder, TriggerAnnotated, TriggerDefinition } from '../builder';
import { Event, RawEvent } from '../event';
import { FirebaseEnv } from '../env';

export class PubsubMessage {
  data: string;
  attributes: { [key: string]: string };
  publishTime: string;
  messageId: string;
  private _json: any;

  constructor(data: any) {
    [this.data, this.attributes, this.publishTime, this.messageId, this._json] =
      [data.data, data.attributes || {}, data.publishTime || null, data.messageId || null, data.json];
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
      publishTime: this.publishTime,
      messageId: this.messageId,
    };
  }
}

export interface CloudPubsubTriggerDefinition extends TriggerDefinition {
  topic: string;
}

export default class CloudPubsubBuilder extends FunctionBuilder {
  topic: string;
  event: string;

  constructor(env: FirebaseEnv, topic: string) {
    super(env);
    this.topic = topic;
  }

  on(
    event: string, handler: (event: Event<PubsubMessage>) => PromiseLike<any> | any,
  ): TriggerAnnotated & ((event: RawEvent | any) => PromiseLike<any> | any) {
    if (event !== 'message') {
      throw new Error(`Provider cloud.pubsub does not support event type "${event}"`);
    }

    console.warn(
      'DEPRECATION NOTICE: cloud.pubsub("topic").on("message", handler) is deprecated, ' +
      'use cloud.pubsub("topic").onPublish(handler)'
    );
    return this._makeHandler(handler, 'message');
  }

  onPublish(
    handler: (event: Event<PubsubMessage>) => PromiseLike<any> | any
  ): TriggerAnnotated & ((event: RawEvent | any) => PromiseLike<any> | any) {
    return this._wrapHandler(handler, 'message', {
      action: 'sources/cloud.pubsub/actions/publish',
      resource: 'projects/' + process.env.GCLOUD_PROJECT + '/topics/' + this.topic,
    });
  }

  protected _toTrigger(event: string): CloudPubsubTriggerDefinition {
    return {
      service: 'cloud.pubsub',
      event: event,
      topic: this.topic,
    };
  }

  protected _dataConstructor(payload: any): PubsubMessage {
    if (this._isEventNewFormat(payload)) {
      return new PubsubMessage(payload.data);
    }

    return new PubsubMessage({
      data: new Buffer(JSON.stringify(payload), 'utf8').toString('base64'),
      attributes: {},
    });
  }
}
