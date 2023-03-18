import { AppOptions } from "firebase-admin/app";
import { readFileSync } from "fs";
import * as path from "path";

import * as logger from "../logger";
import { currentProjectId } from "./utilities/utils";

let cache: AppOptions | null = null;

/**
 * @internal
 * @alpha
 */
export function resetCache(newCache: AppOptions = null) {
  cache = newCache;
}

/**
 * Get the fields you need to initialize a Firebase app
 * @alpha
 */
export function firebaseConfig(): AppOptions | null {
  if (cache) {
    return cache;
  }

  let env = process.env.FIREBASE_CONFIG;
  if (env) {
    // Firebase Tools will always use a JSON blob in prod, but docs
    // explicitly state that the user can set the env to a file:
    // https://firebase.google.com/docs/admin/setup#initialize-without-parameters
    if (!env.startsWith("{")) {
      env = readFileSync(path.join(process.env.PWD, env)).toString("utf8");
    }

    cache = JSON.parse(env);
    return cache;
  }

  const projectId = currentProjectId();
  if (projectId) {
    logger.warn(
      "Warning, estimating Firebase Config based on GCLOUD_PROJECT. Initializing firebase-admin may fail"
    );
    cache = {
      databaseURL: process.env.DATABASE_URL || `https://${projectId}.firebaseio.com`,
      storageBucket: process.env.STORAGE_BUCKET_URL || `${projectId}.appspot.com`,
      projectId: projectId,
    };
    return cache;
  } else {
    logger.warn(
      "Warning, FIREBASE_CONFIG and GCLOUD_PROJECT environment variables are missing. Initializing firebase-admin will fail"
    );
  }

  return null;
}
