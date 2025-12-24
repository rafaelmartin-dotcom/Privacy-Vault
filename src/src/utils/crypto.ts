export function generateNineDigitKey(): number {
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  return 100000000 + (buffer[0] % 900000000);
}

export function encryptWithKey(plaintext: string, key: number): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);
  const keyBytes = keyToBytes(key);
  const encrypted = new Uint8Array(data.length);

  for (let i = 0; i < data.length; i += 1) {
    encrypted[i] = data[i] ^ keyBytes[i % keyBytes.length];
  }

  return `0x${bytesToHex(encrypted)}`;
}

export function decryptWithKey(ciphertext: string, key: number): string {
  const bytes = hexToBytes(ciphertext);
  const keyBytes = keyToBytes(key);
  const decrypted = new Uint8Array(bytes.length);

  for (let i = 0; i < bytes.length; i += 1) {
    decrypted[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
  }

  return new TextDecoder().decode(decrypted);
}

function keyToBytes(key: number): Uint8Array {
  const normalized = key >>> 0;
  return new Uint8Array([
    (normalized >>> 24) & 0xff,
    (normalized >>> 16) & 0xff,
    (normalized >>> 8) & 0xff,
    normalized & 0xff,
  ]);
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (normalized.length === 0) {
    return new Uint8Array(0);
  }

  const length = normalized.length / 2;
  const result = new Uint8Array(length);

  for (let i = 0; i < length; i += 1) {
    const start = i * 2;
    result[i] = parseInt(normalized.slice(start, start + 2), 16);
  }

  return result;
}
