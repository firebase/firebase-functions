import * as admin from 'firebase-admin';
import fetch from 'node-fetch';

interface AndroidDevice {
  androidModelId: string;
  androidVersionId: string;
  locale: string;
  orientation: string;
}

const TESTING_API_SERVICE_NAME = 'testing.googleapis.com';

/**
 * Creates a new TestMatrix in Test Lab which is expected to be rejected as
 * invalid.
 *
 * @param projectId Project for which the test run will be created
 * @param testId Test id which will be encoded in client info details
 * @param accessToken accessToken to attach to requested for authentication
 */
export async function startTestRun(
  projectId: string,
  testId: string,
  accessToken: string
) {
  const device = await fetchDefaultDevice(accessToken);
  return await createTestMatrix(accessToken, projectId, testId, device);
}

async function fetchDefaultDevice(accessToken: string): Promise<AndroidDevice> {
  const resp = await fetch(
    `https://${TESTING_API_SERVICE_NAME}/v1/testEnvironmentCatalog/ANDROID`,
    {
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
    }
  );
  if (!resp.ok) {
    throw new Error(resp.statusText);
  }
  const data = await resp.json();
  const models = data?.androidDeviceCatalog?.models || [];
  const defaultModels = models.filter(
    (m) =>
      m.tags !== undefined &&
      m.tags.indexOf('default') > -1 &&
      m.supportedVersionIds !== undefined &&
      m.supportedVersionIds.length > 0
  );

  if (defaultModels.length === 0) {
    throw new Error('No default device found');
  }

  const model = defaultModels[0];
  const versions = model.supportedVersionIds;

  return {
    androidModelId: model.id,
    androidVersionId: versions[versions.length - 1],
    locale: 'en',
    orientation: 'portrait',
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
          gcsPath: 'gs://path/to/non-existing-app.apk',
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
        gcsPath: 'gs://' + admin.storage().bucket().name,
      },
    },
    clientInfo: {
      name: 'CloudFunctionsSDKIntegrationTest',
      clientInfoDetails: {
        key: 'testId',
        value: testId,
      },
    },
  };
  const resp = await fetch(
    `https://${TESTING_API_SERVICE_NAME}/v1/projects/${projectId}/testMatrices`,
    {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );
  if (!resp.ok) {
    throw new Error(resp.statusText);
  }
  return;
}
