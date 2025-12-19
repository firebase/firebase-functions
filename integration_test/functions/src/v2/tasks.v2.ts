import { onTaskDispatched } from "firebase-functions/v2/tasks";
import { sendEvent } from "../utils";

export const tasksOnTaskDispatchedTrigger = onTaskDispatched(
  {
    retryConfig: {
      maxAttempts: 0,
    },
  },
  async (event) => {
    await sendEvent("onTaskDispatched", {
      queueName: event.queueName,
      id: event.id,
      retryCount: event.retryCount,
      executionCount: event.executionCount,
      scheduledTime: event.scheduledTime,
      previousResponse: event.previousResponse,
      retryReason: event.retryReason,
      // headers: event.headers, // Contains some sensitive information so exclude for now
      data: event.data,
    });
  }
);
