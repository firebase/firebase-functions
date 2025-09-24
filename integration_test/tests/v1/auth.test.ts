import * as admin from "firebase-admin";
import { initializeApp } from "firebase/app";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  getAuth,
  UserCredential,
} from "firebase/auth";
import { initializeFirebase } from "../firebaseSetup";
import { retry } from "../utils";
import { getFirebaseClientConfig } from "../firebaseClientConfig";

describe("Firebase Auth (v1)", () => {
  const userIds: string[] = [];
  const projectId = process.env.PROJECT_ID || "functions-integration-tests";
  const testId = process.env.TEST_RUN_ID;
  const deployedFunctions = process.env.DEPLOYED_FUNCTIONS?.split(",") || [];

  if (!testId) {
    throw new Error("Environment configured incorrectly.");
  }

  // Use hardcoded Firebase client config (safe to expose publicly)
  const config = getFirebaseClientConfig(projectId);

  const app = initializeApp(config);

  beforeAll(() => {
    initializeFirebase();
  });

  afterAll(async () => {
    for (const userId of userIds) {
      await admin.firestore().collection("userProfiles").doc(userId).delete();
      await admin.firestore().collection("authUserOnCreateTests").doc(userId).delete();
      await admin.firestore().collection("authUserOnDeleteTests").doc(userId).delete();
      await admin.firestore().collection("authBeforeCreateTests").doc(userId).delete();
      await admin.firestore().collection("authBeforeSignInTests").doc(userId).delete();
    }
  });

  // Only run onCreate tests if the onCreate function is deployed
  if (deployedFunctions.includes("onCreate")) {
    describe("user onCreate trigger", () => {
      let userRecord: admin.auth.UserRecord;
      let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      userRecord = await admin.auth().createUser({
        email: `${testId}@fake-create.com`,
        password: "secret",
        displayName: `${testId}`,
      });

      loggedContext = await retry(() =>
        admin
          .firestore()
          .collection("authUserOnCreateTests")
          .doc(userRecord.uid)
          .get()
          .then((logSnapshot) => logSnapshot.data())
      );

      userIds.push(userRecord.uid);
    });

    afterAll(async () => {
      await admin.auth().deleteUser(userRecord.uid);
    });

    it("should perform expected actions", async () => {
      const userProfile = await admin
        .firestore()
        .collection("userProfiles")
        .doc(userRecord.uid)
        .get();
      expect(userProfile.exists).toBeTruthy();
    });

    it("should have a project as resource", () => {
      expect(loggedContext?.resource.name).toMatch(`projects/${projectId}`);
    });

    it("should not have a path", () => {
      expect(loggedContext?.path).toBeUndefined();
    });

    it("should have the correct eventType", () => {
      expect(loggedContext?.eventType).toEqual("google.firebase.auth.user.create");
    });

    it("should have an eventId", () => {
      expect(loggedContext?.eventId).toBeDefined();
    });

    it("should have a timestamp", () => {
      expect(loggedContext?.timestamp).toBeDefined();
    });

    it("should not have auth", () => {
      expect(loggedContext?.auth).toBeUndefined();
    });

    it("should not have an action", () => {
      expect(loggedContext?.action).toBeUndefined();
    });
  });
  } else {
    describe.skip("user onCreate trigger - function not deployed", () => {});
  }

  // Only run onDelete tests if the onDelete function is deployed
  if (deployedFunctions.includes("onDelete")) {
    describe("user onDelete trigger", () => {
    let userRecord: admin.auth.UserRecord;
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      userRecord = await admin.auth().createUser({
        email: `${testId}@fake-delete.com`,
        password: "secret",
        displayName: testId,
      });
      userIds.push(userRecord.uid);

      await admin.auth().deleteUser(userRecord.uid);

      loggedContext = await retry(() =>
        admin
          .firestore()
          .collection("authUserOnDeleteTests")
          .doc(userRecord.uid)
          .get()
          .then((logSnapshot) => logSnapshot.data())
      );
    });

    it("should have the correct eventType", () => {
      expect(loggedContext?.eventType).toEqual("google.firebase.auth.user.delete");
    });

    it("should have an eventId", () => {
      expect(loggedContext?.eventId).toBeDefined();
    });

    it("should have a timestamp", () => {
      expect(loggedContext?.timestamp).toBeDefined();
    });
  });
  } else {
    describe.skip("user onDelete trigger - function not deployed", () => {});
  }

  describe("blocking beforeCreate function", () => {
    let userCredential: UserCredential;
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      if (!deployedFunctions.includes("beforeCreate")) {
        console.log("⏭️  Skipping beforeCreate tests - function not deployed in this suite");
        return;
      }

      const auth = getAuth(app);
      userCredential = await createUserWithEmailAndPassword(
        auth,
        `${testId}@beforecreate.com`,
        "secret123"
      );
      userIds.push(userCredential.user.uid);

      loggedContext = await retry(() =>
        admin
          .firestore()
          .collection("authBeforeCreateTests")
          .doc(userCredential.user.uid)
          .get()
          .then((logSnapshot) => logSnapshot.data())
      );
    });

    afterAll(async () => {
      if (userCredential?.user?.uid) {
        await admin.auth().deleteUser(userCredential.user.uid);
      }
    });

    if (deployedFunctions.includes("beforeCreate")) {
      it("should have the correct eventType", () => {
        // beforeCreate eventType can include the auth method (e.g., :password, :oauth, etc.)
        expect(loggedContext?.eventType).toMatch(
          /^providers\/cloud\.auth\/eventTypes\/user\.beforeCreate/
        );
      });

      it("should have an eventId", () => {
        expect(loggedContext?.eventId).toBeDefined();
      });

      it("should have a timestamp", () => {
        expect(loggedContext?.timestamp).toBeDefined();
      });
    } else {
      it.skip("should have the correct eventType - beforeCreate function not deployed", () => {});
      it.skip("should have an eventId - beforeCreate function not deployed", () => {});
      it.skip("should have a timestamp - beforeCreate function not deployed", () => {});
    }
  });

  describe("blocking beforeSignIn function", () => {
    let userRecord: admin.auth.UserRecord;
    let userCredential: UserCredential;
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      if (!deployedFunctions.includes("beforeSignIn")) {
        console.log("⏭️  Skipping beforeSignIn tests - function not deployed in this suite");
        return;
      }

      userRecord = await admin.auth().createUser({
        email: `${testId}@beforesignin.com`,
        password: "secret456",
        displayName: testId,
      });
      userIds.push(userRecord.uid);

      const auth = getAuth(app);
      // Fix: Use signInWithEmailAndPassword instead of createUserWithEmailAndPassword
      userCredential = await signInWithEmailAndPassword(
        auth,
        `${testId}@beforesignin.com`,
        "secret456"
      );

      loggedContext = await retry(() =>
        admin
          .firestore()
          .collection("authBeforeSignInTests")
          .doc(userRecord.uid)
          .get()
          .then((logSnapshot) => logSnapshot.data())
      );
    });

    afterAll(async () => {
      if (userRecord?.uid) {
        await admin.auth().deleteUser(userRecord.uid);
      }
    });

    if (deployedFunctions.includes("beforeSignIn")) {
      it("should have the correct eventType", () => {
        // beforeSignIn eventType can include the auth method (e.g., :password, :oauth, etc.)
        expect(loggedContext?.eventType).toMatch(
          /^providers\/cloud\.auth\/eventTypes\/user\.beforeSignIn/
        );
      });

      it("should have an eventId", () => {
        expect(loggedContext?.eventId).toBeDefined();
      });

      it("should have a timestamp", () => {
        expect(loggedContext?.timestamp).toBeDefined();
      });
    } else {
      it.skip("should have the correct eventType - beforeSignIn function not deployed", () => {});
      it.skip("should have an eventId - beforeSignIn function not deployed", () => {});
      it.skip("should have a timestamp - beforeSignIn function not deployed", () => {});
    }
  });
});
