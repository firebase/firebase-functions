// Copied from firebase-tools/src/gcp/proto

/**
 * A type alias used to annotate interfaces as using a google.protobuf.Duration.
 * This type is parsed/encoded as a string of seconds + the "s" prefix.
 */
export type Duration = string;

/** Get a google.protobuf.Duration for a number of seconds. */
export function durationFromSeconds(s: number): Duration {
  return `${s}s`;
}

/**
 * Utility function to help copy fields from type A to B.
 * As a safety net, catches typos or fields that aren't named the same
 * in A and B, but cannot verify that both Src and Dest have the same type for the same field.
 */
export function copyIfPresent<Src, Dest>(
  dest: Dest,
  src: Src,
  ...fields: Array<keyof Src & keyof Dest>
) {
  for (const field of fields) {
    if (!Object.prototype.hasOwnProperty.call(src, field)) {
      continue;
    }
    dest[field] = src[field] as any;
  }
}

export function convertIfPresent<Src, Dest>(
  dest: Dest,
  src: Src,
  destField: keyof Dest,
  srcField: keyof Src,
  converter: (from: any) => any = (from: any) => {
    return from;
  }
) {
  if (!Object.prototype.hasOwnProperty.call(src, srcField)) {
    return;
  }
  dest[destField] = converter(src[srcField]);
}

export function serviceAccountFromShorthand(
  serviceAccount: string
): string | null {
  if (serviceAccount === 'default') {
    return null;
  } else if (serviceAccount.endsWith('@')) {
    if (!process.env.GCLOUD_PROJECT) {
      throw new Error(
        `Unable to determine email for service account '${serviceAccount}' because process.env.GCLOUD_PROJECT is not set.`
      );
    }
    return `${serviceAccount}${process.env.GCLOUD_PROJECT}.iam.gserviceaccount.com`;
  } else if (serviceAccount.includes('@')) {
    return serviceAccount;
  } else {
    throw new Error(
      `Invalid option for serviceAccount: '${serviceAccount}'. Valid options are 'default', a service account email, or '{serviceAccountName}@'`
    );
  }
}

export function convertInvoker(invoker: string | string[]): string[] {
  if (typeof invoker === 'string') {
    invoker = [invoker];
  }

  if (invoker.length === 0) {
    throw new Error('Invalid option for invoker: Must be a non-empty array.');
  }

  if (invoker.find((inv) => inv.length === 0)) {
    throw new Error('Invalid option for invoker: Must be a non-empty string.');
  }

  if (
    invoker.length > 1 &&
    invoker.find((inv) => inv === 'public' || inv === 'private')
  ) {
    throw new Error(
      "Invalid option for invoker: Cannot have 'public' or 'private' in an array of service accounts."
    );
  }

  return invoker;
}
