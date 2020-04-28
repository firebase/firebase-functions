- Adds `functions.logger` SDK to enable structured logging in the Node.js 10 runtime. For example:

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

  In older runtimes, logger prints to the console, and no structured data is saved.
