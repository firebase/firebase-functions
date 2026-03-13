/**
 * @internal
 * Documentation-only entry point. This file is not part of the public API
 * and is used only by api-extractor to generate reference documentation.
 * It includes exports that are not part of the main `index.ts` entry point
 * to avoid forcing optional peer dependencies on all users.
 *
 * DO NOT use for runtime imports.
 * The 2nd gen API for Cloud Functions for Firebase.
 * This SDK supports deep imports. For example, the namespace
 * `pubsub` is available at `firebase-functions/v2` or is directly importable
 * from `firebase-functions/v2/pubsub`.
 * @packageDocumentation
 */

export * from "./index";

// Explicitly export the hidden dataconnect module wrapper for documentation generation
// This shadows the `dataconnect` export from `./index`.
export * as dataconnect from "./dataconnect.doc";
