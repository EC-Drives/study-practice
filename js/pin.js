// Parent PIN. The PIN is never stored: only a salted PBKDF2-SHA-256 hash made with the browser's
// Web Crypto. This is a light lock that keeps the parent area out of casual reach. It is not real
// security: anyone with the device and some know-how can read or clear the browser's storage.

export const PIN_ITERATIONS = 150000;

const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export function validPin(pin) {
  return typeof pin === 'string' && /^\d{4,8}$/.test(pin);
}

async function derive(pin, salt, iterations) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
}

/** Returns the record to store: { v, salt, hash, iterations }. */
export async function hashPin(pin, iterations = PIN_ITERATIONS) {
  if (!validPin(pin)) throw new Error('The PIN must be 4 to 8 digits.');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await derive(pin, salt, iterations);
  return { v: 1, salt: b64(salt), hash: b64(bits), iterations };
}

export async function verifyPin(pin, record) {
  if (!record || !validPin(pin)) return false;
  const bits = new Uint8Array(await derive(pin, unb64(record.salt), record.iterations));
  const want = unb64(record.hash);
  if (bits.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < bits.length; i++) diff |= bits[i] ^ want[i];
  return diff === 0;
}

/** Slows down guessing: after 5 wrong tries, wait 30 s, doubling each further miss (max 10 min). */
export function lockoutSeconds(failures) {
  if (failures < 5) return 0;
  return Math.min(600, 30 * 2 ** (failures - 5));
}
