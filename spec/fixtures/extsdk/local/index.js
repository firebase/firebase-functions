"use strict";
/**
 * TaskQueue/LifecycleEvent/RuntimeStatus Tester SDK for extensions-try-backfill3@0.0.2
 *
 * When filing bugs or feature requests please specify:
 *   "Extensions SDK v1.0.0 for Local extension.
 * https://github.com/firebase/firebase-tools/issues/new/choose
 *
 * GENERATED FILE. DO NOT EDIT.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.backfill = exports.backfill = void 0;
function backfill(instanceId, params) {
    return new Backfill(instanceId, params);
}
exports.backfill = backfill;
/**
 * TaskQueue/LifecycleEvent/RuntimeStatus Tester
 * A tester for the TaskQueue/LCE/RuntimeStatus project
 */
class Backfill {
    constructor(instanceId, params) {
        this.instanceId = instanceId;
        this.params = params;
        this.FIREBASE_EXTENSION_LOCAL_PATH = "./functions/generated/extensions/local/backfill/0.0.2/src";
    }
    getInstanceId() { return this.instanceId; }
    getParams() { return this.params; }
}
exports.Backfill = Backfill;
