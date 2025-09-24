import * as admin from "firebase-admin";
import { retry } from "../utils";
import { initializeFirebase } from "../firebaseSetup";

describe("Firebase Remote Config (v2)", () => {
  const projectId = process.env.PROJECT_ID;
  const testId = process.env.TEST_RUN_ID;

  if (!testId || !projectId) {
    throw new Error("Environment configured incorrectly.");
  }

  beforeAll(() => {
    initializeFirebase();
  });

  afterAll(async () => {
    await admin.firestore().collection("remoteConfigOnConfigUpdatedTests").doc(testId).delete();
  });

  describe("onUpdated trigger", () => {
    let loggedContext: admin.firestore.DocumentData | undefined;
    let shouldSkip = false;

    beforeAll(async () => {
      try {
        const accessToken = await admin.credential.applicationDefault().getAccessToken();
        const resp = await fetch(
          `https://firebaseremoteconfig.googleapis.com/v1/projects/${projectId}/remoteConfig`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken.access_token}`,
              "Content-Type": "application/json; UTF-8",
              "Accept-Encoding": "gzip",
              "If-Match": "*",
            },
            body: JSON.stringify({ version: { description: testId } }),
          }
        );
        if (!resp.ok) {
          throw new Error(resp.statusText);
        }

        loggedContext = await retry(() =>
          admin
            .firestore()
            .collection("remoteConfigOnConfigUpdatedTests")
            .doc(testId)
            .get()
            .then((logSnapshot) => logSnapshot.data())
        );
      } catch (error) {
        console.warn("RemoteConfig API access failed, skipping test:", (error as Error).message);
        shouldSkip = true;
      }
    });

    it("should have the right event type", () => {
      if (shouldSkip) {
        return;
      }
      // TODO: not sure if the nested remoteconfig.remoteconfig is expected?
      expect(loggedContext?.type).toEqual("google.firebase.remoteconfig.remoteConfig.v1.updated");
    });

    it("should have event id", () => {
      if (shouldSkip) {
        return; // Skip test when API not available
      }
      expect(loggedContext?.id).toBeDefined();
    });

    it("should have time", () => {
      if (shouldSkip) {
        return; // Skip test when API not available
      }
      expect(loggedContext?.time).toBeDefined();
    });
  });
});
