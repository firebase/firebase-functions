import { setGlobalOptions } from "firebase-functions/v2";
import { REGION } from "../region";
setGlobalOptions({ region: REGION });

export * from "./alerts-tests";
// export * from "./database-tests";
// export * from "./eventarc-tests";
// export * from "./firestore-tests";
// export * from './https-tests';
// TODO: cannot deploy multiple auth blocking funcs at once.
// update framework to run v1 tests in isolation, tear down, then run v2 tests
// export * from "./identity-tests";
// export * from './pubsub-tests';
// export * from "./scheduler-tests";
// export * from "./storage-tests";
// export * from "./tasks-tests";
// export * from "./testLab-tests";
