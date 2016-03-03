interface FirebaseEventOptions {
  source: string;
  type: string;
  instance?: string;
  uid?: string;
  deviceId?: string;
  data?: any;
}

export default class FirebaseEvent {
  source: string;
  type: string;
  instance: string;
  uid: string;
  deviceId: string;
  data: any;

  constructor(options: FirebaseEventOptions) {
    [this.source, this.type, this.instance, this.uid, this.deviceId, this.data] =
      [options.source, options.type, options.instance, options.uid, options.deviceId, options.data];
  }
}
