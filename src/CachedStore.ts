type Dependencies = Record<string,string[]>;
type CreateCachedStoreParam = {
    dependencies: Dependencies
}

const emptyCachedStoreParam = {
    dependencies: {}
}

export function createCachedStore({dependencies={}} : CreateCachedStoreParam = emptyCachedStoreParam) {

    const cache = new Map<string, any>();
    const dirtyEntries = new Map<string,boolean>();
    let _dependencies :Dependencies = dependencies;

    function updateDependencies(dependencies: Dependencies) : void{
        _dependencies = dependencies;
    }

    function isDirty(key:string){
        const isDirty = dirtyEntries.get(key)
        return isDirty;
    }

    /**
     * Erzeugt einen eindeutigen Schlüssel basierend auf der Funktion und ihren Argumenten.
     * @param fn Die Funktion, die ausgeführt werden soll.
     * @param args Die Argumente, mit denen die Funktion aufgerufen wird.
     * @returns Ein eindeutiger String, der als Cache-Schlüssel dient.
     */
    function getCacheKey(fn: Function, args: any[]): string {
      // Verwende den Funktionsnamen (oder toString als Fallback) und die serialisierten Argumente.
      const functionId = fn.name || fn.toString();
      return `${functionId}_${JSON.stringify(args)}`;
    }
  
    // Overload-Signaturen für execute:
    function execute<R>(fn: (...args: any[]) => R, ...args: any[]): R;
    function execute<R>(key: string, fn: (...args: any[]) => R, ...args: any[]): R;
  
    /**
     * Führt eine Funktion mit den angegebenen Argumenten aus und speichert das Ergebnis im Cache.
     * Optional kann ein eigener Schlüssel als erster Parameter übergeben werden.
     *
     * Beispiel ohne eigenen Schlüssel (automatische Schlüsselgenerierung):
     *   store.execute(add, 2, 3);
     *
     * Beispiel mit eigenem Schlüssel:
     *   store.execute("meineAddition", add, 2, 3);
     *
     * @param params Entweder [fn, ...args] oder [key, fn, ...args].
     * @returns Das Ergebnis der Funktion, entweder aus dem Cache oder frisch berechnet.
     */
    function execute<R>(...params: any[]): R {
      let key: string;
      let fn: (...args: any[]) => R;
      let fnArgs: any[];
  
      // Falls der erste Parameter ein string ist, wurde ein eigener Schlüssel übergeben.
      if (typeof params[0] === "string") {
        key = params[0];
        fn = params[1];
        fnArgs = params.slice(2);
      } else {
        fn = params[0];
        fnArgs = params.slice(1);
        key = getCacheKey(fn, fnArgs);
      }
  
      if (cache.has(key) && !dirtyEntries.get(key)) {
        return cache.get(key);
      }
  
      const result = fn(...fnArgs);
      cache.set(key, result);
      dirtyEntries.set(key,false);
      return result;
    }

    function set<T>(key:string, value:T){
        cache.set(key,value);
        dirtyEntries.set(key,false);

        let dependenciesOfKey = _dependencies[key] || [];

        for(let dependency of dependenciesOfKey){
            dirtyEntries.set(dependency,true);
        }
    }
  
    /**
     * Leert den gesamten Cache.
     */
    function clearCache(): void {
      cache.clear();
      console.log("Cache geleert");
    }
  
    return {
      set,
      isDirty,
      execute,
      clearCache,
      updateDependencies
    };
  }