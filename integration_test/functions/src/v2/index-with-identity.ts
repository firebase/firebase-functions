// V2 exports WITH identity blocking functions
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
export * from "./identity-tests"; // Includes beforeUserCreated and beforeUserSignedIn blocking functions
export * from "./pubsub-tests";
export * from "./scheduler-tests";
export * from "./storage-tests";
export * from "./tasks-tests";
export * from "./testLab-tests";
export * from "./remoteConfig-tests";