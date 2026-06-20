import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

interface EncryptedPayload {
  ciphertext: string;
  iv: string;
  authTag: string;
}

interface EncryptedBuffer {
  ciphertext: Buffer;
  iv: string;
  authTag: string;
}

@Injectable()
export class ChatCryptoService {
  readonly keyVersion = 1;
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    const configuredKey = config.get<string>("CHAT_ENCRYPTION_KEY") || config.get<string>("JWT_ACCESS_SECRET") || "development-chat-key";
    this.key = this.normalizeKey(configuredKey);
  }

  encryptText(value: string): EncryptedPayload {
    const encrypted = this.encryptBuffer(Buffer.from(value, "utf8"));
    return {
      ciphertext: encrypted.ciphertext.toString("base64"),
      iv: encrypted.iv,
      authTag: encrypted.authTag
    };
  }

  decryptText(payload: EncryptedPayload): string {
    return this.decryptBuffer({
      ciphertext: Buffer.from(payload.ciphertext, "base64"),
      iv: payload.iv,
      authTag: payload.authTag
    }).toString("utf8");
  }

  encryptFile(buffer: Buffer): EncryptedBuffer {
    return this.encryptBuffer(buffer);
  }

  decryptFile(payload: EncryptedBuffer): Buffer {
    return this.decryptBuffer(payload);
  }

  private encryptBuffer(buffer: Buffer): EncryptedBuffer {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()]);
    return {
      ciphertext,
      iv: iv.toString("base64"),
      authTag: cipher.getAuthTag().toString("base64")
    };
  }

  private decryptBuffer(payload: EncryptedBuffer): Buffer {
    const decipher = createDecipheriv("aes-256-gcm", this.key, Buffer.from(payload.iv, "base64"));
    decipher.setAuthTag(Buffer.from(payload.authTag, "base64"));
    return Buffer.concat([decipher.update(payload.ciphertext), decipher.final()]);
  }

  private normalizeKey(value: string): Buffer {
    try {
      const decoded = Buffer.from(value, "base64");
      if (decoded.length === 32) return decoded;
    } catch {
      // Fall back to hashing below.
    }
    return createHash("sha256").update(value).digest();
  }
}
