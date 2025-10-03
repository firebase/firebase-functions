## Key Guidelines

- Always use 2nd-gen functions for new development.
- Use v1 functions _only_ for Analytics, basic Auth, and Test Lab triggers.
- Use `firebase-functions` SDK version 6.0.0 and above
- Use top-level imports (e.g., `firebase-functions/https`). These are 2nd gen by default.

## Configuration: Use Secret Params for API Keys

For sensitive information like API keys (e.g., for LLMs, payment providers, etc.), **always** use `defineSecret`. This stores the value securely in Cloud Secret Manager.

```typescript
import { onRequest } from "firebase-functions/https";
import { logger } from "firebase-functions/logger";
import { defineString, defineSecret } from "firebase-functions/params";

// Securely define an LLM API key
const LLM_API_KEY = defineSecret("LLM_API_KEY");

// Example function that uses the secret
export const callLlm = onRequest({ secrets: [LLM_API_KEY] }, async (req, res) => {
  const apiKey = LLM_API_KEY.value();

  // Use the apiKey to make a call to the LLM service
  logger.info("Calling LLM with API key.");

  // insert code here to call LLM...

  res.send("LLM API call initiated.");
});
```

When you deploy a function with `secrets`, the CLI will prompt you to enter the secret's value.

Alternatively, you can instruct the user to set the secret using the Firebase CLI command:

firebase functions:secrets:set <NAME>

## Use the Firebase Admin SDK

To interact with Firebase services like Firestore, Auth, or RTDB from within your functions, you need to initialize the Firebase Admin SDK. Call `initializeApp` without any arguments so that Application Default Credentials are used.

1.  **Install the SDK:**

    ```bash
    npm i firebase-admin
    ```

2.  **Initialize in your code:**

    ```typescript
    import * as admin from "firebase-admin";

    admin.initializeApp();
    ```

    This should be done once at the top level of your `index.ts` file.

## Common Imports

```typescript
// HTTPS, Firestore, RTDB, Scheduled, Storage, Pub/Sub, Auth, Logging, Config
import { onRequest } from "firebase-functions/https";
import { onDocumentUpdated } from "firebase-functions/firestore";
import { onValueWritten } from "firebase-functions/database";
import { onSchedule } from "firebase-functions/scheduler";
import { onObjectFinalized } from "firebase-functions/storage";
import { onMessagePublished } from "firebase-functions/pubsub";
import { beforeUserSignedIn } from "firebase-functions/identity";
import { logger, onInit } from "firebase-functions";
import { defineString, defineSecret } from "firebase-functions/params";
```

## 1st-gen Functions (Legacy Triggers)\*\*

Use the `firebase-functions/v1` import for Analytics and basic Auth triggers. These aren't supported in 2nd gen.

```typescript
import * as functionsV1 from "firebase-functions/v1";

// v1 Analytics trigger
export const onPurchase = functionsV1.analytics.event("purchase").onLog(async (event) => {
  logger.info("Purchase event", { value: event.params?.value });
});

// v1 Auth trigger
export const onUserCreate = functionsV1.auth.user().onCreate(async (user) => {
  logger.info("User created", { uid: user.uid });
});
```

## Development Commands

````bash
# Install dependencies
npm install

# Compile TypeScript
npm run build

# Run emulators for local development
# Tell the user to run the following command to start the emulators:
```bash
firebase emulators:start --only functions
````

# Deploy functions

firebase deploy --only functions

```

```
