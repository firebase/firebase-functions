import { PubSub } from "@google-cloud/pubsub";
import { GoogleAuth } from "google-auth-library";
import { Request, Response } from "express";
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import * as fs from "fs";
import fetch from "node-fetch";

import * as v1 from "./v1";
import * as v2 from "./v2";
const getNumTests = (m: object): number => {
  return Object.keys(m).filter((k) => ({}.hasOwnProperty.call(m[k], "__endpoint"))).length;
};
const numTests = getNumTests(v1) + getNumTests(v2);
export { v1, v2 };

import { REGION } from "./region";
import * as testLab from "./v1/testLab-utils";

const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
admin.initializeApp();

// Re-enable no-unused-var check once callable functions are testable again.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function callHttpsTrigger(name: string, data: any) {
  const url = `https://${REGION}-${firebaseConfig.projectId}.cloudfunctions.net/${name}`;
  const client = await new GoogleAuth().getIdTokenClient("32555940559.apps.googleusercontent.com");
  const resp = await client.request({
    url,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data }),
  });
  if (resp.status > 200) {
    throw Error(resp.statusText);
  }
}

// Re-enable no-unused-var check once callable functions are testable again.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function callV2HttpsTrigger(name: string, data: any, accessToken: string) {
  const getFnResp = await fetch(
    `https://cloudfunctions.googleapis.com/v2beta/projects/${firebaseConfig.projectId}/locations/${REGION}/functions/${name}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!getFnResp.ok) {
    throw new Error(getFnResp.statusText);
  }
  const fn = await getFnResp.json();
  const uri = fn.serviceConfig?.uri;
  if (!uri) {
    throw new Error(`Cannot call v2 https trigger ${name} - no uri found`);
  }

  const client = await new GoogleAuth().getIdTokenClient("32555940559.apps.googleusercontent.com");
  const invokeFnREsp = await client.request({
    url: uri,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ data }),
  });
  if (invokeFnREsp.status > 200) {
    throw Error(invokeFnREsp.statusText);
  }
}

async function callScheduleTrigger(functionName: string, region: string, accessToken: string) {
  const response = await fetch(
    `https://cloudscheduler.googleapis.com/v1/projects/${firebaseConfig.projectId}/locations/us-central1/jobs/firebase-schedule-${functionName}-${region}:run`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!response.ok) {
    throw new Error(`Failed request with status ${response.status}!`);
  }
  const data = await response.text();
  functions.logger.log(`Successfully scheduled function ${functionName}`, data);
  return;
}

async function callV2ScheduleTrigger(
  functionName: string,
  region: string,
  accessToken: string
) {
  const response = await fetch(
    `https://cloudscheduler.googleapis.com/v1/projects/${firebaseConfig.projectId}/locations/us-central1/jobs/firebase-schedule-${functionName}-${region}:run`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!response.ok) {
    throw new Error(`Failed request with status ${response.status}!`);
  }
  const data = await response.text();
  functions.logger.log(
    `Successfully scheduled v2 function ${functionName}`,
    data
  );
  return;
}

async function updateRemoteConfig(testId: string, accessToken: string): Promise<void> {
  const resp = await fetch(
    `https://firebaseremoteconfig.googleapis.com/v1/projects/${firebaseConfig.projectId}/remoteConfig`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
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
}

function v1Tests(testId: string, accessToken: string): Array<Promise<unknown>> {
  return [
    // A database write to trigger the Firebase Realtime Database tests.
    admin.database().ref(`dbTests/${testId}/start`).set({ ".sv": "timestamp" }),
    // A Pub/Sub publish to trigger the Cloud Pub/Sub tests.
    new PubSub().topic("pubsubTests").publish(Buffer.from(JSON.stringify({ testId }))),
    // A user creation to trigger the Firebase Auth user creation tests.
    admin
      .auth()
      .createUser({
        email: `${testId}@fake.com`,
        password: "secret",
        displayName: `${testId}`,
      })
      .then(async (userRecord) => {
        // A user deletion to trigger the Firebase Auth user deletion tests.
        await admin.auth().deleteUser(userRecord.uid);
      }),
    // A firestore write to trigger the Cloud Firestore tests.
    admin.firestore().collection("tests").doc(testId).set({ test: testId }),
    // Invoke a callable HTTPS trigger.
    // TODO: Temporarily disable - doesn't work unless running on projects w/ permission to create public functions.
    // callHttpsTrigger("v1-callableTests", { foo: "bar", testId }),
    // A Remote Config update to trigger the Remote Config tests.
    updateRemoteConfig(testId, accessToken),
    // A storage upload to trigger the Storage tests
    admin
      .storage()
      .bucket()
      .upload("/tmp/" + testId + ".txt"),
    testLab.startTestRun(firebaseConfig.projectId, testId, accessToken),
    // Invoke the schedule for our scheduled function to fire
    callScheduleTrigger("v1-schedule", "us-central1", accessToken),
  ];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function v2Tests(testId: string, accessToken: string): Array<Promise<void>> {
  return [
    // Invoke a callable HTTPS trigger.
    // TODO: Temporarily disable - doesn't work unless running on projects w/ permission to create public functions.
    // callV2HttpsTrigger("v2-callabletests", { foo: "bar", testId }, accessToken),
    // Invoke a scheduled trigger.
    callV2ScheduleTrigger('v2-schedule', 'us-central1', accessToken),
  ];
}

export const integrationTests: any = functions
  .region(REGION)
  .runWith({
    timeoutSeconds: 540,
    invoker: "private",
  })
  .https.onRequest(async (req: Request, resp: Response) => {
    const testId = admin.database().ref().push().key;
    await admin.database().ref(`testRuns/${testId}/timestamp`).set(Date.now());
    const testIdRef = admin.database().ref(`testRuns/${testId}`);
    functions.logger.info("testId is: ", testId);
    fs.writeFile(`/tmp/${testId}.txt`, "test", () => undefined);
    try {
      const accessToken = await admin.credential.applicationDefault().getAccessToken();
      await Promise.all([
        ...v1Tests(testId, accessToken.access_token),
        ...v2Tests(testId, accessToken.access_token),
      ]);
      // On test completion, check that all tests pass and reply "PASS", or provide further details.
      functions.logger.info("Waiting for all tests to report they pass...");
      await new Promise<void>((resolve, reject) => {
        setTimeout(() => reject(new Error("Timeout")), 5 * 60 * 1000);
        let testsExecuted = 0;
        testIdRef.on("child_added", (snapshot) => {
          if (snapshot.key === "timestamp") {
            return;
          }
          testsExecuted += 1;
          if (!snapshot.val().passed) {
            reject(new Error(`test ${snapshot.key} failed; see database for details.`));
            return;
          }
          functions.logger.info(`${snapshot.key} passed (${testsExecuted} of ${numTests})`);
          if (testsExecuted < numTests) {
            // Not all tests have completed. Wait longer.
            return;
          }
          // All tests have passed!
          resolve();
        });
      });
      functions.logger.info("All tests pass!");
      resp.status(200).send("PASS \n");
    } catch (err) {
      functions.logger.info(`Some tests failed: ${err}`, err);
      resp
        .status(500)
        .send(`FAIL - details at ${functions.firebaseConfig().databaseURL}/testRuns/${testId}`);
    } finally {
      testIdRef.off("child_added");
    }
  });
