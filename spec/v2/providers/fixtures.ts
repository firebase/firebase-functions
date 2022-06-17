import { TriggerAnnotation } from '../../../src/v2/core';
import * as options from '../../../src/v2/options';

export const FULL_OPTIONS: options.GlobalOptions = {
  region: "us-west1",
  memory: "512MiB",
  timeoutSeconds: 60,
  minInstances: 1,
  maxInstances: 3,
  concurrency: 20,
  vpcConnector: "aConnector",
  vpcConnectorEgressSettings: "ALL_TRAFFIC",
  serviceAccount: "root@",
  ingressSettings: "ALLOW_ALL",
  cpu: "gcf_gen1",
  labels: {
    hello: 'world',
  },
  secrets: ['MY_SECRET'],
};

export const FULL_TRIGGER: TriggerAnnotation = {
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
  secrets: ['MY_SECRET'],
};
