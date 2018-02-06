import * as functions from 'firebase-functions';
import { TestSuite, expectEq, expectDeepEq } from './testing';

const testIdFieldName = 'documentId';

export const firestoreTests: any = functions.firestore.document('tests/{documentId}').onCreate(receivedEvent => {
  return new TestSuite('firestore document onWrite')

    .it('should not have event.app', event => !event.app)

    .it('should give refs write access', event =>
      event.data.ref.set({ allowed: 1 }, {merge: true}).then(() => true))

    .it('should have well-formatted resource', event => expectEq(
      event.resource,
      `projects/${process.env.GCLOUD_PROJECT}/databases/(default)/documents/tests/${event.params.documentId}`)
    )

    .it('should have the right eventType', event => expectEq(
      event.eventType, 'providers/cloud.firestore/eventTypes/document.create'))

    .it('should have eventId', event => event.eventId)

    .it('should have timestamp', event => event.timestamp)

    .it('should have the correct data', event => expectDeepEq(event.data.data(), {test: event.params.documentId}))

    .it('previous.exists should be false', event => expectEq(event.data.previous.exists, false))

    .run(receivedEvent.params[testIdFieldName], receivedEvent);
});
