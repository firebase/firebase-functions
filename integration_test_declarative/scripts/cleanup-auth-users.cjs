#!/usr/bin/env node

/**
 * Cleanup script for auth users created during tests
 * Usage: node cleanup-auth-users.js <TEST_RUN_ID>
 */

const admin = require("firebase-admin");

const testRunId = process.argv[2];
const projectId = process.env.PROJECT_ID || "functions-integration-tests";

if (!testRunId) {
  console.error("Usage: node cleanup-auth-users.js <TEST_RUN_ID>");
  process.exit(1);
}

// Initialize admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    projectId,
  });
}

async function cleanupAuthUsers() {
  try {
    console.log(`Cleaning up auth users with TEST_RUN_ID: ${testRunId}`);

    // List all users and find ones created by this test run
    let pageToken;
    let deletedCount = 0;

    do {
      const listUsersResult = await admin.auth().listUsers(1000, pageToken);

      for (const user of listUsersResult.users) {
        // Check if user email contains the test run ID
        if (user.email && user.email.includes(testRunId)) {
          try {
            await admin.auth().deleteUser(user.uid);
            console.log(`   Deleted user: ${user.email}`);
            deletedCount++;
          } catch (error) {
            console.error(`   Failed to delete user ${user.email}: ${error.message}`);
          }
        }
      }

      pageToken = listUsersResult.pageToken;
    } while (pageToken);

    console.log(`   Deleted ${deletedCount} test users`);
  } catch (error) {
    console.error("Error cleaning up auth users:", error);
  }
}

cleanupAuthUsers().then(() => process.exit(0));