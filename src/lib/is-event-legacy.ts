export function isEventLegacy(event: {action: string}): boolean {
	// new events will have an action field of format "sources/.../actions/..."
  return !/sources\/[^/]+\/actions\/[^/]+/.test(event.action);
}
