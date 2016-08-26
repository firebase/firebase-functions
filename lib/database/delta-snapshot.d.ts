import * as firebase from 'firebase';
import { GCFDatabasePayload } from '../gcf';
export default class DatabaseDeltaSnapshot {
    private _adminRef;
    private _ref;
    private _path;
    private _auth;
    private _data;
    private _delta;
    private _newData;
    private _childPath;
    private _isPrevious;
    constructor(eventData?: GCFDatabasePayload);
    readonly ref: firebase.database.Reference;
    readonly adminRef: firebase.database.Reference;
    readonly key: string;
    val(): any;
    exists(): boolean;
    child(childPath?: string): DatabaseDeltaSnapshot;
    readonly previous: DatabaseDeltaSnapshot;
    readonly current: DatabaseDeltaSnapshot;
    changed(): boolean;
    forEach(childAction: Function): void;
    hasChild(childPath: string): boolean;
    hasChildren(): boolean;
    numChildren(): number;
    private _dup(previous, childPath?);
    private _fullPath();
}
