// import { sendEvent } from "../utils";
// import { onMutationExecuted } from "firebase-functions/dataconnect";

// export const databaseOnValueCreated = onMutationExecuted(
//   {
//     ref: `integration_test/{runId}/onValueCreated/{timestamp}`,
//   },
//   async (event) => {
//     await sendEvent(
//       "onValueCreated",
//       serializeDatabaseEvent(event, serializeDataSnapshot(event.data!))
//     );
//   }
// );

