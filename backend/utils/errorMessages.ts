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

export const PSE_ERROR_MESSAGES: PSEErrorMessages = {
  SUCCESS: 'Transaccion procesada correctamente.',
  FAIL_ENTITYNOTEXISTSORDISABLED: 'No se pudo crear la transaccion, por favor intente mas tarde o comuniquese con la empresa',
  FAIL_BANKNOTEXISTSORDISABLED: 'El banco seleccionado no esta disponible. Por favor seleccione otro.',
  FAIL_SERVICENOTEXISTSORNOTCONFIGURED: 'No se pudo crear la transaccion, por favor intente mas tarde o comuniquese con la empresa',
  FAIL_INVALIDAMOUNTORVATAMOUNT: 'El monto ingresado no es valido. Por favor verifique el valor.',
  FAIL_INVALIDSOLICITDATE: 'La fecha de solicitud no es valida. Por favor recargue la pagina.',
  FAIL_CANNOTGETCURRENTCYCLE: 'No se pudo crear la transaccion, por favor intente mas tarde o comuniquese con la empresa',
  FAIL_ACCESSDENIED: 'Acceso denegado. Por favor contacte a la empresa.',
  FAIL_EXCEEDEDLIMIT: 'El monto de la transaccion excede los limites establecidos en PSE para la empresa, por favor comuniquese con nuestras lineas de atencion al cliente al telefono (605) 333-XXXX o al correo electronico facturacion@juntaatlantico.co',
  FAIL_TRANSACTIONNOTALLOWED: 'La transaccion no esta permitida en este momento. Por favor intente mas tarde.',
  FAIL_INVALIDPARAMETERS: 'No se pudo crear la transaccion, por favor intente mas tarde o comuniquese con la empresa',
  FAIL_GENERICERROR: 'No se pudo crear la transaccion, por favor intente mas tarde o comuniquese con la empresa',
  FAIL_DISABLEDUSEREMAIL: 'El correo electronico ingresado presenta restricciones. Por favor verifique o use otro correo de contacto.',
  FAIL_ERRORINCREDITS: 'Ocurrio un error al procesar los creditos. Por favor intente mas tarde.',
  FAIL_INVALIDTRAZABILITYCODE: 'La transaccion aun se esta procesando. Por favor espere unos minutos.',
  FAIL_BANKUNREACHEABLE: 'La entidad financiera no puede ser contactada para iniciar la transaccion, por favor seleccione otra o intente mas tarde',
  FAIL_TIMEOUT: 'El tiempo de espera ha expirado. Por favor intente mas tarde.',
  FAIL_NOTCONFIRMEDBYBANK: 'No se pudo crear la transaccion, por favor intente mas tarde o comuniquese con la empresa',
  FAIL_INVALIDSTATE: 'La transaccion no puede ser procesada en este momento. Por favor intente mas tarde.',
  FAIL_INCONSISTENTFECHA: 'No se pudo crear la transaccion, por favor intente mas tarde o comuniquese con la empresa',
  FAIL_INVALIDBANKPROCESSINGDATE: 'No se pudo crear la transaccion, por favor intente mas tarde o comuniquese con la empresa',
  FAIL_INVALIDAUTHORIZEDAMOUNT: 'El valor devuelto por la Entidad Financiera es diferente al valor enviado. Por favor intente mas tarde.'
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
  return PSE_ERROR_MESSAGES[code] || PSE_ERROR_MESSAGES.FAIL_GENERICERROR;
}

export function getDoublePaymentMessage(state: string, ticketId: string | number, cus: string): string {
  return VALIDATION_ERRORS.FAIL_DOUBLEPAYMENT(state, ticketId, cus);
}
