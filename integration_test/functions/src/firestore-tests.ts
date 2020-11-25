import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { expectDeepEq, expectEq, TestSuite } from './testing';
import DocumentSnapshot = admin.firestore.DocumentSnapshot;

const testIdFieldName = 'documentId';
const REGION = process.env.FIREBASE_FUNCTIONS_TEST_REGION || 'us-central1';

export const firestoreTests: any = functions
  .runWith({
    timeoutSeconds: 540,
  })
  .region(REGION)
  .firestore.document('tests/{documentId}')
  .onCreate((s, c) => {
    return new TestSuite<DocumentSnapshot>('firestore document onWrite')

      .it('should not have event.app', (snap, context) => !(context as any).app)

      .it('should give refs write access', (snap) =>
        snap.ref.set({ allowed: 1 }, { merge: true }).then(() => true)
      )

      .it('should have well-formatted resource', (snap, context) =>
        expectEq(
          context.resource.name,
          `projects/${process.env.GCLOUD_PROJECT}/databases/(default)/documents/tests/${context.params.documentId}`
        )
      )

      .it('should have the right eventType', (snap, context) =>
        expectEq(context.eventType, 'google.firestore.document.create')
      )

      .it('should have eventId', (snap, context) => context.eventId)

      .it('should have timestamp', (snap, context) => context.timestamp)

      .it('should have the correct data', (snap, context) =>
        expectDeepEq(snap.data(), { test: context.params.documentId })
      )

      .run(c.params[testIdFieldName], s, c);
  });
