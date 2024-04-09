// The MIT License (MIT)
//
// Copyright (c) 2023 Firebase
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import * as firestore from "firebase-admin/firestore";
import * as logger from "../../logger";
import { getApp } from "../../common/app";
import { google } from "../../../protos/compiledFirestore";
import { dateToTimestampProto } from "../../common/utilities/encoder";

/** static-complied protobufs */
const DocumentEventData = google.events.cloud.firestore.v1.DocumentEventData;

let firestoreInstance: any;

/** @hidden */
function _getValueProto(data: any, resource: string, valueFieldName: string) {
  const value = data?.[valueFieldName];
  if (
    typeof value === "undefined" ||
    value === null ||
    (typeof value === "object" && !Object.keys(value).length)
  ) {
    // Firestore#snapshot_ takes resource string instead of proto for a non-existent snapshot
    return resource;
  }
  const proto = {
    fields: value?.fields || {},
    createTime: dateToTimestampProto(value?.createTime),
    updateTime: dateToTimestampProto(value?.updateTime),
    name: value?.name || resource,
  };
  return proto;
}

/** @internal */
export function createSnapshotFromProtobuf(data: Uint8Array, path: string, databaseId: string) {
  if (!firestoreInstance) {
    firestoreInstance = firestore.getFirestore(databaseId);
  }
  try {
    const dataBuffer = Buffer.from(data);
    const firestoreDecoded = DocumentEventData.decode(dataBuffer);

    return firestoreInstance.snapshot_(firestoreDecoded.value || path, null, "protobufJS");
  } catch (err: unknown) {
    logger.error("Failed to decode protobuf and create a snapshot.");
    throw err;
  }
}

/** @internal */
export function createBeforeSnapshotFromProtobuf(
  data: Uint8Array,
  path: string,
  databaseId: string
) {
  if (!firestoreInstance) {
    firestoreInstance = firestore.getFirestore(databaseId);
  }
  try {
    const dataBuffer = Buffer.from(data);
    const firestoreDecoded = DocumentEventData.decode(dataBuffer);

    return firestoreInstance.snapshot_(firestoreDecoded.oldValue || path, null, "protobufJS");
  } catch (err: unknown) {
    logger.error("Failed to decode protobuf and create a before snapshot.");
    throw err;
  }
}

/** @internal */
export function createSnapshotFromJson(
  data: any,
  source: string,
  createTime: string | undefined,
  updateTime: string | undefined,
  databaseId?: string
) {
  if (!firestoreInstance) {
    firestoreInstance = databaseId
      ? firestore.getFirestore(databaseId)
      : firestore.getFirestore(getApp());
  }
  const valueProto = _getValueProto(data, source, "value");
  let timeString = createTime || updateTime;

  if (!timeString) {
    logger.warn("Snapshot has no readTime. Using now()");
    timeString = new Date().toISOString();
  }

  const readTime = dateToTimestampProto(timeString);
  return firestoreInstance.snapshot_(valueProto, readTime, "json");
}

/** @internal */
export function createBeforeSnapshotFromJson(
  data: any,
  source: string,
  createTime: string | undefined,
  updateTime: string | undefined,
  databaseId?: string
) {
  if (!firestoreInstance) {
    firestoreInstance = databaseId
      ? firestore.getFirestore(databaseId)
      : firestore.getFirestore(getApp());
  }

  const oldValueProto = _getValueProto(data, source, "oldValue");
  const oldReadTime = dateToTimestampProto(createTime || updateTime);
  return firestoreInstance.snapshot_(oldValueProto, oldReadTime, "json");
}
