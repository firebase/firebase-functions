import * as options from "../../../src/v2/options";

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
