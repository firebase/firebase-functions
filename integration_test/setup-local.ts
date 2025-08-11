import setup from "./setup";
import * as dotenv from "dotenv";

dotenv.config();

setup("node", "local", "18", "^12.0.0");
