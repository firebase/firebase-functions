import { serializeCloudEvent } from ".";
import { StorageEvent, StorageObjectData } from "firebase-functions/v2/storage";

export function serializeStorageEvent(event: StorageEvent): any {
  return {
    ...serializeCloudEvent(event),
    bucket: event.bucket, // Exposed at top-level and object level
    object: serializeStorageObjectData(event.data),
  };
}

function serializeStorageObjectData(data: StorageObjectData): any {
  return {
    bucket: data.bucket,
    cacheControl: data.cacheControl,
    componentCount: data.componentCount,
    contentDisposition: data.contentDisposition,
    contentEncoding: data.contentEncoding,
    contentLanguage: data.contentLanguage,
    contentType: data.contentType,
    crc32c: data.crc32c,
    customerEncryption: data.customerEncryption,
    etag: data.etag,
    generation: data.generation,
    id: data.id,
    kind: data.kind,
    md5Hash: data.md5Hash,
    mediaLink: data.mediaLink,
    metadata: data.metadata,
    metageneration: data.metageneration,
    name: data.name,
    selfLink: data.selfLink,
    size: data.size,
    storageClass: data.storageClass,
    timeCreated: data.timeCreated,
    timeDeleted: data.timeDeleted,
    timeStorageClassUpdated: data.timeStorageClassUpdated,
    updated: data.updated,
  };
}
