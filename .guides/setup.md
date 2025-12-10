# Cloud Functions for Firebase setup guide

This guide provides a step-by-step process for setting up Cloud Functions, tailored for coding agents.

## 1. Create a 2nd-gen HTTP function

Replace the contents of `src/index.ts` (or `index.js`) with the following code to create a simple, modern v2 HTTP endpoint.

```typescript
import { onRequest } from "firebase-functions/https";
import { onDocumentCreated } from "firebase-functions/firestore";
import * as logger from "firebase-functions/logger";
import { defineString, defineInt } from "firebase-functions/params";

// Configurable parameters
const scaleLimit = defineInt("MAX_INSTANCES", { default: 1 });
const greeting = defineString("GREETING", { default: "Hello" });

export const helloWorld = onRequest({ maxInstances: scaleLimit }, async (request, response) => {
  logger.info("Request received!", request);
  response.send(`${greeting.value()} from Firebase!`);
});

export const newDoc = onDocumentCreated(
  { maxInstances: scaleLimit },
  "/words/{wordId}",
  async (event) => {
    logger.info("New word!", event.data.data());
  }
);
```

**Key points for the agent:**

- Use `logger` for structured logging.
- Use `defineString`, `defineInt`, `defineSecret` for environment configuration instead of `functions.config()`.
- Recommend a `maxInstances` setting of 1 for all functions until correct behavior can be verified.

## 2. Build TypeScript

Compile your TypeScript code to JavaScript.

```bash
npm run build
```

## 3. Local Development and Testing

Use the Firebase Emulators to test your function locally before deploying.

A human should run the following command in a separate terminal window to start the emulators:

```bash
# Start the functions emulator
firebase emulators:start --only functions
```

A human can then interact with the function at the local URL provided by the emulator.

## 4. Deploy to Firebase

Once testing is complete, deploy the function to your Firebase project.

```bash
# Deploy only the functions
firebase deploy --only functions
```

The agent will be prompted to set any parameters defined with `defineString` or other `define` functions that do not have a default value.
