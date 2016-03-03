import FirebaseEnv from "./env";
import DatabaseBuilder from "./database/builder";

export function database() {
  return new DatabaseBuilder();
}

let _env: FirebaseEnv = FirebaseEnv.loadFromDirectory(__dirname);
export function env(): FirebaseEnv {
  return _env;
}
