interface PSEErrorMessages {
  [key: string]: string;
}

export const PSE_ERROR_MESSAGES: PSEErrorMessages = {
  SUCCESS: 'Transaccion procesada correctamente.',
  FAIL_EXCEEDEDLIMIT:
    'El monto de la transaccion excede los limites establecidos en PSE para la empresa, ' +
    'por favor comuniquese con nuestras lineas de atencion al cliente al telefono ' +
    '(605) 333-XXXX o al correo electronico facturacion@juntaatlantico.co',
  FAIL_BANKUNREACHEABLE:
    'La entidad financiera no puede ser contactada para iniciar la transaccion, ' +
    'por favor seleccione otra o intente mas tarde',
  FAIL_DISABLEDUSEREMAIL:
    'El correo electronico ingresado presenta restricciones. ' +
    'Por favor verifique o use otro correo de contacto.',
  FAIL_ERRORINCREDITS:
    'Ocurrio un error al procesar los creditos. Por favor intente mas tarde.',
  FAIL_INVALIDTRAZABILITYCODE:
    'La transaccion aun se esta procesando. Por favor espere unos minutos.',
  FAIL_BANKNOTEXISTSORDISABLED:
    'El banco seleccionado no esta disponible. Por favor seleccione otro.',
  FAIL_INVALIDAMOUNT:
    'El monto ingresado no es valido. Por favor verifique el valor.',
  FAIL_INVALIDSOLICITDATE:
    'La fecha de solicitud no es valida. Por favor recargue la pagina.',
  FAIL_TRANSACTIONNOTALLOWED:
    'La transaccion no esta permitida en este momento. Por favor intente mas tarde.',
  FAIL_TIMEOUT:
    'El tiempo de espera ha expirado. Por favor intente mas tarde.',
  FAIL_GENERICERROR:
    'No se pudo crear la transaccion, por favor intente mas tarde o comuniquese con la empresa.',
  FAIL_ACCESSDENIED:
    'Acceso denegado. Por favor contacte a la empresa.',
  FAIL_RECAPTCHA:
    'No se pudo verificar que no eres un robot. Por favor intenta de nuevo.',
  FAIL_RATE_LIMIT:
    'Demasiadas solicitudes. Por favor intente en un minuto.',
  FAIL_DOUBLEPAYMENT: 'Verifique el estado de su pago antes de iniciar uno nuevo.',
  FAIL_VALIDATION: 'Por favor verifica los datos ingresados.'
};

export function getErrorMessage(code: string): string {
  return PSE_ERROR_MESSAGES[code] || PSE_ERROR_MESSAGES.FAIL_GENERICERROR;
}
