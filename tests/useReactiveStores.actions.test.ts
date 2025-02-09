import { describe, it, test, } from "node:test";
import assert from "node:assert";
import { useReactiveStore } from '../src/ReactiveStore';

describe('Store-Actions',()=>{
  it('An action without parameter can be called', (t) => {
    const store = useReactiveStore().$extend({
      state: {
        var1: 1
      },
      actions:{
        setTo2(ctx){
          ctx.state.var1 = 2;
        },
      }
    });
  
    assert.strictEqual(store.state.var1, 1);
    store.setTo2();
    assert.strictEqual(store.state.var1, 2);
  });

  it('An action with parameter can be called', (t) => {
    const store = useReactiveStore().$extend({
      state: {
        var1: 1
      },
      actions:{
        setToNr(ctx, nr){
          ctx.state.var1 = nr;
        },
      }
    });
  
    assert.strictEqual(store.var1, 1);
    store.setToNr(3);
    assert.strictEqual(store.var1, 3);
  });
  
});