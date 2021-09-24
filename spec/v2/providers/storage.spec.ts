import { expect } from 'chai';
import * as sinon from 'sinon';
import * as config from '../../../src/config';
import * as options from '../../../src/v2/options';
import * as storage from '../../../src/v2/providers/storage';
import { FULL_OPTIONS, FULL_TRIGGER } from './helpers';

const EVENT_TRIGGER = {
  eventType: 'event-type',
  resource: 'some-bucket',
  service: storage.service,
};

describe('v2/storage', () => {
  describe('_getOptsAndBucket', () => {
    it('should return the default bucket with empty opts', () => {
      const configStub = sinon
        .stub(config, 'firebaseConfig')
        .returns({ storageBucket: 'default-bucket' });

      const [opts, bucket] = storage._getOptsAndBucket({});

      configStub.restore();
      expect(opts).to.deep.equal({});
      expect(bucket).to.eq('default-bucket');
    });

    it('should return the default bucket with opts param', () => {
      const configStub = sinon
        .stub(config, 'firebaseConfig')
        .returns({ storageBucket: 'default-bucket' });

      const [opts, bucket] = storage._getOptsAndBucket({ region: 'us-west1' });

      configStub.restore();
      expect(opts).to.deep.equal({ region: 'us-west1' });
      expect(bucket).to.eq('default-bucket');
    });

    it('should return the given bucket', () => {
      const [opts, bucket] = storage._getOptsAndBucket('my-bucket');

      expect(opts).to.deep.equal({});
      expect(bucket).to.eq('my-bucket');
    });

    it('should return the given bucket and opts', () => {
      const [opts, bucket] = storage._getOptsAndBucket({
        bucket: 'my-bucket',
        region: 'us-west1',
      });

      expect(opts).to.deep.equal({ region: 'us-west1' });
      expect(bucket).to.eq('my-bucket');
    });
  });

  describe('_onOperation', () => {
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

    it('should create a minimal trigger with bucket', () => {
      const result = storage._onOperation(
        'event-type',
        'some-bucket',
        () => 42
      );

      expect(result.__trigger).to.deep.equal({
        apiVersion: 2,
        platform: 'gcfv2',
        labels: {},
        eventTrigger: EVENT_TRIGGER,
      });
    });

    it('should create a minimal trigger with opts', () => {
      configStub.returns({ storageBucket: 'default-bucket' });

      const result = storage._onOperation(
        'event-type',
        { region: 'us-west1' },
        () => 42
      );

      expect(result.__trigger).to.deep.equal({
        apiVersion: 2,
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...EVENT_TRIGGER,
          resource: 'default-bucket',
        },
        regions: ['us-west1'],
      });
    });

    it('should create a minimal trigger with bucket with opts and bucket', () => {
      const result = storage._onOperation(
        'event-type',
        { bucket: 'some-bucket' },
        () => 42
      );

      expect(result.__trigger).to.deep.equal({
        apiVersion: 2,
        platform: 'gcfv2',
        labels: {},
        eventTrigger: EVENT_TRIGGER,
      });
    });

    it('should create a complex trigger with appropriate values', () => {
      const result = storage._onOperation(
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
    });

    it('should merge options and globalOptions', () => {
      options.setGlobalOptions({
        concurrency: 20,
        region: 'europe-west1',
        minInstances: 1,
      });

      const result = storage._onOperation(
        'event-type',
        {
          bucket: 'some-bucket',
          region: 'us-west1',
          minInstances: 3,
        },
        () => 42
      );

      expect(result.__trigger).to.deep.equal({
        apiVersion: 2,
        platform: 'gcfv2',
        concurrency: 20,
        minInstances: 3,
        regions: ['us-west1'],
        labels: {},
        eventTrigger: EVENT_TRIGGER,
      });
    });
  });

  describe('onObjectArchived', () => {
    const ARCHIVED_TRIGGER = {
      ...EVENT_TRIGGER,
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
        apiVersion: 2,
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...ARCHIVED_TRIGGER,
          resource: 'default-bucket',
        },
      });
    });

    it('should accept bucket and handler', () => {
      const result = storage.onObjectArchived('my-bucket', () => 42);

      expect(result.__trigger).to.deep.equal({
        apiVersion: 2,
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...ARCHIVED_TRIGGER,
          resource: 'my-bucket',
        },
      });
    });

    it('should accept opts and handler', () => {
      const result = storage.onObjectArchived(
        { bucket: 'my-bucket', region: 'us-west1' },
        () => 42
      );

      expect(result.__trigger).to.deep.equal({
        apiVersion: 2,
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...ARCHIVED_TRIGGER,
          resource: 'my-bucket',
        },
        regions: ['us-west1'],
      });
    });

    it('should accept opts and handler, default bucket', () => {
      configStub.returns({ storageBucket: 'default-bucket' });

      const result = storage.onObjectArchived({ region: 'us-west1' }, () => 42);

      expect(result.__trigger).to.deep.equal({
        apiVersion: 2,
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...ARCHIVED_TRIGGER,
          resource: 'default-bucket',
        },
        regions: ['us-west1'],
      });
    });
  });

  describe('onObjectFinalized', () => {
    const FINALIZED_TRIGGER = {
      ...EVENT_TRIGGER,
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
        apiVersion: 2,
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...FINALIZED_TRIGGER,
          resource: 'default-bucket',
        },
      });
    });

    it('should accept bucket and handler', () => {
      const result = storage.onObjectFinalized('my-bucket', () => 42);

      expect(result.__trigger).to.deep.equal({
        apiVersion: 2,
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...FINALIZED_TRIGGER,
          resource: 'my-bucket',
        },
      });
    });

    it('should accept opts and handler', () => {
      const result = storage.onObjectFinalized(
        { bucket: 'my-bucket', region: 'us-west1' },
        () => 42
      );

      expect(result.__trigger).to.deep.equal({
        apiVersion: 2,
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...FINALIZED_TRIGGER,
          resource: 'my-bucket',
        },
        regions: ['us-west1'],
      });
    });

    it('should accept opts and handler, default bucket', () => {
      configStub.returns({ storageBucket: 'default-bucket' });

      const result = storage.onObjectFinalized(
        { region: 'us-west1' },
        () => 42
      );

      expect(result.__trigger).to.deep.equal({
        apiVersion: 2,
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...FINALIZED_TRIGGER,
          resource: 'default-bucket',
        },
        regions: ['us-west1'],
      });
    });
  });

  describe('onObjectDeleted', () => {
    const DELETED_TRIGGER = {
      ...EVENT_TRIGGER,
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
        apiVersion: 2,
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...DELETED_TRIGGER,
          resource: 'default-bucket',
        },
      });

      configStub.restore();
    });

    it('should accept bucket and handler', () => {
      const result = storage.onObjectDeleted('my-bucket', () => 42);

      expect(result.__trigger).to.deep.equal({
        apiVersion: 2,
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...DELETED_TRIGGER,
          resource: 'my-bucket',
        },
      });
    });

    it('should accept opts and handler', () => {
      const result = storage.onObjectDeleted(
        { bucket: 'my-bucket', region: 'us-west1' },
        () => 42
      );

      expect(result.__trigger).to.deep.equal({
        apiVersion: 2,
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...DELETED_TRIGGER,
          resource: 'my-bucket',
        },
        regions: ['us-west1'],
      });
    });

    it('should accept opts and handler, default bucket', () => {
      configStub.returns({ storageBucket: 'default-bucket' });

      const result = storage.onObjectDeleted({ region: 'us-west1' }, () => 42);

      expect(result.__trigger).to.deep.equal({
        apiVersion: 2,
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...DELETED_TRIGGER,
          resource: 'default-bucket',
        },
        regions: ['us-west1'],
      });
    });
  });

  describe('onObjectMetadataUpdated', () => {
    const METADATA_TRIGGER = {
      ...EVENT_TRIGGER,
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
        apiVersion: 2,
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...METADATA_TRIGGER,
          resource: 'default-bucket',
        },
      });

      configStub.restore();
    });

    it('should accept bucket and handler', () => {
      const result = storage.onObjectMetadataUpdated('my-bucket', () => 42);

      expect(result.__trigger).to.deep.equal({
        apiVersion: 2,
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...METADATA_TRIGGER,
          resource: 'my-bucket',
        },
      });
    });

    it('should accept opts and handler', () => {
      const result = storage.onObjectMetadataUpdated(
        { bucket: 'my-bucket', region: 'us-west1' },
        () => 42
      );

      expect(result.__trigger).to.deep.equal({
        apiVersion: 2,
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...METADATA_TRIGGER,
          resource: 'my-bucket',
        },
        regions: ['us-west1'],
      });
    });

    it('should accept opts and handler, default bucket', () => {
      configStub.returns({ storageBucket: 'default-bucket' });

      const result = storage.onObjectMetadataUpdated(
        { region: 'us-west1' },
        () => 42
      );

      expect(result.__trigger).to.deep.equal({
        apiVersion: 2,
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          ...METADATA_TRIGGER,
          resource: 'default-bucket',
        },
        regions: ['us-west1'],
      });
    });
  });
});
