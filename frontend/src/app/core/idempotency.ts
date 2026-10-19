export type CryptoSource = Pick<Crypto, 'getRandomValues'> & { randomUUID?: () => string };

export class SecureRandomUnavailableError extends Error {
  constructor() {
    super('El navegador no dispone de una fuente criptográfica segura para registrar esta operación. Actualice el navegador o use una conexión compatible.');
    this.name = 'SecureRandomUnavailableError';
  }
}

const hex = (value: number) => value.toString(16).padStart(2, '0');

export function generateUuidV4(source: CryptoSource | undefined = globalThis.crypto): string {
  if (typeof source?.randomUUID === 'function') return source.randomUUID();
  if (typeof source?.getRandomValues !== 'function') throw new SecureRandomUnavailableError();

  const bytes = source.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const value = Array.from(bytes, hex).join('');
  return `${value.slice(0, 8)}-${value.slice(8, 12)}-${value.slice(12, 16)}-${value.slice(16, 20)}-${value.slice(20)}`;
}

export function idempotencyHeaders(idempotent: boolean, key?: string, source?: CryptoSource): Record<string, string> {
  return idempotent ? { 'Idempotency-Key': key ?? generateUuidV4(source) } : {};
}
