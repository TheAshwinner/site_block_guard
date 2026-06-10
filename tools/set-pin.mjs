// Usage: npm run set-pin <newpin>
// Prints a fresh salt + salted SHA-256 hash to paste into src/config.js (config.pin).
import { hashPin } from '../src/pin.js';

const pin = process.argv[2];
if (!pin) {
  console.error('Usage: npm run set-pin <newpin>');
  process.exit(1);
}

const salt = [...crypto.getRandomValues(new Uint8Array(8))]
  .map((b) => b.toString(16).padStart(2, '0'))
  .join('');
const hash = await hashPin(pin, salt);

console.log('Paste into src/config.js -> config.pin:');
console.log(`  pin: {\n    salt: '${salt}',\n    hash: '${hash}',\n  },`);
