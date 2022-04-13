import { REGION } from '../region';
import { setGlobalOptions } from 'firebase-functions/v2';
setGlobalOptions({ region: REGION });

export * from './https-tests';
