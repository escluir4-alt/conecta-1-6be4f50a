import { supabase } from "@/integrations/supabase/client";
import {
  createVaultConfig,
  decryptBytes,
  encryptBytes,
  fileToBytes,
  generateAesKey,
  unlockVaultConfig,
  unwrapKeyWithMasterKey,
  wrapKeyWithMasterKey,
} from "./crypto";
import {
  getEncryptedBlob,
  listFiles,
  listFolders,
  loadVaultConfig,
  openDb,
  saveEncryptedBlob,
  saveFile,
  saveFolder,
  saveVaultConfig,
} from "./offline-db";
import type {
  CloudFile,
  CloudFolder,
  CloudVaultConfig,
  EncryptedBlob,
  SecurePreview,
} from "./types";

type VaultRuntime = {
  vaultConfig: CloudVaultConfig | null;
  masterKey: CryptoKey | null;
};

const runtime: VaultRuntime = {
  vaultConfig: null,
  masterKey: null,
};

function getStorageErrorMessage(error: unknown, fallback: string): string {
  const text = error instanceof Error ? error.message : String(error ?? "");
  const normalized = text.toLowerCase();

  if (normalized.includes("bucket not found") || normalized.includes("storage bucket") || normalized.includes("not found") && normalized.includes("bucket")) {
    return "Bucket 'cloud-docs' não encontrado. Crie o bucket no Supabase Storage e confirme que o nome está exatamente 'cloud-docs'.";
  }

  if (normalized.includes("row level security") || normalized.includes("policy")) {
    return "O bucket 'cloud-docs' existe, mas as políticas RLS do Supabase estão bloqueando o upload. Verifique as regras de acesso do Storage.";
  }

  return fallback;
}

export function getRuntime(): VaultRuntime {
  return runtime;
}

export async function ensureVaultForUser(password: string, userId: string) {
  const existing = await loadVaultConfig();

  if (existing && existing.userId === userId) {
    const key = await unlockVaultConfig(existing, password);
    runtime.vaultConfig = existing;
    runtime.masterKey = key;
    await clearVaultAttemptCounters();
    return { ok: true, created: false };
  }

  const config = await createFreshVault(password, userId);
  const key = await unlockVaultConfig(config, password);
  runtime.vaultConfig = config;
  runtime.masterKey = key;
  await clearVaultAttemptCounters();

  return { ok: true, created: true };
}

const ATTEMPTS_KEY = "vault-attempts";
const LAST_ATTEMPT_KEY = "vault-last-attempt";

export type VaultAttemptState = {
  count: number;
  lockedUntil: string | null;
};

export async function getVaultAttemptState(): Promise<VaultAttemptState> {
  const [count, lockedUntil] = await Promise.all([
    readIndexedValue(ATTEMPTS_KEY),
    readIndexedValue(LAST_ATTEMPT_KEY),
  ]);

  if (lockedUntil && new Date(lockedUntil).getTime() > Date.now()) {
    return { count: count ?? 0, lockedUntil };
  }

  return { count: 0, lockedUntil: null };
}

export async function registerVaultFailure(policy: {
  lockMinutes: number;
  maxAttempts: number;
}): Promise<VaultAttemptState> {
  const state = await getVaultAttemptState();
  const nextCount = (state.count || 0) + 1;

  if (nextCount >= policy.maxAttempts && !state.lockedUntil) {
    const lockedUntil = new Date(Date.now() + policy.lockMinutes * 60_000).toISOString();
    await writeIndexedValue(LAST_ATTEMPT_KEY, lockedUntil);
    return { count: nextCount, lockedUntil };
  }

  await writeIndexedValue(ATTEMPTS_KEY, nextCount);
  return { count: nextCount, lockedUntil: state.lockedUntil };
}

export async function getVaultPolicy(): Promise<{
  lockMinutes: number;
  maxAttempts: number;
} | null> {
  const config = await loadVaultConfig();
  if (!config) return null;
  return config.passwordPolicy;
}

export function isVaultLocked(state: VaultAttemptState): boolean {
  return !!state.lockedUntil && new Date(state.lockedUntil).getTime() > Date.now();
}

export async function clearVaultAttemptCounters() {
  await Promise.all([
    writeIndexedValue(ATTEMPTS_KEY, 0),
    writeIndexedValue(LAST_ATTEMPT_KEY, null),
  ]);
}

async function readIndexedValue(key: string): Promise<unknown> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_ATTEMPTS, "readonly");
    const store = tx.objectStore(STORE_ATTEMPTS);
    const request = store.get(key);
    request.onsuccess = () => resolve((request.result as { id: string; value: unknown } | undefined)?.value ?? undefined);
    request.onerror = () => reject(request.error ?? new Error("Erro ao ler estado de tentativas"));
  });
}

async function writeIndexedValue(key: string, value: unknown) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_ATTEMPTS, "readwrite");
    const store = tx.objectStore(STORE_ATTEMPTS);
    if (value === null) store.delete(key);
    else store.put({ id: key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Erro ao gravar estado de tentativas"));
  });
}

export async function createFreshVault(password: string, userId: string): Promise<CloudVaultConfig> {
  const config = await createVaultConfig(password, userId);
  await saveVaultConfig(config);
  return config;
}

export async function lockVault() {
  runtime.masterKey = null;
  runtime.vaultConfig = null;
}

export async function listVaultFolders(): Promise<CloudFolder[]> {
  return listFolders();
}

export async function listVaultFiles(): Promise<CloudFile[]> {
  return listFiles();
}

