import { setGlobalOptions } from "firebase-functions/v2";
import { REGION } from "../region";
setGlobalOptions({ region: REGION });

export * from "./https-tests";
export * from "./scheduled-tests";
export * from "./database-tests";
export * from "./storage-tests";
export * from "./firestore-tests";
export * from "./pubsub-tests";
export * from "./tasks-tests";
export * from "./remoteConfig-tests";
export * from "./testLab-tests";
export * from "./identity-tests";
export * from "./eventarc-tests";
export * from "./alerts-tests";
