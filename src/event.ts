interface FirebaseEventOptions {
  service: string;
  type: string;
  instance?: string;
  uid?: string;
  deviceId?: string;
  data?: any;
  params?: {[option: string]: any};
}

export default class FirebaseEvent<T> {
  service: string;
  type: string;
  instance: string;
  uid: string;
  deviceId: string;
  data: T;
  params: {[option: string]: any};

  constructor(options: FirebaseEventOptions) {
    [this.service, this.type, this.instance, this.uid, this.deviceId, this.data, this.params] =
      [options.service, options.type, options.instance, options.uid, options.deviceId, options.data, options.params || {}];
  }
}
