import { TriggerDefinition } from '../trigger';
export interface CloudHttpHandler {
    (req: any, res: any): any;
    __trigger?: TriggerDefinition;
}
export default class CloudHttpBuilder {
    private _toConfig(event);
    on(event: string, handler: CloudHttpHandler): CloudHttpHandler;
}
