import * as admin from "firebase-admin";
import { CloudTasksClient, protos } from "@google-cloud/tasks";
import fetch from "node-fetch";

interface AndroidDevice {
  androidModelId: string;
  androidVersionId: string;
  locale: string;
  orientation: string;
}

const TESTING_API_SERVICE_NAME = "testing.googleapis.com";

export async function startTestRun(projectId: string, testId: string, accessToken: string) {
  const device = await fetchDefaultDevice(accessToken);
  return await createTestMatrix(accessToken, projectId, testId, device);
}

async function fetchDefaultDevice(accessToken: string) {
  const resp = await fetch(
    `https://${TESTING_API_SERVICE_NAME}/v1/testEnvironmentCatalog/ANDROID`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );
  if (!resp.ok) {
    throw new Error(resp.statusText);
  }
  const data = await resp.json();
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
  } as AndroidDevice;
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

export const timeout = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function createTask(
  project: string,
  queue: string,
  location: string,
  url: string,
  payload: Record<string, any>
) {
  const client = new CloudTasksClient();
  const queuePath = client.queuePath(project, location, queue);
  // try {
  //   await client.getQueue({ name: queuePath });
  // } catch (err: any) {
  //   if (err.code === 5) {
  //     // '5' is the error code for 'not found' in Google Cloud APIs
  //     const queue = {
  //       name: queuePath,
  //     };
  //     const parent = client.locationPath(project, location);
  //     await client.createQueue({ parent, queue });
  //   } else {
  //     throw err;
  //   }
  // }

  const parent = client.queuePath(project, location, queue);
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!serviceAccountPath) {
    throw new Error("Environment configured incorrectly.");
  }
  const serviceAccount = await import(serviceAccountPath);
  const task: protos.google.cloud.tasks.v2.ITask = {
    httpRequest: {
      httpMethod: "POST",
      url,
      oidcToken: {
        serviceAccountEmail: serviceAccount.client_email,
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
}
