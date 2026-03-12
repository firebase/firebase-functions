import * as functions from "firebase-functions/v1";
import { sendEvent } from "../utils";

export const tasksV1OnTaskDispatchedTrigger = functions.tasks
  .taskQueue({
    retryConfig: {
      maxAttempts: 0,
    },
  })
  .onDispatch(async (data, event) => {
    await sendEvent("onTaskDispatchedV1 ", {
      queueName: event.queueName,
      id: event.id,
      retryCount: event.retryCount,
      executionCount: event.executionCount,
      scheduledTime: event.scheduledTime,
      previousResponse: event.previousResponse,
      retryReason: event.retryReason,
      // headers: event.headers, // Contains some sensitive information so exclude for now
      data,
    });
  });

export const test = {
  tasksV1OnTaskDispatchedTrigger,
};
