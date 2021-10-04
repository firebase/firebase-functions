## API Report File for "firebase-functions"

> Do not edit this file. It is a report generated by [API Extractor](https://api-extractor.com/).

```ts

/// <reference types="node" />

import * as express from 'express';
import * as firebase from 'firebase-admin';
import { ParamsDictionary } from 'express-serve-static-core';
import { Request } from 'express';
import { Response } from 'express';

declare namespace analytics {
    export {
        event,
        _eventWithOptions,
        provider,
        service,
        AnalyticsEventBuilder,
        AnalyticsEvent,
        UserDimensions,
        UserPropertyValue,
        DeviceInfo,
        GeoInfo,
        AppInfo,
        ExportBundleInfo
    }
}
export { analytics }

// @public
class AnalyticsEvent {
    constructor(wireFormat: any);
    logTime: string;
    name: string;
    params: {
        [key: string]: any;
    };
    previousLogTime?: string;
    reportingDate: string;
    user?: UserDimensions;
    valueInUSD?: number;
}

// @public
class AnalyticsEventBuilder {
    constructor(triggerResource: () => string, options: DeploymentOptions);
    onLog(handler: (event: AnalyticsEvent, context: EventContext) => PromiseLike<any> | any): CloudFunction<AnalyticsEvent>;
}

// Warning: (ae-forgotten-export) The symbol "apps" needs to be exported by the entry point index.d.ts
//
// @public (undocumented)
export const app: apps.apps.Apps;

// @public
interface AppInfo {
    appId?: string;
    appInstanceId: string;
    appPlatform: string;
    appStore?: string;
    appVersion?: string;
}

// @public (undocumented)
function apps_2(): apps_2.Apps;

// @public (undocumented)
namespace apps_2 {
    const // (undocumented)
    garbageCollectionInterval: number;
    // (undocumented)
    class Apps {
        constructor();
        // (undocumented)
        get admin(): firebase.app.App;
        // (undocumented)
        _appAlive(appName: string): boolean;
        // (undocumented)
        _destroyApp(appName: string): void;
        // (undocumented)
        release(): Promise<void>;
        // (undocumented)
        retain(): void;
        setEmulatedAdminApp(app: firebase.app.App): void;
    }
    let // (undocumented)
    singleton: apps_2.Apps;
    let // (undocumented)
    init: () => Apps;
    // (undocumented)
    interface AuthMode {
        // (undocumented)
        admin: boolean;
        // (undocumented)
        variable?: any;
    }
    // (undocumented)
    function delay(delay: number): Promise<unknown>;
    // (undocumented)
    interface RefCounter {
        // (undocumented)
        [appName: string]: number;
    }
}

declare namespace auth {
    export {
        user,
        _userWithOptions,
        userRecordConstructor,
        provider_2 as provider,
        service_2 as service,
        UserRecordMetadata,
        UserBuilder,
        UserRecord,
        UserInfo
    }
}
export { auth }

// @public (undocumented)
function beforeSnapshotConstructor(event: Event): DocumentSnapshot;

// @public
function bucket(bucket?: string): BucketBuilder;

// @public
class BucketBuilder {
    constructor(triggerResource: () => string, options: DeploymentOptions);
    object(): ObjectBuilder;
}

// @public (undocumented)
function _bucketWithOptions(options: DeploymentOptions, bucket?: string): BucketBuilder;

// @public
interface CallableContext {
    // Warning: (ae-forgotten-export) The symbol "AppCheckData" needs to be exported by the entry point index.d.ts
    app?: AppCheckData;
    // Warning: (ae-forgotten-export) The symbol "AuthData" needs to be exported by the entry point index.d.ts
    auth?: AuthData;
    instanceIdToken?: string;
    rawRequest: Request_2;
}

// @public
export class Change<T> {
    constructor(before: T, after: T);
    // (undocumented)
    after: T;
    // (undocumented)
    before: T;
}

// @public (undocumented)
export namespace Change {
    // (undocumented)
    export function applyFieldMask(sparseBefore: any, after: any, fieldMask: string): any;
    export function fromJSON<T>(json: ChangeJson, customizer?: (x: any) => T): Change<T>;
    export function fromObjects<T>(before: T, after: T): Change<T>;
}

// @public
export interface ChangeJson {
    after?: any;
    before?: any;
    fieldMask?: string;
}

// @public
class ClientInfo {
    details: {
        [key: string]: string;
    };
    name: string;
}

// @public
export type CloudFunction<T> = Runnable<T> & TriggerAnnotated & ((input: any, context?: any) => PromiseLike<any> | any);

// @public (undocumented)
export function config(): config.Config;

// @public
export namespace config {
    export interface Config {
        // (undocumented)
        [key: string]: any;
    }
    let // (undocumented)
    singleton: config.Config;
}

declare namespace database {
    export {
        instance,
        ref,
        _instanceWithOptions,
        _refWithOptions,
        extractInstanceAndPath,
        provider_3 as provider,
        service_3 as service,
        InstanceBuilder,
        RefBuilder,
        DataSnapshot
    }
}
export { database }

// @public (undocumented)
function database_2(database: string): DatabaseBuilder;

// @public (undocumented)
class DatabaseBuilder {
    constructor(database: string, options: DeploymentOptions);
    // (undocumented)
    document(path: string): DocumentBuilder;
    // (undocumented)
    namespace(namespace: string): NamespaceBuilder;
}

// @public (undocumented)
function _databaseWithOptions(database: string, options: DeploymentOptions): DatabaseBuilder;

// @public
class DataSnapshot {
    constructor(data: any, path?: string, // path will be undefined for the database root
    app?: firebase.app.App, instance?: string);
    child(childPath: string): DataSnapshot;
    exists(): boolean;
    exportVal(): any;
    forEach(action: (a: DataSnapshot) => boolean | void): boolean;
    getPriority(): string | number | null;
    hasChild(childPath: string): boolean;
    hasChildren(): boolean;
    // (undocumented)
    instance: string;
    get key(): string;
    numChildren(): number;
    get ref(): firebase.database.Reference;
    toJSON(): Object;
    val(): any;
}

// @public
function debug(...args: any[]): void;

// @public (undocumented)
export const DEFAULT_FAILURE_POLICY: FailurePolicy;

// @public (undocumented)
const defaultDatabase = "(default)";

// @public (undocumented)
export interface DeploymentOptions extends RuntimeOptions {
    // (undocumented)
    regions?: Array<typeof SUPPORTED_REGIONS[number] | string>;
    // (undocumented)
    schedule?: Schedule;
}

// @public
interface DeviceInfo {
    deviceCategory?: string;
    deviceId?: string;
    deviceModel?: string;
    deviceTimeZoneOffsetSeconds: number;
    limitedAdTracking: boolean;
    mobileBrandName?: string;
    mobileMarketingName?: string;
    mobileModelName?: string;
    platformVersion?: string;
    resettableDeviceId?: string;
    userDefaultLanguage: string;
}

// @public
function document(path: string): DocumentBuilder;

// @public (undocumented)
class DocumentBuilder {
    constructor(triggerResource: () => string, options: DeploymentOptions);
    onCreate(handler: (snapshot: QueryDocumentSnapshot, context: EventContext) => PromiseLike<any> | any): CloudFunction<QueryDocumentSnapshot>;
    onDelete(handler: (snapshot: QueryDocumentSnapshot, context: EventContext) => PromiseLike<any> | any): CloudFunction<QueryDocumentSnapshot>;
    onUpdate(handler: (change: Change<QueryDocumentSnapshot>, context: EventContext) => PromiseLike<any> | any): CloudFunction<Change<QueryDocumentSnapshot>>;
    onWrite(handler: (change: Change<DocumentSnapshot>, context: EventContext) => PromiseLike<any> | any): CloudFunction<Change<DocumentSnapshot>>;
}

// @public (undocumented)
type DocumentSnapshot = firebase.firestore.DocumentSnapshot;

// @public (undocumented)
function _documentWithOptions(path: string, options: DeploymentOptions): DocumentBuilder;

// @public
function error(...args: any[]): void;

// @public
export interface Event {
    // (undocumented)
    context: {
        eventId: string;
        timestamp: string;
        eventType: string;
        resource: Resource;
        domain?: string;
    };
    // (undocumented)
    data: any;
}

// @public
function event(analyticsEventType: string): AnalyticsEventBuilder;

// @public
export interface EventContext {
    auth?: {
        token: object;
        uid: string;
    };
    authType?: 'ADMIN' | 'USER' | 'UNAUTHENTICATED';
    eventId: string;
    eventType: string;
    params: {
        [option: string]: any;
    };
    resource: Resource;
    timestamp: string;
}

// @public (undocumented)
function _eventWithOptions(analyticsEventType: string, options: DeploymentOptions): AnalyticsEventBuilder;

// @public
class ExportBundleInfo {
    constructor(wireFormat: any);
    bundleSequenceId: number;
    serverTimestampOffset: number;
}

// @public (undocumented)
function extractInstanceAndPath(resource: string, domain?: string): string[];

// @public (undocumented)
export interface FailurePolicy {
    // (undocumented)
    retry: {};
}

// @public (undocumented)
export function firebaseConfig(): firebase.AppOptions | null;

// @public (undocumented)
export let firebaseConfigCache: firebase.AppOptions | null;

declare namespace firestore {
    export {
        document,
        namespace,
        database_2 as database,
        _databaseWithOptions,
        _namespaceWithOptions,
        _documentWithOptions,
        snapshotConstructor,
        beforeSnapshotConstructor,
        provider_4 as provider,
        service_4 as service,
        defaultDatabase,
        DocumentSnapshot,
        QueryDocumentSnapshot,
        DatabaseBuilder,
        NamespaceBuilder,
        DocumentBuilder
    }
}
export { firestore }

// @public (undocumented)
export class FunctionBuilder {
    constructor(options: DeploymentOptions);
    // (undocumented)
    get analytics(): {
        event: (analyticsEventType: string) => analytics.AnalyticsEventBuilder;
    };
    // (undocumented)
    get auth(): {
        user: () => auth.UserBuilder;
    };
    // (undocumented)
    get database(): {
        instance: (instance: string) => database.InstanceBuilder;
        ref: (path: string) => database.RefBuilder;
    };
    // (undocumented)
    get firestore(): {
        document: (path: string) => firestore.DocumentBuilder;
        namespace: (namespace: string) => firestore.NamespaceBuilder;
        database: (database: string) => firestore.DatabaseBuilder;
    };
    // (undocumented)
    get https(): {
        onRequest: (handler: (req: https.Request, resp: express.Response) => void | Promise<void>) => HttpsFunction;
        onCall: (handler: (data: any, context: https.CallableContext) => any | Promise<any>) => TriggerAnnotated & ((req: express.Request<ParamsDictionary>, resp: express.Response<any>) => void | Promise<void>) & Runnable<any>;
    };
    // (undocumented)
    get pubsub(): {
        topic: (topic: string) => pubsub.TopicBuilder;
        schedule: (schedule: string) => pubsub.ScheduleBuilder;
    };
    region(...regions: Array<typeof SUPPORTED_REGIONS[number] | string>): FunctionBuilder;
    // (undocumented)
    get remoteConfig(): {
        onUpdate: (handler: (version: remoteConfig.TemplateVersion, context: EventContext) => PromiseLike<any> | any) => CloudFunction<remoteConfig.TemplateVersion>;
    };
    runWith(runtimeOptions: RuntimeOptions): FunctionBuilder;
    // (undocumented)
    get storage(): {
        bucket: (bucket?: string) => storage.BucketBuilder;
        object: () => storage.ObjectBuilder;
    };
    // (undocumented)
    get testLab(): {
        testMatrix: () => testLab.TestMatrixBuilder;
    };
}

// @public
type FunctionsErrorCode = 'ok' | 'cancelled' | 'unknown' | 'invalid-argument' | 'deadline-exceeded' | 'not-found' | 'already-exists' | 'permission-denied' | 'resource-exhausted' | 'failed-precondition' | 'aborted' | 'out-of-range' | 'unimplemented' | 'internal' | 'unavailable' | 'data-loss' | 'unauthenticated';

// @public
interface GeoInfo {
    city?: string;
    continent?: string;
    country?: string;
    region?: string;
}

// Warning: (ae-forgotten-export) The symbol "HandlerBuilder" needs to be exported by the entry point index.d.ts
//
// @public (undocumented)
export let handler: HandlerBuilder;

declare namespace https {
    export {
        onRequest,
        onCall,
        _onRequestWithOptions,
        _onCallWithOptions,
        Request_2 as Request,
        CallableContext,
        FunctionsErrorCode,
        HttpsError
    }
}
export { https }

// @public
class HttpsError extends Error {
    constructor(code: FunctionsErrorCode, message: string, details?: unknown);
    readonly code: FunctionsErrorCode;
    readonly details: unknown;
    // Warning: (ae-forgotten-export) The symbol "HttpErrorCode" needs to be exported by the entry point index.d.ts
    readonly httpErrorCode: HttpErrorCode;
    // Warning: (ae-forgotten-export) The symbol "HttpErrorWireFormat" needs to be exported by the entry point index.d.ts
    //
    // (undocumented)
    toJSON(): HttpErrorWireFormat;
}

// @public
export type HttpsFunction = TriggerAnnotated & ((req: Request, resp: Response) => void | Promise<void>);

// @public
function info(...args: any[]): void;

// @public
export const INGRESS_SETTINGS_OPTIONS: readonly ["INGRESS_SETTINGS_UNSPECIFIED", "ALLOW_ALL", "ALLOW_INTERNAL_ONLY", "ALLOW_INTERNAL_AND_GCLB"];

// @public
function instance(instance: string): InstanceBuilder;

// @public
class InstanceBuilder {
    constructor(instance: string, options: DeploymentOptions);
    ref(path: string): RefBuilder;
}

// @public (undocumented)
function _instanceWithOptions(instance: string, options: DeploymentOptions): InstanceBuilder;

// @public
type InvalidMatrixDetails = 'DETAILS_UNAVAILABLE' | 'MALFORMED_APK' | 'MALFORMED_TEST_APK' | 'NO_MANIFEST' | 'NO_PACKAGE_NAME' | 'INVALID_PACKAGE_NAME' | 'TEST_SAME_AS_APP' | 'NO_INSTRUMENTATION' | 'NO_SIGNATURE' | 'INSTRUMENTATION_ORCHESTRATOR_INCOMPATIBLE' | 'NO_TEST_RUNNER_CLASS' | 'NO_LAUNCHER_ACTIVITY' | 'FORBIDDEN_PERMISSIONS' | 'INVALID_ROBO_DIRECTIVES' | 'INVALID_RESOURCE_NAME' | 'INVALID_DIRECTIVE_ACTION' | 'TEST_LOOP_INTENT_FILTER_NOT_FOUND' | 'SCENARIO_LABEL_NOT_DECLARED' | 'SCENARIO_LABEL_MALFORMED' | 'SCENARIO_NOT_DECLARED' | 'DEVICE_ADMIN_RECEIVER' | 'MALFORMED_XC_TEST_ZIP' | 'BUILT_FOR_IOS_SIMULATOR' | 'NO_TESTS_IN_XC_TEST_ZIP' | 'USE_DESTINATION_ARTIFACTS' | 'TEST_NOT_APP_HOSTED' | 'PLIST_CANNOT_BE_PARSED' | 'NO_CODE_APK' | 'INVALID_INPUT_APK' | 'INVALID_APK_PREVIEW_SDK';

// @public
function log(...args: any[]): void;

// @public
interface LogEntry {
    // (undocumented)
    [key: string]: any;
    // (undocumented)
    message?: string;
    // (undocumented)
    severity: LogSeverity;
}

declare namespace logger {
    export {
        write,
        debug,
        log,
        info,
        warn,
        error,
        LogSeverity,
        LogEntry
    }
}
export { logger }

// @public
type LogSeverity = 'DEBUG' | 'INFO' | 'NOTICE' | 'WARNING' | 'ERROR' | 'CRITICAL' | 'ALERT' | 'EMERGENCY';

// @public (undocumented)
export function makeCloudFunction<EventData>({ after, before, contextOnlyHandler, dataConstructor, eventType, handler, labels, legacyEventType, options, provider, service, triggerResource, }: MakeCloudFunctionArgs<EventData>): CloudFunction<EventData>;

// @public (undocumented)
export interface MakeCloudFunctionArgs<EventData> {
    // (undocumented)
    after?: (raw: Event) => void;
    // (undocumented)
    before?: (raw: Event) => void;
    // (undocumented)
    contextOnlyHandler?: (context: EventContext) => PromiseLike<any> | any;
    // (undocumented)
    dataConstructor?: (raw: Event) => EventData;
    // (undocumented)
    eventType: string;
    // (undocumented)
    handler?: (data: EventData, context: EventContext) => PromiseLike<any> | any;
    // (undocumented)
    labels?: {
        [key: string]: any;
    };
    // (undocumented)
    legacyEventType?: string;
    // (undocumented)
    options?: {
        [key: string]: any;
    };
    // (undocumented)
    provider: string;
    // (undocumented)
    service: string;
    // (undocumented)
    triggerResource: () => string;
}

// @public (undocumented)
export const MAX_NUMBER_USER_LABELS = 58;

// @public
export const MAX_TIMEOUT_SECONDS = 540;

// @public
class Message {
    constructor(data: any);
    readonly attributes: {
        [key: string]: string;
    };
    readonly data: string;
    get json(): any;
    toJSON(): any;
}

// @public
export const MIN_TIMEOUT_SECONDS = 0;

// @public (undocumented)
function namespace(namespace: string): NamespaceBuilder;

// @public (undocumented)
class NamespaceBuilder {
    constructor(database: string, options: DeploymentOptions, namespace?: string);
    // (undocumented)
    document(path: string): DocumentBuilder;
}

// @public (undocumented)
function _namespaceWithOptions(namespace: string, options: DeploymentOptions): NamespaceBuilder;

// @public
function object(): ObjectBuilder;

// @public
class ObjectBuilder {
    constructor(triggerResource: () => string, options: DeploymentOptions);
    onArchive(handler: (object: ObjectMetadata, context: EventContext) => PromiseLike<any> | any): CloudFunction<ObjectMetadata>;
    // (undocumented)
    onChange(handler: any): Error;
    onDelete(handler: (object: ObjectMetadata, context: EventContext) => PromiseLike<any> | any): CloudFunction<ObjectMetadata>;
    onFinalize(handler: (object: ObjectMetadata, context: EventContext) => PromiseLike<any> | any): CloudFunction<ObjectMetadata>;
    onMetadataUpdate(handler: (object: ObjectMetadata, context: EventContext) => PromiseLike<any> | any): CloudFunction<ObjectMetadata>;
}

// @public
interface ObjectMetadata {
    // (undocumented)
    acl?: [
        {
        kind?: string;
        id?: string;
        selfLink?: string;
        bucket?: string;
        object?: string;
        generation?: string;
        entity?: string;
        role?: string;
        email?: string;
        entityId?: string;
        domain?: string;
        projectTeam?: {
            projectNumber?: string;
            team?: string;
        };
        etag?: string;
    }
    ];
    bucket: string;
    cacheControl?: string;
    componentCount?: string;
    contentDisposition?: string;
    contentEncoding?: string;
    contentLanguage?: string;
    contentType?: string;
    crc32c?: string;
    customerEncryption?: {
        encryptionAlgorithm?: string;
        keySha256?: string;
    };
    // (undocumented)
    etag?: string;
    generation?: string;
    id: string;
    kind: string;
    md5Hash?: string;
    mediaLink?: string;
    metadata?: {
        [key: string]: string;
    };
    metageneration?: string;
    name?: string;
    // (undocumented)
    owner?: {
        entity?: string;
        entityId?: string;
    };
    selfLink?: string;
    size: string;
    storageClass: string;
    timeCreated: string;
    timeDeleted?: string;
    // (undocumented)
    timeStorageClassUpdated?: string;
    updated: string;
}

// @public (undocumented)
function _objectWithOptions(options: DeploymentOptions): ObjectBuilder;

// @public
function onCall(handler: (data: any, context: CallableContext) => any | Promise<any>): HttpsFunction & Runnable<any>;

// @public (undocumented)
function _onCallWithOptions(handler: (data: any, context: CallableContext) => any | Promise<any>, options: DeploymentOptions): HttpsFunction & Runnable<any>;

// @public
function onRequest(handler: (req: Request_2, resp: express.Response) => void | Promise<void>): HttpsFunction;

// @public (undocumented)
function _onRequestWithOptions(handler: (req: Request_2, resp: express.Response) => void | Promise<void>, options: DeploymentOptions): HttpsFunction;

// @public
function onUpdate(handler: (version: TemplateVersion, context: EventContext) => PromiseLike<any> | any): CloudFunction<TemplateVersion>;

// @public (undocumented)
function _onUpdateWithOptions(handler: (version: TemplateVersion, context: EventContext) => PromiseLike<any> | any, options: DeploymentOptions): CloudFunction<TemplateVersion>;

// @public (undocumented)
export function optionsToTrigger(options: DeploymentOptions): any;

// @public
type OutcomeSummary = 'SUCCESS' | 'FAILURE' | 'INCONCLUSIVE' | 'SKIPPED';

// @public (undocumented)
const provider = "google.analytics";

// @public (undocumented)
const provider_2 = "google.firebase.auth";

// @public (undocumented)
const provider_3 = "google.firebase.database";

// @public (undocumented)
const provider_4 = "google.firestore";

// @public (undocumented)
const provider_5 = "google.firebase.remoteconfig";

// @public (undocumented)
const provider_6 = "google.storage";

// @public (undocumented)
const provider_7 = "google.pubsub";

declare namespace pubsub {
    export {
        topic,
        _topicWithOptions,
        schedule,
        _scheduleWithOptions,
        provider_7 as provider,
        service_7 as service,
        TopicBuilder,
        ScheduleBuilder,
        Message
    }
}
export { pubsub }

// @public (undocumented)
type QueryDocumentSnapshot = firebase.firestore.QueryDocumentSnapshot;

// @public
function ref(path: string): RefBuilder;

// @public
class RefBuilder {
    constructor(apps: apps_2.Apps, triggerResource: () => string, options: DeploymentOptions);
    onCreate(handler: (snapshot: DataSnapshot, context: EventContext) => PromiseLike<any> | any): CloudFunction<DataSnapshot>;
    onDelete(handler: (snapshot: DataSnapshot, context: EventContext) => PromiseLike<any> | any): CloudFunction<DataSnapshot>;
    onUpdate(handler: (change: Change<DataSnapshot>, context: EventContext) => PromiseLike<any> | any): CloudFunction<Change<DataSnapshot>>;
    onWrite(handler: (change: Change<DataSnapshot>, context: EventContext) => PromiseLike<any> | any): CloudFunction<Change<DataSnapshot>>;
}

// @public (undocumented)
function _refWithOptions(path: string, options: DeploymentOptions): RefBuilder;

// @public
export function region(...regions: Array<typeof SUPPORTED_REGIONS[number] | string>): FunctionBuilder;

declare namespace remoteConfig {
    export {
        onUpdate,
        _onUpdateWithOptions,
        provider_5 as provider,
        service_5 as service,
        UpdateBuilder,
        TemplateVersion,
        RemoteConfigUser
    }
}
export { remoteConfig }

// @public
interface RemoteConfigUser {
    email: string;
    imageUrl?: string;
    name?: string;
}

export { Request }

// @public (undocumented)
interface Request_2 extends express.Request {
    // (undocumented)
    rawBody: Buffer;
}

// @public
export interface Resource {
    // (undocumented)
    labels?: {
        [tag: string]: string;
    };
    // (undocumented)
    name: string;
    // (undocumented)
    service: string;
    // (undocumented)
    type?: string;
}

export { Response }

// @public
class ResultStorage {
    gcsPath?: string;
    resultsUrl?: string;
    toolResultsExecutionId?: string;
    toolResultsHistoryId?: string;
}

// @public
export interface Runnable<T> {
    // (undocumented)
    run: (data: T, context: any) => PromiseLike<any> | any;
}

// @public (undocumented)
export interface RuntimeOptions {
    failurePolicy?: FailurePolicy | boolean;
    ingressSettings?: typeof INGRESS_SETTINGS_OPTIONS[number];
    invoker?: 'public' | 'private' | string | string[];
    labels?: Record<string, string>;
    maxInstances?: number;
    memory?: typeof VALID_MEMORY_OPTIONS[number];
    minInstances?: number;
    platform?: 'gcfv1';
    serviceAccount?: 'default' | string;
    timeoutSeconds?: number;
    vpcConnector?: string;
    vpcConnectorEgressSettings?: typeof VPC_EGRESS_SETTINGS_OPTIONS[number];
}

// @public
export function runWith(runtimeOptions: RuntimeOptions): FunctionBuilder;

// @public
export interface Schedule {
    // (undocumented)
    retryConfig?: ScheduleRetryConfig;
    // (undocumented)
    schedule: string;
    // (undocumented)
    timeZone?: string;
}

// @public
function schedule(schedule: string): ScheduleBuilder;

// @public
class ScheduleBuilder {
    constructor(triggerResource: () => string, options: DeploymentOptions);
    onRun(handler: (context: EventContext) => PromiseLike<any> | any): CloudFunction<unknown>;
    // (undocumented)
    retryConfig(config: ScheduleRetryConfig): ScheduleBuilder;
    // (undocumented)
    timeZone(timeZone: string): ScheduleBuilder;
}

// @public
export interface ScheduleRetryConfig {
    // (undocumented)
    maxBackoffDuration?: string;
    // (undocumented)
    maxDoublings?: number;
    // (undocumented)
    maxRetryDuration?: string;
    // (undocumented)
    minBackoffDuration?: string;
    // (undocumented)
    retryCount?: number;
}

// @public (undocumented)
function _scheduleWithOptions(schedule: string, options: DeploymentOptions): ScheduleBuilder;

// @public (undocumented)
const service = "app-measurement.com";

// @public (undocumented)
const service_2 = "firebaseauth.googleapis.com";

// @public (undocumented)
const service_3 = "firebaseio.com";

// @public (undocumented)
const service_4 = "firestore.googleapis.com";

// @public (undocumented)
const service_5 = "firebaseremoteconfig.googleapis.com";

// @public (undocumented)
const service_6 = "storage.googleapis.com";

// @public (undocumented)
const service_7 = "pubsub.googleapis.com";

// @public (undocumented)
function snapshotConstructor(event: Event): DocumentSnapshot;

declare namespace storage {
    export {
        bucket,
        object,
        _bucketWithOptions,
        _objectWithOptions,
        provider_6 as provider,
        service_6 as service,
        BucketBuilder,
        ObjectBuilder,
        ObjectMetadata
    }
}
export { storage }

// @public
export const SUPPORTED_REGIONS: readonly ["us-central1", "us-east1", "us-east4", "us-west2", "us-west3", "us-west4", "europe-central2", "europe-west1", "europe-west2", "europe-west3", "europe-west6", "asia-east1", "asia-east2", "asia-northeast1", "asia-northeast2", "asia-northeast3", "asia-south1", "asia-southeast1", "asia-southeast2", "northamerica-northeast1", "southamerica-east1", "australia-southeast1"];

// @public
interface TemplateVersion {
    description: string;
    rollbackSource?: number;
    updateOrigin: string;
    updateTime: string;
    updateType: string;
    updateUser: RemoteConfigUser;
    versionNumber: number;
}

declare namespace testLab {
    export {
        testMatrix,
        TestMatrixBuilder,
        TestMatrix,
        ClientInfo,
        ResultStorage,
        InvalidMatrixDetails,
        TestState,
        OutcomeSummary
    }
}
export { testLab }

// @public
class TestMatrix {
    clientInfo: ClientInfo;
    createTime: string;
    invalidMatrixDetails?: InvalidMatrixDetails;
    outcomeSummary?: OutcomeSummary;
    resultStorage: ResultStorage;
    state: TestState;
    testMatrixId: string;
}

// @public
function testMatrix(): TestMatrixBuilder;

// @public
class TestMatrixBuilder {
    onComplete(handler: (testMatrix: TestMatrix, context: EventContext) => PromiseLike<any> | any): CloudFunction<TestMatrix>;
}

// @public
type TestState = 'VALIDATING' | 'PENDING' | 'FINISHED' | 'ERROR' | 'INVALID';

// @public
function topic(topic: string): TopicBuilder;

// @public
class TopicBuilder {
    constructor(triggerResource: () => string, options: DeploymentOptions);
    onPublish(handler: (message: Message, context: EventContext) => PromiseLike<any> | any): CloudFunction<Message>;
}

// @public (undocumented)
function _topicWithOptions(topic: string, options: DeploymentOptions): TopicBuilder;

// @public
export interface TriggerAnnotated {
    // (undocumented)
    __trigger: {
        availableMemoryMb?: number;
        eventTrigger?: {
            eventType: string;
            resource: string;
            service: string;
        };
        failurePolicy?: FailurePolicy;
        httpsTrigger?: {
            invoker?: string[];
        };
        labels?: {
            [key: string]: string;
        };
        regions?: string[];
        schedule?: Schedule;
        timeout?: Duration;
        vpcConnector?: string;
        vpcConnectorEgressSettings?: string;
        serviceAccountEmail?: string;
        ingressSettings?: string;
    };
}

// @public
class UpdateBuilder {
    constructor(triggerResource: () => string, options: DeploymentOptions);
    onUpdate(handler: (version: TemplateVersion, context: EventContext) => PromiseLike<any> | any): CloudFunction<TemplateVersion>;
}

// @public
function user(): UserBuilder;

// @public
class UserBuilder {
    constructor(triggerResource: () => string, options?: DeploymentOptions);
    onCreate(handler: (user: UserRecord, context: EventContext) => PromiseLike<any> | any): CloudFunction<UserRecord>;
    onDelete(handler: (user: UserRecord, context: EventContext) => PromiseLike<any> | any): CloudFunction<UserRecord>;
}

// @public
class UserDimensions {
    constructor(wireFormat: any);
    appInfo?: AppInfo;
    bundleInfo: ExportBundleInfo;
    deviceInfo: DeviceInfo;
    firstOpenTime?: string;
    geoInfo: GeoInfo;
    userId?: string;
    userProperties: {
        [key: string]: UserPropertyValue;
    };
}

// @public
type UserInfo = firebase.auth.UserInfo;

// @public
class UserPropertyValue {
    constructor(wireFormat: any);
    setTime: string;
    value: string;
}

// @public
type UserRecord = firebase.auth.UserRecord;

// @public (undocumented)
function userRecordConstructor(wireData: Object): firebase.auth.UserRecord;

// @public (undocumented)
class UserRecordMetadata implements firebase.auth.UserMetadata {
    constructor(creationTime: string, lastSignInTime: string);
    // (undocumented)
    creationTime: string;
    // (undocumented)
    lastSignInTime: string;
    toJSON(): {
        creationTime: string;
        lastSignInTime: string;
    };
}

// @public (undocumented)
function _userWithOptions(options: DeploymentOptions): UserBuilder;

// @public
export const VALID_MEMORY_OPTIONS: readonly ["128MB", "256MB", "512MB", "1GB", "2GB", "4GB", "8GB"];

// @public
export const VPC_EGRESS_SETTINGS_OPTIONS: readonly ["VPC_CONNECTOR_EGRESS_SETTINGS_UNSPECIFIED", "PRIVATE_RANGES_ONLY", "ALL_TRAFFIC"];

// @public
function warn(...args: any[]): void;

// @public
function write(entry: LogEntry): void;

// Warnings were encountered during analysis:
//
// lib/cloud-functions.d.ts:196:9 - (ae-forgotten-export) The symbol "Duration" needs to be exported by the entry point index.d.ts

// (No @packageDocumentation comment for this package)

```