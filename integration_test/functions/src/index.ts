import * as databaseV1 from "./v1/database.v1";
import * as firestoreV1 from "./v1/firestore.v1";
import * as httpsV1 from "./v1/https.v1";
import * as pubsubV1 from "./v1/pubsub.v1";
import * as remoteConfigV1 from "./v1/remoteConfig.v1";
import * as storageV1 from "./v1/storage.v1";
import * as tasksV1 from "./v1/tasks.v1";

import * as database from "./v2/database.v2";
import * as eventarc from "./v2/eventarc.v2";
import * as firestore from "./v2/firestore.v2";
import * as https from "./v2/https.v2";
import * as identity from "./v2/identity.v2";
import * as pubsub from "./v2/pubsub.v2";
import * as remoteConfig from "./v2/remoteConfig.v2";
import * as scheduler from "./v2/scheduler.v2";
import * as storage from "./v2/storage.v2";
import * as tasks from "./v2/tasks.v2";

export const test = {
  ...databaseV1,
  ...firestoreV1,
  ...httpsV1,
  ...pubsubV1,
  ...remoteConfigV1,
  ...storageV1,
  ...tasksV1,
  ...database,
  ...eventarc,
  ...firestore,
  ...https,
  ...identity,
  ...pubsub,
  ...remoteConfig,
  ...scheduler,
  ...storage,
  ...tasks,
};
