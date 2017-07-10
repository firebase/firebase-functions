import * as functions from 'firebase-functions';
import { TestSuite, expectReject, expectEq, expectMatches } from './testing';

const testIdFieldName = 'testId';

export const databaseTests: any = functions.database.ref('dbTests/{testId}/start').onWrite(receivedEvent => {
  if (receivedEvent.data.val() === null) {
    console.log(
      'Event for ' + receivedEvent.params[testIdFieldName]
      + ' is null; presuming data cleanup, so skipping.');
    return;
  }

  return new TestSuite('database ref onWrite')

    .it('should not have event.app', event => !event.app)

    .it('should not give user refs access to admin data', expectReject(event =>
      event.data.ref.parent.child('adminOnly').update({ disallowed: 0 })))

    .it('should give admin refs access to admin data', event =>
      event.data.adminRef.parent.child('adminOnly').update({ allowed: 1 }).then(() => true))

    .it('should have a correct ref url', event => {
      const url = event.data.ref.toString();
      return Promise.resolve().then(() => {
        return expectMatches(url, new RegExp(`^https://${process.env.GCLOUD_PROJECT}.firebaseio.com/dbTests`));
      }).then(() => {
        return expectMatches(url, /\/start$/);
      });
    })

    .it('should have refs resources', event => expectEq(
      event.resource,
      `projects/_/instances/${process.env.GCLOUD_PROJECT}/refs/dbTests/${event.params.testId}/start`))

    .it('should not include path', event => expectEq(event.path, undefined))

    .it('should have the right eventType', event => expectEq(
      event.eventType, 'providers/google.firebase.database/eventTypes/ref.write'))

    .it('should have eventId', event => event.eventId)

    .it('should have timestamp', event => event.timestamp)

    .it('should not be admin-authenticated', event => expectEq(event.auth.admin, false))

    .it('should not have action', event => expectEq(event.action, undefined))

    .run(receivedEvent.params[testIdFieldName], receivedEvent);
});
