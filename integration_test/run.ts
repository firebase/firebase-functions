/**
 * Bootstrap file for integration tests
 * The main logic has been refactored into src/main.ts
 */

import runIntegrationTests from "./src/main.js";
import { logger } from "./src/utils/logger.js";

// Run the integration tests
runIntegrationTests()
  .then(() => {
    logger.success("Integration tests completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("An error occurred during integration tests", error);
    process.exit(1);
  });
