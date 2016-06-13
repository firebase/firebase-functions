import DatabaseBuilder from './database/builder';
import FirebaseEnv from './env'
import internal from './internal'
import * as firebase from 'firebase';

// There are a few rough edges around exporting top-level properties in TypeScript.
// You can get around this with a var, but the emitted JS still uses `get property()` syntax,
// which breaks in node 0.12. This method helps bridge older JS and TypeScript.
interface FirebaseFunctions {
  database():DatabaseBuilder
  app:firebase.App
  env:FirebaseEnv
}

let functions = <FirebaseFunctions>{
  database(): DatabaseBuilder {
    return new DatabaseBuilder();
  }
};

Object.defineProperty(functions, 'app', {
  enumerable: true,
  get: () => internal.apps.admin
});

Object.defineProperty(functions, 'env', {
  enumerable: true,
  get: () => internal.env
});

export = functions;