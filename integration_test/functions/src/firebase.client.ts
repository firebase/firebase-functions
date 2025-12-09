import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFunctions } from "firebase/functions";
import { config } from "./config";

export const app = initializeApp(config);
export const auth = getAuth(app);
export const functions = getFunctions(app);