export async function createFolderRecord(name: string, parentId: string | null): Promise<CloudFolder> {
  if (!runtime.masterKey) {
    throw new Error("Cofre bloqueado.");
  }

  const id = crypto.randomUUID();
  const folderKey = await generateAesKey();
  const encryptedName = await encryptBytes(new TextEncoder().encode(name.trim()), folderKey);

  const folder: CloudFolder = {
    id,
    parentId,
    nameEnc: encryptedName.ciphertextB64,
    nameIvB64: encryptedName.ivB64,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await saveFolder(folder);
  return folder;
}

export async function encryptAndStoreFile(file: File, folderId: string | null): Promise<CloudFile> {
  if (!runtime.masterKey) {
    throw new Error("Cofre bloqueado.");
  }

  const fileId = crypto.randomUUID();
  const contentKey = await generateAesKey();
  const contentBytes = await fileToBytes(file);

  const encryptedContent = await encryptBytes(contentBytes, contentKey);
  const encryptedKey = await wrapKeyWithMasterKey(contentKey, runtime.masterKey);

  const encryptedBlob: EncryptedBlob = {
    id: fileId,
    payload: encryptedContent,
    createdAt: new Date().toISOString(),
  };

  await saveEncryptedBlob(encryptedBlob);

  const fileNameBytes = new TextEncoder().encode(file.name);
  const mimeBytes = new TextEncoder().encode(file.type || "application/octet-stream");

  const encryptedName = await encryptBytes(fileNameBytes, contentKey);
  const encryptedMime = await encryptBytes(mimeBytes, contentKey);

  const record: CloudFile = {
    id: fileId,
    folderId,
    nameEnc: encryptedName.ciphertextB64,
    nameIvB64: encryptedName.ivB64,
    mimeTypeEnc: encryptedMime.ciphertextB64,
    mimeTypeIvB64: encryptedMime.ivB64,
    size: file.size,
    blobId: fileId,
    encryptedKeyWrapped: encryptedKey,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    remotePath: null,
    isOfflineAvailable: true,
  };

  await saveFile(record);
  return record;
}

export async function uploadBatchToSupabase(files: Array<{ id: string; blob: Blob; path: string }>): Promise<void> {
  await Promise.all(
    files.map(async ({ id, blob, path }) => {
      const { error } = await supabase.storage.from("cloud-docs").upload(path, blob, {
        upsert: true,
        contentType: blob.type || "application/octet-stream",
      });

      if (error) {
        throw new Error(getStorageErrorMessage(error, `Falha ao subir arquivo ${id}: ${error.message}`));
      }
    })
  );
}

export async function saveEncryptedFileToRemote(fileRecord: CloudFile, blob: Blob): Promise<string> {
  const path = `cloud/${fileRecord.id}.enc`;

  const { data, error } = await supabase.storage.from("cloud-docs").upload(path, blob, {
    upsert: true,
    contentType: blob.type || "application/octet-stream",
  });

  if (error) {
    throw new Error(getStorageErrorMessage(error, error.message));
  }

  return data?.path ?? path;
}

export async function previewSecureFile(fileRecord: CloudFile): Promise<SecurePreview | null> {
  if (!runtime.masterKey) {
    return null;
  }

  const encryptedBlob = await getEncryptedBlob(fileRecord.blobId);
  if (!encryptedBlob) {
    return null;
  }

  const fileKey = await unwrapKeyWithMasterKey(fileRecord.encryptedKeyWrapped, runtime.masterKey);
  const decryptedContent = await decryptBytes(encryptedBlob.payload, fileKey);

  const mimeTypeBytes = await decryptBytes(
    {
      ivB64: fileRecord.mimeTypeIvB64,
      ciphertextB64: fileRecord.mimeTypeEnc,
    },
    fileKey
  );

  const fileNameBytes = await decryptBytes(
    {
      ivB64: fileRecord.nameIvB64,
      ciphertextB64: fileRecord.nameEnc,
    },
    fileKey
  );

  const mimeType = new TextDecoder().decode(mimeTypeBytes) || "application/octet-stream";
  const fileName = new TextDecoder().decode(fileNameBytes) || "arquivo-criptografado";

  const blob = new Blob([decryptedContent], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);

  return {
    objectUrl,
    mimeType,
    fileName,
    cleanup: () => URL.revokeObjectURL(objectUrl),
  };
}

export async function loadEncryptedFileForDownload(fileRecord: CloudFile): Promise<Blob | null> {
  if (!runtime.masterKey) {
    return null;
  }

  const encryptedBlob = await getEncryptedBlob(fileRecord.blobId);
  if (!encryptedBlob) {
    return null;
  }

  const fileKey = await unwrapKeyWithMasterKey(fileRecord.encryptedKeyWrapped, runtime.masterKey);
  const decryptedContent = await decryptBytes(encryptedBlob.payload, fileKey);

  const mimeTypeBytes = await decryptBytes(
    {
      ivB64: fileRecord.mimeTypeIvB64,
      ciphertextB64: fileRecord.mimeTypeEnc,
    },
    fileKey
  );

  const mimeType = new TextDecoder().decode(mimeTypeBytes) || "application/octet-stream";

  return new Blob([decryptedContent], { type: mimeType });
}

export async function decryptVaultName(value: CloudFile | CloudFolder, key: CryptoKey | null): Promise<string> {
  if (!key) {
    return "Documento cifrado";
  }

  try {
    const item = value as CloudFile & CloudFolder;
    if (!item.nameEnc || !item.nameIvB64) {
      return "Documento cifrado";
    }

    const decrypted = await decryptBytes(
      {
        ivB64: item.nameIvB64,
        ciphertextB64: item.nameEnc,
      },
      key
    );

    return new TextDecoder().decode(decrypted) || "Documento cifrado";
  } catch {
    return "Documento cifrado";
  }
}
