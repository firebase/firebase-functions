import { TriggerDefinition } from '../trigger';
export interface CloudStorageHandler {
    (data: Object): void;
    __trigger?: CloudStorageTriggerDefinition;
}
export interface CloudStorageTriggerDefinition extends TriggerDefinition {
    bucket: string;
}
export default class CloudStorageBuilder {
    bucket: string;
    _toConfig(event: string): CloudStorageTriggerDefinition;
    constructor(bucket: string);
    on(event: string, handler: CloudStorageHandler): CloudStorageHandler;
}
