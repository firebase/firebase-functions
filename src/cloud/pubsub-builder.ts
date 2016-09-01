import { TriggerDefinition } from '../trigger';

export interface CloudPubsubHandler {
  (data: Object): any;
  __trigger?: TriggerDefinition;
}

export interface CloudPubsubTriggerDefinition extends TriggerDefinition {
  topic: string;
}

export default class CloudPubsubBuilder {
  topic: string;
  event: string;

  constructor(topic: string) {
    this.topic = topic;
  }

  _toConfig(event: string): CloudPubsubTriggerDefinition {
    return {
      service: 'cloud.pubsub',
      event: event,
      topic: this.topic
    }
  }

  on(event: string, handler: CloudPubsubHandler): CloudPubsubHandler {
    if (event !== 'message') {
      throw new Error(`Provider cloud.pubsub does not support event type "${event}"`);
    }

    console.warn('DEPRECATION NOTICE: cloud.pubsub("topic").on("message", handler) is deprecated, use cloud.pubsub("topic").onMessage(handler)');
    return this.onMessage(handler);
  }

  onMessage(handler: CloudPubsubHandler): CloudPubsubHandler {
    handler.__trigger = this._toConfig('message');
    return handler;
  }
}
