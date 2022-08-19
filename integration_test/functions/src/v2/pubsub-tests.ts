import {
  MessagePublishedData,
  onMessagePublished,
} from 'firebase-functions/v2/pubsub';
import { evaluate, expectEq, TestSuite } from '../testing';
import { CloudEvent } from 'firebase-functions/v2';

interface Message {
  testId: string;
}

export const pubsubtests: any = onMessagePublished<Message>(
  'pubsubV2Tests',
  (event) => {
    let testId: string;
    try {
      testId = event.data.message.json.testId;
    } catch (e) {
      /* Ignored. Covered in another test case that `event.data.json` works. */
    }

    return new TestSuite<CloudEvent<MessagePublishedData>>('pubsub onPublish')
      .it('should have a topic as resource', (event) =>
        expectEq(
          event.source,
          `//pubsub.googleapis.com/projects/${process.env.GCLOUD_PROJECT}/topics/pubsubV2Tests`
        )
      )

      .it('should have the correct eventType', (event) =>
        expectEq(event.type, 'google.cloud.pubsub.topic.v1.messagePublished')
      )

      .it('should have an eventId', (event) => event.id)

      .it('should have a timestamp', (event) => event.time)

      .it('should have pubsub data', (event) => {
        const decoded = new Buffer(
          event.data.message.data,
          'base64'
        ).toString();
        const parsed = JSON.parse(decoded);
        return evaluate(
          parsed.hasOwnProperty('testId'),
          'Raw data was: ' + event.data.message.data
        );
      })

      .it('should decode JSON payloads with the json helper', (event) =>
        evaluate(
          event.data.message.json.hasOwnProperty('testId'),
          'has json test id'
        )
      )
      .run(testId, event);
  }
);
