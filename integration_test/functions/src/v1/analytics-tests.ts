import * as functions from "firebase-functions";
import { REGION } from "../region";

export const analyticsEventTests: any = functions
  .region(REGION)
  .analytics.event("in_app_purchase")
  .onLog(async () => {});
