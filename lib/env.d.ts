export default class FirebaseEnv {
    private _env;
    constructor(env: any);
    static loadPath(envPath: string): FirebaseEnv;
    get(path?: string, fallback?: any): any;
}
