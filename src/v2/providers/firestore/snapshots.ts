import {
  createBeforeSnapshotFromJson,
  createBeforeSnapshotFromProtobuf,
  createSnapshotFromJson,
  createSnapshotFromProtobuf,
} from "../../../common/providers/firestore";
import * as logger from "../../../logger";
import { Change } from "../../core";

import type { RawFirestoreData, RawFirestoreEvent } from "./types";

function getPath(event: RawFirestoreEvent): string {
  return `projects/${event.project}/databases/${event.database}/documents/${event.document}`;
}

/** @internal */
export function createSnapshot(event: RawFirestoreEvent) {
  if (event.datacontenttype?.includes("application/protobuf") || Buffer.isBuffer(event.data)) {
    return createSnapshotFromProtobuf(event.data as Uint8Array, getPath(event), event.database);
  } else if (event.datacontenttype?.includes("application/json")) {
    return createSnapshotFromJson(
      event.data,
      event.source,
      (event.data as RawFirestoreData).value?.createTime,
      (event.data as RawFirestoreData).value?.updateTime,
      event.database
    );
  } else {
    logger.error(
      `Cannot determine payload type, datacontenttype is ${event.datacontenttype}, failing out.`
    );
    throw Error("Error: Cannot parse event payload.");
  }
}

/** @internal */
export function createBeforeSnapshot(event: RawFirestoreEvent) {
  if (event.datacontenttype?.includes("application/protobuf") || Buffer.isBuffer(event.data)) {
    return createBeforeSnapshotFromProtobuf(
      event.data as Uint8Array,
      getPath(event),
      event.database
    );
  } else if (event.datacontenttype?.includes("application/json")) {
    return createBeforeSnapshotFromJson(
      event.data,
      event.source,
      (event.data as RawFirestoreData).oldValue?.createTime,
      (event.data as RawFirestoreData).oldValue?.updateTime,
      event.database
    );
  } else {
    logger.error(
      `Cannot determine payload type, datacontenttype is ${event.datacontenttype}, failing out.`
    );
    throw Error("Error: Cannot parse event payload.");
  }
}

/** @internal */
export function createChangeSnapshot(event: RawFirestoreEvent) {
  const before = createBeforeSnapshot(event);
  const after = createSnapshot(event);
  return Change.fromObjects(before, after);
}
