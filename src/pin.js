// Pure PIN logic. Uses WebCrypto's SubtleCrypto, which is a global in both the
// extension service worker AND Node 18+, so this file is unit-testable directly.

/** Salted SHA-256 of a PIN, returned as lowercase hex. */
export async function hashPin(pin, salt) {
  const data = new TextEncoder().encode(`${salt}:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** True iff `pin` hashes (with `salt`) to `expectedHash`. Length-safe compare. */
export async function verifyPin(pin, salt, expectedHash) {
  const actual = await hashPin(pin, salt);
  if (actual.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) {
    diff |= actual.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  }
  return diff === 0;
}
