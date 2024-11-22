import { setGlobalOptions } from "firebase-functions/v2";
import { REGION } from "../region";
setGlobalOptions({ region: REGION });

// TODO: Temporarily disable - doesn't work unless running on projects w/ permission to create public functions.
export * from "./https-tests";
export * from "./scheduled-tests";
