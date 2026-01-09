import { DatabaseEvent, DataSnapshot } from "firebase-functions/database";
import { Change } from "firebase-functions/v2";
import { serializeCloudEvent } from ".";
import { Reference } from "firebase-admin/database";

export function serializeDatabaseEvent(event: DatabaseEvent<unknown>, eventData: any) {
  return {
    ...serializeCloudEvent(event),
    params: event.params,
    firebaseDatabaseHost: event.firebaseDatabaseHost,
    instance: event.instance,
    ref: event.ref,
    location: event.location,
    eventData,
  };
}

export function serializeDataSnapshot(snapshot: DataSnapshot) {
  return {
    ref: serializeReference(snapshot.ref),
    key: snapshot.key,
    priority: snapshot.getPriority(),
    exists: snapshot.exists(),
    hasChildren: snapshot.hasChildren(),
    hasChild: snapshot.hasChild("noop"),
    numChildren: snapshot.numChildren(),
    json: snapshot.toJSON(),
  };
}

export function serializeReference(reference: Reference) {
  return {
    __type: "reference",
    key: reference.key,
  };
}

export function serializeChangeEvent(event: Change<DataSnapshot>): any {
  return {
    before: serializeDataSnapshot(event.before),
    after: serializeDataSnapshot(event.after),
  };
}
