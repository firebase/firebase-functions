- Adds `serviceAccount` option to `runtimeOptions`, which lets users to specify what service account a Cloud Function should run as. For example: ```
  const functions = require('firebase-functions');

functions.runWith({
serviceAccount: 'test-sa@project.iam.gserviceaccount.com'
// OR
// serviceAcount: 'test-sa@"
// OR
// serviceAccount: 'default'
})

```
Requires firebase-tools@8.18.0 or later. Thanks @egor-miasnikov!
- Upgrades `highlight.js` to `10.4.1` to fix a vulnerability.
```
