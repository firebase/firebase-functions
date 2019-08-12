import * as http from 'http';
import * as https from 'https';
import * as admin from 'firebase-admin';
import * as _ from 'lodash';
import * as utils from './test-utils';

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
 */
export async function startTestRun(projectId: string, testId: string) {
  const accessToken = await admin.credential
    .applicationDefault()
    .getAccessToken();
  const device = await fetchDefaultDevice(accessToken);
  return await createTestMatrix(accessToken, projectId, testId, device);
}

async function fetchDefaultDevice(
  accessToken: admin.GoogleOAuthAccessToken
): Promise<AndroidDevice> {
  const response = await utils.makeRequest(
    requestOptions(accessToken, 'GET', '/v1/testEnvironmentCatalog/ANDROID')
  );
  const data = JSON.parse(response);
  const models = _.get(data, 'androidDeviceCatalog.models', []);
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

  return <AndroidDevice>{
    androidModelId: model.id,
    androidVersionId: versions[versions.length - 1],
    locale: 'en',
    orientation: 'portrait',
  };
}

function createTestMatrix(
  accessToken: admin.GoogleOAuthAccessToken,
  projectId: string,
  testId: string,
  device: AndroidDevice
): Promise<string> {
  const options = requestOptions(
    accessToken,
    'POST',
    '/v1/projects/' + projectId + '/testMatrices'
  );
  const body = {
    projectId: projectId,
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
  return utils.makeRequest(options, JSON.stringify(body));
}

function requestOptions(
  accessToken: admin.GoogleOAuthAccessToken,
  method: string,
  path: string
): https.RequestOptions {
  return {
    method: method,
    hostname: TESTING_API_SERVICE_NAME,
    path: path,
    headers: {
      Authorization: 'Bearer ' + accessToken.access_token,
      'Content-Type': 'application/json',
    },
  };
}
