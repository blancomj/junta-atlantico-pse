interface PSEErrorMessages {
  [key: string]: string;
}

/**
 * Mensaje genérico exigido por PSE (Requisito #7) para los errores de creación
 * de transacción. Todos los códigos de GENERIC_CREATE_ERRORS —y cualquier código
 * desconocido— se resuelven a este texto.
 */
const GENERIC_CREATE_ERROR =
  'No se pudo crear la transaccion, por favor intente mas tarde o comuniquese con la empresa.';

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
  'FAIL_GENERICERROR'
];

export const PSE_ERROR_MESSAGES: PSEErrorMessages = {
  SUCCESS: 'Transaccion procesada correctamente.',

  // Requisito PSE #6: texto claro + se ofrecen opciones de contacto (bloque aparte).
  FAIL_EXCEEDEDLIMIT:
    'El monto de la transaccion excede los limites establecidos en PSE para la empresa, ' +
    'por favor comuniquese con la empresa.',

  // Mensaje genérico (Requisito #7)
  FAIL_GENERICERROR: GENERIC_CREATE_ERROR,

  // Mensajes recomendados (Anexo doc) para códigos NO listados en el #7
  FAIL_BANKUNREACHEABLE:
    'La entidad financiera no puede ser contactada para iniciar la transaccion, ' +
    'por favor seleccione otra o intente mas tarde.',
  FAIL_DISABLEDUSEREMAIL:
    'El correo electronico ingresado presenta restricciones. ' +
    'Por favor verifique o use otro correo de contacto.',
  FAIL_ERRORINCREDITS:
    'Ocurrio un error al procesar los creditos. Por favor intente mas tarde.',
  FAIL_INVALIDTRAZABILITYCODE:
    'La transaccion aun se esta procesando. Por favor espere unos minutos.',
  FAIL_TIMEOUT:
    'El tiempo de espera ha expirado. Por favor intente mas tarde.',

  // Errores del lado cliente (no son respuestas de creación PSE)
  FAIL_RECAPTCHA:
    'No se pudo verificar que no eres un robot. Por favor intenta de nuevo.',
  RECAPTCHA_UNAVAILABLE:
    'No se pudo inicializar la verificacion de seguridad. Recarga la pagina e intenta de nuevo.',
  FAIL_RATE_LIMIT:
    'Demasiadas solicitudes. Por favor intente en un minuto.',
  FAIL_DOUBLEPAYMENT: 'Verifique el estado de su pago antes de iniciar uno nuevo.',
  FAIL_VALIDATION: 'Por favor verifica los datos ingresados.'
};

export function getErrorMessage(code: string): string {
  if (GENERIC_CREATE_ERRORS.includes(code)) {
    return GENERIC_CREATE_ERROR;
  }
  return PSE_ERROR_MESSAGES[code] || GENERIC_CREATE_ERROR;
}

/**
 * Indica si, para el código dado, se deben ofrecer opciones de contacto con la
 * empresa (Requisitos PSE #6 y #7). Aplica a EXCEEDEDLIMIT, a los errores de
 * creación de transacción y a cualquier código desconocido; NO a los errores de
 * cliente (validación, reCAPTCHA, rate limit, doble pago).
 */
export function shouldOfferContact(code: string): boolean {
  const clientSide = [
    'FAIL_VALIDATION', 'FAIL_RECAPTCHA', 'RECAPTCHA_UNAVAILABLE',
    'FAIL_RATE_LIMIT', 'FAIL_DOUBLEPAYMENT'
  ];
  if (!code) return false;
  if (clientSide.includes(code)) return false;
  return true;
}