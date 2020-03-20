- Adds support for defining max number of instances for a function. Example:

  ```
  functions.runWith({
    maxInstances: 10
  }).https.onRequest(...);
  ```

  Learn more about max instances in the [Google Cloud documentation.](https://cloud.google.com/functions/docs/max-instances)

- Fixes TypeScript build error when `package-lock.json` is present by updating dependencies (Issue #637).
