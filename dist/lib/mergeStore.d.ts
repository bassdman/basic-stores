type StoreConfig<TState, TGetters, TActions, TGlobals> = {
    state: TState;
    getters: TGetters;
    actions: TActions;
    globals: TGlobals;
};
type StoreSetup = {
    state: {};
};
type Store<TState, TFunctions> = {
    state: TState;
} & TFunctions;
export declare function mergeStore<OState, OFunctions, NState, NGetters, NActions, NGlobals>(oldStore: Store<OState, OFunctions> | StoreSetup, newStoreConfig: StoreConfig<NState, NGetters, NActions, NGlobals>): Store<OState & NState, OFunctions & NGetters & NActions & NGlobals>;
export declare function useStore<NState, NGetters, NActions, NGlobals>(storeConfig: StoreConfig<NState, NGetters, NActions, NGlobals>): Store<NState, {
    state: NState;
} & NGetters & NActions & NGlobals>;
export {};
//# sourceMappingURL=mergeStore.d.ts.map