import { expect } from 'chai';
import * as sinon from 'sinon';
import * as config from '../../../src/config';
import * as options from '../../../src/v2/options';
import * as storage from '../../../src/v2/providers/storage';
import { FULL_ENDPOINT, FULL_OPTIONS, FULL_TRIGGER } from './fixtures';

const EVENT_TRIGGER = {
  eventType: 'event-type',
  resource: 'some-bucket',
};

const ENDPOINT_EVENT_TRIGGER = {
  eventType: 'event-type',
  eventFilters: {
    bucket: 'some-bucket',
  },
  retry: false,
};

const DEFAULT_BUCKET_EVENT_FILTER = {
  bucket: 'default-bucket',
};

const SPECIFIC_BUCKET_EVENT_FILTER = {
  bucket: 'my-bucket',
};

describe('v2/storage', () => {
  describe('getOptsAndBucket', () => {
    it('should return the default bucket with empty opts', () => {
      const configStub = sinon
        .stub(config, 'firebaseConfig')
        .returns({ storageBucket: 'default-bucket' });

      const [opts, bucket] = storage.getOptsAndBucket({});

      configStub.restore();
      expect(opts).to.deep.equal({});
      expect(bucket).to.eq('default-bucket');
    });

    it('should return the default bucket with opts param', () => {
      const configStub = sinon
        .stub(config, 'firebaseConfig')
        .returns({ storageBucket: 'default-bucket' });

      const [opts, bucket] = storage.getOptsAndBucket({ region: 'us-west1' });

      configStub.restore();
      expect(opts).to.deep.equal({ region: 'us-west1' });
      expect(bucket).to.eq('default-bucket');
    });

    it('should return the given bucket', () => {
      const [opts, bucket] = storage.getOptsAndBucket('my-bucket');

      expect(opts).to.deep.equal({});
      expect(bucket).to.eq('my-bucket');
    });

    it('should return the given bucket and opts', () => {
      const [opts, bucket] = storage.getOptsAndBucket({
        bucket: 'my-bucket',
        region: 'us-west1',
      });

      expect(opts).to.deep.equal({ region: 'us-west1' });
      expect(bucket).to.eq('my-bucket');
    });
  });

  describe('onOperation', () => {
    let configStub: sinon.SinonStub;

    beforeEach(() => {
      process.env.GCLOUD_PROJECT = 'aProject';
      configStub = sinon.stub(config, 'firebaseConfig');
    });

    afterEach(() => {
      options.setGlobalOptions({});
      delete process.env.GCLOUD_PROJECT;
      configStub.restore();
    });

    it('should create a minimal trigger/endpoint with bucket', () => {
      const result = storage.onOperation('event-type', 'some-bucket', () => 42);

      expect(result.__trigger).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: EVENT_TRIGGER,
      });

      expect(result.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: ENDPOINT_EVENT_TRIGGER,
      });
    });

    it('should create a minimal trigger/endpoint with opts', () => {
      configStub.returns({ storageBucket: 'default-bucket' });

      const result = storage.onOperation(
        'event-type',
        { region: 'us-west1' },
        () => 42
      );

      expect(result.__trigger).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...EVENT_TRIGGER,
          resource: 'default-bucket',
        },
        regions: ['us-west1'],
      });

      expect(result.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...ENDPOINT_EVENT_TRIGGER,
          eventFilters: DEFAULT_BUCKET_EVENT_FILTER,
        },
        region: ['us-west1'],
      });
    });

    it('should create a minimal trigger with bucket with opts and bucket', () => {
      const result = storage.onOperation(
        'event-type',
        { bucket: 'some-bucket' },
        () => 42
      );

      expect(result.__trigger).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: EVENT_TRIGGER,
      });

      expect(result.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: ENDPOINT_EVENT_TRIGGER,
      });
    });

    it('should create a complex trigger/endpoint with appropriate values', () => {
      const result = storage.onOperation(
        'event-type',
        {
          ...FULL_OPTIONS,
          bucket: 'some-bucket',
        },
        () => 42
      );

      expect(result.__trigger).to.deep.equal({
        ...FULL_TRIGGER,
        eventTrigger: EVENT_TRIGGER,
      });

      expect(result.__endpoint).to.deep.equal({
        ...FULL_ENDPOINT,
        eventTrigger: ENDPOINT_EVENT_TRIGGER,
      });
    });

    it('should merge options and globalOptions', () => {
      options.setGlobalOptions({
        concurrency: 20,
        region: 'europe-west1',
        minInstances: 1,
      });

      const result = storage.onOperation(
        'event-type',
        {
          bucket: 'some-bucket',
          region: 'us-west1',
          minInstances: 3,
        },
        () => 42
      );

      expect(result.__trigger).to.deep.equal({
        platform: 'gcfv2',
        concurrency: 20,
        minInstances: 3,
        regions: ['us-west1'],
        labels: {},
        eventTrigger: EVENT_TRIGGER,
      });

      expect(result.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        concurrency: 20,
        minInstances: 3,
        region: ['us-west1'],
        labels: {},
        eventTrigger: ENDPOINT_EVENT_TRIGGER,
      });
    });
  });

  describe('onObjectArchived', () => {
    const ARCHIVED_TRIGGER = {
      ...EVENT_TRIGGER,
      eventType: storage.archivedEvent,
    };
    const ENDPOINT_ARCHIVED_TRIGGER = {
      ...ENDPOINT_EVENT_TRIGGER,
      eventType: storage.archivedEvent,
    };
    let configStub: sinon.SinonStub;

    beforeEach(() => {
      configStub = sinon.stub(config, 'firebaseConfig');
    });

    afterEach(() => {
      configStub.restore();
    });

    it('should accept only handler', () => {
      configStub.returns({ storageBucket: 'default-bucket' });

      const result = storage.onObjectArchived(() => 42);

      expect(result.__trigger).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...ARCHIVED_TRIGGER,
          resource: 'default-bucket',
        },
      });

      expect(result.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...ENDPOINT_ARCHIVED_TRIGGER,
          eventFilters: DEFAULT_BUCKET_EVENT_FILTER,
        },
      });
    });

    it('should accept bucket and handler', () => {
      const result = storage.onObjectArchived('my-bucket', () => 42);

      expect(result.__trigger).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...ARCHIVED_TRIGGER,
          resource: 'my-bucket',
        },
      });

      expect(result.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...ENDPOINT_ARCHIVED_TRIGGER,
          eventFilters: SPECIFIC_BUCKET_EVENT_FILTER,
        },
      });
    });

    it('should accept opts and handler', () => {
      const result = storage.onObjectArchived(
        { bucket: 'my-bucket', region: 'us-west1' },
        () => 42
      );

      expect(result.__trigger).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...ARCHIVED_TRIGGER,
          resource: 'my-bucket',
        },
        regions: ['us-west1'],
      });

      expect(result.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...ENDPOINT_ARCHIVED_TRIGGER,
          eventFilters: SPECIFIC_BUCKET_EVENT_FILTER,
        },
        region: ['us-west1'],
      });
    });

    it('should accept opts and handler, default bucket', () => {
      configStub.returns({ storageBucket: 'default-bucket' });

      const result = storage.onObjectArchived({ region: 'us-west1' }, () => 42);

      expect(result.__trigger).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...ARCHIVED_TRIGGER,
          resource: 'default-bucket',
        },
        regions: ['us-west1'],
      });

      expect(result.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...ENDPOINT_ARCHIVED_TRIGGER,
          eventFilters: DEFAULT_BUCKET_EVENT_FILTER,
        },
        region: ['us-west1'],
      });
    });
  });

  describe('onObjectFinalized', () => {
    const FINALIZED_TRIGGER = {
      ...EVENT_TRIGGER,
      eventType: storage.finalizedEvent,
    };
    const ENDPOINT_FINALIZED_TRIGGER = {
      ...ENDPOINT_EVENT_TRIGGER,
      eventType: storage.finalizedEvent,
    };
    let configStub: sinon.SinonStub;

    beforeEach(() => {
      configStub = sinon.stub(config, 'firebaseConfig');
    });

    afterEach(() => {
      configStub.restore();
    });

    it('should accept only handler', () => {
      configStub.returns({ storageBucket: 'default-bucket' });

      const result = storage.onObjectFinalized(() => 42);

      expect(result.__trigger).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...FINALIZED_TRIGGER,
          resource: 'default-bucket',
        },
      });

      expect(result.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...ENDPOINT_FINALIZED_TRIGGER,
          eventFilters: DEFAULT_BUCKET_EVENT_FILTER,
        },
      });
    });

    it('should accept bucket and handler', () => {
      const result = storage.onObjectFinalized('my-bucket', () => 42);

      expect(result.__trigger).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...FINALIZED_TRIGGER,
          resource: 'my-bucket',
        },
      });

      expect(result.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...ENDPOINT_FINALIZED_TRIGGER,
          eventFilters: SPECIFIC_BUCKET_EVENT_FILTER,
        },
      });
    });

    it('should accept opts and handler', () => {
      const result = storage.onObjectFinalized(
        { bucket: 'my-bucket', region: 'us-west1' },
        () => 42
      );

      expect(result.__trigger).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...FINALIZED_TRIGGER,
          resource: 'my-bucket',
        },
        regions: ['us-west1'],
      });

      expect(result.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...ENDPOINT_FINALIZED_TRIGGER,
          eventFilters: SPECIFIC_BUCKET_EVENT_FILTER,
        },
        region: ['us-west1'],
      });
    });

    it('should accept opts and handler, default bucket', () => {
      configStub.returns({ storageBucket: 'default-bucket' });

      const result = storage.onObjectFinalized(
        { region: 'us-west1' },
        () => 42
      );

      expect(result.__trigger).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...FINALIZED_TRIGGER,
          resource: 'default-bucket',
        },
        regions: ['us-west1'],
      });

      expect(result.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...ENDPOINT_FINALIZED_TRIGGER,
          eventFilters: DEFAULT_BUCKET_EVENT_FILTER,
        },
        region: ['us-west1'],
      });
    });
  });

  describe('onObjectDeleted', () => {
    const DELETED_TRIGGER = {
      ...EVENT_TRIGGER,
      eventType: storage.deletedEvent,
    };
    const ENDPOINT_DELETED_TRIGGER = {
      ...ENDPOINT_EVENT_TRIGGER,
      eventType: storage.deletedEvent,
    };
    let configStub: sinon.SinonStub;

    beforeEach(() => {
      configStub = sinon.stub(config, 'firebaseConfig');
    });

    afterEach(() => {
      configStub.restore();
    });

    it('should accept only handler', () => {
      configStub.returns({ storageBucket: 'default-bucket' });

      const result = storage.onObjectDeleted(() => 42);

      expect(result.__trigger).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...DELETED_TRIGGER,
          resource: 'default-bucket',
        },
      });

      expect(result.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...ENDPOINT_DELETED_TRIGGER,
          eventFilters: DEFAULT_BUCKET_EVENT_FILTER,
        },
      });

      configStub.restore();
    });

    it('should accept bucket and handler', () => {
      const result = storage.onObjectDeleted('my-bucket', () => 42);

      expect(result.__trigger).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...DELETED_TRIGGER,
          resource: 'my-bucket',
        },
      });

      expect(result.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...ENDPOINT_DELETED_TRIGGER,
          eventFilters: SPECIFIC_BUCKET_EVENT_FILTER,
        },
      });
    });

    it('should accept opts and handler', () => {
      const result = storage.onObjectDeleted(
        { bucket: 'my-bucket', region: 'us-west1' },
        () => 42
      );

      expect(result.__trigger).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...DELETED_TRIGGER,
          resource: 'my-bucket',
        },
        regions: ['us-west1'],
      });

      expect(result.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...ENDPOINT_DELETED_TRIGGER,
          eventFilters: SPECIFIC_BUCKET_EVENT_FILTER,
        },
        region: ['us-west1'],
      });
    });

    it('should accept opts and handler, default bucket', () => {
      configStub.returns({ storageBucket: 'default-bucket' });

      const result = storage.onObjectDeleted({ region: 'us-west1' }, () => 42);

      expect(result.__trigger).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...DELETED_TRIGGER,
          resource: 'default-bucket',
        },
        regions: ['us-west1'],
      });

      expect(result.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...ENDPOINT_DELETED_TRIGGER,
          eventFilters: DEFAULT_BUCKET_EVENT_FILTER,
        },
        region: ['us-west1'],
      });
    });
  });

  describe('onObjectMetadataUpdated', () => {
    const METADATA_TRIGGER = {
      ...EVENT_TRIGGER,
      eventType: storage.metadataUpdatedEvent,
    };
    const ENDPOINT_METADATA_TRIGGER = {
      ...ENDPOINT_EVENT_TRIGGER,
      eventType: storage.metadataUpdatedEvent,
    };
    let configStub: sinon.SinonStub;

    beforeEach(() => {
      configStub = sinon.stub(config, 'firebaseConfig');
    });

    afterEach(() => {
      configStub.restore();
    });

    it('should accept only handler', () => {
      configStub.returns({ storageBucket: 'default-bucket' });

      const result = storage.onObjectMetadataUpdated(() => 42);

      expect(result.__trigger).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...METADATA_TRIGGER,
          resource: 'default-bucket',
        },
      });

      expect(result.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...ENDPOINT_METADATA_TRIGGER,
          eventFilters: DEFAULT_BUCKET_EVENT_FILTER,
        },
      });

      configStub.restore();
    });

    it('should accept bucket and handler', () => {
      const result = storage.onObjectMetadataUpdated('my-bucket', () => 42);

      expect(result.__trigger).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...METADATA_TRIGGER,
          resource: 'my-bucket',
        },
      });

      expect(result.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...ENDPOINT_METADATA_TRIGGER,
          eventFilters: SPECIFIC_BUCKET_EVENT_FILTER,
        },
      });
    });

    it('should accept opts and handler', () => {
      const result = storage.onObjectMetadataUpdated(
        { bucket: 'my-bucket', region: 'us-west1' },
        () => 42
      );

      expect(result.__trigger).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...METADATA_TRIGGER,
          resource: 'my-bucket',
        },
        regions: ['us-west1'],
      });

      expect(result.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...ENDPOINT_METADATA_TRIGGER,
          eventFilters: SPECIFIC_BUCKET_EVENT_FILTER,
        },
        region: ['us-west1'],
      });
    });

    it('should accept opts and handler, default bucket', () => {
      configStub.returns({ storageBucket: 'default-bucket' });

      const result = storage.onObjectMetadataUpdated(
        { region: 'us-west1' },
        () => 42
      );

      expect(result.__trigger).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...METADATA_TRIGGER,
          resource: 'default-bucket',
        },
        regions: ['us-west1'],
      });

      expect(result.__endpoint).to.deep.equal({
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...ENDPOINT_METADATA_TRIGGER,
          eventFilters: DEFAULT_BUCKET_EVENT_FILTER,
        },
        region: ['us-west1'],
      });
    });
  });
});
