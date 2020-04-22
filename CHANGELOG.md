- Adds `functions.logger` SDK to enabled structured logging in the Node.js 10 runtime. Example:

  ```js
  const functions = require('firebase-functions');

  functions.logger.debug('example log with structured data', {
    uid: user.uid,
    authorized: true,
  });
  ```

  The logger can also override default behavior of `console.*` methods through a special require:

  ```js
  require('firebase-functions/logger/compat');
  ```
