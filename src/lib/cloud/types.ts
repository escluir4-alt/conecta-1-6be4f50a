export type CloudVaultConfig = {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
  passwordPolicy: {
    minLength: number;
    lockMinutes: number;
    maxAttempts: number;
  };
  kdf: {
    type: "PBKDF2";
    iterations: number;
    saltB64: string;
  };
  masterKeyWrapped: {
    ivB64: string;
    ciphertextB64: string;
  };
};

export type CloudFolder = {
  id: string;
  parentId: string | null;
  nameEnc: string;
  nameIvB64: string;
  createdAt: string;
  updatedAt: string;
};

export type CloudFile = {
  id: string;
  folderId: string | null;
  nameEnc: string;
  nameIvB64: string;
  mimeTypeEnc: string;
  mimeTypeIvB64: string;
  size: number;
  blobId: string;
  encryptedKeyWrapped: {
    ivB64: string;
    ciphertextB64: string;
  };
  createdAt: string;
  updatedAt: string;
  remotePath?: string | null;
  isOfflineAvailable: boolean;
};

export type EncryptedBlob = {
  id: string;
  payload: {
    ivB64: string;
    ciphertextB64: string;
  };
  createdAt: string;
};

export type SecurePreview = {
  objectUrl: string;
  mimeType: string;
  fileName: string;
  cleanup: () => void;
};
