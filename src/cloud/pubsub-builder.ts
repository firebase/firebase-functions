import { FunctionBuilder, FunctionHandler, TriggerDefinition } from '../builder';
import { Event } from '../event';
import { FirebaseEnv } from '../env';

export interface PubsubMessage {
  data: string;
  attributes?: { [key: string]: string };
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

  on(event: string, handler: FunctionHandler): FunctionHandler {
    if (event !== 'message') {
      throw new Error(`Provider cloud.pubsub does not support event type "${event}"`);
    }

    console.warn(
      'DEPRECATION NOTICE: cloud.pubsub("topic").on("message", handler) is deprecated, ' +
      'use cloud.pubsub("topic").onPublish(handler)'
    );
    return this._makeHandler(handler, 'message');
  }

  onPublish(handler: (event: Event<PubsubMessage>) => any): FunctionHandler {
    const payloadTransform = function (payload: any): PubsubMessage {
        return {
          data: payload, // pending GCF approval for format
        };
    };
    return this._wrapHandler(handler, 'message', {
        action: 'sources/cloud.pubsub/actions/publish',
        resource: 'projects/' + process.env.GCLOUD_PROJECT + '/topics/' + this.topic,
    }, payloadTransform);
  }

  protected _toTrigger(event: string): CloudPubsubTriggerDefinition {
    return {
      service: 'cloud.pubsub',
      event: event,
      topic: this.topic,
    };
  }
}
