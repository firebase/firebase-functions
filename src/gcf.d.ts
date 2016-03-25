declare interface GCFHandler {
  (data: GCFDatabasePayload);
  __trigger?: Object;
}

declare interface GCFDatabasePayload {
  type: string;
  path: string;
  authToken: string;
  data: any;
  delta: any;
  params?: any;
}
