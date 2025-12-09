import { sendEvent } from "./utils";
import {
  serializeChangeEvent,
  serializeDatabaseEvent,
  serializeDataSnapshot,
} from "./serializers/database";
import { onValueCreated, onValueDeleted, onValueUpdated } from "firebase-functions/database";

export const databaseOnValueCreated = onValueCreated(
  {
    ref: `integration_test/{runId}/onValueCreated/{timestamp}`,
  },
  async (event) => {
    await sendEvent(
      "onValueCreated",
      serializeDatabaseEvent(event, serializeDataSnapshot(event.data!))
    );
  }
);

export const databaseOnValueUpdated = onValueUpdated(
  {
    ref: `integration_test/{runId}/onValueUpdated/{timestamp}`,
  },
  async (event) => {
    await sendEvent(
      "onValueUpdated",
      serializeDatabaseEvent(event, serializeChangeEvent(event.data!))
    );
  }
);

export const databaseOnValueDeleted = onValueDeleted(
  {
    ref: `integration_test/{runId}/onValueDeleted/{timestamp}`,
  },
  async (event) => {
    await sendEvent(
      "onValueDeleted",
      serializeDatabaseEvent(event, serializeDataSnapshot(event.data!))
    );
  }
);
