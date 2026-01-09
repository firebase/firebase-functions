import { CloudEvent } from "firebase-functions";
import { EventContext } from "firebase-functions/v1";

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

// v1
export function serializeEventContext(ctx: EventContext): any {
  return {
    auth: ctx.auth,
    authType: ctx.authType,
    eventId: ctx.eventId,
    eventType: ctx.eventType,
    params: ctx.params,
    resource: ctx.resource,
    timestamp: ctx.timestamp,
  };
}
