import { TransactionState } from './transaction';

export type PSEReturnCode =
  | 'SUCCESS'
  | 'FAIL_ENTITYNOTEXISTSORDISABLED'
  | 'FAIL_BANKNOTEXISTSORDISABLED'
  | 'FAIL_SERVICENOTEXISTSORNOTCONFIGURED'
  | 'FAIL_INVALIDAMOUNTORVATAMOUNT'
  | 'FAIL_INVALIDSOLICITDATE'
  | 'FAIL_CANNOTGETCURRENTCYCLE'
  | 'FAIL_ACCESSDENIED'
  | 'FAIL_EXCEEDEDLIMIT'
  | 'FAIL_TRANSACTIONNOTALLOWED'
  | 'FAIL_INVALIDPARAMETERS'
  | 'FAIL_GENERICERROR'
  | 'FAIL_DISABLEDUSEREMAIL'
  | 'FAIL_ERRORINCREDITS'
  | 'FAIL_INVALIDTRAZABILITYCODE'
  | 'FAIL_BANKUNREACHEABLE'
  | 'FAIL_TIMEOUT'
  | 'FAIL_NOTCONFIRMEDBYBANK'
  | 'FAIL_INVALIDSTATE'
  | 'FAIL_INCONSISTENTFECHA'
  | 'FAIL_INVALIDBANKPROCESSINGDATE'
  | 'FAIL_INVALIDAUTHORIZEDAMOUNT';

export interface PSEApiResponse {
  returnCode: PSEReturnCode;
  trazabilityCode?: string;
  pseURL?: string;
  transactionCycle?: number;
  transactionState?: TransactionState;
  authorizationID?: string;
  errorDetails?: string;
  banks?: Array<{
    financialInstitutionCode: string;
    financialInstitutionName: string;
  }>;
}

export interface RecaptchaVerificationResult {
  success: boolean;
  score: number;
  error?: string;
}

export interface DoublePaymentCheckResult {
  exists: boolean;
  state?: TransactionState;
  trazabilityCode?: string;
}
