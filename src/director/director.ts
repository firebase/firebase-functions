// The MIT License (MIT)
//
// Copyright (c) 2026 Firebase
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

export interface DirectorOptions{
  type?: 'upgrade' | 'downgrade';
}

/*
 * Determines whether or not a Function instance should continue executing
 * in the contect of switching over between simultaneously executing v1/v2
 * Functions.
 * 
 * The decision is based on whether the current environment is GCF v1 or v2,
 * the programmed cutoff time, and whether the migration is an upgrade or
 * downgrade.
 */
export class Director {
  private cutoff: Date;
  private options: DirectorOptions;

  constructor(Date, DirectorOptions?);
  constructor(string, DirectorOptions?);

  constructor(cutoffDate?: Date, cutoffString?: string, options?: DirectorOptions) {
    if (cutoffDate) {
      this.cutoff = cutoffDate;
    } else if (cutoffString) {
      this.cutoff = new Date(cutoffString);
    } else {
      throw Error("Director constructor called without either cutoff parameter.");
    }
    this.options = options ?? {type: 'upgrade'};
  }

  shouldProcess(): boolean {
    const isV2Env = this.isV2Env();
    const isAfterCutoff = Date.now() > this.cutoff.getTime();
    const envShouldRunAfterCutoff = (this.options.type === 'upgrade' && isV2Env) || (this.options.type === 'downgrade' && !isV2Env);
    return isAfterCutoff? envShouldRunAfterCutoff : !envShouldRunAfterCutoff;
  }

  private isV2Env(): boolean {
    return (typeof process.env.K_SERVICE !== 'undefined');
  }
}