export const ATTACHMENT_MAX_BYTES = 1_250_000;
export const ATTACHMENT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

export function validateAttachmentFile(file: File): string | null {
  if (!ATTACHMENT_TYPES.includes(file.type)) return `${file.name}: tipo não permitido (apenas PDF, JPEG, PNG ou WEBP).`;
  if (file.size > ATTACHMENT_MAX_BYTES) return `${file.name}: maior que 1.250.000 bytes.`;
  return null;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo"));
    reader.readAsDataURL(file);
  });
}
