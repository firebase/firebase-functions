import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { expectEq, expectMatches, TestSuite } from './testing';
import DataSnapshot = admin.database.DataSnapshot;

const testIdFieldName = 'testId';
const REGION = process.env.FIREBASE_FUNCTIONS_TEST_REGION || 'us-central1';

export const databaseTests: any = functions
  .region(REGION)
  .database.ref('dbTests/{testId}/start')
  .onWrite((ch, ctx) => {
    if (ch.after.val() === null) {
      console.log(
        'Event for ' +
          ctx.params[testIdFieldName] +
          ' is null; presuming data cleanup, so skipping.'
      );
      return;
    }

    return new TestSuite<functions.Change<DataSnapshot>>('database ref onWrite')

      .it(
        'should not have event.app',
        (change, context) => !(context as any).app
      )

      .it('should give refs access to admin data', (change) =>
        change.after.ref.parent
          .child('adminOnly')
          .update({ allowed: 1 })
          .then(() => true)
      )

      .it('should have a correct ref url', (change) => {
        const url = change.after.ref.toString();
        return Promise.resolve()
          .then(() => {
            return expectMatches(
              url,
              new RegExp(
                `^https://${process.env.GCLOUD_PROJECT}.firebaseio.com/dbTests`
              )
            );
          })
          .then(() => {
            return expectMatches(url, /\/start$/);
          });
      })

      .it('should have refs resources', (change, context) =>
        expectEq(
          context.resource.name,
          `projects/_/instances/${process.env.GCLOUD_PROJECT}/refs/dbTests/${context.params.testId}/start`
        )
      )

      .it('should not include path', (change, context) =>
        expectEq((context as any).path, undefined)
      )

      .it('should have the right eventType', (change, context) =>
        expectEq(context.eventType, 'google.firebase.database.ref.write')
      )

      .it('should have eventId', (change, context) => context.eventId)

      .it('should have timestamp', (change, context) => context.timestamp)

      .it('should not have action', (change, context) =>
        expectEq((context as any).action, undefined)
      )

      .it('should have admin authType', (change, context) =>
        expectEq(context.authType, 'ADMIN')
      )

      .run(ctx.params[testIdFieldName], ch, ctx);
  });
