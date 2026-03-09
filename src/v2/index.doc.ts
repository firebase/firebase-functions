/**
 * @internal
 * Documentation-only entry point. This file is not part of the public API
 * and is used only by api-extractor to generate reference documentation.
 * It includes exports that are not part of the main `index.ts` entry point
 * to avoid forcing optional peer dependencies on all users.
 *
 * DO NOT use for runtime imports.
 */
export * from "./index";

// Explicitly export the hidden graphql module for documentation generation
export * as graphql from "./providers/dataconnect/graphql";
