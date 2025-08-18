import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { REGION } from "../region";
import { sanitizeData } from "../utils";

export const authUserOnCreateTests: any = functions
  .region(REGION)
  .auth.user()
  .onCreate(async (user, context) => {
    const { email, displayName, uid } = user;
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
  });

export const authUserOnDeleteTests: any = functions
  .region(REGION)
  .auth.user()
  .onDelete(async (user, context) => {
    const { uid } = user;
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
  });

export const authUserBeforeCreateTests: any = functions
  .region(REGION)
  .auth.user()
  .beforeCreate(async (user, context) => {
    await admin.firestore().collection("authBeforeCreateTests").doc(user.uid).set({
      eventId: context.eventId,
      eventType: context.eventType,
      timestamp: context.timestamp,
      resource: context.resource,
    });

    return user;
  });

export const authUserBeforeSignInTests: any = functions
  .region(REGION)
  .auth.user()
  .beforeSignIn(async (user, context) => {
    await admin.firestore().collection("authBeforeSignInTests").doc(user.uid).set({
      eventId: context.eventId,
      eventType: context.eventType,
      timestamp: context.timestamp,
      resource: context.resource,
    });

    return user;
  });
