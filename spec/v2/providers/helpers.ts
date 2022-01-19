import * as options from '../../../src/v2/options';

export const BASIC_OPTIONS: options.EventHandlerOptions = {
  labels: {
    someKey: 'someValue',
  },
  region: 'us-east1',
};

export const BASIC_ENDPOINT = {
  platform: 'gcfv2',
  region: ['us-east1'],
  labels: {
    someKey: 'someValue',
  },
};

export const FULL_OPTIONS: options.GlobalOptions = {
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
};

export const FULL_TRIGGER = {
  apiVersion: 2,
  platform: 'gcfv2',
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
};

export const FULL_ENDPOINT = {
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
};
