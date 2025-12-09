import { CloudEvent } from "firebase-functions";

export function serializeCloudEvent(event: CloudEvent<unknown>): any {
  return {
    specversion: event.specversion,
    id: event.id,
    source: event.source,
    subject: event.subject,
    type: event.type,
    time: event.time,
  };
}