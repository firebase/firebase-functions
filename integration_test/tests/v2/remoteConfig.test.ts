import admin from "firebase-admin";
import { timeout } from "../utils";
import { initializeFirebase } from "../firebaseSetup";
import fetch from "node-fetch";

describe("Firebase Remote Config (v2)", () => {
  const projectId = process.env.PROJECT_ID;
  const testId = process.env.TEST_RUN_ID;

  if (!testId || !projectId) {
    throw new Error("Environment configured incorrectly.");
  }

  beforeAll(async () => {
    await initializeFirebase();
  });

  afterAll(async () => {
    await admin.firestore().collection("remoteConfigOnConfigUpdatedTests").doc(testId).delete();
  });

  describe("onUpdated trigger", () => {
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
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
      await timeout(20000);
      const logSnapshot = await admin
        .firestore()
        .collection("remoteConfigOnConfigUpdatedTests")
        .doc(testId)
        .get();
      loggedContext = logSnapshot.data();
      if (!loggedContext) {
        throw new Error("loggedContext is undefined");
      }
    });

    it("should have the right event type", () => {
      // TODO: not sure if the nested remoteconfig.remoteconfig is expected?
      expect(loggedContext?.type).toEqual("google.firebase.remoteconfig.remoteConfig.v1.updated");
    });

    it("should have event id", () => {
      expect(loggedContext?.id).toBeDefined();
    });

    it("should have time", () => {
      expect(loggedContext?.time).toBeDefined();
    });
  });
});
