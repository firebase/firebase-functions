import { TriggerDefinition } from '../trigger';

export interface CloudHttpHandler {
  (req: any, res: any): any;
  __trigger?: TriggerDefinition;
}

export default class CloudHttpBuilder {
  private _toConfig(event: string): TriggerDefinition {
    return {
      service: 'cloud.http',
      event
    };
  }

  on(event: string, handler: CloudHttpHandler): CloudHttpHandler {
    if (event !== 'request') {
      throw new Error(`Provider cloud.http does not support event type "${event}"`);
    }

    console.warn('DEPRECATION NOTICE: cloud.http().on("request", handler) is deprecated, use cloud.http().onRequest(handler)');
    return this.onRequest(handler);
  }

  onRequest(handler: CloudHttpHandler): CloudHttpHandler {
    handler.__trigger = this._toConfig('request');
    return handler;
  }
}
