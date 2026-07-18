import crypto from 'crypto';
import config from '../config/pse.config';
import logger from '../utils/logger';

class EncryptionService {
  private key: Buffer;
  private iv: Buffer;
  private algorithm: string;
  private tagLength: number;
  private ivLength: number;

  constructor() {
    this.key = Buffer.from(config.encryptionKey, 'base64');
    this.iv = Buffer.from(config.encryptionIv, 'base64');
    this.algorithm = 'aes-256-gcm';
    this.tagLength = 16;
    this.ivLength = 12;

    if (this.key.length !== 32) {
      throw new Error(`PSE_ENCRYPTION_KEY debe tener 32 bytes (tiene ${this.key.length})`);
    }
    if (this.iv.length !== 12) {
      throw new Error(`PSE_ENCRYPTION_IV debe tener 12 bytes (tiene ${this.iv.length})`);
    }
  }

  encrypt(data: object | string): string {
    try {
      const message: string = typeof data === 'string' ? data : JSON.stringify(data);
      const iv: Buffer = crypto.randomBytes(this.ivLength);

      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv) as crypto.CipherGCM;
      let encrypted: string = cipher.update(message, 'utf8', 'binary');
      encrypted += cipher.final('binary');

      const tag: Buffer = cipher.getAuthTag();

      const result = Buffer.concat([
        iv,
        Buffer.from(encrypted, 'binary'),
        tag
      ]);

      return result.toString('base64');
    } catch (error) {
      logger.error('Error en encrypt:', error);
      throw new Error(`Encryption error: ${(error as Error).message}`);
    }
  }

  decrypt(encryptedBase64: string): object | string {
    try {
      const data: Buffer = Buffer.from(encryptedBase64, 'base64');

      const iv: Buffer = data.subarray(0, this.ivLength);
      const encrypted: Buffer = data.subarray(this.ivLength, -this.tagLength);
      const tag: Buffer = data.subarray(-this.tagLength);

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv) as crypto.DecipherGCM;
      decipher.setAuthTag(tag);

      let decrypted: string = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      try {
        return JSON.parse(decrypted) as object;
      } catch {
        return decrypted;
      }
    } catch (error) {
      logger.error('Error en decrypt:', error);
      throw new Error(`Decryption error: ${(error as Error).message}`);
    }
  }
}

export default new EncryptionService();
