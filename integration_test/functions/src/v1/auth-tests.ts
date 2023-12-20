import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { REGION } from "../region";
import { sanitizeData } from "../utils";

export const authUserOnCreateTests: any = functions
  .region(REGION)
  .auth.user()
  .onCreate(async (user, context) => {
    const { email, displayName, uid } = user;
    try {
      const userProfile = {
        email,
        displayName,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await admin.firestore().collection("userProfiles").doc(uid).set(userProfile);

      await admin
        .firestore()
        .collection("authUserOnCreateTests")
        .doc(uid)
        .set(
          sanitizeData({
            ...context,
            metadata: JSON.stringify(user.metadata),
          })
        );
    } catch (error) {
      console.error(`Error in Auth user onCreate function for uid: ${uid}`, error);
    }
  });

export const authUserOnDeleteTests: any = functions
  .region(REGION)
  .auth.user()
  .onDelete(async (user, context) => {
    const { uid } = user;
    try {
      await admin
        .firestore()
        .collection("authUserOnDeleteTests")
        .doc(uid)
        .set(
          sanitizeData({
            ...context,
            metadata: JSON.stringify(user.metadata),
          })
        );
    } catch (error) {
      console.error(`Error in Auth user onDelete function for uid: ${uid}`, error);
    }
  });

export const authUserBeforeCreateTests: any = functions
  .region(REGION)
  .auth.user()
  .beforeCreate(async (user, context) => {
    const { uid } = user;
    try {
      await admin
        .firestore()
        .collection("authUserBeforeCreateTests")
        .doc(uid)
        .set(sanitizeData(context));
    } catch (error) {
      console.error(`Error in Auth user beforeCreate function for uid: ${uid}`, error);
    }
    return user;
  });

export const authUserBeforeSignInTests: any = functions
  .region(REGION)
  .auth.user()
  .beforeSignIn(async (user, context) => {
    const { uid } = user;
    try {
      await admin
        .firestore()
        .collection("authUserBeforeSignInTests")
        .doc(uid)
        .set(sanitizeData(context));
    } catch (error) {
      console.error(`Error in Auth user beforeSignIn function for uid: ${uid}`, error);
    }
    return user;
  });
