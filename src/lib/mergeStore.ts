// Generischer Typ für den Store
type StoreConfig<TState, TGetters, TActions, TGlobals> = {
    state: TState;
    getters: TGetters;
    actions: TActions;
    globals: TGlobals;
};
type StoreSetup = {
    state: {},
}

type Store<TState, TFunctions> = {
    state: TState
} & TFunctions //& TActions & TGlobals;

export function mergeStore<
    OState, OFunctions,
    NState, NGetters, NActions,NGlobals
>(
    oldStore: Store<OState, OFunctions> | StoreSetup,
    newStoreConfig: StoreConfig<NState,NGetters,NActions,NGlobals>
) {
    const newStore =  {
        state: { ...oldStore.state, ...newStoreConfig.state },
        ...newStoreConfig.getters,
        ...newStoreConfig.actions,
        ...newStoreConfig.globals,
    } as Store<OState&NState,OFunctions&NGetters& NActions& NGlobals>;

    for(let key of Object.keys(oldStore)){
        newStore[key] = oldStore[key];
    }
    return newStore;
}
  
  // Funktion zur Store-Erstellung mit Extend-Funktion
  export function useStore<NState, NGetters, NActions, NGlobals>(
    storeConfig: StoreConfig<NState, NGetters, NActions, NGlobals>
  ) {
    // Initiales Store-Setup mit extend-Funktion
    const storeSetup = {
      state: {} as NState,
    };
  
    // Store wird gemergt
    const returnStore = mergeStore(storeSetup, storeConfig);
     
    return returnStore;
  }
 

  
/*
// Beispielverwendung:
const oldStore = {
    state: { count: 0 },
    getDouble() {
        return this.state.count * 2;
    },
    increment() {
        this.state.count++;
    },
};

// Neues Store-Objekt mit zusätzlichen Eigenschaften
const newStore = mergeStore(oldStore, {
    state: { user: "Max" },
    getters: {
        getUser() {
            return this.state.user;
        },
    },
     actions: {
       setUser(name: string) {
         this.state.user = name;
       },
     },
    globals: {
       version: "1.0.1",
     },
});


console.log(newStore.state); // { count: 0, user: "Max" }
console.log(newStore.getDouble()); // 0
console.log(newStore.getUser()); // "Max"
//console.log(newStore.version); // "1.0.1"
*/

const newStore = useStore({
    state: { user: "Max" },
    getters: {
        getUser() {
            return this.state.user;
        },
    },
     actions: {
       setUser(name: string) {
         this.state.user = name;
       },
     },
    globals: {
       version: "1.0.1",
     },
});

/*newStore.$extend({
    state: { user2: "Max" },
    getters: {
        getUser2() {
            return this.state.user;
        },
    },
     actions: {
       setUser2(name: string) {
         this.state.user = name;
       },
     },
    globals: {
       version2: "1.0.1",
     },
});*/