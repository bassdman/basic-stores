type Dependencies = Record<string | symbol, string[]>;
type CreateCachedStoreParam = {
    dependencies: Dependencies;
};
export declare function createCachedStore({ dependencies }?: CreateCachedStoreParam): {
    set: <T>(key: string | symbol, value: T) => void;
    isDirty: (key: string) => boolean;
    execute: {
        <R>(fn: (...args: any[]) => R, ...args: any[]): R;
        <R>(key: string, fn: (...args: any[]) => R, ...args: any[]): R;
    };
    clearCache: () => void;
    updateDependencies: (dependencies: Dependencies) => void;
};
export {};
//# sourceMappingURL=CachedStore.d.ts.map