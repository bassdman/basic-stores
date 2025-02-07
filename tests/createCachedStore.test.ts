import { describe, it, test, } from "node:test";
import assert from "node:assert";
import { createCachedStore } from '../src/CachedStore';

describe('createCachedStore', () => {
    it('should be able to be called without configuration', () => {
        const cachedStore = createCachedStore();
    });

});

describe('createCachedStore().isDirty(key)', () => {
    it('should have function isDirty', () => {
        const cachedStore = createCachedStore();
        assert.strictEqual(typeof cachedStore.isDirty, 'function');
    });

    it('should return undefined if key is not defined', () => {
        const cachedStore = createCachedStore();

        const isDirty = cachedStore.isDirty('undefinedkey');

        assert.strictEqual(isDirty, undefined);
    });

    it('should return false if key is updated before', () => {
        const cachedStore = createCachedStore();
        cachedStore.set('anykey', 'anyvalue')
        const isDirty = cachedStore.isDirty('anykey');

        assert.strictEqual(isDirty, false);
    });

    it('should return true if is first setDirty, then updated', () => {
        const cachedStore = createCachedStore();

        cachedStore.set('anykey', 'anyvalue')
        const isDirty = cachedStore.isDirty('anykey');

        assert.strictEqual(isDirty, false);
    });
});

describe('createCachedStore().update(key,value,params)', () => {
    it('should have function execute', () => {
        const cachedStore = createCachedStore();
        assert.strictEqual(typeof cachedStore.execute, 'function');
    });

    it('should return false if param1 is set true and param2 is asked', () => {
        const cachedStore = createCachedStore();

        cachedStore.set('param1', 'anyvalue')
        const isDirty = cachedStore.isDirty('param2');

        assert.strictEqual(isDirty, undefined);
    });

    it('should return true if param1 is set true and param2 is asked, when having a dependency', () => {
        const cachedStore = createCachedStore({
            dependencies: {
                param1: ['param2'],
            }
        });

        cachedStore.set('param1', 'anyvalue')

        assert.strictEqual(cachedStore.isDirty('param1'), false);
        assert.strictEqual(cachedStore.isDirty('param2'), true);
    });


    it('should handle recursive dependencies', () => {
        const cachedStore = createCachedStore({
            dependencies: {
                param1: ['param2','param3','param4'],
            }
        });

        cachedStore.set('param1', 'anyvalue')

        assert.strictEqual(cachedStore.isDirty('param1'), false);
        assert.strictEqual(cachedStore.isDirty('param2'), true);
        assert.strictEqual(cachedStore.isDirty('param3'), true);
        assert.strictEqual(cachedStore.isDirty('param4'), true);

        cachedStore.execute('param2', ()=>'anyvalue-x');

        assert.strictEqual(cachedStore.isDirty('param1'), false);
        assert.strictEqual(cachedStore.isDirty('param2'), false);
        assert.strictEqual(cachedStore.isDirty('param3'), true);
        assert.strictEqual(cachedStore.isDirty('param4'), true);
    });
});