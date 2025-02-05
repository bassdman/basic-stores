import { describe, it, test, } from "node:test";
import assert from "node:assert";
import { useReactiveStore } from '../src/ReactiveStore';

describe('Store-Getters',()=>{
  it('with only ctx as parameter returning number in declaration should return number', (t) => {
    const store = useReactiveStore().$extend({
      state: {
        var1: 1
      },
      getters:{
        double(ctx){
          return ctx.state.var1 * 2;
        },
      }
    });
  
    assert.strictEqual(store.double, 2);
  });

  it('without parameter in declaration returning number should return number', (t) => {
    const store = useReactiveStore().$extend({
      state: {
        var1: 1
      },
      getters:{
        pi(){
          return 3.1415;
        },
      }
    });
  
    assert.strictEqual(store.pi, 3.1415);
  });
  
    it('store-getter returning number with 2 parameters should return function', (t) => {
      const store = useReactiveStore().$extend({
        state: {
          var1: 1
        },
        getters:{
          sum(ctx, nr){
            return ctx.state.var1 + nr;
          },
        }
      });
      assert.strictEqual(typeof store.sum, 'function');
      assert.strictEqual(store.sum(3), 4);
    });
});