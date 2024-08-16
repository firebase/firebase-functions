/**
 * TaskQueue/LifecycleEvent/RuntimeStatus Tester SDK for backfill@0.0.2
 *
 * When filing bugs or feature requests please specify:
 *   "Extensions SDK v1.0.0 for Local extension.
 * https://github.com/firebase/firebase-tools/issues/new/choose
 *
 * GENERATED FILE. DO NOT EDIT.
 */
export type DoBackfillParam = "True" | "False";
export type LocationParam = "us-central1" | "us-east1" | "us-east4" | "europe-west1" | "europe-west2" | "europe-west3" | "asia-east2" | "asia-northeast1";
/**
 * Parameters for backfill@0.0.2 extension
 */
export interface BackfillParams {
    /**
     * Do a backfill
     */
    DO_BACKFILL: DoBackfillParam;
    /**
     * Cloud Functions location
     */
    LOCATION: LocationParam;
}
export declare function backfill(instanceId: string, params: BackfillParams): Backfill;
/**
 * TaskQueue/LifecycleEvent/RuntimeStatus Tester
 * A tester for the TaskQueue/LCE/RuntimeStatus project
 */
export declare class Backfill {
    private instanceId;
    private params;
    readonly FIREBASE_EXTENSION_LOCAL_PATH = "./functions/generated/extensions/local/backfill/0.0.2/src";
    constructor(instanceId: string, params: BackfillParams);
    getInstanceId(): string;
    getParams(): BackfillParams;
}