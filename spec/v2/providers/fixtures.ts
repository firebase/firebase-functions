import { ManifestEndpoint } from '../../../src/runtime/manifest';
import { TriggerAnnotation } from "../../../src/v2/core";
import * as options from "../../../src/v2/options";
import { RESET_VALUE } from "../../../src/common/options";

export const MINIMAL_V2_ENDPOINT: ManifestEndpoint = {
  availableMemoryMb: RESET_VALUE,
  concurrency: RESET_VALUE,
  ingressSettings: RESET_VALUE,
  maxInstances: RESET_VALUE,
  minInstances: RESET_VALUE,
  serviceAccountEmail: RESET_VALUE,
  timeoutSeconds: RESET_VALUE,
  vpc: RESET_VALUE,
};

export const MINIMAL_V1_ENDPOINT: ManifestEndpoint = {
  availableMemoryMb: RESET_VALUE,
  ingressSettings: RESET_VALUE,
  maxInstances: RESET_VALUE,
  minInstances: RESET_VALUE,
  serviceAccountEmail: RESET_VALUE,
  timeoutSeconds: RESET_VALUE,
  vpc: RESET_VALUE,
};

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
    hello: "world",
  },
  secrets: ["MY_SECRET"],
};

export const FULL_TRIGGER: TriggerAnnotation = {
  platform: "gcfv2",
  regions: ["us-west1"],
  availableMemoryMb: 512,
  timeout: "60s",
  minInstances: 1,
  maxInstances: 3,
  concurrency: 20,
  vpcConnector: "aConnector",
  vpcConnectorEgressSettings: "ALL_TRAFFIC",
  serviceAccountEmail: "root@aProject.iam.gserviceaccount.com",
  ingressSettings: "ALLOW_ALL",
  labels: {
    hello: "world",
  },
  secrets: ["MY_SECRET"],
};

export const FULL_ENDPOINT: ManifestEndpoint = {
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
  cpu: 'gcf_gen1',
  labels: {
    hello: 'world',
  },
  secretEnvironmentVariables: [{ key: 'MY_SECRET' }],
};
