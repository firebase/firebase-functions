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

import { format } from "util";

import * as logger from "../../logger";

/**
 * Logs a value thrown by user code that the SDK caught on its behalf.
 *
 * An Error is passed through so the entry carries its stack. Anything else is formatted into
 * the message, because the logger treats a trailing plain object as the structured entry and
 * replaces its message. The logger then attaches its own stack, which keeps the entry visible
 * to Error Reporting.
 * @hidden
 */
export function logUnhandledError(err: unknown): void {
  if (err instanceof Error) {
    logger.error("Unhandled error", err);
  } else {
    logger.error(format("Unhandled error", err));
  }
}
