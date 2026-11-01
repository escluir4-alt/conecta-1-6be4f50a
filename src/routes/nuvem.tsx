import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  FileText,
  FolderPlus,
  HardDrive,
  Lock,
  Search,
  ShieldCheck,
  Unlock,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { fromBase64 } from "@/lib/cloud/crypto";
import {
  clearVaultDB,
  getEncryptedBlob,
  listFiles,
  listFolders,
  loadVaultConfig,
} from "@/lib/cloud/offline-db";
import {
  createFolderRecord,
  createFreshVault,
  decryptVaultName,
  encryptAndStoreFile,
  ensureVaultForUser,
  getRuntime,
  listVaultFiles,
  listVaultFolders,
  lockVault,
  previewSecureFile,
  uploadBatchToSupabase,
} from "@/lib/cloud/vault";
import type { CloudFile, CloudFolder, CloudVaultConfig } from "@/lib/cloud/types";

export const Route = createFileRoute("/nuvem")({
  head: () => ({
    meta: [
      { title: "Nuvem — Casa Clara" },
      { name: "description", content: "Documentos pessoais protegidos por criptografia obrigatória." },
      { property: "og:title", content: "Nuvem — Casa Clara" },
      { property: "og:description", content: "Documentos pessoais protegidos por criptografia obrigatória." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: NuvemPage,
});

function NuvemPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [user, setUser] = useState<{ email: string; name: string } | null>(null);
  const [status, setStatus] = useState<"locked" | "unlocked">("locked");
  const [password, setPassword] = useState("");
  const [vault, setVault] = useState<CloudVaultConfig | null>(null);
  const [folders, setFolders] = useState<CloudFolder[]>([]);
  const [files, setFiles] = useState<CloudFile[]>([]);
  const [displayNames, setDisplayNames] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function syncDisplayNames(nextFiles: CloudFile[]) {
    const masterKey = getRuntime().masterKey;
    if (!masterKey) {
      setDisplayNames({});
      return;
    }

    const map: Record<string, string> = {};
    for (const file of nextFiles) {
      map[file.id] = await decryptVaultName(file, masterKey);
    }
    setDisplayNames(map);
  }

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        navigate({ to: "/" });
        return;
      }

      setUser({
        email: data.user.email ?? "",
        name: (data.user.user_metadata?.["full_name"] as string) || data.user.email || "",
      });

      const existingVault = await loadVaultConfig();
      setVault(existingVault);

      const [nextFolders, nextFiles] = await Promise.all([listVaultFolders(), listVaultFiles()]);
      setFolders(nextFolders);
      setFiles(nextFiles);
      await syncDisplayNames(nextFiles);
    }

    void init();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") navigate({ to: "/", replace: true });
    });

    return () => sub.subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    void syncDisplayNames(files);
  }, [files, vault]);

  const filteredFiles = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return files;

    return files.filter((file) => {
      const value = (displayNames[file.id] ?? file.nameEnc).toLowerCase();
      return value.includes(term);
    });
  }, [files, displayNames, search]);

  async function createVault() {
    if (!user) return;

    if (password.length < 12) {
      setError("A senha da Nuvem deve ter no mínimo 12 caracteres.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const config = await createFreshVault(password, user.email);
      await ensureVaultForUser(password, user.email);
      setVault(config);
      setStatus("unlocked");
      const nextFiles = await listVaultFiles();
      setFiles(nextFiles);
      await syncDisplayNames(nextFiles);
      toast.success("Cofre da Nuvem criado com sucesso.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao criar o cofre.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function unlockVault() {
    if (!vault) {
      await createVault();
      return;
    }

    if (password.length < 12) {
      setError("A senha da Nuvem deve ter no mínimo 12 caracteres.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await ensureVaultForUser(password, user?.email ?? "");
      setStatus("unlocked");
      const nextFiles = await listVaultFiles();
      const nextFolders = await listVaultFolders();
      setFiles(nextFiles);
      setFolders(nextFolders);
      await syncDisplayNames(nextFiles);
      toast.success("Nuvem desbloqueada.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Senha incorreta ou cofre inválido.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function blockVault() {
    await lockVault();
    setStatus("locked");
    setPassword("");
    setError("");
    setDisplayNames({});
    toast.info("Cofre bloqueado.");
  }

  async function createFolder() {
    if (status === "locked") {
      toast.error("Desbloqueie a Nuvem antes de criar pastas.");
      return;
    }

    const folderName = window.prompt("Nome da pasta:");
    if (!folderName || !folderName.trim()) return;

    try {
      await createFolderRecord(folderName.trim(), null);
      setFolders(await listVaultFolders());
      toast.success("Pasta criada.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao criar a pasta.";
      toast.error(message);
    }
  }

  async function uploadFiles(fileList: File[]) {
    if (!fileList.length) return;
    if (status === "locked") {
      toast.error("Desbloqueie a Nuvem antes de enviar arquivos.");
      return;
    }

    const toRemote: Array<{ id: string; blob: Blob; path: string }> = [];

    for (const file of fileList) {
      const record = await encryptAndStoreFile(file, null);
      const encryptedBlob = await getEncryptedBlob(record.blobId);
      if (!encryptedBlob) continue;

      const ciphertextBytes = fromBase64(encryptedBlob.payload.ciphertextB64);
      const remoteBlob = new Blob([ciphertextBytes], {
        type: file.type || "application/octet-stream",
      });

      toRemote.push({
        id: record.id,
        blob: remoteBlob,
        path: `cloud/${record.id}.enc`,
      });
    }

    try {
      await uploadBatchToSupabase(toRemote);
      const nextFiles = await listVaultFiles();
      setFiles(nextFiles);
      await syncDisplayNames(nextFiles);
      toast.success(`${fileList.length} arquivos cifrados e sincronizados.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao sincronizar arquivos.";
      toast.error(message);
      setFiles(await listVaultFiles());
    }
  }

  async function downloadFile(file: CloudFile) {
    const preview = await previewSecureFile(file);
    if (!preview) {
      toast.error("Não foi possível abrir o arquivo.");
      return;
    }

    const anchor = document.createElement("a");
    anchor.href = preview.objectUrl;
    anchor.download = preview.fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    setTimeout(() => preview.cleanup(), 1500);
  }

  async function resetVault() {
    const confirmed = window.confirm("Deseja limpar o cofre local e reiniciar a Nuvem?");
    if (!confirmed) return;

    await clearVaultDB();
    setVault(null);
    setFiles([]);
    setFolders([]);
    setStatus("locked");
    setPassword("");
    setError("");
    setDisplayNames({});
    toast.success("Cofre reiniciado.");
  }

  const lockedView = status === "locked" || !vault;

  return (
    <AppShell
      active="nuvem"
      user={user}
      headerActions={
        <Button variant="outline" size="icon" aria-label="Bloquear Nuvem" onClick={blockVault}>
          <Lock className="size-4" />
        </Button>
      }
    >
      <div className="mx-auto w-full max-w-6xl p-4 md:p-8">
        <div className="rounded-3xl border bg-card p-6 shadow-soft">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">Cofre pessoal</p>
              <h1 className="mt-2 text-3xl font-extrabold">Nuvem</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Arquivos protegidos por criptografia obrigatória e armazenados em cache local cifrado.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700">
                <ShieldCheck className="size-3.5" />
                Protegido
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                <HardDrive className="size-3.5" />
                AES-256-GCM
              </span>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border bg-muted/40 p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Pastas</div>
              <div className="mt-3 text-3xl font-bold">{folders.length}</div>
            </div>
            <div className="rounded-2xl border bg-muted/40 p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Documentos</div>
              <div className="mt-3 text-3xl font-bold">{files.length}</div>
            </div>
            <div className="rounded-2xl border bg-muted/40 p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Status</div>
              <div className="mt-3 text-lg font-bold">{lockedView ? "Bloqueado" : "Desbloqueado"}</div>
            </div>
          </div>

          {lockedView ? (
            <div className="mt-8 rounded-2xl border bg-muted/20 p-6">
              <div className="mx-auto max-w-lg text-center">
                <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Lock className="size-8" />
                </div>

                <h2 className="mt-5 text-2xl font-bold">Nuvem bloqueada</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Digite a senha exclusiva do cofre para acessar seus documentos.
                </p>

                <div className="mt-6 space-y-4">
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Senha da Nuvem"
                    className="h-12"
                  />

                  <Button variant="brand" className="h-12 w-full" onClick={unlockVault} disabled={loading}>
                    <Unlock className="mr-2 size-4" />
                    {loading ? "Desbloqueando..." : vault ? "Desbloquear Nuvem" : "Criar e desbloquear Nuvem"}
                  </Button>

                  {!vault && (
                    <Button variant="outline" className="h-12 w-full" onClick={createVault} disabled={loading}>
                      Criar cofre
                    </Button>
                  )}
                </div>

                {error && (
                  <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                <div className="mt-5 text-xs text-muted-foreground">
                  A senha da Nuvem é independente da senha do Casa Clara. Nenhum valor é gravado em logs.
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-8 space-y-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative md:max-w-md md:flex-1">
                  <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Pesquisar arquivos..."
                    className="h-11 pl-9"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Button variant="outline" className="h-11" onClick={createFolder}>
                    <FolderPlus className="mr-2 size-4" />
                    Nova pasta
                  </Button>

                  <Button variant="brand" className="h-11" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="mr-2 size-4" />
                    Enviar
                  </Button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    hidden
                    multiple
                    onChange={(event) => {
                      const list = Array.from(event.target.files ?? []);
                      if (list.length > 0) {
                        void uploadFiles(list);
                      }
                      event.target.value = "";
                    }}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {folders.map((folder) => (
                  <div key={folder.id} className="rounded-2xl border bg-muted/20 p-4">
                    <div className="flex items-center gap-3">
                      <FolderPlus className="size-5 text-muted-foreground" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">{folder.nameEnc || "Pasta cifrada"}</div>
                        <div className="text-xs text-muted-foreground">{new Date(folder.createdAt).toLocaleString("pt-BR")}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border bg-card p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-bold">Arquivos recentes</h3>
                  <Button variant="ghost" size="sm" onClick={resetVault}>
                    <X className="mr-2 size-4" />
                    Reiniciar cofre
                  </Button>
                </div>

                <div className="space-y-2">
                  {filteredFiles.length === 0 ? (
                    <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                      Nenhum arquivo no cofre.
                    </div>
                  ) : (
                    filteredFiles.map((file) => {
                      const displayName = displayNames[file.id] ?? file.nameEnc;

                      return (
                        <div key={file.id} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                          <div className="flex min-w-0 items-center gap-3">
                            <FileText className="size-5 text-muted-foreground" />
                            <div className="min-w-0">
                              <div className="truncate font-medium">{displayName || "Arquivo cifrado"}</div>
                              <div className="text-xs text-muted-foreground">
                                {file.size} bytes • {new Date(file.createdAt).toLocaleString("pt-BR")}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="icon" onClick={() => downloadFile(file)} aria-label="Baixar arquivo">
                              <Download className="size-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
