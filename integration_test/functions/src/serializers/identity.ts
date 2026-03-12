import { AuthBlockingEvent } from "firebase-functions/identity";
import { EventContext } from "firebase-functions/v1";

// v1?
function serializeEventContext(ctx: EventContext): any {
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

export function serializeAuthBlockingEvent(event: AuthBlockingEvent): any {
  return {
    ...serializeEventContext(event),
    locale: event.locale,
    ipAddress: event.ipAddress,
    userAgent: event.userAgent,
    additionalUserInfo: event.additionalUserInfo,
    credential: event.credential,
    emailType: event.emailType,
    smsType: event.smsType,
    data: event.data,
  };
}
