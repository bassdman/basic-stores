export declare function createRecursiveProxy(target: any, handler: any): any;
interface EventEmitterInterface<T extends Record<string, (...args: any[]) => any>> {
    on<K extends keyof T>(event: K, listener: T[K]): void;
    emit<K extends keyof T>(event: K, ...args: Parameters<T[K]>): ReturnType<T[K]> | void;
}
export declare function mergeEmitters<T extends Record<string, (...args: any[]) => any>>(emitterA: EventEmitterInterface<T>, emitterB: EventEmitterInterface<T>): EventEmitterInterface<T>;
export {};
//# sourceMappingURL=lib.d.ts.map