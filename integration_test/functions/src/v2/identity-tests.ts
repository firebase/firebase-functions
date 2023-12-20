import * as admin from "firebase-admin";
import { beforeUserCreated, beforeUserSignedIn } from "firebase-functions/v2/identity";

export const identityBeforeUserCreatedTests = beforeUserCreated(async (event) => {
  const { uid } = event.data;
  try {
    await admin
      .firestore()
      .collection("identityBeforeUserCreatedTests")
      .doc(uid)
      .set({
        event: JSON.stringify(event),
      });
  } catch (error) {
    console.error(`Error in identity beforeUserCreated function for uid: ${uid}`, error);
  }
  return event.data;
});

export const identityBeforeUserSignedInTests = beforeUserSignedIn(async (event) => {
  const { uid } = event.data;
  try {
    await admin
      .firestore()
      .collection("identityBeforeUserSignedInTests")
      .doc(uid)
      .set({
        event: JSON.stringify(event),
      });
  } catch (error) {
    console.error(`Error in identity beforeUserCreated function for uid: ${uid}`, error);
  }
  return event.data;
});
