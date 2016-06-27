declare interface GCFHandler {
  (data: GCFDatabasePayload);
  __trigger?: Object;
}

declare interface AuthMode {
  admin: boolean;
  variable?: any;
}

declare interface GCFDatabasePayload {
  type: string;
  path: string;
  auth: AuthMode;
  data: any;
  delta: any;
  params?: any;
}
