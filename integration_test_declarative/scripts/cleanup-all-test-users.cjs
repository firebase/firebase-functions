#!/usr/bin/env node

/**
 * Cleanup script for ALL test auth users (use with caution)
 * Usage: node cleanup-all-test-users.js
 */

const admin = require("firebase-admin");

const projectId = process.env.PROJECT_ID || "functions-integration-tests";

// Initialize admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    projectId,
  });
}

async function cleanupAllTestUsers() {
  try {
    console.log("Cleaning up ALL test auth users...");
    console.log("This will delete users with emails ending in:");
    console.log("  - @beforecreate.com");
    console.log("  - @beforesignin.com");
    console.log("  - @fake-create.com");
    console.log("  - @fake-before-create.com");
    console.log("  - @fake-before-signin.com");
    console.log("  - @example.com (containing 'test')");

    // List all users and find test users
    let pageToken;
    let deletedCount = 0;

    do {
      const listUsersResult = await admin.auth().listUsers(1000, pageToken);

      for (const user of listUsersResult.users) {
        // Check if this is a test user based on email pattern
        if (user.email && (
          user.email.endsWith('@beforecreate.com') ||
          user.email.endsWith('@beforesignin.com') ||
          user.email.endsWith('@fake-create.com') ||
          user.email.endsWith('@fake-before-create.com') ||
          user.email.endsWith('@fake-before-signin.com') ||
          (user.email.includes('test') && user.email.endsWith('@example.com'))
        )) {
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

// Confirmation prompt
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Are you sure you want to delete ALL test users? (yes/no): ', (answer) => {
  if (answer.toLowerCase() === 'yes') {
    cleanupAllTestUsers().then(() => {
      rl.close();
      process.exit(0);
    });
  } else {
    console.log('Cleanup cancelled.');
    rl.close();
    process.exit(0);
  }
});