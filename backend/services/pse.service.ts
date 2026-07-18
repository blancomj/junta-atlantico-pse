import axios from 'axios';
import config from '../config/pse.config';
import { FORBIDDEN_CHARS_REGEX } from '../config/constants';
import { PaymentData, PSETransactionPayload } from '../../shared/types/payment';
import { PSEApiResponse } from '../../shared/types/pse-api';
import encryptionService from './encryption.service';
import tokenService from './token.service';
import { nowColombiaISO } from '../utils/dates';
import logger from '../utils/logger';

class PSEService {
  private apiKey: string;
  private entityCode: string;
  private serviceCode: string;
  private ciiuCategory: string;
  private companyName: string;
  private apiBaseUrl: string;
  private returnUrl: string;

  constructor() {
    this.apiKey = config.apiKey;
    this.entityCode = config.entityCode;
    this.serviceCode = config.serviceCode;
    this.ciiuCategory = config.ciiuCategory;
    this.companyName = config.companyName;
    this.apiBaseUrl = config.apiBaseUrl;
    this.returnUrl = config.returnUrl;
  }

  async makeRequest(endpoint: string, data: object, maxRetries: number = 1): Promise<PSEApiResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const token = await tokenService.getToken();
        const encryptedData: string = encryptionService.encrypt(data);

        logger.info(`[Attempt ${attempt}] Enviando request a ${endpoint}`);

        const response = await axios({
          method: 'POST',
          url: `${this.apiBaseUrl}/${endpoint}`,
          params: { apikey: this.apiKey },
          data: encryptedData,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        });

        const decryptedResponse: PSEApiResponse = encryptionService.decrypt(response.data) as PSEApiResponse;
        logger.info(`Respuesta de ${endpoint}: ${decryptedResponse.returnCode || 'OK'}`);
        return decryptedResponse;

      } catch (error) {
        lastError = error as Error;
        const axiosError = error as { response?: { status: number; data: unknown }; message: string };
        logger.error(`[Attempt ${attempt}] Error en ${endpoint}:`, axiosError.response?.data || axiosError.message);

        if (axiosError.response) {
          throw new Error(`PSE API Error: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
        }
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }

    throw new Error(`Network Error: ${lastError?.message}`);
  }

  async getBankList(): Promise<PSEApiResponse> {
    const data = { entityCode: this.entityCode };
    return await this.makeRequest('GetBankListNF', data);
  }

  async createTransaction(paymentData: PaymentData): Promise<PSEApiResponse> {
    const transactionData: PSETransactionPayload = this.buildTransactionData(paymentData);
    this.validateTransactionData(transactionData);
    return await this.makeRequest('CreateTransactionPaymentNF', transactionData);
  }

  buildTransactionData(paymentData: PaymentData): PSETransactionPayload {
    return {
      entityCode: this.entityCode,
      serviceCode: this.serviceCode || paymentData.serviceCode || '',
      financialInstitutionCode: paymentData.bankCode,
      transactionValue: Number(paymentData.amount),
      vatValue: Number(paymentData.vat || 0),
      ticketId: paymentData.ticketId || '',
      entityurl: this.returnUrl,
      userType: paymentData.userType,
      soliciteDate: nowColombiaISO(),
      paymentDescription: paymentData.description || 'Pago en Junta Atlantico',
      referenceNumber1: paymentData.reference1 || paymentData.identificationNumber || '',
      referenceNumber2: paymentData.reference2 || '',
      referenceNumber3: paymentData.reference3 || '',
      identificationType: paymentData.identificationType,
      identificationNumber: paymentData.identificationNumber,
      fullName: paymentData.fullName,
      cellphoneNumber: paymentData.cellphoneNumber,
      address: paymentData.address,
      email: paymentData.email,
      beneficiaryEntityIdentificationType: 'NIT',
      beneficiaryEntityIdentification: this.entityCode.replace(/-/g, '').slice(0, 15),
      beneficiaryEntityName: this.companyName,
      beneficiaryEntityCIIUCategory: this.ciiuCategory,
      beneficiaryIdentificationType: paymentData.identificationType,
      beneficiaryIdentification: paymentData.identificationNumber,
      indicator4per1000: parseInt(String(paymentData.indicator4per1000)) || 0
    };
  }

  async getTransactionInformation(
    trazabilityCode: string,
    maxAttempts: number = 3
  ): Promise<PSEApiResponse> {
    const backoff: number[] = [5000, 10000, 20000];
    const data = {
      entityCode: this.entityCode,
      trazabilityCode
    };

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result: PSEApiResponse = await this.makeRequest('GetTransactionInformationNF', data);

      if (result.returnCode !== 'FAIL_INVALIDTRAZABILITYCODE') {
        return result;
      }

      if (attempt < maxAttempts - 1) {
        logger.warn(`FAIL_INVALIDTRAZABILITYCODE en intento ${attempt + 1}, reintentando en ${backoff[attempt] / 1000}s...`);
        await new Promise(r => setTimeout(r, backoff[attempt]));
      }
    }

    return { returnCode: 'FAIL_INVALIDTRAZABILITYCODE' };
  }

  async getTransactionInformationDetailed(trazabilityCode: string): Promise<PSEApiResponse> {
    const data = {
      entityCode: this.entityCode,
      trazabilityCode
    };
    return await this.makeRequest('GetTransactionInformationDetailed', data);
  }

  async finalizeTransaction(
    trazabilityCode: string,
    authorizationId: string | null = null
  ): Promise<PSEApiResponse> {
    const data = {
      entityCode: this.entityCode,
      trazabilityCode,
      entityAuthorizationId: authorizationId || `AUTH_${Date.now()}`
    };
    return await this.makeRequest('FinalizeTransactionPaymentNF', data);
  }

  validateTransactionData(data: PSETransactionPayload): void {
    const required: (keyof PSETransactionPayload)[] = [
      'entityCode', 'financialInstitutionCode', 'serviceCode',
      'transactionValue', 'ticketId', 'entityurl', 'userType',
      'identificationType', 'identificationNumber', 'fullName',
      'cellphoneNumber', 'address', 'email', 'soliciteDate',
      'beneficiaryEntityIdentificationType', 'beneficiaryEntityIdentification'
    ];

    for (const field of required) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        throw new Error(`Campo requerido faltante: ${field}`);
      }
    }

    const fieldsToCheck: (keyof PSETransactionPayload)[] = [
      'paymentDescription', 'referenceNumber1', 'referenceNumber2', 'referenceNumber3'
    ];
    for (const field of fieldsToCheck) {
      if (typeof data[field] === 'string' && FORBIDDEN_CHARS_REGEX.test(data[field] as string)) {
        throw new Error(`El campo "${field}" contiene caracteres prohibidos (| o "). No se permite.`);
      }
    }

    if (String(data.serviceCode).length > 10) {
      throw new Error(`serviceCode no puede tener mas de 10 caracteres (tiene ${String(data.serviceCode).length})`);
    }
  }
}

export default new PSEService();
