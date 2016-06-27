export interface CloudStorageHandler {
  (data: Object): void;
  __trigger?: CloudStorageTriggerDefinition;
}

export interface CloudStorageTriggerDefinition extends TriggerDefinition {
  bucket: string;
}

export default class CloudStorageBuilder {
  bucket: string;

  _toConfig(event: string): CloudStorageTriggerDefinition {
    return {
      service: 'cloud.storage',
      bucket: this.bucket,
      event
    }
  }

  constructor(bucket: string) {
    this.bucket = bucket;
  }

  on(event: string, handler: CloudStorageHandler) {
    if (event !== 'change') {
      throw new Error(`Provider cloud.storage does not support event type "${event}"`);
    }

    handler.__trigger = this._toConfig(event);
    return handler;
  }
}