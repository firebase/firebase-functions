import { firestore } from "./firebase.server";

export const RUN_ID = String(process.env.RUN_ID);

export async function sendEvent(event: string, data: any): Promise<void> {
  await firestore.collection(RUN_ID).doc(event).set(data);
}

export function waitForEvent<T = unknown>(
  event: string,
  trigger: () => Promise<void>,
  timeoutMs: number = 60_000
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let timer: NodeJS.Timeout | null = null;
    let triggerCompleted = false;
    let snapshotData: T | null = null;
    let unsubscribe: (() => void) | null = null;

    const checkAndResolve = () => {
      if (triggerCompleted && snapshotData !== null) {
        if (timer) clearTimeout(timer);
        if (unsubscribe) unsubscribe();
        resolve(snapshotData);
      }
    };

    unsubscribe = firestore
      .collection(RUN_ID)
      .doc(event)
      .onSnapshot((snapshot) => {
        if (snapshot.exists) {
          snapshotData = snapshot.data() as T;
          checkAndResolve();
        }
      });

    timer = setTimeout(() => {
      if (unsubscribe) unsubscribe();
      reject(new Error(`Timeout waiting for event "${event}" after ${timeoutMs}ms`));
    }, timeoutMs);

    trigger()
      .then(() => {
        triggerCompleted = true;
        checkAndResolve();
      })
      .catch(reject);
  });
}
