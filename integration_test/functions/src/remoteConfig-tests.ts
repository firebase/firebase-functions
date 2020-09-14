import * as functions from 'firebase-functions';
import { expectEq, TestSuite } from './testing';
import TemplateVersion = functions.remoteConfig.TemplateVersion;

const REGION = process.env.FIREBASE_FUNCTIONS_TEST_REGION || 'us-central1';

export const remoteConfigTests: any = functions
  .region(REGION)
  .remoteConfig.onUpdate((v, c) => {
    return new TestSuite<TemplateVersion>('remoteConfig onUpdate')
      .it('should have a project as resource', (version, context) =>
        expectEq(
          context.resource.name,
          `projects/${process.env.GCLOUD_PROJECT}`
        )
      )

      .it('should have the correct eventType', (version, context) =>
        expectEq(context.eventType, 'google.firebase.remoteconfig.update')
      )

      .it('should have an eventId', (version, context) => context.eventId)

      .it('should have a timestamp', (version, context) => context.timestamp)

      .it('should not have auth', (version, context) =>
        expectEq((context as any).auth, undefined)
      )

      .run(v.description, v, c);
  });
