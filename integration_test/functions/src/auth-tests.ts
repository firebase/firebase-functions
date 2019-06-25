import * as functions from 'firebase-functions';
import { TestSuite, expectEq } from './testing';
import * as admin from 'firebase-admin';
import UserMetadata = admin.auth.UserRecord;

export const createUserTests: any = functions.auth.user().onCreate((u, c) => {
  let testId: string = u.displayName;
  console.log(`testId is ${testId}`);

  return new TestSuite<UserMetadata>('auth user onCreate')
    .it('should have a project as resource', (user, context) =>
      expectEq(context.resource.name, `projects/${process.env.GCLOUD_PROJECT}`)
    )

    .it('should not have a path', (user, context) =>
      expectEq((context as any).path, undefined)
    )

    .it('should have the correct eventType', (user, context) =>
      expectEq(context.eventType, 'google.firebase.auth.user.create')
    )

    .it('should have an eventId', (user, context) => context.eventId)

    .it('should have a timestamp', (user, context) => context.timestamp)

    .it('should not have auth', (user, context) =>
      expectEq((context as any).auth, undefined)
    )

    .it('should not have action', (user, context) =>
      expectEq((context as any).action, undefined)
    )

    .it('should have properly defined meta', (user, context) => user.metadata)

    .run(testId, u, c);
});

export const deleteUserTests: any = functions.auth.user().onDelete((u, c) => {
  let testId: string = u.displayName;
  console.log(`testId is ${testId}`);

  return new TestSuite<UserMetadata>('auth user onDelete')
    .it('should have a project as resource', (user, context) =>
      expectEq(context.resource.name, `projects/${process.env.GCLOUD_PROJECT}`)
    )

    .it('should not have a path', (user, context) =>
      expectEq((context as any).path, undefined)
    )

    .it('should have the correct eventType', (user, context) =>
      expectEq(context.eventType, 'google.firebase.auth.user.delete')
    )

    .it('should have an eventId', (user, context) => context.eventId)

    .it('should have a timestamp', (user, context) => context.timestamp)

    .it('should not have auth', (user, context) =>
      expectEq((context as any).auth, undefined)
    )

    .it('should not have action', (user, context) =>
      expectEq((context as any).action, undefined)
    )

    .run(testId, u, c);
});
