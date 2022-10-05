import { ManifestEndpoint } from "../src/runtime/manifest";
import { RESET_VALUE } from "../src/common/options";

export const MINIMAL_ENDPOINT: Partial<ManifestEndpoint> = {
  availableMemoryMb: RESET_VALUE,
  concurrency: RESET_VALUE,
  ingressSettings: RESET_VALUE,
  maxInstances: RESET_VALUE,
  minInstances: RESET_VALUE,
  serviceAccountEmail: RESET_VALUE,
  timeoutSeconds: RESET_VALUE,
  vpc: RESET_VALUE,
};
