import dotenv from 'dotenv';
dotenv.config();

// Set test env variables before any imports
process.env.PSE_ENCRYPTION_KEY = Buffer.alloc(32).toString('base64');
process.env.PSE_ENCRYPTION_IV = Buffer.alloc(12).toString('base64');
process.env.DB_ENCRYPTION_KEY = Buffer.alloc(32).toString('base64');
process.env.PSE_ENV = 'dev';

import encryptionService from '../services/encryption.service';

describe('EncryptionService', () => {
  const testData = {
    entityCode: '901234567-8',
    transactionValue: 150000,
    fullName: 'Juan Perez Gomez'
  };

  test('should encrypt and decrypt data correctly', () => {
    const encrypted = encryptionService.encrypt(testData);
    expect(encrypted).toBeDefined();
    expect(typeof encrypted).toBe('string');

    const decrypted = encryptionService.decrypt(encrypted);
    expect(decrypted).toEqual(testData);
  });

  test('should produce different ciphertext for same input (random IV)', () => {
    const encrypted1 = encryptionService.encrypt(testData);
    const encrypted2 = encryptionService.encrypt(testData);
    expect(encrypted1).not.toBe(encrypted2);
  });

  test('should encrypt string data', () => {
    const message = 'Hello World';
    const encrypted = encryptionService.encrypt(message);
    const decrypted = encryptionService.decrypt(encrypted);
    expect(decrypted).toBe(message);
  });

  test('should throw error for invalid encrypted data', () => {
    expect(() => {
      encryptionService.decrypt('invalid-base64-data');
    }).toThrow();
  });
});
