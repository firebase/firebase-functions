import * as functions from "firebase-functions/v1";
import { REGION } from "../region";

export const analyticsEventTests = functions
  .region(REGION)
  .analytics.event("in_app_purchase")
  .onLog(async () => {
    // Test function - intentionally empty
  });
