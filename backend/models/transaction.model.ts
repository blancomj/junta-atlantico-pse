import crypto from 'crypto';
import config from '../config/pse.config';
import logger from '../utils/logger';
import { TransactionRecord, TransactionState } from '../../shared/types/transaction';

class TransactionModel {
  private restKey: Buffer;
  private algorithm: string;

  constructor() {
    this.restKey = Buffer.from(
      process.env.DB_ENCRYPTION_KEY || config.encryptionKey,
      'base64'
    );
    this.algorithm = 'aes-256-gcm';
  }

  encrypt(value: string | number | null): string | null {
    if (value === null || value === undefined) return null;
    const iv: Buffer = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, this.restKey, iv) as crypto.CipherGCM;
    let encrypted: string = cipher.update(String(value), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag: Buffer = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  }

  decrypt(encryptedValue: string | null): string | null {
    if (!encryptedValue) return null;
    try {
      const [ivHex, tagHex, encrypted] = encryptedValue.split(':');
      const iv: Buffer = Buffer.from(ivHex, 'hex');
      const tag: Buffer = Buffer.from(tagHex, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.restKey, iv) as crypto.DecipherGCM;
      decipher.setAuthTag(tag);
      let decrypted: string = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      logger.error('Error descifrando:', error);
      return null;
    }
  }

  async findByTicketId(
    ticketId: string | number,
    excludeCus: string | null = null
  ): Promise<TransactionRecord | null> {
    // IMPLEMENTAR SEGUN TU BD
    return null;
  }

  async create(data: Partial<TransactionRecord>): Promise<TransactionRecord> {
    // IMPLEMENTAR SEGUN TU BD
    return { id: 'mock-id', ...data } as TransactionRecord;
  }

  async updateState(
    trazabilityCode: string,
    updates: Partial<TransactionRecord>
  ): Promise<TransactionRecord> {
    // IMPLEMENTAR SEGUN TU BD
    return { trazabilityCode, ...updates } as TransactionRecord;
  }
}

export default new TransactionModel();
