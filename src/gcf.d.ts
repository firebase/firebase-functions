declare interface GCFHandler {
  (context: GCFContext, data: GCFDatabasePayload);
  __trigger?: Object;
}

declare interface GCFContext {
  success: (out?: any) => void;
  error: (err?: any) => void;
}

declare interface GCFDatabasePayload {
  type: string;
  path: string;
  authToken: string;
  data: any;
  delta: any;
}
