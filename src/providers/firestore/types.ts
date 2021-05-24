import * as firebase from 'firebase-admin';
import * as _ from 'lodash';

import { apps } from "../../apps";

export type DocumentSnapshot = firebase.firestore.DocumentSnapshot;
export type DocumentReference = firebase.firestore.DocumentReference;
export type QueryDocumentSnapsho = firebase.firestore.QueryDocumentSnapshot;

export interface EventData {
  value: ProtoDocument;
  oldValue: ProtoDocument;
}

interface ProtoDocument {
  name?: (string|null);
  fields?: Record<string, Value>;
  createTime?: string;
  updateTime?: string;
  readTime?: string;
}

interface Value {
  nullValue?: null;
  booleanValue?: boolean;
  integerValue?: number;
  doubleValue?: number;
  timestampValue?: string;
  stringValue?: string;
  bytesValue?: string;
  referenceValue?: string;
  geoPointValue?: {
    latitude: number,
    longitude: number,
  };
  array_value?: {
    values?: Value[];
  };
  mapValue?: {
    fields: Record<string, Value>;
  };
}

class GeoPoint {
  constructor(readonly latitude: number, readonly longitude: number) {}
  isEqual(other: {latitude: number, longitude: number}): boolean {
    return this.latitude === other.latitude && this.longitude == other.longitude;
  }
  toProto() {
    return {
      geoPointValue: {
        latitude: this.latitude,
        longitude: this.longitude,
      },
    }; 
  }
};

class Timestamp {
  constructor(private _seconds: number, private _nanoseconds: number) {}

  // The Firestore SDK type hase these same named fields and properties;
  // we need to also have them for unit tests to pass.
  get seconds() { return this._seconds; }
  get nanoseconds() { return this._nanoseconds; }

  static fromString(timeString?: string): Timestamp | undefined {
    if (!timeString) {
      return;
    }
    const date = new Date(timeString);
    const seconds = Math.floor(date.getTime() / 1000);
    let nanos = 0;
    if (timeString.length > 20) {
      const nanoString = timeString.substring(20, timeString.length - 1);
      const trailingZeroes = 9 - nanoString.length;
      nanos = parseInt(nanoString, 10) * Math.pow(10, trailingZeroes);
    }
    return new Timestamp(seconds, nanos);
  }
  isEqual(other: {seconds: number, nanoseconds: number}): boolean {
    return this.seconds === other.seconds && this.nanoseconds === other.nanoseconds;
  }
  toProto() {
    return {
      timestampValue: {
        seconds: this.seconds,
        nanoseconds: this.nanoseconds,
      },
    };
  }
}

function prop<T>(
  obj: Record<string, unknown>,
  field: string,
  generator: () => T
): void {
  let cached: T | undefined;
  let fetched = false;
  Object.defineProperty(obj, field, {
    get: () => {
      if (!fetched) {
        cached = generator();
        fetched = true;
      }
      return cached;
    },
  });
}

