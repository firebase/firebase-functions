import { debug, info, warn, error } from '../logger';

console.debug = debug;
console.info = info;
console.log = info;
console.warn = warn;
console.error = error;
