import { FunctionBuilder, FunctionHandler, TriggerDefinition } from '../builder';
import { FirebaseEnv } from '../env';

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
      'use cloud.pubsub("topic").onMessage(handler)'
    );
    return this.onMessage(handler);
  }

  onMessage(handler: FunctionHandler): FunctionHandler {
    return this._makeHandler(handler, 'message');
  }

  protected _toTrigger(event: string): CloudPubsubTriggerDefinition {
    return {
      service: 'cloud.pubsub',
      event: event,
      topic: this.topic,
    };
  }
}
