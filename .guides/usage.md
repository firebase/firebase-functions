This guide covers Firebase Functions SDK v6.0.0+.

**Key Guidelines**
*   Always use v2 functions for new development.
*   Use v1 functions *only* for Analytics, basic Auth, and Test Lab triggers.
*   For SDK versions before 6.0.0, add `/v2` to import paths (e.g., `firebase-functions/v2/https`).

**Configuration: Use Secret Params for API Keys**
For sensitive information like API keys (e.g., for LLMs, payment providers, etc.), **always** use `defineSecret`. This stores the value securely in Cloud Secret Manager.

```typescript
import {onRequest} from 'firebase-functions/v2/https';
import {logger} from 'firebase-functions/logger';
import {defineString, defineSecret} from 'firebase-functions/params';

// Securely define an LLM API key
const LLM_API_KEY = defineSecret('LLM_API_KEY');

// Example function that uses the secret
export const callLlm = onRequest({ secrets: [LLM_API_KEY] }, (req, res) => {
  const apiKey = LLM_API_KEY.value();
  
  // Use the apiKey to make a call to the LLM service
  logger.info('Calling LLM with API key.');
  
  res.send('LLM API call initiated.');
});
```
When you deploy a function with `secrets`, the CLI will prompt you to enter the secret's value.

**Initializing the Firebase Admin SDK**
To interact with Firebase services like Firestore, Auth, or RTDB from within your functions, you need to initialize the Firebase Admin SDK.

1.  **Install the SDK:**
    ```bash
    npm i firebase-admin
    ```

2.  **Initialize in your code:**
    ```typescript
    import * as admin from 'firebase-admin';

    admin.initializeApp();
    ```
    This should be done once at the top level of your `index.ts` file.

**Common Imports**
```typescript
// HTTPS, Firestore, RTDB, Scheduled, Storage, Pub/Sub, Auth, Logging, Config
import {onRequest} from 'firebase-functions/https';
import {onDocumentUpdated} from 'firebase-functions/firestore';
import {onValueWritten} from 'firebase-functions/database';
import {onSchedule} from 'firebase-functions/scheduler';
import {onObjectFinalized} from 'firebase-functions/storage';
import {onMessagePublished} from 'firebase-functions/pubsub';
import {beforeUserSignedIn} from 'firebase-functions/identity';
import {logger} from 'firebase-functions';
import {defineString, defineSecret} from 'firebase-functions/params';
```

**v1 Functions (Legacy Triggers)**
Use the `firebase-functions/v1` import for Analytics and basic Auth triggers.
```typescript
import * as functionsV1 from 'firebase-functions/v1';

// v1 Analytics trigger
export const onPurchase = functionsV1.analytics.event('purchase').onLog((event) => {
  logger.info('Purchase event', { value: event.params?.value });
});

// v1 Auth trigger
export const onUserCreate = functionsV1.auth.user().onCreate((user) => {
  logger.info('User created', { uid: user.uid });
});
```

**Development Commands**
```bash
# Install dependencies
npm install

# Compile TypeScript
npm run build

# Run emulators for local development
firebase emulators:start --only functions

# Deploy functions
firebase deploy --only functions
```
