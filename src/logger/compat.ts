import { debug, info, warn, error } from '../logger';

// IMPORTANT -- "../logger" must be imported before monkeypatching!
console.debug = debug;
console.info = info;
console.log = info;
console.warn = warn;
console.error = error;
