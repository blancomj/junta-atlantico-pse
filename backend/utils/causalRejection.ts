export const CAUSAL_REJECTION: Record<string, string> = {
  '00001': 'El usuario abandono la transaccion en el banco',
  '00002': 'Cuenta embargada',
  '00003': 'Cuenta inactiva',
  '00004': 'La cuenta no existe',
  '00005': 'La cuenta no esta habilitada',
  '00006': 'La cuenta no ha sido habilitada para pagos',
  '00007': 'La cuenta esta saldada',
  '00008': 'El usuario excede el limite transaccional autorizado por el banco',
  '00009': 'El banco no se encuentra disponible',
  '00010': 'Fallas tecnicas en la Entidad Financiera',
  '00011': 'Fondos insuficientes',
  '00012': 'Inconsistencia en los datos de la transaccion',
  '00013': 'La cuenta esta cancelada',
  '00015': 'La transaccion no fue concluida en el banco. La entidad debe contar con un control de sesion (maximo 7 minutos) para no superar el tiempo de la sonda de PSE.',
  '00016': 'Datos de acceso invalidos en el portal de la Entidad Financiera',
  '00017': 'El usuario no tiene habilitado el servicio de PSE en su Entidad Financiera',
  '00024': 'Transaccion rechazada por sospecha de fraude en la Entidad Financiera',
  '00014': 'Cancelacion de PSE: el banco no confirmo el estado de la transaccion (3 intentos en 21 minutos)',
  '00018': 'Cambio de estado en la transaccion (de aprobada a rechazada) realizado por la Entidad Financiera',
  '00019': 'Transaccion declinada por el pre-autorizador (sospecha de fraude, Monitor Plus)',
  '00020': 'El usuario abandono la transaccion en PSE al regresar al comercio',
  '00021': 'El usuario abandono la transaccion en PSE al cerrar el navegador',
  '00022': 'El navegador utilizado no es compatible con PSE (versiones: Chrome 84+, Edge 18.18363+, Firefox 79+, Opera 69+, Safari 13.1+)',
  '00023': 'El usuario no presento actividad en PSE (TIMEOUT)',
  '00025': 'Cancelada por PSE: Credibanco no confirmo la transaccion',
  '00026': 'OTP NO INFORMADO. El usuario no ingreso el codigo OTP despues de agotar los reenvios configurados por la entidad y finalizado el tiempo configurado en el ultimo intento en PSE Avanza.',
  '00027': 'OTP INVALIDA. El usuario ingreso un OTP que no es valido o no cumple los requisitos.',
  '10001': 'La transaccion excede el limite asignado a la empresa en PSE',
  '10002': 'No se puede conectar a la Entidad Financiera',
  '10003': 'La Entidad Financiera no acepto iniciar la transaccion'
};

export function getCausalMessage(code: string): string {
  return CAUSAL_REJECTION[code] || `Causal ${code}`;
}
