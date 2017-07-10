import * as functions from 'firebase-functions';
import { TestSuite, expectEq, evaluate } from './testing';

// TODO(inlined) use multiple queues to run inline.
// Expected message data: {"hello": "world"}
export const pubsubTests: any = functions.pubsub.topic('pubsubTests').onPublish(receivedEvent => {
  let testId: string;
  try {
    testId = receivedEvent.data.json.testId;
  } catch (e) {
    /* Ignored. Covered in another test case that `event.data.json` works. */
  }

  return new TestSuite('pubsub onPublish')
    .it('should have a topic as resource', event => expectEq(
      event.resource, `projects/${process.env.GCLOUD_PROJECT}/topics/pubsubTests`))

    .it('should not have a path', event => expectEq(event.path, undefined))

    .it('should have the correct eventType', event => expectEq(
      event.eventType, 'providers/cloud.pubsub/eventTypes/topic.publish'))

    .it('should have an eventId', event => event.eventId)

    .it('should have a timestamp', event => event.timestamp)

    .it('should not have auth', event => expectEq(event.auth, undefined))

    .it('should not have action', event => expectEq(event.action, undefined))

    .it('should have pubsub data', event => {
      const decoded = (new Buffer(event.data.data, 'base64')).toString();
      const parsed = JSON.parse(decoded);
      return evaluate(parsed.hasOwnProperty('testId'), 'Raw data was: ' + event.data.data);
    })

    .it('should decode JSON payloads with the json helper', event =>
      evaluate(event.data.json.hasOwnProperty('testId'), event.data.json))

    .run(testId, receivedEvent);
});
