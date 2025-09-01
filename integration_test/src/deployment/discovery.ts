/**
 * Endpoint discovery functionality
 */

import fs from "fs";
import yaml from "js-yaml";
import portfinder from "portfinder";
import { getRuntimeDelegate } from "firebase-tools/lib/deploy/functions/runtimes/index.js";
import { detectFromPort } from "firebase-tools/lib/deploy/functions/runtimes/discovery/index.js";
import {
  ModifiedYaml,
  EndpointConfig,
  FirebaseProjectConfig,
  EnvironmentConfig,
} from "../utils/types.js";
import { logger } from "../utils/logger.js";

/**
 * Generate unique hash for function names
 */
export function generateUniqueHash(originalName: string, testRunId: string): string {
  // Function name can only contain letters, numbers and hyphens and be less than 100 chars
  const modifiedName = `${testRunId}-${originalName}`;
  if (modifiedName.length > 100) {
    throw new Error(
      `Function name is too long. Original=${originalName}, Modified=${modifiedName}`
    );
  }
  return modifiedName;
}

/**
 * Write functions.yaml file
 */
export function writeFunctionsYaml(filePath: string, data: ModifiedYaml): void {
  try {
    fs.writeFileSync(filePath, yaml.dump(data));
    logger.success(`Functions YAML written to ${filePath}`);
  } catch (err) {
    logger.error("Error writing functions.yaml", err as Error);
    throw err;
  }
}

/**
 * Discover endpoints and modify functions.yaml file
 */
export async function discoverAndModifyEndpoints(
  config: FirebaseProjectConfig,
  env: EnvironmentConfig,
  testRunId: string
): Promise<{ killServer: () => void; modifiedYaml: ModifiedYaml }> {
  logger.info("Discovering endpoints...");

  try {
    const port = await portfinder.getPortPromise({ port: 9000 });
    const delegate = await getRuntimeDelegate(config);
    const killServer = await delegate.serveAdmin(port.toString(), {}, env);

    logger.info(`Admin server started on port ${port}`);

    const originalYaml = (await detectFromPort(
      port,
      config.projectId,
      config.runtime,
      10000
    )) as ModifiedYaml;

    // Modify endpoint names with unique test run ID
    const modifiedYaml: ModifiedYaml = {
      ...originalYaml,
      endpoints: Object.fromEntries(
        Object.entries(originalYaml.endpoints).map(([key, value]) => {
          const modifiedKey = generateUniqueHash(key, testRunId);
          const modifiedValue: EndpointConfig = { ...value };
          delete modifiedValue.project;
          delete modifiedValue.runtime;
          return [modifiedKey, modifiedValue];
        })
      ),
      specVersion: "v1alpha1",
    };

    writeFunctionsYaml("./functions/functions.yaml", modifiedYaml);

    return { killServer, modifiedYaml };
  } catch (err) {
    logger.error("Error discovering endpoints", err as Error);
    throw err;
  }
}
