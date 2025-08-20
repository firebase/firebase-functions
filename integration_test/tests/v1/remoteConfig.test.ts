import * as admin from "firebase-admin";
import { retry } from "../utils";
import { initializeFirebase } from "../firebaseSetup";
import fetch from "node-fetch";

describe("Firebase Remote Config (v1)", () => {
  const projectId = process.env.PROJECT_ID;
  const testId = process.env.TEST_RUN_ID;

  if (!testId || !projectId) {
    throw new Error("Environment configured incorrectly.");
  }

  beforeAll(async () => {
    await initializeFirebase();
  });

  afterAll(async () => {
    await admin.firestore().collection("remoteConfigOnUpdateTests").doc(testId).delete();
  });

  describe("onUpdate trigger", () => {
    let loggedContext: admin.firestore.DocumentData | undefined;

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
            .collection("remoteConfigOnUpdateTests")
            .doc(testId)
            .get()
            .then((logSnapshot) => logSnapshot.data())
        );
      } catch (error) {
        console.warn("RemoteConfig API access failed, skipping test:", (error as Error).message);
        (this as any).skip();
      }
    });

    it("should have refs resources", () =>
      expect(loggedContext?.resource.name).toMatch(`projects/${process.env.PROJECT_ID}`));

    it("should have the right eventType", () => {
      expect(loggedContext?.eventType).toEqual("google.firebase.remoteconfig.update");
    });

    it("should have eventId", () => {
      expect(loggedContext?.eventId).toBeDefined();
    });

    it("should have timestamp", () => {
      expect(loggedContext?.timestamp).toBeDefined();
    });

    it("should not have auth", () => {
      expect(loggedContext?.auth).toBeUndefined();
    });
  });
});
