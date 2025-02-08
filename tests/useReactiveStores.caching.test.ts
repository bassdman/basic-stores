import { describe, it, test, } from "node:test";
import assert from "node:assert";
import { useReactiveStore } from '../src/ReactiveStore';

describe('Store-Caching',()=>{
  it('getter-function should be not be internally called if store is just initialized',()=>{
    let count = 0;
    const store = useReactiveStore({
      state: {
        var1: 1
      },
      getters:{
        pi(){
          count++;
          return 3.1415;
        }
      }
    });
    assert.strictEqual(count, 0);
  });

  it('getter-function should be internally called once',()=>{
    let count = 0;
    const store = useReactiveStore({
      state: {
        var1: 1
      },
      getters:{
        pi(){
          count++;
          return 3.1415;
        }
      }
    });

    store.pi;
    
    assert.strictEqual(count, 1);
  });

  it('getter-function should be internally called once',()=>{
    let count = 0;
    const store = useReactiveStore({
      state: {
        var1: 1
      },
      getters:{
        sum(ctx,nr){
          count++;
          return 3.1415 + nr;
        }
      }
    });

    store.sum(3);
    assert.strictEqual(count, 1);
  });

  it('getter-function should be internally called once even if getter is called twice',()=>{
    let count = 0;
    const store = useReactiveStore({
      state: {
        var1: 1
      },
      getters:{
        pi(){
          count++;
          return 3.1415;
        }
      }
    });

    store.pi;
    store.pi
    assert.strictEqual(count, 1);
  });

  it('getter-function should be internally called before state-value changed, but not afterwards',()=>{
    let count = 0;
    const store = useReactiveStore({
      state: {
        var1: 1
      },
      actions:{
        setVar1(ctx, nr){
          ctx.var1 = nr;
        }
      },
      getters:{
        pi(){
          count++;
          return 3.1415;
        }
      }
    });

    store.pi;
    store.pi;
    store.setVar1(5);
    store.pi;
    store.pi;
    store.pi;
    assert.strictEqual(count, 1);
  });
});