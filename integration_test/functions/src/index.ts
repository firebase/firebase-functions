import { PubSub } from '@google-cloud/pubsub';
import { Request, Response } from 'express';
import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import * as fs from 'fs';
import * as https from 'https';

export * from './pubsub-tests';
export * from './database-tests';
export * from './auth-tests';
export * from './firestore-tests';
export * from './https-tests';
export * from './remoteConfig-tests';
export * from './storage-tests';
export * from './testLab-tests';
const numTests = Object.keys(exports).length; // Assumption: every exported function is its own test.

import * as utils from './test-utils';
import * as testLab from './testLab-utils';

import 'firebase-functions'; // temporary shim until process.env.FIREBASE_CONFIG available natively in GCF(BUG 63586213)
import { config } from 'firebase-functions';
const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG);
admin.initializeApp();
const REGION = functions.config().functions.test_region;

// TODO(klimt): Get rid of this once the JS client SDK supports callable triggers.
function callHttpsTrigger(name: string, data: any, baseUrl) {
  return utils.makeRequest(
    {
      method: 'POST',
      host: REGION + '-' + firebaseConfig.projectId + '.' + baseUrl,
      path: '/' + name,
      headers: {
        'Content-Type': 'application/json',
      },
    },
    JSON.stringify({ data })
  );
}

async function callScheduleTrigger(functionName: string, region: string) {
  const accessToken = await admin.credential
    .applicationDefault()
    .getAccessToken();
  return new Promise<string>((resolve, reject) => {
    const request = https.request(
      {
        method: 'POST',
        host: 'cloudscheduler.googleapis.com',
        path: `/v1/projects/${firebaseConfig.projectId}/locations/us-central1/jobs/firebase-schedule-${functionName}-${region}:run`,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken.access_token}`,
        },
      },
      (response) => {
        if (response.statusCode! / 100 != 2) {
          reject(
            new Error('Failed request with status ' + response.statusCode!)
          );
          return;
        }
        let body = '';
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('end', () => {
          console.log(`Successfully scheduled function ${functionName}`);
          resolve(body);
        });
      }
    );
    request.on('error', (err) => {
      console.error('Failed to schedule cloud scheduler job with error', err);
      reject(err);
    });
    request.write('{}');
    request.end();
  });
}

export const integrationTests: any = functions
  .region(REGION)
  .runWith({
    timeoutSeconds: 540,
  })
  .https.onRequest(async (req: Request, resp: Response) => {
    // We take the base url for our https call (cloudfunctions.net, txckloud.net, etc) from the request
    // so that it changes with the environment that the tests are run in
    const baseUrl = req.hostname
      .split('.')
      .slice(1)
      .join('.');
    const testId = admin
      .database()
      .ref()
      .push().key;
    admin
      .database()
      .ref(`testRuns/${testId}/timestamp`)
      .set(Date.now());
    const testIdRef = admin.database().ref(`testRuns/${testId}`);
    console.log('testId is: ', testId);
    fs.writeFile('/tmp/' + testId + '.txt', 'test', () => {});
    try {
      await Promise.all([
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
        callHttpsTrigger('callableTests', { foo: 'bar', testId }, baseUrl),
        // A Remote Config update to trigger the Remote Config tests.
        admin.credential
          .applicationDefault()
          .getAccessToken()
          .then((accessToken) => {
            const options = {
              hostname: 'firebaseremoteconfig.googleapis.com',
              path: `/v1/projects/${firebaseConfig.projectId}/remoteConfig`,
              method: 'PUT',
              headers: {
                Authorization: 'Bearer ' + accessToken.access_token,
                'Content-Type': 'application/json; UTF-8',
                'Accept-Encoding': 'gzip',
                'If-Match': '*',
              },
            };
            const request = https.request(options, (resp) => {});
            request.write(JSON.stringify({ version: { description: testId } }));
            request.end();
          }),
        // A storage upload to trigger the Storage tests
        admin
          .storage()
          .bucket()
          .upload('/tmp/' + testId + '.txt'),
        testLab.startTestRun(firebaseConfig.projectId, testId),
        // Invoke the schedule for our scheduled function to fire
        callScheduleTrigger('schedule', 'us-central1'),
      ]);

      // On test completion, check that all tests pass and reply "PASS", or provide further details.
      console.log('Waiting for all tests to report they pass...');
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
          console.log(
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
      console.log('All tests pass!');
      resp.status(200).send('PASS \n');
    } catch (err) {
      console.log(`Some tests failed: ${err}`);
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
