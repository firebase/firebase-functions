import * as firebase from 'firebase-admin';
import * as _ from 'lodash';

import { apps } from '../../apps';

export type DocumentSnapshot = firebase.firestore.DocumentSnapshot;
export type DocumentReference = firebase.firestore.DocumentReference;
export type QueryDocumentSnapsho = firebase.firestore.QueryDocumentSnapshot;

export interface EventData {
  value: ProtoDocument;
  oldValue: ProtoDocument;
}

interface ProtoDocument {
  name?: string | null;
  fields?: Record<string, Value>;
  createTime?: string;
  updateTime?: string;
  readTime?: string;
}

// We've implmeented Value as a type union instead of a struct with any possible values in hopes
// that one day TypeScript will support type unions the same way Scala does and it will be a compiler
// error to miss a type case.
type Value =
  | NullValue
  | BooleanValue
  | IntegerValue
  | DoubleValue
  | TimestampValue
  | StringValue
  | BytesValue
  | ReferenceValue
  | GeoPointValue
  | ArrayValue
  | MapValue;

interface NullValue {
  nullValue: null;
}

function isNullValue(value: Value): value is NullValue {
  return Object.prototype.hasOwnProperty.bind(value)('nullValue');
}

interface BooleanValue {
  booleanValue: boolean;
}

function isBooleanValue(value: Value): value is BooleanValue {
  return Object.prototype.hasOwnProperty.bind(value)('booleanValue');
}

interface IntegerValue {
  integerValue: number;
}

function isIntegerValue(value: Value): value is IntegerValue {
  return Object.prototype.hasOwnProperty.bind(value)('integerValue');
}

interface DoubleValue {
  doubleValue: number;
}

function isDoubleValue(value: Value): value is DoubleValue {
  return Object.prototype.hasOwnProperty.bind(value)('doubleValue');
}

// Note: this differs from the proto type because google.protobuf.Timestamp
// has a special JSON encoding for an ISO8601 timestamp
interface TimestampValue {
  timestampValue: string;
}

function isTimestampValue(value: Value): value is TimestampValue {
  return Object.prototype.hasOwnProperty.bind(value)('timestampValue');
}

interface StringValue {
  stringValue: string;
}

function isStringValue(value: Value): value is StringValue {
  return Object.prototype.hasOwnProperty.bind(value)('stringValue');
}

interface BytesValue {
  bytesValue: string;
}

function isBytesValue(value: Value): value is BytesValue {
  return Object.prototype.hasOwnProperty.bind(value)('bytesValue');
}

interface ReferenceValue {
  referenceValue: string;
}

function isReferenceValue(value: Value): value is ReferenceValue {
  return Object.prototype.hasOwnProperty.bind(value)('referenceValue');
}

interface GeoPointValue {
  geoPointValue: {
    latitude: number;
    longitude: number;
  };
}

function isGeoPointValue(value: Value): value is GeoPointValue {
  return Object.prototype.hasOwnProperty.bind(value)('geoPointValue');
}

interface ArrayValue {
  arrayValue: {
    values: Value[];
  };
}

function isArrayValue(value: Value): value is ArrayValue {
  return Object.prototype.hasOwnProperty.bind(value)('arrayValue');
}

interface MapValue {
  mapValue: {
    fields: Record<string, Value>;
  };
}

function isMapValue(value: Value): value is MapValue {
  return Object.prototype.hasOwnProperty.bind(value)('mapValue');
}

