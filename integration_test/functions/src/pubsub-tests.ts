import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { evaluate, expectEq, success, TestSuite } from './testing';
import PubsubMessage = functions.pubsub.Message;

const REGION = process.env.FIREBASE_FUNCTIONS_TEST_REGION || 'us-central1';

// TODO(inlined) use multiple queues to run inline.
// Expected message data: {"hello": "world"}
export const pubsubTests: any = functions
  .region(REGION)
  .pubsub.topic('pubsubTests')
  .onPublish((m, c) => {
    let testId: string;
    try {
      testId = m.json.testId;
    } catch (e) {
      /* Ignored. Covered in another test case that `event.data.json` works. */
    }

    return new TestSuite<PubsubMessage>('pubsub onPublish')
      .it('should have a topic as resource', (message, context) =>
        expectEq(
          context.resource.name,
          `projects/${process.env.GCLOUD_PROJECT}/topics/pubsubTests`
        )
      )

      .it('should not have a path', (message, context) =>
        expectEq((context as any).path, undefined)
      )

      .it('should have the correct eventType', (message, context) =>
        expectEq(context.eventType, 'google.pubsub.topic.publish')
      )

      .it('should have an eventId', (message, context) => context.eventId)

      .it('should have a timestamp', (message, context) => context.timestamp)

      .it('should not have auth', (message, context) =>
        expectEq((context as any).auth, undefined)
      )

      .it('should not have action', (message, context) =>
        expectEq((context as any).action, undefined)
      )

      .it('should have pubsub data', (message) => {
        const decoded = new Buffer(message.data, 'base64').toString();
        const parsed = JSON.parse(decoded);
        return evaluate(
          parsed.hasOwnProperty('testId'),
          'Raw data was: ' + message.data
        );
      })

      .it('should decode JSON payloads with the json helper', (message) =>
        evaluate(message.json.hasOwnProperty('testId'), message.json)
      )

      .run(testId, m, c);
  });

export const schedule: any = functions
  .region(REGION)
  .pubsub.schedule('every 10 hours') // This is a dummy schedule, since we need to put a valid one in.
  // For the test, the job is triggered by the jobs:run api
  .onRun((context) => {
    let testId;
    const db = admin.database();
    return new Promise(async (resolve, reject) => {
      await db
        .ref('testRuns')
        .orderByChild('timestamp')
        .limitToLast(1)
        .on('value', (snap) => {
          testId = Object.keys(snap.val())[0];
          new TestSuite('pubsub scheduleOnRun')
            .it('should trigger when the scheduler fires', () => success())
            .run(testId, null);
        });
      resolve();
    });
  });
