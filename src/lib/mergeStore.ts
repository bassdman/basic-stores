// Generischer Typ für den Store
type StoreConfig<TState, TGetters, /*TActions, TGlobals*/> = {
    state: TState;
    getters: TGetters;
    // actions: TActions;
    // globals: TGlobals;
};

type Store<TState, TGetters, /*TActions, TGlobals*/> = {
    state: TState
} & TGetters //& TActions & TGlobals;

// Merge-Funktion mit generischen Typen
function mergeStore<
    OState, OGetters, //OActions, OGlobals, // Alter Store
    NState, NGetters, //NActions, NGlobals  // Neuer Store
>(
    oldStore: Store<OState, OGetters /*OActions, OGlobals*/>,
    newStoreConfig: {
        state: NState;
        getters: NGetters;
        //     actions: NActions;
        //     globals: NGlobals;
    }
) {
    const newStore =  {
        state: { ...oldStore.state, ...newStoreConfig.state },
         ...oldStore,
        ...newStoreConfig.getters,
        //   ...newStoreConfig.actions,
        //   ...newStoreConfig.globals,
    } as Store<OState&NState,OGetters&NGetters>;

    return newStore;
}
 

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
    /* actions: {
       setUser(name: string) {
         this.state.user = name;
       },
     },
     globals: {
       version: "1.0.1",
     },*/
});



console.log(newStore.state); // { count: 0, user: "Max" }
//  console.log(newStore.getters.getDouble()); // 0
//  console.log(newStore.getters.getUser()); // "Max"
//  console.log(newStore.globals.version); // "1.0.1"
