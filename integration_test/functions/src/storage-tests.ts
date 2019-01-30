import * as functions from 'firebase-functions';
import { TestSuite, expectEq, expectDeepEq } from './testing';
import ObjectMetadata = functions.storage.ObjectMetadata;
const testIdFieldName = 'documentId';

export const storageTests: any = functions
  .runWith({
    timeoutSeconds: 540,
  })
  .storage.bucket()
  .object()
  .onFinalize((s, c) => {
    const testId = s.name.split('.')[0];
    return new TestSuite<ObjectMetadata>('storage object finalize')

      .it('should not have event.app', (data, context) => !(context as any).app)

      .it('should have the right eventType', (snap, context) =>
        expectEq(context.eventType, 'google.storage.object.finalize')
      )

      .it('should have eventId', (snap, context) => context.eventId)

      .it('should have timestamp', (snap, context) => context.timestamp)

      .run(testId, s, c);
  });
