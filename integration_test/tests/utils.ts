import { CloudTasksClient } from "@google-cloud/tasks";
import * as admin from "firebase-admin";

export const timeout = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type RetryOptions = { maxRetries?: number; checkForUndefined?: boolean };

/**
 * @template T
 * @param {() => Promise<T>} fn
 * @param {RetryOptions | undefined} [options={ maxRetries: 10, checkForUndefined: true }]
 *
 * @returns {Promise<T>}
 */
export async function retry<T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> {
  let count = 0;
  let lastError: Error | undefined;
  const { maxRetries = 20, checkForUndefined = true } = options ?? {};
  let result: Awaited<T> | null = null;

  while (count < maxRetries) {
    try {
      result = await fn();
      if (!checkForUndefined || result) {
        return result;
      }
    } catch (e) {
      lastError = e as Error;
    }
    await timeout(5000);
    count++;
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error(`Max retries exceeded: result = ${result}`);
}

export async function createTask(
  project: string,
  queue: string,
  location: string,
  url: string,
  payload: Record<string, any>
): Promise<string> {
  const client = new CloudTasksClient();
  const parent = client.queuePath(project, location, queue);

  // Try to get service account email from various sources
  let serviceAccountEmail: string;

  // First, check if we have a service account file
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (serviceAccountPath && serviceAccountPath !== '{}') {
    try {
      const serviceAccount = await import(serviceAccountPath);
      serviceAccountEmail = serviceAccount.client_email;
    } catch (e) {
      // Fall back to using project default service account
      serviceAccountEmail = `${project}@appspot.gserviceaccount.com`;
    }
  } else {
    // Use project's default App Engine service account when using ADC
    // This is what Cloud Build and other Google Cloud services will use
    serviceAccountEmail = `${project}@appspot.gserviceaccount.com`;
  }

  const task = {
    httpRequest: {
      httpMethod: "POST" as const,
      url,
      oidcToken: {
        serviceAccountEmail,
      },
      headers: {
        "Content-Type": "application/json",
      },
      body: Buffer.from(JSON.stringify(payload)).toString("base64"),
    },
  };

  const [response] = await client.createTask({ parent, task });
  if (!response) {
    throw new Error("Unable to create task");
  }
  return response.name || "";
}

// TestLab utilities
const TESTING_API_SERVICE_NAME = "testing.googleapis.com";

interface AndroidDevice {
  androidModelId: string;
  androidVersionId: string;
  locale: string;
  orientation: string;
}

export async function startTestRun(projectId: string, testId: string, accessToken: string) {
  const device = await fetchDefaultDevice(accessToken);
  return await createTestMatrix(accessToken, projectId, testId, device);
}

async function fetchDefaultDevice(accessToken: string): Promise<AndroidDevice> {
  const resp = await fetch(
    `https://${TESTING_API_SERVICE_NAME}/v1/testEnvironmentCatalog/androidDeviceCatalog`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );
  if (!resp.ok) {
    throw new Error(resp.statusText);
  }
  const data = (await resp.json()) as any;
  const models = data?.androidDeviceCatalog?.models || [];
  const defaultModels = models.filter(
    (m: any) =>
      m.tags !== undefined &&
      m.tags.indexOf("default") > -1 &&
      m.supportedVersionIds !== undefined &&
      m.supportedVersionIds.length > 0
  );

  if (defaultModels.length === 0) {
    throw new Error("No default device found");
  }

  const model = defaultModels[0];
  const versions = model.supportedVersionIds;

  return {
    androidModelId: model.id,
    androidVersionId: versions[versions.length - 1],
    locale: "en",
    orientation: "portrait",
  };
}

async function createTestMatrix(
  accessToken: string,
  projectId: string,
  testId: string,
  device: AndroidDevice
): Promise<void> {
  const body = {
    projectId,
    testSpecification: {
      androidRoboTest: {
        appApk: {
          gcsPath: "gs://path/to/non-existing-app.apk",
        },
      },
    },
    environmentMatrix: {
      androidDeviceList: {
        androidDevices: [device],
      },
    },
    resultStorage: {
      googleCloudStorage: {
        gcsPath: "gs://" + admin.storage().bucket().name,
      },
    },
    clientInfo: {
      name: "CloudFunctionsSDKIntegrationTest",
      clientInfoDetails: {
        key: "testId",
        value: testId,
      },
    },
  };
  const resp = await fetch(
    `https://${TESTING_API_SERVICE_NAME}/v1/projects/${projectId}/testMatrices`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );
  if (!resp.ok) {
    throw new Error(resp.statusText);
  }
  return;
}
