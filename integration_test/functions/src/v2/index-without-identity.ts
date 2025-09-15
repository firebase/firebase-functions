// V2 exports WITHOUT identity blocking functions (for when v1 auth is enabled)
import { setGlobalOptions } from "firebase-functions/v2";
import { REGION } from "../region";
setGlobalOptions({ region: REGION });

export * from "./alerts-tests";
export * from "./database-tests";
// export * from "./eventarc-tests";
export * from "./firestore-tests";
// Temporarily disable http test - will not work unless running on projects
// w/ permission to create public functions.
// export * from "./https-tests";
// Identity tests excluded to avoid conflict with v1 auth blocking functions
// export * from "./identity-tests";
export * from "./pubsub-tests";
export * from "./scheduler-tests";
export * from "./storage-tests";
export * from "./tasks-tests";
export * from "./testLab-tests";
export * from "./remoteConfig-tests";