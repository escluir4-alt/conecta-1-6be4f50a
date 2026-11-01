import type { CloudFile, CloudFolder, CloudVaultConfig, EncryptedBlob } from "./types";

const DB_NAME = "casa-clara-cloud";
const DB_VERSION = 1;

const STORE_VAULT = "vault";
const STORE_FOLDERS = "folders";
const STORE_FILES = "files";
const STORE_BLOBS = "blobs";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STORE_VAULT)) {
        db.createObjectStore(STORE_VAULT, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(STORE_FOLDERS)) {
        db.createObjectStore(STORE_FOLDERS, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES, { keyPath: "id" });
      }

      if (!db.objectStoreNames.contains(STORE_BLOBS)) {
        db.createObjectStore(STORE_BLOBS, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Falha ao abrir IndexedDB"));
  });
}

export async function saveVaultConfig(config: CloudVaultConfig): Promise<void> {
  const db = await openDb();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_VAULT, "readwrite");
    const store = tx.objectStore(STORE_VAULT);

    store.put({ id: "vault-current", config });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Erro ao salvar vault"));
  });
}

export async function loadVaultConfig(): Promise<CloudVaultConfig | null> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_VAULT, "readonly");
    const store = tx.objectStore(STORE_VAULT);
    const request = store.get("vault-current");

    request.onsuccess = () => {
      const row = request.result as { id: string; config: CloudVaultConfig } | undefined;
      resolve(row?.config ?? null);
    };

    request.onerror = () => reject(request.error ?? new Error("Erro ao carregar vault"));
  });
}

export async function clearVaultDB(): Promise<void> {
  const db = await openDb();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([STORE_VAULT, STORE_FOLDERS, STORE_FILES, STORE_BLOBS], "readwrite");

    tx.objectStore(STORE_VAULT).clear();
    tx.objectStore(STORE_FOLDERS).clear();
    tx.objectStore(STORE_FILES).clear();
    tx.objectStore(STORE_BLOBS).clear();

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Erro ao limpar dados da nuvem"));
  });
}

export async function saveFolder(folder: CloudFolder): Promise<void> {
  const db = await openDb();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_FOLDERS, "readwrite");
    const store = tx.objectStore(STORE_FOLDERS);

    store.put(folder);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Erro ao salvar pasta"));
  });
}

export async function listFolders(): Promise<CloudFolder[]> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FOLDERS, "readonly");
    const request = tx.objectStore(STORE_FOLDERS).getAll();

    request.onsuccess = () => resolve((request.result as CloudFolder[]) ?? []);
    request.onerror = () => reject(request.error ?? new Error("Erro ao listar pastas"));
  });
}

export async function saveFile(file: CloudFile): Promise<void> {
  const db = await openDb();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, "readwrite");
    const store = tx.objectStore(STORE_FILES);

    store.put(file);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Erro ao salvar arquivo"));
  });
}

export async function listFiles(): Promise<CloudFile[]> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, "readonly");
    const request = tx.objectStore(STORE_FILES).getAll();

    request.onsuccess = () => resolve((request.result as CloudFile[]) ?? []);
    request.onerror = () => reject(request.error ?? new Error("Erro ao listar arquivos"));
  });
}

export async function saveEncryptedBlob(blob: EncryptedBlob): Promise<void> {
  const db = await openDb();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_BLOBS, "readwrite");
    const store = tx.objectStore(STORE_BLOBS);

    store.put(blob);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("Erro ao salvar blob cifrado"));
  });
}

export async function getEncryptedBlob(id: string): Promise<EncryptedBlob | null> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_BLOBS, "readonly");
    const request = tx.objectStore(STORE_BLOBS).get(id);

    request.onsuccess = () => {
      resolve((request.result as EncryptedBlob | undefined) ?? null);
    };

    request.onerror = () => reject(request.error ?? new Error("Erro ao carregar blob"));
  });
}
