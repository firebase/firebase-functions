import { format } from 'util';
import {
  CONSOLE_SEVERITY,
  SUPPORTS_STRUCTURED_LOGS,
  UNPATCHED_CONSOLE,
} from './common';

/** @hidden */
function patchedConsole(severity: string): (data: any, ...args: any[]) => void {
  return function(data: any, ...args: any[]): void {
    if (SUPPORTS_STRUCTURED_LOGS) {
      UNPATCHED_CONSOLE[CONSOLE_SEVERITY[severity]](
        JSON.stringify({ severity, message: format(data, ...args) })
      );
      return;
    }

    UNPATCHED_CONSOLE[CONSOLE_SEVERITY[severity]](data, ...args);
  };
}

// IMPORTANT -- "../logger" must be imported before monkeypatching!
console.debug = patchedConsole('DEBUG');
console.info = patchedConsole('INFO');
console.log = patchedConsole('INFO');
console.warn = patchedConsole('WARNING');
console.error = patchedConsole('ERROR');
