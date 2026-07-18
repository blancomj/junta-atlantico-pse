process.env.PSE_ENV = 'dev';
process.env.PSE_ENCRYPTION_KEY = Buffer.alloc(32).toString('base64');
process.env.PSE_ENCRYPTION_IV = Buffer.alloc(12).toString('base64');
process.env.DB_ENCRYPTION_KEY = Buffer.alloc(32).toString('base64');
process.env.RECAPTCHA_SECRET = '';
process.env.PSE_DOUBLE_PAYMENT_CHECK = 'true';

import request from 'supertest';
import express from 'express';

// Mock services
jest.mock('../../services/pse.service', () => ({
  getBankList: jest.fn(),
  createTransaction: jest.fn(),
  getTransactionInformation: jest.fn(),
  getTransactionInformationDetailed: jest.fn(),
  finalizeTransaction: jest.fn()
}));
jest.mock('../../services/recaptcha.service', () => ({
  verify: jest.fn()
}));
jest.mock('../../services/doublePayment.service', () => ({
  check: jest.fn(),
  getErrorMessage: jest.fn()
}));
jest.mock('../../services/token.service', () => ({
  getToken: jest.fn()
}));

import pseService from '../../services/pse.service';
import recaptchaService from '../../services/recaptcha.service';
import doublePaymentService from '../../services/doublePayment.service';
import { TRANSACTION_STATES } from '../../config/constants';

import app from '../../server';

describe('PSE API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (recaptchaService.verify as jest.Mock).mockResolvedValue({ success: true, score: 1.0 });
  });

  describe('GET /api/pse/health', () => {
    test('should return health status', async () => {
      const res = await request(app).get('/api/pse/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('OK');
    });
  });

  describe('GET /api/pse/banks', () => {
    test('should return bank list', async () => {
      (pseService.getBankList as jest.Mock).mockResolvedValue([
        { financialInstitutionCode: '1007', financialInstitutionName: 'BANCOLOMBIA' }
      ]);

      const res = await request(app).get('/api/pse/banks');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /api/pse/transaction', () => {
    const validPayment = {
      recaptchaToken: 'test-token',
      bankCode: '1007',
      amount: 150000,
      userType: 'person',
      identificationType: 'CedulaDeCiudadania',
      identificationNumber: '1234567890',
      fullName: 'Juan Perez',
      cellphoneNumber: '3001234567',
      email: 'juan@test.com',
      address: 'Calle 123',
      description: 'Pago de prueba'
    };

    test('should create transaction successfully', async () => {
      (doublePaymentService.check as jest.Mock).mockResolvedValue({ exists: false });
      (pseService.createTransaction as jest.Mock).mockResolvedValue({
        returnCode: 'SUCCESS',
        trazabilityCode: 'CUS_123456',
        pseURL: 'https://pse.test.com/pay',
        transactionCycle: 1
      });

      const res = await request(app)
        .post('/api/pse/transaction')
        .send(validPayment);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.trazabilityCode).toBe('CUS_123456');
    });

    test('should reject invalid userType/identificationType combination', async () => {
      const res = await request(app)
        .post('/api/pse/transaction')
        .send({
          ...validPayment,
          userType: 'person',
          identificationType: 'NIT'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should reject forbidden chars in description', async () => {
      const res = await request(app)
        .post('/api/pse/transaction')
        .send({
          ...validPayment,
          description: 'Pago|test'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    test('should detect double payment', async () => {
      (doublePaymentService.check as jest.Mock).mockResolvedValue({
        exists: true,
        state: TRANSACTION_STATES.OK,
        trazabilityCode: 'CUS_EXISTING'
      });
      (doublePaymentService.getErrorMessage as jest.Mock).mockReturnValue('Transaccion duplicada');

      const res = await request(app)
        .post('/api/pse/transaction')
        .send(validPayment);

      expect(res.status).toBe(409);
      expect(res.body.code).toBe('FAIL_DOUBLEPAYMENT');
    });
  });

  describe('GET /api/pse/transaction/:cus/status', () => {
    test('should return transaction status', async () => {
      (pseService.getTransactionInformation as jest.Mock).mockResolvedValue({
        returnCode: 'SUCCESS',
        transactionState: 'OK',
        trazabilityCode: 'CUS_123456',
        transactionValue: 150000
      });
      (pseService.finalizeTransaction as jest.Mock).mockResolvedValue({ returnCode: 'SUCCESS' });

      const res = await request(app).get('/api/pse/transaction/CUS_123456/status');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
