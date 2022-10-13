### Breaking Changes

- Deprecated `allowInvalidAppCheckToken` option. Instead use
  `enforceAppCheck`.

> App Check enforcement on callable functions is disabled by default in v4.
> Requests containing invalid App Check tokens won't be denied unless you
> explicitly enable App Check enforcement using the new `enforceAppCheck` option.
> Furthermore, when enforcement is enabled, callable functions will deny
> all requests without App Check tokens.

- Dropped support for Node.js versions 8, 10, and 12.
- Dropped support for Admin SDK versions 8 and 9.
- Removed the `functions.handler` namespace.
- `DataSnapshot` passed to the Firebase Realtime Database trigger now
  matches the `DataSnapshot` returned by the Admin SDK, with null values
  removed.
- Removed `__trigger` object on function handlers.
- Reorganized source code location. This affects only apps that directly import files instead of using the recommend entry points specified in the
- Reworked the `apps` library and removed `lodash` as a runtime dependency.

### Enhancements

- Logs created with the `functions.logger` package in v2 functions
  are now annotated with each request's trace ID, making it easy to correlate
  log entries with the incoming request. Trace IDs are especially useful for
  cases where 2nd gen's concurrency feature permits a function
  to handle multiple requests at any given time. See
  [Correlate log entries](https://cloud.google.com/logging/docs/view/correlate-logs) to learn more.
- `functions.logger.error` now always outputs an error object and is included in Google Cloud Error Reporting.
- The logging severity of Auth/App Check token validation has changed from `info` to `debug` level.
- Event parameters for 2nd generation functions are now strongly typed, permitting stronger TypeScript types for matched parameters.
