// The MIT License (MIT)
//
// Copyright (c) 2017 Firebase
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { format } from 'util';
import { CONSOLE_SEVERITY, UNPATCHED_CONSOLE } from './common';

/** @hidden */
function patchedConsole(severity: string): (data: any, ...args: any[]) => void {
  return function(data: any, ...args: any[]): void {
    let message = format(data, ...args);
    if (severity === 'ERROR') {
      message = new Error(message).stack || message;
    }

    UNPATCHED_CONSOLE[CONSOLE_SEVERITY[severity]](
      JSON.stringify({ severity, message })
    );
  };
}

// IMPORTANT -- "../logger" must be imported before monkeypatching!
console.debug = patchedConsole('DEBUG');
console.info = patchedConsole('INFO');
console.log = patchedConsole('INFO');
console.warn = patchedConsole('WARNING');
console.error = patchedConsole('ERROR');
