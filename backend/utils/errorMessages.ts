import { TransactionState } from '../../shared/types/transaction';

interface PSEErrorMessages {
  [key: string]: string;
}

interface ValidationErrors {
  FAIL_RECAPTCHA: string;
  FAIL_RATE_LIMIT: string;
  FAIL_INVALID_USER_TYPE: string;
  FAIL_FORBIDDEN_CHARS: (field: string) => string;
  FAIL_DOUBLEPAYMENT: (state: string, ticketId: string | number, cus: string) => string;
}

/**
 * Mensaje genérico exigido por PSE (Requisito #7) para los errores de creación
 * de transacción. Todos los códigos de GENERIC_CREATE_ERRORS —y cualquier código
 * desconocido— se resuelven a este texto.
 */
const GENERIC_CREATE_ERROR =
  'No se pudo crear la transaccion, por favor intente mas tarde o comuniquese con la empresa';

// Requisito PSE #7: estos códigos deben mostrar SIEMPRE el mensaje genérico.
const GENERIC_CREATE_ERRORS: string[] = [
  'FAIL_ENTITYNOTEXISTSORDISABLED',
  'FAIL_BANKNOTEXISTSORDISABLED',
  'FAIL_SERVICENOTEXISTSORNOTCONFIGURED',
  'FAIL_INVALIDAMOUNTORVATAMOUNT',
  'FAIL_INVALIDAMOUNT',
  'FAIL_INVALIDSOLICITDATE',
  'FAIL_CANNOTGETCURRENTCYCLE',
  'FAIL_ACCESSDENIED',
  'FAIL_TRANSACTIONNOTALLOWED',
  'FAIL_INVALIDPARAMETERS',
  'FAIL_GENERICERROR',
  // Otros códigos de fallo de creación que también deben ir al genérico
  'FAIL_NOTCONFIRMEDBYBANK',
  'FAIL_INCONSISTENTFECHA',
  'FAIL_INVALIDBANKPROCESSINGDATE'
];

export const PSE_ERROR_MESSAGES: PSEErrorMessages = {
  SUCCESS: 'Transaccion procesada correctamente.',

  // Requisito PSE #6: texto claro; las opciones de contacto se muestran en el
  // frontend (bloque de contacto). Se mantiene el core del texto exigido.
  FAIL_EXCEEDEDLIMIT:
    'El monto de la transaccion excede los limites establecidos en PSE para la empresa, ' +
    'por favor comuniquese con la empresa',

  // Requisito PSE #7: todos estos comparten el mensaje genérico
  FAIL_ENTITYNOTEXISTSORDISABLED: GENERIC_CREATE_ERROR,
  FAIL_BANKNOTEXISTSORDISABLED: GENERIC_CREATE_ERROR,
  FAIL_SERVICENOTEXISTSORNOTCONFIGURED: GENERIC_CREATE_ERROR,
  FAIL_INVALIDAMOUNTORVATAMOUNT: GENERIC_CREATE_ERROR,
  FAIL_INVALIDAMOUNT: GENERIC_CREATE_ERROR,
  FAIL_INVALIDSOLICITDATE: GENERIC_CREATE_ERROR,
  FAIL_CANNOTGETCURRENTCYCLE: GENERIC_CREATE_ERROR,
  FAIL_ACCESSDENIED: GENERIC_CREATE_ERROR,
  FAIL_TRANSACTIONNOTALLOWED: GENERIC_CREATE_ERROR,
  FAIL_INVALIDPARAMETERS: GENERIC_CREATE_ERROR,
  FAIL_GENERICERROR: GENERIC_CREATE_ERROR,
  FAIL_NOTCONFIRMEDBYBANK: GENERIC_CREATE_ERROR,
  FAIL_INCONSISTENTFECHA: GENERIC_CREATE_ERROR,
  FAIL_INVALIDBANKPROCESSINGDATE: GENERIC_CREATE_ERROR,

  // Códigos NO listados en el #7: mensajes recomendados (Anexo del doc)
  FAIL_DISABLEDUSEREMAIL:
    'El correo electronico ingresado presenta restricciones. Por favor verifique o use otro correo de contacto.',
  FAIL_ERRORINCREDITS:
    'Ocurrio un error al procesar los creditos. Por favor intente mas tarde.',
  FAIL_INVALIDTRAZABILITYCODE:
    'La transaccion aun se esta procesando. Por favor espere unos minutos.',
  FAIL_BANKUNREACHEABLE:
    'La entidad financiera no puede ser contactada para iniciar la transaccion, por favor seleccione otra o intente mas tarde',
  FAIL_TIMEOUT:
    'El tiempo de espera ha expirado. Por favor intente mas tarde.',
  FAIL_INVALIDSTATE:
    'La transaccion no puede ser procesada en este momento. Por favor intente mas tarde.',
  FAIL_INVALIDAUTHORIZEDAMOUNT:
    'El valor devuelto por la Entidad Financiera es diferente al valor enviado. Por favor intente mas tarde.'
};

export const VALIDATION_ERRORS: ValidationErrors = {
  FAIL_RECAPTCHA: 'No se pudo verificar que no eres un robot. Por favor intenta de nuevo.',
  FAIL_RATE_LIMIT: 'Demasiadas solicitudes. Por favor intente en un minuto.',
  FAIL_INVALID_USER_TYPE: 'Si el tipo de persona es "person", el tipo de identificacion no puede ser NIT. Si es "company", el unico tipo valido es NIT.',
  FAIL_FORBIDDEN_CHARS: (field: string): string =>
    `El campo "${field}" no puede contener los caracteres "|" ni '"'. Estos caracteres generan conflicto con el motor de fraude Monitor Plus.`,
  FAIL_DOUBLEPAYMENT: (state: string, ticketId: string | number, cus: string): string => {
    if (state === 'OK') {
      return `En este momento su #${ticketId} ha finalizado su proceso de pago y cuya transaccion se encuentra APROBADA en su entidad financiera. Si desea mas informacion sobre el estado de su operacion puede comunicarse a nuestras lineas de atencion al cliente 57-1-9999999 o enviar un correo electronico a facturacion@juntaatlantico.co y preguntar por el estado de la transaccion: ${cus}`;
    }
    if (state === 'PENDING') {
      return `En este momento su #${ticketId} presenta un proceso de pago cuya transaccion se encuentra PENDIENTE de recibir confirmacion por parte de su entidad financiera, por favor espere unos minutos y vuelva a consultar mas tarde para verificar si su pago fue confirmado de forma exitosa. Si desea mas informacion sobre el estado actual de su operacion puede comunicarse a nuestras lineas de atencion al cliente 57-1-9999999 o enviar un correo electronico a facturacion@juntaatlantico.co y preguntar por el estado de la transaccion: ${cus}`;
    }
    return 'Transaccion duplicada detectada. Por favor verifique el estado de su pago.';
  }
};

export function getPSEErrorMessage(code: string): string {
  if (GENERIC_CREATE_ERRORS.includes(code)) {
    return GENERIC_CREATE_ERROR;
  }
  return PSE_ERROR_MESSAGES[code] || GENERIC_CREATE_ERROR;
}

export function getDoublePaymentMessage(state: string, ticketId: string | number, cus: string): string {
  return VALIDATION_ERRORS.FAIL_DOUBLEPAYMENT(state, ticketId, cus);
}


