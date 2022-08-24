import * as admin from 'firebase-admin';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { REGION } from '../region';
import { success, TestSuite } from '../testing';

export const schedule: any = onSchedule(
  { 
    schedule: 'every 10 hours',
    region: REGION,
  },
  async (event) => {
    const db = admin.database();
    const snap = await db
      .ref('testRuns')
      .orderByChild('timestamp')
      .limitToLast(1)
      .once('value');
    const testId = Object.keys(snap.val())[0];
    return new TestSuite('scheduler scheduleOnRun')
      .it('should trigger when the scheduler fires', () => success())
      .run(testId, null);
  }
);