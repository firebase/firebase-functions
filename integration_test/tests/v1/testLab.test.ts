import admin from "firebase-admin";
import { timeout } from "../utils";
import { initializeFirebase } from "../firebaseSetup";
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

describe("TestLab test matrix onComplete trigger", () => {
  const projectId = process.env.PROJECT_ID;
  const testId = process.env.TEST_RUN_ID;
  let loggedContext: admin.firestore.DocumentData | undefined;

  beforeAll(async () => {
    if (!testId || !projectId) {
      throw new Error("Environment configured incorrectly.");
    }

    await initializeFirebase();

    const accessToken = await admin.credential.applicationDefault().getAccessToken();
    await startTestRun(projectId, testId, accessToken.access_token);
    await timeout(20000);
    const logSnapshot = await admin
      .firestore()
      .collection("testLabOnCompleteTests")
      .doc(testId)
      .get();
    loggedContext = logSnapshot.data();
    if (!loggedContext) {
      throw new Error("loggedContext is undefined");
    }
  });

  it("should have eventId", () => {
    expect(loggedContext?.eventId).toBeDefined();
  });

  it("should have right eventType", () => {
    expect(loggedContext?.eventType).toEqual("google.testing.testMatrix.complete");
  });

  it("should be in state 'INVALID'", () => {
    const matrix = JSON.parse(loggedContext?.matrix);
    expect(matrix?.state).toEqual("INVALID");
  });
});

// describe("Firebase TestLab onComplete trigger", () => {
//   test("should have refs resources", async () => {
//     console.log("test");
//   });
// });
