const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

function loadIdempotency() {
  const filename = path.join(__dirname, '..', 'src', 'app', 'core', 'idempotency.ts');
  const source = fs.readFileSync(filename, 'utf8');
  const compiled = source
    .replace(/export type[\s\S]+?;\r?\n\r?\n/, '')
    .replace(/: number/g, '')
    .replace(/: boolean/g, '')
    .replace(/source: CryptoSource \| undefined/g, 'source')
    .replace(/key\?: string/g, 'key')
    .replace(/source\?: CryptoSource/g, 'source')
    .replace(/\): string/g, ')')
    .replace(/\): Record<string, string>/g, ')')
    .replace(/export class (\w+)/g, 'class $1')
    .replace(/export function (\w+)/g, 'function $1')
    .concat('\nmodule.exports = { generateUuidV4, idempotencyHeaders, SecureRandomUnavailableError };');
  const module = { exports: {} };
  new Function('exports', 'require', 'module', '__filename', '__dirname', compiled)(module.exports, require, module, filename, path.dirname(filename));
  return module.exports;
}

const { generateUuidV4, idempotencyHeaders, SecureRandomUnavailableError } = loadIdempotency();
const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

test('genera UUID v4 válido con randomUUID cuando está disponible', () => {
  const uuid = generateUuidV4({ randomUUID: () => '123e4567-e89b-42d3-a456-426614174000' });
  assert.match(uuid, uuidV4);
});

test('genera UUID v4 con getRandomValues cuando randomUUID no está disponible', () => {
  const uuid = generateUuidV4({ getRandomValues: bytes => bytes.fill(0) });
  assert.match(uuid, uuidV4);
  assert.equal(uuid, '00000000-0000-4000-8000-000000000000');
});

test('las claves generadas son distintas para operaciones distintas', () => {
  let value = 0;
  const source = { getRandomValues: bytes => { for (let index = 0; index < bytes.length; index += 1) bytes[index] = value + index; value += 16; return bytes; } };
  assert.notEqual(generateUuidV4(source), generateUuidV4(source));
});

test('falla de forma controlada sin una fuente criptográfica segura', () => {
  assert.throws(() => generateUuidV4({}), SecureRandomUnavailableError);
  assert.throws(() => idempotencyHeaders(true, undefined, {}), SecureRandomUnavailableError);
});

test('agrega Idempotency-Key solo a solicitudes idempotentes y permite reutilizar una clave de reintento', () => {
  assert.deepEqual(idempotencyHeaders(false), {});
  assert.deepEqual(idempotencyHeaders(true, 'retry-key'), { 'Idempotency-Key': 'retry-key' });
  assert.match(idempotencyHeaders(true, undefined, { getRandomValues: bytes => bytes.fill(1) })['Idempotency-Key'], uuidV4);
});