function parseValue(value: any): unknown {
  if (isBooleanValue(value)) {
    return Boolean(value.booleanValue);
  } else if (isBytesValue(value)) {
    return Buffer.from(value.bytesValue, 'base64');
  } else if (isDoubleValue(value)) {
    return Number(value.doubleValue);
  } else if (isIntegerValue(value)) {
    return Number(value.integerValue);
  } else if (isNullValue(value)) {
    return null;
  } else if (isStringValue(value)) {
    return value.stringValue;
  } else if (isTimestampValue(value)) {
    return Timestamp.fromString(value.timestampValue);
  } else if (isGeoPointValue(value)) {
    return new GeoPoint(
      value.geoPointValue.latitude,
      value.geoPointValue.longitude
    );
  } else if (isReferenceValue(value)) {
    return makeProxyDocumentReference(value.referenceValue);
  } else if (isMapValue(value)) {
    const res = {};
    for (const [key, raw] of Object.entries(value.mapValue.fields)) {
      res[key] = parseValue(raw);
    }
    return res;
  } else if (isArrayValue(value)) {
    const res = [];
    for (const raw of value.arrayValue.values) {
      res.push(parseValue(raw));
    }
    return res;
  } else {
    // Should never happen unless Firestore adds a new type and the Functions SDK
    // has not been updated to handle it.
    throw new Error(
      'Unexpected parse error. Could not create scalar value for IValue ' +
        JSON.stringify(value)
    );
  }
}

class GeoPoint {
  constructor(readonly latitude: number, readonly longitude: number) {}
  isEqual(other: { latitude: number; longitude: number }): boolean {
    return (
      this.latitude === other.latitude && this.longitude == other.longitude
    );
  }
  toProto() {
    return {
      geoPointValue: {
        latitude: this.latitude,
        longitude: this.longitude,
      },
    };
  }
}

class Timestamp {
  // The Firestore SDK type hase these same named fields and properties;
  // we need to also have them for unit tests to pass.
  get seconds() {
    return this._seconds;
  }
  get nanoseconds() {
    return this._nanoseconds;
  }

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
  constructor(private _seconds: number, private _nanoseconds: number) {}
  isEqual(other: { seconds: number; nanoseconds: number }): boolean {
    return (
      this.seconds === other.seconds && this.nanoseconds === other.nanoseconds
    );
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

/**
 *  Creates a caching property accessor.
 *  Use this method for things that need to look like simple iValues (e.g. DocumentSnapshot.ref)
 *  but are expensive to create. Prop will automatically cache these expensive values,
 *  hides them behind a generator so they're not created unless accessed, and supports
 *  properties that throw.
 */
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

/**
 * Creates a faux DocumentSnapshot that conforms to the interface but is not instanceof DocumentSnapshot.
 * We could technically make a class ProxyDocumentSnapshot, but that would make the caching property accessors
 * much more annoying to write.
 */
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
  proxy.get = (field: string | firebase.firestore.FieldPath): any =>
    _.get(proxy.__data, field.toString());

  // private methods:
  proxy.protoField = (field: string | firebase.firestore.FieldPath): any =>
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

/** Create a faux DocumentReference. */
function makeProxyDocumentReference(ref: string): DocumentReference {
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
  proxy.create = (data: unknown) => proxy.__realRef.create(data);
  proxy.delete = (precondition?: firebase.firestore.Precondition) =>
    proxy.__realRef.delete(precondition);
  proxy.set = (
    data: firebase.firestore.DocumentData,
    options?: {
      merge?: boolean;
      mergeFields?: string | firebase.firestore.FieldPath;
    }
  ) => {
    return proxy.__realRef.set(data, options);
  };
  proxy.update = (
    dataOrField:
      | firebase.firestore.UpdateData
      | string
      | firebase.firestore.FieldPath,
    ...preconditionOrValues: Array<
      | unknown
      | string
      | firebase.firestore.FieldPath
      | firebase.firestore.Precondition
    >
  ) => {
    return proxy.__realRef.update(dataOrField, ...preconditionOrValues);
  };
  proxy.onSnapshot = (
    onNext: (snapshot: DocumentSnapshot) => void,
    onError?: (error: Error) => void
  ) => {
    return proxy.__realRef.onSnapshot(onNext, onError);
  };
  proxy.isEqual = (other: DocumentReference): boolean =>
    proxy.__realRef.isEqual(other);
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
