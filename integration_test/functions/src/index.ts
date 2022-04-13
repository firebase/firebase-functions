import { PubSub } from '@google-cloud/pubsub';
import { Request, Response } from 'express';
import fetch from 'node-fetch';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as fs from 'fs';

import * as v1 from './v1/index';
const numTests = Object.keys(v1).filter((k) =>
  ({}.hasOwnProperty.call(v1[k], '__endpoint'))
).length;
export { v1 };

import * as testLab from './v1/testLab-utils';

const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
const REGION = functions.config().functions.test_region;
admin.initializeApp();

function callHttpsTrigger(name: string, data: any) {
  return fetch(
    `https://${REGION}-${firebaseConfig.projectId}.cloudfunctions.net/${name}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ data }),
    }
  );
}

async function callScheduleTrigger(functionName: string, region: string) {
  const accessToken = await admin.credential
    .applicationDefault()
    .getAccessToken();
  const response = await fetch(
    `https://cloudscheduler.googleapis.com/v1/projects/${firebaseConfig.projectId}/locations/us-central1/jobs/firebase-schedule-${functionName}-${region}:run`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken.access_token}`,
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

async function updateRemoteConfig(
  testId: string,
  accessToken: string
): Promise<void> {
  await fetch(
    `https://firebaseremoteconfig.googleapis.com/v1/projects/${firebaseConfig.projectId}/remoteConfig`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json; UTF-8',
        'Accept-Encoding': 'gzip',
        'If-Match': '*',
      },
      body: JSON.stringify({ version: { description: testId } }),
    }
  );
}

function v1Tests(testId: string, accessToken: string) {
  return [
    // A database write to trigger the Firebase Realtime Database tests.
    admin
      .database()
      .ref(`dbTests/${testId}/start`)
      .set({ '.sv': 'timestamp' }),
    // A Pub/Sub publish to trigger the Cloud Pub/Sub tests.
    new PubSub()
      .topic('pubsubTests')
      .publish(Buffer.from(JSON.stringify({ testId }))),
    // A user creation to trigger the Firebase Auth user creation tests.
    admin
      .auth()
      .createUser({
        email: `${testId}@fake.com`,
        password: 'secret',
        displayName: `${testId}`,
      })
      .then((userRecord) => {
        // A user deletion to trigger the Firebase Auth user deletion tests.
        admin.auth().deleteUser(userRecord.uid);
      }),
    // A firestore write to trigger the Cloud Firestore tests.
    admin
      .firestore()
      .collection('tests')
      .doc(testId)
      .set({ test: testId }),
    // Invoke a callable HTTPS trigger.
    callHttpsTrigger('v1-callableTests', { foo: 'bar', testId }),
    // A Remote Config update to trigger the Remote Config tests.
    updateRemoteConfig(testId, accessToken),
    // A storage upload to trigger the Storage tests
    admin
      .storage()
      .bucket()
      .upload('/tmp/' + testId + '.txt'),
    testLab.startTestRun(firebaseConfig.projectId, testId),
    // Invoke the schedule for our scheduled function to fire
    callScheduleTrigger('v1-schedule', 'us-central1'),
  ];
}

export const integrationTests: any = functions
  .region(REGION)
  .runWith({
    timeoutSeconds: 540,
  })
  .https.onRequest(async (req: Request, resp: Response) => {
    const testId = admin
      .database()
      .ref()
      .push().key;
    admin
      .database()
      .ref(`testRuns/${testId}/timestamp`)
      .set(Date.now());
    const testIdRef = admin.database().ref(`testRuns/${testId}`);
    functions.logger.info('testId is: ', testId);
    fs.writeFile('/tmp/' + testId + '.txt', 'test', () => {});
    try {
      const accessToken = await admin.credential
        .applicationDefault()
        .getAccessToken();
      await Promise.all([...v1Tests(testId, accessToken.access_token)]);
      // On test completion, check that all tests pass and reply "PASS", or provide further details.
      functions.logger.info('Waiting for all tests to report they pass...');
      await new Promise<void>((resolve, reject) => {
        setTimeout(() => reject(new Error('Timeout')), 5 * 60 * 1000);
        let testsExecuted = 0;
        testIdRef.on('child_added', (snapshot) => {
          testsExecuted += 1;
          if (snapshot.key != 'timestamp' && !snapshot.val().passed) {
            reject(
              new Error(
                `test ${snapshot.key} failed; see database for details.`
              )
            );
            return;
          }
          functions.logger.info(
            `${snapshot.key} passed (${testsExecuted} of ${numTests})`
          );
          if (testsExecuted < numTests) {
            // Not all tests have completed. Wait longer.
            return;
          }
          // All tests have passed!
          resolve();
        });
      });
      functions.logger.info('All tests pass!');
      resp.status(200).send('PASS \n');
    } catch (err) {
      functions.logger.info(`Some tests failed: ${err}`, err);
      resp
        .status(500)
        .send(
          `FAIL - details at ${functions.firebaseConfig()
            .databaseURL!}/testRuns/${testId}`
        );
    } finally {
      testIdRef.off('child_added');
    }
  });
