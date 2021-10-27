// The MIT License (MIT)
//
// Copyright (c) 2021 Firebase
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
import * as url from "url";

/**
 * Dynamically load import function to prevent TypeScript from
 * transpiling into a require.
 *
 * See https://github.com/microsoft/TypeScript/issues/43329.
 */
// eslint-disable-next-line @typescript-eslint/no-implied-eval
const dynamicImport = new Function(
    'modulePath',
    'return import(modulePath)'
) as (modulePath: string) => Promise<any>;

function getFunctionModulePath(codeLocation: string): string | undefined {
    let path;
    try {
        console.log(process.cwd());
        path = require.resolve(codeLocation);
    } catch (e) {
        console.error(`Failed to resolve module at location ${codeLocation}: ${e.message}`)
    }
    return path;
}

/**
 * TODO
 * @param functionsDir
 */
export async function loadModule(functionsDir: string) {
    const functionModulePath = getFunctionModulePath(functionsDir);
    if (functionModulePath == undefined) {
        throw new Error('Provided code is not a loadable module.');
        return;
    }

    try {
        return require(functionModulePath);
    } catch (e) {
        if (e.code === 'ERR_REQUIRE_ESM') {
            const modulePath = require.resolve(functionModulePath);
            // Resolve module path to file:// URL. Required for windows support.
            const moduleURL = url.pathToFileURL(modulePath).href;
            return await dynamicImport(moduleURL);
        }
        throw e;
    }
}
