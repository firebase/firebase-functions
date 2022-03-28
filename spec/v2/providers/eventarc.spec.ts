import { expect } from 'chai';
import * as options from '../../../src/v2/options';
import * as eventarc from '../../../src/v2/providers/eventarc';
import { FULL_OPTIONS } from './helpers';

const ENDPOINT_EVENT_TRIGGER = {
  eventType: 'event-type',
  retry: false,
};

describe('v2/eventarc', () => {
  describe('onCustomEventPublished', () => {
    beforeEach(() => {
      process.env.GCLOUD_PROJECT = 'aProject';
    });

    afterEach(() => {
      options.setGlobalOptions({});
      delete process.env.GCLOUD_PROJECT;
    });

    it('should create a minimal trigger/endpoint with bucket', () => {
      const result = eventarc.onCustomEventPublished('event-type', () => 42);

      expect(result.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...ENDPOINT_EVENT_TRIGGER,
          channel: 'locations/us-central1/channels/firebase',
        },
      });
    });

    it('should create a minimal trigger/endpoint with opts', () => {
      const result = eventarc.onCustomEventPublished(
        'event-type',
        { region: 'us-west1' },
        () => 42
      );

      expect(result.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...ENDPOINT_EVENT_TRIGGER,
          channel: 'locations/us-central1/channels/firebase',
        },
        region: ['us-west1'],
      });
    });

    it('should create a minimal trigger with bucket with opts', () => {
      const result = eventarc.onCustomEventPublished(
        'event-type',
        {
          channel: 'locations/us-west1/channels/my-channel',
          filters: { foo: 'bar' },
        },
        () => 42
      );

      expect(result.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...ENDPOINT_EVENT_TRIGGER,
          channel: 'locations/us-west1/channels/my-channel',
          eventFilters: [
            {
              attribute: 'foo',
              value: 'bar',
            },
          ],
        },
      });
    });

    it('should create a complex trigger/endpoint with appropriate values', () => {
      const result = eventarc.onCustomEventPublished(
        'event-type',
        {
          ...FULL_OPTIONS,
          channel: 'locations/us-west1/channels/my-channel',
        },
        () => 42
      );

      expect(result.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        region: ['us-west1'],
        availableMemoryMb: 512,
        timeoutSeconds: 60,
        minInstances: 1,
        maxInstances: 3,
        concurrency: 20,
        vpc: {
          connector: 'aConnector',
          egressSettings: 'ALL_TRAFFIC',
        },
        serviceAccountEmail: 'root@',
        ingressSettings: 'ALLOW_ALL',
        labels: {
          hello: 'world',
        },
        eventTrigger: {
          ...ENDPOINT_EVENT_TRIGGER,
          channel: 'locations/us-west1/channels/my-channel',
        },
      });
    });

    it('should merge options and globalOptions', () => {
      options.setGlobalOptions({
        concurrency: 20,
        region: 'europe-west1',
        minInstances: 1,
      });

      const result = eventarc.onCustomEventPublished(
        'event-type',
        {
          channel: 'locations/us-west1/channels/my-channel',
          region: 'us-west1',
          minInstances: 3,
        },
        () => 42
      );

      expect(result.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        concurrency: 20,
        minInstances: 3,
        region: ['us-west1'],
        labels: {},
        eventTrigger: {
          ...ENDPOINT_EVENT_TRIGGER,
          channel: 'locations/us-west1/channels/my-channel',
        },
      });
    });
  });
});
