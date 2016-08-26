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
    constructor(topic: string);
    _toConfig(event: string): CloudPubsubTriggerDefinition;
    on(event: string, handler: CloudPubsubHandler): CloudPubsubHandler;
}
