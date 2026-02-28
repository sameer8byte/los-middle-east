// =============================
import crypto from "crypto";

/**
 * Decrypts the AA redirect parameter `ecres` using AES-256-CBC.
 * Key material is derived from your `redirection_key` and the `resdate` value as salt.
 * NOTE: Confirm exact KDF/mode with Finduit; providers sometimes vary.
 */
export function decryptEcres(
  ecresBase64: string,
  redirectionKey: string,
  resdate: string,
) {
  // Derive key & iv with PBKDF2 (32-byte key, 16-byte IV)
  const key = crypto.pbkdf2Sync(redirectionKey, resdate, 100000, 32, "sha256");
  const iv = crypto.pbkdf2Sync(resdate, redirectionKey, 100000, 16, "sha256");

  const encrypted = Buffer.from(ecresBase64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}
