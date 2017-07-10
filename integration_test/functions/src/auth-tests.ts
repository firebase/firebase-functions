import * as functions from 'firebase-functions';
import { TestSuite, expectEq } from './testing';

export const createUserTests: any = functions.auth.user().onCreate(receivedEvent => {
  let user = receivedEvent.data;
  let testId: string = user.displayName;
  console.log(`testId is ${testId}`);

  return new TestSuite('auth user onCreate')
    .it('should have a project as resource', event => expectEq(
      event.resource, `projects/${process.env.GCLOUD_PROJECT}`))

    .it('should not have a path', event => expectEq(event.path, undefined))

    .it('should have the correct eventType', event => expectEq(
      event.eventType, 'providers/firebase.auth/eventTypes/user.create'))

    .it('should have an eventId', event => event.eventId)

    .it('should have a timestamp', event => event.timestamp)

    .it('should not have auth', event => expectEq(event.auth, undefined))

    .it('should not have action', event => expectEq(event.action, undefined))

    .run(testId, receivedEvent);
});

export const deleteUserTests: any = functions.auth.user().onDelete(receivedEvent => {
  let user = receivedEvent.data;
  let testId: string = user.displayName;
  console.log(`testId is ${testId}`);

  return new TestSuite('auth user onDelete')
    .it('should have a project as resource', event => expectEq(
      event.resource, `projects/${process.env.GCLOUD_PROJECT}`))

    .it('should not have a path', event => expectEq(event.path, undefined))

    .it('should have the correct eventType', event => expectEq(
      event.eventType, 'providers/firebase.auth/eventTypes/user.delete'))

    .it('should have an eventId', event => event.eventId)

    .it('should have a timestamp', event => event.timestamp)

    .it('should not have auth', event => expectEq(event.auth, undefined))

    .it('should not have action', event => expectEq(event.action, undefined))

    .run(testId, receivedEvent);
});
