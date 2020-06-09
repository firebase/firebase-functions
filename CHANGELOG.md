- Adds `functions.logger` SDK to enable structured logging in the Node.js 10 runtime. For example:

  ```js
  const functions = require('firebase-functions');

  functions.logger.debug('example log with structured data', {
    uid: user.uid,
    authorized: true,
  });
  ```

- Adds a special require that mimics Node.js 8 runtime logging in Node.js 10 and later runtimes:

  ```js
  require('firebase-functions/lib/logger/compat');
  ```

  In newer runtimes, requiring this will emit text logs with multi-line support and appropriate severity. In the Node.js 8 runtime, the `compat` module has no effect.

- Fixes `https.onRequest` type signature to allow Promises for `async` functions.
