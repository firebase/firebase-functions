# Firebase Functions Setup Guide

This guide provides a step-by-step process for setting up a new Firebase Functions project, tailored for a coding agent.

### **Step 1: Initialize Firebase Project**

If you haven't already, initialize your Firebase project. The agent should have the `firebase-tools` CLI installed.

```bash
# One-time setup for a new project
firebase login
firebase init functions
```
During initialization, select `TypeScript`.

### **Step 2: Install Dependencies**

Navigate to the `functions` directory and install the necessary NPM packages.

```bash
cd functions
npm install
```

### **Step 3: Create a v2 HTTP Function**

Replace the contents of `src/index.ts` with the following code to create a simple, modern v2 HTTP endpoint.

```typescript
import {onRequest} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {defineString} from "firebase-functions/params";

// Define a configuration parameter for a greeting
const greeting = defineString("GREETING", {default: "Hello"});

export const helloWorld = onRequest((request, response) => {
  logger.info("Request received!", {structuredData: true});
  response.send(`${greeting.value()} from Firebase!`);
});
```

**Key points for the agent:**
*   Always import from `firebase-functions/v2/*` for new functions.
*   Use `logger` for structured logging.
*   Use `defineString`, `defineInt`, `defineSecret` for environment configuration instead of `functions.config()`.

### **Step 4: Build TypeScript**

Compile your TypeScript code to JavaScript.

```bash
npm run build
```

### **Step 5: Local Development and Testing**

Use the Firebase Emulators to test your function locally before deploying.

```bash
# Start the functions emulator
firebase emulators:start --only functions
```
The agent can then interact with the function at the local URL provided by the emulator.

### **Step 6: Deploy to Firebase**

Once testing is complete, deploy the function to your Firebase project.

```bash
# Deploy only the functions
firebase deploy --only functions
```
The agent will be prompted to set any parameters defined with `defineString` or other `define` functions that do not have a default value.
