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

  on(event: string, handler: CloudPubsubHandler) {
    if (event !== 'message') {
      throw new Error(`Provider cloud.pubsub does not support event type "${event}"`);
    }

    handler.__trigger = this._toConfig(event);
    return handler;
  }
}