export function makeProxyDocument(
  raw: ProtoDocument,
  ref: string
): DocumentSnapshot {
  const proxy: any = {};

  prop<DocumentSnapshot>(proxy, '__realDoc', () => {
    return (firebase.firestore(apps().admin) as any).snapshot_(
      raw,
      proxy.readTime,
      'json'
    );
  });
  prop(proxy, 'ref', () => makeProxyDocumentReference(raw.name || ref));
  prop(proxy, 'id', () => proxy.ref.id);

  proxy.createTime = Timestamp.fromString(raw.createTime);
  proxy.updateTime = Timestamp.fromString(raw.updateTime);
  proxy.readTime = Timestamp.fromString((raw as any).readTime);
  // Unlike the realtime database, a document can exist without properties according to tests.
  proxy.exists = !!proxy.createTime;
  prop(proxy, '__data', () => {
    const data: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(raw.fields || {})) {
      data[key] = parseValue(value);
    }
    return data;
  });
  proxy.data = () => proxy.__data;
  proxy.get = (field: string | typeof firebase.firestore.FieldPath): any =>
    _.get(proxy.__data, field.toString());

  // private methods:
  proxy.protoField = (field: string | typeof firebase.firestore.FieldPath): any =>
    _.get(raw.fields, field.toString());
  proxy.toWriteProto = () => {
    return {
      update: {
        name: raw.name,
        fields: raw,
      },
    };
  };
  proxy.toDocumentProto = () => raw;
  proxy.isEqual = (other: DocumentSnapshot): boolean => {
    return proxy.__realDoc.isEqual(other);
  };

  return proxy as DocumentSnapshot;
}
function makeProxyDocumentReference(
  ref: string
): DocumentReference {
  const proxy: any = {};

  // Cut "/projects/*/databases/*/documents"
  const path = ref.split('/').slice(5);
  proxy.path = path.join('/');
  proxy.id = path[path.length - 1];
  proxy.formattedName = ref;
  prop(proxy, '__realRef', () =>
    firebase.firestore(apps().admin).doc(proxy.path)
  );
  prop(proxy, 'parent', () => proxy.__realRef.parent);
  prop(proxy, 'firestore', () => firebase.firestore(apps().admin));

  proxy.get = () => proxy.__realRef.get();
  proxy.collection = (collectionPath: string) =>
    proxy.__realRef.collection(collectionPath);
  proxy.listCollections = () => proxy.__realRef.listCollections();
  proxy.create = (data: unknown) =>
    proxy.__realRef.create(data);
  proxy.delete = (precondition?: firebase.firestore.Precondition) =>
    proxy.__realRef.delete(precondition);
  // TOOD: fix any
  proxy.set = (
    data: firebase.firestore.DocumentData,
    options?: { merge?: boolean; mergeFields?: string | typeof firebase.firestore.FieldPath }
  ) => {
    return proxy.__realRef.set(data, options);
  };
  proxy.update = (
    dataOrField: firebase.firestore.UpdateData | string | typeof firebase.firestore.FieldPath,
    ...preconditionOrValues: Array<
      unknown | string | typeof firebase.firestore.FieldPath | firebase.firestore.Precondition
    >
  ) => {
    return proxy.__realRef.update(dataOrField, ...preconditionOrValues);
  };
  proxy.onSnapshot = (
    onNext: (
      snapshot: DocumentSnapshot
    ) => void,
    onError?: (error: Error) => void
  ) => {
    return proxy.__realRef.onSnapshot(onNext, onError);
  };
  proxy.isEqual = (other: DocumentReference): boolean => proxy.__realRef.isEqual(other);
  proxy.toProto = () => {
    referenceValue: ref;
  };
  proxy.withConverter = <U>(
    converter: firebase.firestore.FirestoreDataConverter<U> | null
  ) => {
    return proxy.__realRef.withConverter(converter);
  };

  return proxy as DocumentReference;
}

function parseValue(value: any): unknown {
  if (value.booleanValue !== undefined) {
    return Boolean(value.booleanValue);
  } else if (value.bytesValue !== undefined) {
    return Buffer.from(value.bytesValue, 'base64');
  } else if (value.doubleValue !== undefined) {
    return Number(value.doubleValue);
  } else if (value.integerValue !== undefined) {
    return Number(value.integerValue);
  } else if (value.nullValue !== undefined) {
    return null;
  } else if (value.stringValue !== undefined) {
    return value.stringValue;
  } else if (value.timestampValue !== undefined) {
    return Timestamp.fromString(value.timestampValue);
  } else if (value.geoPointValue !== undefined) {
    return new GeoPoint(value.geoPointValue.latitude, value.geoPointValue.longitude);
  } else if (value.referenceValue !== undefined) {
    return makeProxyDocumentReference(value.referenceValue);
  } else if (value.mapValue !== undefined) {
    const res = {};
    for (const [key, raw] of Object.entries(value.mapValue.fields)) {
      res[key] = parseValue(raw);
    }
    return res;
  } else if (value.arrayValue !== undefined) {
    const res = [];
    for (const raw of value.arrayValue.values) {
      res.push(parseValue(raw));
    }
    return res;
  } else {
    // Should never happen
    throw new Error(
      'Unexpected parse error. Could not create scalar value for IValue ' +
        JSON.stringify(value)
    );
  }
}