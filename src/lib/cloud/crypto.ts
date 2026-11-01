const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

export function toBase64(bytes: Uint8Array): string {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  return crypto.getRandomValues(new Uint8Array(length));
}

export async function generateAesKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: 256,
    },
    true,
    ["encrypt", "decrypt"]
  );
}

export async function derivePasswordKey(password: string, salt: Uint8Array, iterations = 250000): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    TEXT_ENCODER.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: new Uint8Array(salt),
      iterations,
      hash: "SHA-256",
    },
    baseKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
}

export type EncryptedPayload = {
  ivB64: string;
  ciphertextB64: string;
};

export async function encryptBytes(data: Uint8Array, key: CryptoKey): Promise<EncryptedPayload> {
  const iv = randomBytes(12);
  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      tagLength: 128,
    },
    key,
    new Uint8Array(data)
  );

  return {
    ivB64: toBase64(iv),
    ciphertextB64: toBase64(new Uint8Array(encrypted)),
  };
}

export async function decryptBytes(payload: EncryptedPayload, key: CryptoKey): Promise<Uint8Array<ArrayBuffer>> {
  const iv = fromBase64(payload.ivB64);
  const ciphertext = fromBase64(payload.ciphertextB64);

  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
      tagLength: 128,
    },
    key,
    ciphertext
  );

  return new Uint8Array(decrypted);
}

export async function wrapKeyWithMasterKey(
  keyToWrap: CryptoKey,
  masterKey: CryptoKey
): Promise<{ ivB64: string; ciphertextB64: string }> {
  const rawKey = await crypto.subtle.exportKey("raw", keyToWrap);
  const iv = randomBytes(12);

  const encrypted = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
      tagLength: 128,
    },
    masterKey,
    rawKey
  );

  return {
    ivB64: toBase64(iv),
    ciphertextB64: toBase64(new Uint8Array(encrypted)),
  };
}

export async function unwrapKeyWithMasterKey(
  wrapped: { ivB64: string; ciphertextB64: string },
  masterKey: CryptoKey
): Promise<CryptoKey> {
  const iv = fromBase64(wrapped.ivB64);
  const ciphertext = fromBase64(wrapped.ciphertextB64);

  const rawKey = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
      tagLength: 128,
    },
    masterKey,
    ciphertext
  );

  return crypto.subtle.importKey(
    "raw",
    rawKey,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function createVaultConfig(password: string, userId: string) {
  const now = new Date().toISOString();
  const salt = randomBytes(16);
  const passwordKey = await derivePasswordKey(password, salt, 250000);
  const masterKey = await generateAesKey();

  const masterIv = randomBytes(12);
  const encryptedMaster = await crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv: masterIv,
      tagLength: 128,
    },
    passwordKey,
    await crypto.subtle.exportKey("raw", masterKey)
  );

  return {
    id: crypto.randomUUID(),
    userId,
    createdAt: now,
    updatedAt: now,
    passwordPolicy: {
      minLength: 12,
      lockMinutes: 5,
      maxAttempts: 5,
    },
    kdf: {
      type: "PBKDF2",
      iterations: 250000,
      saltB64: toBase64(salt),
    },
    masterKeyWrapped: {
      ivB64: toBase64(masterIv),
      ciphertextB64: toBase64(new Uint8Array(encryptedMaster)),
    },
  } as const;
}

export async function unlockVaultConfig(config: any, password: string): Promise<CryptoKey> {
  const salt = fromBase64(config.kdf.saltB64);
  const passwordKey = await derivePasswordKey(password, salt, config.kdf.iterations ?? 250000);

  const rawMaster = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64(config.masterKeyWrapped.ivB64),
      tagLength: 128,
    },
    passwordKey,
    fromBase64(config.masterKeyWrapped.ciphertextB64)
  );

  return crypto.subtle.importKey(
    "raw",
    rawMaster,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
}

export function utf8ToBase64(value: string): string {
  return toBase64(TEXT_ENCODER.encode(value));
}

export function base64ToUtf8(value: string): string {
  return TEXT_DECODER.decode(fromBase64(value));
}

export async function fileToBytes(file: File): Promise<Uint8Array> {
  return new Uint8Array(await file.arrayBuffer());
}
