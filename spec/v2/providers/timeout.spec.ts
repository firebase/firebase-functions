import { expect } from "chai";
import * as ai from "../../../src/v2/providers/ai";
import * as database from "../../../src/v2/providers/database";
import * as dataconnect from "../../../src/v2/providers/dataconnect";
import * as eventarc from "../../../src/v2/providers/eventarc";
import * as firestore from "../../../src/v2/providers/firestore";
import * as https from "../../../src/v2/providers/https";
import * as identity from "../../../src/v2/providers/identity";
import * as options from "../../../src/v2/options";
import * as pubsub from "../../../src/v2/providers/pubsub";
import * as remoteConfig from "../../../src/v2/providers/remoteConfig";
import * as scheduler from "../../../src/v2/providers/scheduler";
import * as storage from "../../../src/v2/providers/storage";
import * as tasks from "../../../src/v2/providers/tasks";
import * as testLab from "../../../src/v2/providers/testLab";

interface TimeoutCase {
  name: string;
  build: () => unknown;
  expectedError: RegExp;
  validateOnEndpointAccess?: boolean;
}

function expectTimeoutError(testCase: TimeoutCase): void {
  expect(() => {
    const fn = testCase.build() as { __endpoint?: unknown };
    if (testCase.validateOnEndpointAccess) {
      void fn.__endpoint;
    }
  }).to.throw(testCase.expectedError);
}

describe("v2 provider timeout validation", () => {
  beforeEach(() => {
    process.env.GCLOUD_PROJECT = "aProject";
  });

  afterEach(() => {
    options.setGlobalOptions({});
    delete process.env.GCLOUD_PROJECT;
  });

  const cases: TimeoutCase[] = [
    {
      name: "https.onRequest rejects HTTPS timeouts above 3600s",
      build: () =>
        https.onRequest({ timeoutSeconds: 3601 }, (_req, res) => {
          res.end();
        }),
      expectedError: /between 0 and 3600 for HTTPS and callable functions/,
    },
    {
      name: "https.onCall rejects HTTPS timeouts above 3600s",
      build: () => https.onCall({ timeoutSeconds: 3601 }, () => 42),
      expectedError: /between 0 and 3600 for HTTPS and callable functions/,
    },
    {
      name: "ai.beforeGenerateContent rejects HTTPS timeouts above 3600s",
      build: () => ai.beforeGenerateContent({ timeoutSeconds: 3601 }, () => ({})),
      expectedError: /between 0 and 3600 for HTTPS and callable functions/,
    },
    {
      name: "identity.beforeUserCreated rejects HTTPS timeouts above 3600s",
      build: () => identity.beforeUserCreated({ timeoutSeconds: 3601 }, () => undefined),
      expectedError: /between 0 and 3600 for HTTPS and callable functions/,
    },
    {
      name: "tasks.onTaskDispatched rejects task timeouts above 1800s",
      build: () => tasks.onTaskDispatched({ timeoutSeconds: 1801 }, () => null),
      expectedError: /between 0 and 1800 for task queue functions/,
    },
    {
      name: "pubsub.onMessagePublished rejects event timeouts above 540s",
      build: () => pubsub.onMessagePublished({ topic: "topic", timeoutSeconds: 3600 }, () => 42),
      expectedError: /between 0 and 540 for event-handling functions/,
    },
    {
      name: "storage.onObjectFinalized rejects event timeouts above 540s",
      build: () =>
        storage.onObjectFinalized({ bucket: "bucket", timeoutSeconds: 3600 }, () => null),
      expectedError: /between 0 and 540 for event-handling functions/,
      validateOnEndpointAccess: true,
    },
    {
      name: "database.onValueCreated rejects event timeouts above 540s",
      build: () => {
        return database.onValueCreated(
          { ref: "/foo", instance: "instance", timeoutSeconds: 3600 },
          () => null
        );
      },
      expectedError: /between 0 and 540 for event-handling functions/,
    },
    {
      name: "firestore.onDocumentCreated rejects event timeouts above 540s",
      build: () =>
        firestore.onDocumentCreated({ document: "foo/{bar}", timeoutSeconds: 3600 }, () => null),
      expectedError: /between 0 and 540 for event-handling functions/,
    },
    {
      name: "eventarc.onCustomEventPublished rejects event timeouts above 540s",
      build: () =>
        eventarc.onCustomEventPublished(
          { eventType: "event-type", timeoutSeconds: 3600 },
          () => 42
        ),
      expectedError: /between 0 and 540 for event-handling functions/,
    },
    {
      name: "remoteConfig.onConfigUpdated rejects event timeouts above 540s",
      build: () => remoteConfig.onConfigUpdated({ timeoutSeconds: 3600 }, () => 42),
      expectedError: /between 0 and 540 for event-handling functions/,
    },
    {
      name: "scheduler.onSchedule rejects event timeouts above 540s",
      build: () =>
        scheduler.onSchedule({ schedule: "* * * * *", timeoutSeconds: 3600 }, () => null),
      expectedError: /between 0 and 540 for event-handling functions/,
    },
    {
      name: "testLab.onTestMatrixCompleted rejects event timeouts above 540s",
      build: () => testLab.onTestMatrixCompleted({ timeoutSeconds: 3600 }, () => 42),
      expectedError: /between 0 and 540 for event-handling functions/,
    },
    {
      name: "dataconnect.onMutationExecuted rejects event timeouts above 540s",
      build: () =>
        dataconnect.onMutationExecuted(
          {
            service: "service",
            connector: "connector",
            operation: "operation",
            timeoutSeconds: 3600,
          },
          () => true
        ),
      expectedError: /between 0 and 540 for event-handling functions/,
    },
  ];

  for (const testCase of cases) {
    it(testCase.name, () => {
      expectTimeoutError(testCase);
    });
  }
});
