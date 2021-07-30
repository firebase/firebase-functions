import { expect } from 'chai';

import { CloudEvent } from '../../../src/v2/base';
import * as options from '../../../src/v2/options';
import * as pubsub from '../../../src/v2/providers/pubsub';

const EVENT_TRIGGER = {
  eventType: 'google.cloud.pubsub.topic.v1.messagePublished',
  resource: 'projects/aProject/topics/topic',
};

describe('onMessagePublished', () => {
  beforeEach(() => {
    options.setGlobalOptions({});
    process.env.GCLOUD_PROJECT = 'aProject';
  });

  afterEach(() => {
    delete process.env.GCLOUD_PROJECT;
  });

  it('should return a minimal trigger with appropriate values', () => {
    const result = pubsub.onMessagePublished('topic', () => 42);
    expect(result.__trigger).to.deep.equal({
      apiVersion: 2,
      platform: 'gcfv2',
      eventTrigger: EVENT_TRIGGER,
      labels: {},
    });
  });

  it('should create a complex trigger with appropraite values', () => {
    const result = pubsub.onMessagePublished(
      {
        topic: 'topic',
        region: 'us-west1',
        memory: '512MB',
        timeoutSeconds: 60,
        minInstances: 1,
        maxInstances: 3,
        concurrency: 20,
        vpcConnector: 'aConnector',
        vpcConnectorEgressSettings: 'ALL_TRAFFIC',
        serviceAccount: 'root@',
        ingressSettings: 'ALLOW_ALL',
        labels: {
          hello: 'world',
        },
      },
      () => 42
    );
    expect(result.__trigger).to.deep.equal({
      apiVersion: 2,
      platform: 'gcfv2',
      eventTrigger: EVENT_TRIGGER,
      regions: ['us-west1'],
      availableMemoryMb: 512,
      timeout: '60s',
      minInstances: 1,
      maxInstances: 3,
      concurrency: 20,
      vpcConnector: 'aConnector',
      vpcConnectorEgressSettings: 'ALL_TRAFFIC',
      serviceAccountEmail: 'root@aProject.iam.gserviceaccount.com',
      ingressSettings: 'ALLOW_ALL',
      labels: {
        hello: 'world',
      },
    });
  });

  it('should merge options and globalOptions', () => {
    options.setGlobalOptions({
      concurrency: 20,
      region: 'europe-west1',
      minInstances: 1,
    });

    const result = pubsub.onMessagePublished(
      {
        topic: 'topic',
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

  it('should have a .run method', () => {
    const func = pubsub.onMessagePublished('topic', (event) => event);

    const res = func.run('input' as any);

    expect(res).to.equal('input');
  });

  it('should parse pubsub messages', () => {
    let json: unknown;
    const messageJSON = {
      messageId: 'uuid',
      data: Buffer.from(JSON.stringify({ hello: 'world' })).toString('base64'),
      attributes: { key: 'value' },
      orderingKey: 'orderingKey',
      publishTime: new Date(Date.now()).toISOString(),
    };
    const publishData: pubsub.MessagePublishedData = {
      message: messageJSON as any,
      subscription: 'projects/aProject/subscriptions/aSubscription',
    };
    const event: CloudEvent<pubsub.MessagePublishedData> = {
      specversion: '1.0',
      source: '//pubsub.googleapis.com/projects/aProject/topics/topic',
      id: 'uuid',
      type: EVENT_TRIGGER.eventType,
      time: messageJSON.publishTime,
      data: publishData,
    };

    const func = pubsub.onMessagePublished('topic', (event) => {
      json = event.data.message.json;
      return event;
    });

    const eventAgain = func(event);

    // Deep equal uses JSON equality, so we'll still match even though
    // Message is a class and we passed an interface.
    expect(eventAgain).to.deep.equal(event);

    expect(json).to.deep.equal({ hello: 'world' });
  });
});
