import { runIntegrationTests } from "./index";

runIntegrationTests().catch((error) => {
  console.error("An error occurred during integration tests", error);
  process.exit(1);
});
