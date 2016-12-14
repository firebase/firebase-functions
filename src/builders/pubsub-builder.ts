import { FunctionBuilder, TriggerDefinition, CloudFunction } from '../builder';
import { Event } from '../event';
import { FirebaseEnv } from '../env';

export class PubsubMessage {
  data: string;
  attributes: { [key: string]: string };
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

export interface CloudPubsubTriggerDefinition extends TriggerDefinition {
  topic: string;
}

export default class PubsubBuilder extends FunctionBuilder {
  topic: string;
  event: string;

  constructor(env: FirebaseEnv, topic: string) {
    super(env);
    this.topic = topic;
  }

  onPublish(
    handler: (event: Event<PubsubMessage>) => PromiseLike<any> | any): CloudFunction {
    return this._makeHandler(handler, 'topic.publish');
  }

  protected _toTrigger(event: string): CloudPubsubTriggerDefinition {
    return {
      service: 'cloud.pubsub',
      event: 'message',
      topic: this.topic,
    };
  }

  protected _dataConstructor(payload: any): PubsubMessage {
    return new PubsubMessage(payload.data);
  }
}
