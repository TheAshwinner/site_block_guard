import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPin, verifyPin } from '../src/pin.js';
import { config } from '../src/config.js';

test('hash is deterministic, hex, and not the plaintext PIN', async () => {
  const h1 = await hashPin('1234', 'salt');
  const h2 = await hashPin('1234', 'salt');
  assert.equal(h1, h2);
  assert.match(h1, /^[0-9a-f]{64}$/);
  assert.notEqual(h1, '1234');
});

test('salt changes the hash', async () => {
  const a = await hashPin('1234', 'saltA');
  const b = await hashPin('1234', 'saltB');
  assert.notEqual(a, b);
});

test('verifyPin: correct vs incorrect', async () => {
  const salt = 'abc';
  const hash = await hashPin('987654', salt);
  assert.equal(await verifyPin('987654', salt, hash), true);
  assert.equal(await verifyPin('987655', salt, hash), false);
  assert.equal(await verifyPin('', salt, hash), false);
});

test('config default PIN (246813) verifies against the stored hash', async () => {
  assert.equal(await verifyPin('246813', config.pin.salt, config.pin.hash), true);
  assert.equal(await verifyPin('000000', config.pin.salt, config.pin.hash), false);
});
