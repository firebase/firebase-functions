import { google } from "./compiledFirestore";

/** static-complied protobufs */
const DocumentEventData = google.events.cloud.firestore.v1.DocumentEventData;
const Any = google.protobuf.Any;

export { Any, DocumentEventData };
