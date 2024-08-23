"use strict";
/**
 * Translate Text in Firestore SDK for firestore-translate-text@0.1.18
 *
 * When filing bugs or feature requests please specify:
 *   "Extensions SDK v1.0.0 for firestore-translate-text@0.1.18"
 * https://github.com/firebase/firebase-tools/issues/new/choose
 *
 * GENERATED FILE. DO NOT EDIT.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirestoreTranslateText = exports.firestoreTranslateText = void 0;
const eventarc_1 = require("../../../../src/v2/providers/eventarc");
function firestoreTranslateText(instanceId, params) {
    return new FirestoreTranslateText(instanceId, params);
}
exports.firestoreTranslateText = firestoreTranslateText;
/**
 * Translate Text in Firestore
 * Translates strings written to a Cloud Firestore collection into multiple languages (uses Cloud Translation API).
 */
class FirestoreTranslateText {
    constructor(instanceId, params) {
        this.instanceId = instanceId;
        this.params = params;
        this.events = [];
        this.FIREBASE_EXTENSION_REFERENCE = "firebase/firestore-translate-text@0.1.18";
        this.EXTENSION_VERSION = "0.1.18";
    }
    getInstanceId() { return this.instanceId; }
    getParams() { return this.params; }
    /**
     * Occurs when a trigger has been called within the Extension, and will include data such as the context of the trigger request.
     */
    onStart(callback, options) {
        this.events.push("firebase.extensions.firestore-translate-text.v1.onStart");
        return (0, eventarc_1.onCustomEventPublished)(Object.assign(Object.assign({}, options), { "eventType": "firebase.extensions.firestore-translate-text.v1.onStart", "channel": `projects/locations/${this.params._EVENT_ARC_REGION}/channels/firebase`, "region": `${this.params._EVENT_ARC_REGION}` }), callback);
    }
    /**
     * Occurs when image resizing completes successfully. The event will contain further details about specific formats and sizes.
     */
    onSuccess(callback, options) {
        this.events.push("firebase.extensions.firestore-translate-text.v1.onSuccess");
        return (0, eventarc_1.onCustomEventPublished)(Object.assign(Object.assign({}, options), { "eventType": "firebase.extensions.firestore-translate-text.v1.onSuccess", "channel": `projects/locations/${this.params._EVENT_ARC_REGION}/channels/firebase`, "region": `${this.params._EVENT_ARC_REGION}` }), callback);
    }
    /**
     * Occurs when an issue has been experienced in the Extension. This will include any error data that has been included within the Error Exception.
     */
    onError(callback, options) {
        this.events.push("firebase.extensions.firestore-translate-text.v1.onError");
        return (0, eventarc_1.onCustomEventPublished)(Object.assign(Object.assign({}, options), { "eventType": "firebase.extensions.firestore-translate-text.v1.onError", "channel": `projects/locations/${this.params._EVENT_ARC_REGION}/channels/firebase`, "region": `${this.params._EVENT_ARC_REGION}` }), callback);
    }
    /**
     * Occurs when the function is settled. Provides no customized data other than the context.
     */
    onCompletion(callback, options) {
        this.events.push("firebase.extensions.firestore-translate-text.v1.onCompletion");
        return (0, eventarc_1.onCustomEventPublished)(Object.assign(Object.assign({}, options), { "eventType": "firebase.extensions.firestore-translate-text.v1.onCompletion", "channel": `projects/locations/${this.params._EVENT_ARC_REGION}/channels/firebase`, "region": `${this.params._EVENT_ARC_REGION}` }), callback);
    }
}
exports.FirestoreTranslateText = FirestoreTranslateText;
