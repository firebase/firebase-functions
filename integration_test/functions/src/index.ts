import * as functions from 'firebase-functions';
import * as firebase from 'firebase';
import * as admin from 'firebase-admin';
import * as _ from 'lodash';
import { Request, Response } from 'express';

export * from './pubsub-tests';
export * from './database-tests';
export * from './auth-tests';
let numTests = 4;  // Make sure to increase this as you add tests!

firebase.initializeApp(_.omit(functions.config().firebase, 'credential'));  // Explicitly decline admin privileges.
admin.initializeApp(functions.config().firebase);

export const integrationTests: any = functions.https.onRequest((req: Request, resp: Response) => {
  let pubsub: any = require('@google-cloud/pubsub')();

  const testId = firebase.database().ref().push().key;

  return Promise.all([
    // A database write to trigger the Firebase Realtime Database tests.
    // The database write happens without admin privileges, so that the triggered function's "event.data.ref" also
    // doesn't have admin privileges.
    firebase.database().ref(`dbTests/${testId}/start`).set({ '.sv': 'timestamp' }),
    // A Pub/Sub publish to trigger the Cloud Pub/Sub tests.
    pubsub.topic('pubsubTests').publish({ testId }),
    // A user creation to trigger the Firebase Auth user creation tests.
    admin.auth().createUser({
      email: `${testId}@fake.com`,
      password: 'secret',
      displayName: `${testId}`,
    }).then(userRecord => {
      // A user deletion to trigger the Firebase Auth user deletion tests.
      admin.auth().deleteUser(userRecord.uid);
    }),
  ]).then(() => {
    // On test completion, check that all tests pass and reply "PASS", or provide further details.
    console.log('Waiting for all tests to report they pass...');
    let ref = admin.database().ref(`testRuns/${testId}`);
    return new Promise((resolve, reject) => {
      let testsExecuted = 0;
      ref.on('child_added', (snapshot) => {
        testsExecuted += 1;
        if (!snapshot.val().passed) {
          reject(new Error(`test ${snapshot.key} failed; see database for details.`));
          return;
        }
        console.log(`${snapshot.key} passed (${testsExecuted} of ${numTests})`);
        if (testsExecuted < numTests) {
          // Not all tests have completed. Wait longer.
          return;
        }
        // All tests have passed!
        resolve();
      });
    }).then(() => {
      ref.off();  // No more need to listen.
      console.log('All tests pass!');
      resp.status(200).send('PASS');
    }).catch(err => {
      ref.off();  // No more need to listen.
      console.log(`Some tests failed: ${err}`);
      resp.status(500).send(`FAIL - details at https://${process.env.GCLOUD_PROJECT}.firebaseio.com/testRuns/${testId}`);
    });
  });
});
