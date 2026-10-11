import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { localStorageAdapter, memoryAdapter } from '../src/storage.js';

afterEach(() => {
  delete globalThis.localStorage;
});

const fakeStorage = () => {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
  };
};

test('memoryAdapter：寫咗就讀到，初始值可以預設', () => {
  const storage = memoryAdapter('a');
  assert.equal(storage.read(), 'a');
  storage.write('b');
  assert.equal(storage.read(), 'b');
  assert.equal(memoryAdapter().read(), null);
});

test('localStorageAdapter：按 key 讀寫', () => {
  globalThis.localStorage = fakeStorage();
  const progress = localStorageAdapter('progress');
  const speed = localStorageAdapter('speed');
  assert.equal(progress.read(), null);
  progress.write('x');
  speed.write('y');
  assert.equal(progress.read(), 'x');
  assert.equal(speed.read(), 'y');
});

test('localStorageAdapter：私隱模式等情況存唔到或者讀唔到，都唔會報錯', () => {
  globalThis.localStorage = {
    getItem: () => {
      throw new Error('blocked');
    },
    setItem: () => {
      throw new Error('blocked');
    },
  };
  const storage = localStorageAdapter('progress');
  assert.equal(storage.read(), null);
  assert.doesNotThrow(() => storage.write('x'));
});
