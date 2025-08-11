import fs from "fs";
import yaml from "js-yaml";
import portfinder from "portfinder";
import { getRuntimeDelegate } from "firebase-tools/lib/deploy/functions/runtimes/index.js";
import { detectFromPort } from "firebase-tools/lib/deploy/functions/runtimes/discovery/index.js";
import { logError, logDeployment } from "./logger.js";
import { TestConfig } from "./config.js";

export interface EndpointConfig {
  project?: string;
  runtime?: string;
  [key: string]: unknown;
}

export interface ModifiedYaml {
  endpoints: Record<string, EndpointConfig>;
  specVersion: string;
}

export function generateUniqueHash(originalName: string, testRunId: string): string {
  // Function name can only contain letters, numbers and hyphens and be less than 100 chars.
  const modifiedName = `${testRunId}-${originalName}`;
  if (modifiedName.length > 100) {
    throw new Error(
      `Function name is too long. Original=${originalName}, Modified=${modifiedName}`
    );
  }
  return modifiedName;
}

export function writeFunctionsYaml(filePath: string, data: any): void {
  try {
    fs.writeFileSync(filePath, yaml.dump(data));
  } catch (err) {
    logError("Error writing functions.yaml. Exiting.", err as Error);
    process.exit(1);
  }
}

/**
 * Discovers endpoints and modifies functions.yaml file.
 * @returns A promise that resolves with a function to kill the server.
 */
export async function discoverAndModifyEndpoints(
  config: TestConfig,
  firebaseConfig: any,
  env: any
): Promise<{ killServer: () => void; modifiedYaml: ModifiedYaml }> {
  logDeployment("Discovering endpoints...");
  try {
    const port = await portfinder.getPortPromise({ port: 9000 });
    const delegate = await getRuntimeDelegate(firebaseConfig);
    const killServer = await delegate.serveAdmin(port.toString(), {}, env);

    console.log("Started on port", port);
    const originalYaml = (await detectFromPort(
      port,
      firebaseConfig.projectId,
      firebaseConfig.runtime,
      10000
    )) as ModifiedYaml;

    const modifiedYaml: ModifiedYaml = {
      ...originalYaml,
      endpoints: Object.fromEntries(
        Object.entries(originalYaml.endpoints).map(([key, value]) => {
          const modifiedKey = generateUniqueHash(key, config.testRunId);
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
    logError("Error discovering endpoints. Exiting.", err as Error);
    process.exit(1);
  }
}

export async function deployModifiedFunctions(
  client: any,
  modifiedYaml: ModifiedYaml,
  testRunId: string
): Promise<void> {
  logDeployment(`Deploying functions with id: ${testRunId}`);
  try {
    // Get the function names that will be deployed
    const functionNames = Object.keys(modifiedYaml.endpoints);

    // Import deployFunctionsWithRetry from deployment-utils
    const { deployFunctionsWithRetry } = await import("../deployment-utils.js");

    // Deploy with rate limiting and retry logic
    await deployFunctionsWithRetry(client, functionNames);

    logDeployment("Functions have been deployed successfully.");
  } catch (err) {
    logError("Error deploying functions. Exiting.", err as Error);
    throw err;
  }
}
