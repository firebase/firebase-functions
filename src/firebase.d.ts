declare module 'firebase' {
  export function app(name?: string): App;
  export function initializeApp(options: AppOptions, name?: string): App;

  export interface AppOptions {
    databaseURL: string;
    databaseAuthVariableOverride?: Object;
    credential?: Credential;
  }

  export interface Credential {
    getAccessToken(): PromisesAPlus.Thenable<AccessToken>;
  }

  export interface AccessToken {
    access_token: string;
    expires_in: number;
  }

  export interface App {
    database(): Database;
  }

  export interface Database {
    ref(path?: string): DatabaseReference;
  }

  export interface DatabaseReference {
    child(path?: string): DatabaseReference;
  }
}
