import setup from "./setup";
import { loadEnv } from "./utils";

loadEnv();

setup("node", "local", "18", "^12.0.0");
