import * as firebase from 'firebase';
import { AuthMode } from './gcf';
export interface FirebaseEventMetadata {
    service: string;
    type: string;
    instance?: string;
    deviceId?: string;
    params?: {
        [option: string]: any;
    };
    auth?: AuthMode;
}
export default class FirebaseEvent<T> {
    service: string;
    type: string;
    instance: string;
    uid: string;
    deviceId: string;
    data: T;
    params: {
        [option: string]: any;
    };
    private _auth;
    private _app;
    constructor(metadata: FirebaseEventMetadata, data: T);
    readonly app: firebase.app.App;
}
