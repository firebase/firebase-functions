export interface GCFHandler {
    (data: GCFDatabasePayload): any;
    __trigger?: Object;
}
export interface AuthMode {
    admin: boolean;
    variable?: any;
}
export interface GCFDatabasePayload {
    type: string;
    path: string;
    auth: AuthMode;
    data: any;
    delta: any;
    params?: any;
}
