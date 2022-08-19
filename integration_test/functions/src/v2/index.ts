import { setGlobalOptions } from 'firebase-functions/v2';
import { REGION } from '../region';
setGlobalOptions({ region: REGION });

export * from './https-tests';
export * from './pubsub-tests';
