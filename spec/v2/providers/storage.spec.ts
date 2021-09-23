import { expect } from 'chai';
import * as sinon from 'sinon';
import * as config from '../../../src/config';
import * as options from '../../../src/v2/options';
import * as storage from '../../../src/v2/providers/storage';
import { FULL_OPTIONS, FULL_TRIGGER } from './helpers';

describe('v2/storage', () => {
  describe('_getOptsAndBucket', () => {
    it('should return throw error without a bucket', () => {
      expect(() => storage._getOptsAndBucket()).to.throw();
    });

    it('should return the default bucket on no params', () => {
      const configStub = sinon
        .stub(config, 'firebaseConfig')
        .returns({ storageBucket: 'default-bucket' });

      const [opts, bucket] = storage._getOptsAndBucket();

      configStub.restore();
      expect(opts).to.deep.equal({});
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
    const EVENT_TRIGGER = {
      eventType: 'google.cloud.storage.event-type',
      resource: 'my-bucket',
      service: 'storage.googleapis.com',
    };

    beforeEach(() => {
      options.setGlobalOptions({});
      process.env.GCLOUD_PROJECT = 'aProject';
    });

    afterEach(() => {
      options.setGlobalOptions({});
      delete process.env.GCLOUD_PROJECT;
    });

    it('should create a minimal trigger', () => {
      const result = storage._onOperation(() => 42, 'event-type', 'my-bucket');

      expect(result.__trigger).to.deep.equal({
        apiVersion: 2,
        platform: 'gcfv2',
        labels: {},
        eventTrigger: EVENT_TRIGGER,
      });
    });

    it('should create a complex trigger with appropriate values', () => {
      const result = storage._onOperation(() => 42, 'event-type', {
        ...FULL_OPTIONS,
        bucket: 'my-bucket',
      });

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

      const result = storage._onOperation(() => 42, 'event-type', {
        bucket: 'my-bucket',
        region: 'us-west1',
        minInstances: 3,
      });

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
    it('should accept only handler', () => {
      const configStub = sinon
        .stub(config, 'firebaseConfig')
        .returns({ storageBucket: 'default-bucket' });

      const result = storage.onObjectArchived(() => 42);

      configStub.restore();
      expect(result.__trigger).to.deep.equal({
        apiVersion: 2,
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: 'google.cloud.storage.object.v1.archived',
          resource: 'default-bucket',
          service: 'storage.googleapis.com',
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
          eventType: 'google.cloud.storage.object.v1.archived',
          resource: 'my-bucket',
          service: 'storage.googleapis.com',
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
          eventType: 'google.cloud.storage.object.v1.archived',
          resource: 'my-bucket',
          service: 'storage.googleapis.com',
        },
        regions: ['us-west1'],
      });
    });
  });

  describe('onObjectFinalized', () => {
    it('should accept only handler', () => {
      const configStub = sinon
        .stub(config, 'firebaseConfig')
        .returns({ storageBucket: 'default-bucket' });

      const result = storage.onObjectFinalized(() => 42);

      configStub.restore();
      expect(result.__trigger).to.deep.equal({
        apiVersion: 2,
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: 'google.cloud.storage.object.v1.finalized',
          resource: 'default-bucket',
          service: 'storage.googleapis.com',
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
          eventType: 'google.cloud.storage.object.v1.finalized',
          resource: 'my-bucket',
          service: 'storage.googleapis.com',
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
          eventType: 'google.cloud.storage.object.v1.finalized',
          resource: 'my-bucket',
          service: 'storage.googleapis.com',
        },
        regions: ['us-west1'],
      });
    });
  });

  describe('onObjectDeleted', () => {
    it('should accept only handler', () => {
      const configStub = sinon
        .stub(config, 'firebaseConfig')
        .returns({ storageBucket: 'default-bucket' });

      const result = storage.onObjectDeleted(() => 42);

      configStub.restore();
      expect(result.__trigger).to.deep.equal({
        apiVersion: 2,
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: 'google.cloud.storage.object.v1.deleted',
          resource: 'default-bucket',
          service: 'storage.googleapis.com',
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
          eventType: 'google.cloud.storage.object.v1.deleted',
          resource: 'my-bucket',
          service: 'storage.googleapis.com',
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
          eventType: 'google.cloud.storage.object.v1.deleted',
          resource: 'my-bucket',
          service: 'storage.googleapis.com',
        },
        regions: ['us-west1'],
      });
    });
  });

  describe('onObjectMetadataUpdated', () => {
    it('should accept only handler', () => {
      const configStub = sinon
        .stub(config, 'firebaseConfig')
        .returns({ storageBucket: 'default-bucket' });

      const result = storage.onObjectMetadataUpdated(() => 42);

      configStub.restore();
      expect(result.__trigger).to.deep.equal({
        apiVersion: 2,
        platform: 'gcfv2',
        labels: {},
        eventTrigger: {
          eventType: 'google.cloud.storage.object.v1.metadataUpdated',
          resource: 'default-bucket',
          service: 'storage.googleapis.com',
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
          eventType: 'google.cloud.storage.object.v1.metadataUpdated',
          resource: 'my-bucket',
          service: 'storage.googleapis.com',
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
          eventType: 'google.cloud.storage.object.v1.metadataUpdated',
          resource: 'my-bucket',
          service: 'storage.googleapis.com',
        },
        regions: ['us-west1'],
      });
    });
  });
});
