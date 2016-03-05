// Compiled using typings@0.6.8
// Source: https://raw.githubusercontent.com/DefinitelyTyped/DefinitelyTyped/56068d3354648384ff32db20b6fcda4262856f33/promises-a-plus/promises-a-plus.d.ts
// Type definitions for promises-a-plus
// Project: http://promisesaplus.com/
// Definitions by: Igor Oleinikov <https://github.com/Igorbek>
// Definitions: https://github.com/borisyankov/DefinitelyTyped

declare module PromisesAPlus {
	interface PromiseCtor {
		<T>(resolver: (resolvePromise: (value: T) => void, rejectPromise: (reason: any) => void) => void): Thenable<T>;
	}

	interface PromiseImpl {
		new <T>(resolver: (resolvePromise: (value: T) => void, rejectPromise: (reason: any) => void) => void): Thenable<T>;
	}

	interface Thenable<T> {
		then<R>(onFulfill?: (value: T) => Thenable<R>|R, onReject?: (error: any) => Thenable<R>|R): Thenable<R>;
	}
}