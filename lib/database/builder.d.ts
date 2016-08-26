import { TriggerDefinition } from '../trigger';
import { GCFHandler } from '../gcf';
import FirebaseEvent from '../event';
import DatabaseDeltaSnapshot from './delta-snapshot';
export interface DatabaseTriggerDefinition extends TriggerDefinition {
    path: string;
}
export default class DatabaseBuilder {
    private _path;
    private _condition;
    private _filter;
    _toConfig(event?: string): DatabaseTriggerDefinition;
    path(path: string): DatabaseBuilder;
    on(event: string, handler: (event: FirebaseEvent<DatabaseDeltaSnapshot>) => any): GCFHandler;
}
