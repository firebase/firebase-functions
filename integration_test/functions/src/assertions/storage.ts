import { assertType, expect } from "vitest";
import { config } from "../config";

export function expectStorageObjectData(data: any, filename: string) {
  expect(data.bucket).toBe(config.storageBucket);
  expect(data.contentType).toBe("text/plain");

  expect(data.crc32c).toBeDefined();
  assertType<string>(data.crc32c);
  expect(data.crc32c.length).toBeGreaterThan(0);

  expect(data.md5Hash).toBeDefined();
  assertType<string>(data.md5Hash);
  expect(data.md5Hash.length).toBeGreaterThan(0);

  expect(data.etag).toBeDefined();
  assertType<string>(data.etag);
  expect(data.etag.length).toBeGreaterThan(0);

  expect(Number.parseInt(data.generation)).toBeGreaterThan(0);

  expect(data.id).toBeDefined();
  assertType<string>(data.id);
  expect(data.id).toContain(config.storageBucket);
  expect(data.id).toContain(filename);

  expect(data.kind).toBe("storage#object");

  expect(data.mediaLink).toContain(
    `https://storage.googleapis.com/download/storage/v1/b/${config.storageBucket}/o/${filename}`
  );

  expect(Number.parseInt(data.metageneration)).toBeGreaterThan(0);

  expect(data.name).toBe(filename);

  expect(data.selfLink).toBe(
    `https://www.googleapis.com/storage/v1/b/${config.storageBucket}/o/${filename}`
  );

  expect(Number.parseInt(data.size)).toBeGreaterThan(0);

  expect(data.storageClass).toBe("REGIONAL");

  expect(Date.parse(data.timeCreated)).toBeGreaterThan(0);
  expect(Date.parse(data.timeStorageClassUpdated)).toBeGreaterThan(0);
  expect(Date.parse(data.updated)).toBeGreaterThan(0);
}
