import * as functions from 'firebase-functions';
import * as firebase from 'firebase';
import * as admin from 'firebase-admin';
import * as _ from 'lodash';
import { Request, Response } from 'express';

export * from './pubsub-tests';
export * from './database-tests';
export * from './auth-tests';

firebase.initializeApp(_.omit(functions.config().firebase, 'credential'));  // Explicitly decline admin privileges.
admin.initializeApp(functions.config().firebase);

export const integrationTests: any = functions.https.onRequest((req: Request, resp: Response) => {
  let pubsub: any = require('@google-cloud/pubsub')();

  const testId = firebase.database().ref().push().key;

  Promise.all([
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
    // On test completion, redirect the user to the Firebase RTDB dashboard, to
    // see the results stored there.
    resp.redirect(`https://${process.env.GCLOUD_PROJECT}.firebaseio.com/testRuns/${testId}`);
  });
});
