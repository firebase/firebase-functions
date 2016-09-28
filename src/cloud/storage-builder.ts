import { FunctionBuilder, FunctionHandler, TriggerDefinition } from '../builder';
import { FirebaseEnv } from '../env';

export interface CloudStorageTriggerDefinition extends TriggerDefinition {
  bucket: string;
}

export default class CloudStorageBuilder extends FunctionBuilder {
  bucket: string;

  constructor(env: FirebaseEnv, bucket: string) {
    super(env);
    this.bucket = bucket;
  }

  on(event: string, handler: FunctionHandler): FunctionHandler {
    if (event !== 'change') {
      throw new Error(`Provider cloud.storage does not support event type "${event}"`);
    }

    console.warn(
      'DEPRECATION NOTICE: cloud.storage("bucket").on("change", handler) is deprecated,' +
      'use cloud.storage("bucket").onChange(handler)'
    );
    return this.onChange(handler);
  }

  onChange(handler: FunctionHandler): FunctionHandler {
    return this._makeHandler(handler, 'change');
  }

  protected _toTrigger(event: string): CloudStorageTriggerDefinition {
    return {
      service: 'cloud.storage',
      bucket: this.bucket,
      event,
    };
  }
}
