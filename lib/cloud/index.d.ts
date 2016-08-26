import CloudHttpBuilder from './http-builder';
import CloudPubsubBuilder from './pubsub-builder';
import CloudStorageBuilder from './storage-builder';
export interface CloudBuilders {
    http(): CloudHttpBuilder;
    pubsub(topic: string): CloudPubsubBuilder;
    storage(bucket: string): CloudStorageBuilder;
}
export declare function http(): CloudHttpBuilder;
export declare function pubsub(topic: string): CloudPubsubBuilder;
export declare function storage(bucket: string): CloudStorageBuilder;
