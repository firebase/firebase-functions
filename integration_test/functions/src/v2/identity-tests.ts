import * as admin from "firebase-admin";
import { beforeUserCreated, beforeUserSignedIn } from "firebase-functions/v2/identity";

export const identityBeforeUserCreatedTests = beforeUserCreated(async (event) => {
  const { uid } = event.data;

  await admin.firestore().collection("identityBeforeUserCreatedTests").doc(uid).set({
    eventId: event.eventId,
    eventType: event.eventType,
    timestamp: event.timestamp,
    resource: event.resource,
  });

  return event.data;
});

export const identityBeforeUserSignedInTests = beforeUserSignedIn(async (event) => {
  const { uid } = event.data;
  await admin.firestore().collection("identityBeforeUserSignedInTests").doc(uid).set({
    eventId: event.eventId,
    eventType: event.eventType,
    timestamp: event.timestamp,
    resource: event.resource,
  });

  return event.data;
});
