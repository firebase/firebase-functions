import CloudHttpBuilder from './http-builder';
import CloudPubsubBuilder from './pubsub-builder';
import CloudStorageBuilder from './storage-builder';

export interface CloudBuilders {
  http(): CloudHttpBuilder
  pubsub(topic: string): CloudPubsubBuilder
  storage(bucket: string): CloudStorageBuilder
}

export function http(): CloudHttpBuilder {
  return new CloudHttpBuilder();
};

export function pubsub(topic: string): CloudPubsubBuilder {
  return new CloudPubsubBuilder(topic);
}

export function storage(bucket: string): CloudStorageBuilder {
  return new CloudStorageBuilder(bucket);
};