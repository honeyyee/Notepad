import test from 'node:test';
import assert from 'node:assert/strict';
import { createOwnerToken, saveOwnerToken, getOwnerToken, forgetOwnerToken } from '../src/noteOwnership.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: key => values.delete(key)
  };
}

test('creates a cryptographically random 256-bit token', () => {
  const cryptoStub = { getRandomValues(bytes) { bytes.fill(15); return bytes; } };
  const token = createOwnerToken(cryptoStub);
  assert.equal(token.length, 64);
  assert.match(token, /^[0-9a-f]{64}$/);
});

test('stores, reads, and removes an owner token per note', () => {
  const storage = memoryStorage();
  saveOwnerToken('note-1', 'secret-1', storage);
  saveOwnerToken('note-2', 'secret-2', storage);
  assert.equal(getOwnerToken('note-1', storage), 'secret-1');
  forgetOwnerToken('note-1', storage);
  assert.equal(getOwnerToken('note-1', storage), null);
  assert.equal(getOwnerToken('note-2', storage), 'secret-2');
});

test('does not generate a token when secure randomness is unavailable', () => {
  assert.throws(() => createOwnerToken({}), /Secure random/);
});
