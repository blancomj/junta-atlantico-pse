export const CAUSAL_REJECTION: Record<string, string> = {
  '00001': 'El usuario abandono la transaccion en el banco',
  '00002': 'Cuenta embargada',
  '00003': 'Cuenta inactiva',
  '00004': 'La cuenta no existe',
  '00005': 'La cuenta no esta habilitada',
  '00006': 'La cuenta no ha sido habilitada para pagos',
  '00007': 'La cuenta esta saldada',
  '00008': 'Excediste el limite transaccional autorizado por tu banco',
  '00009': 'El banco no se encuentra disponible',
  '00010': 'Fallas tecnicas en la Entidad Financiera',
  '00011': 'Fondos insuficientes',
  '00012': 'Inconsistencia en los datos de la transaccion',
  '00013': 'La cuenta esta cancelada',
  '00015': 'La transaccion no fue concluida en el banco en el tiempo maximo permitido (7 min).',
  '00016': 'Datos de acceso invalidos en el portal de la Entidad Financiera',
  '00017': 'No tienes habilitado el servicio de PSE en tu Entidad Financiera',
  '00024': 'Transaccion rechazada por sospecha de fraude en la Entidad Financiera',
  '00014': 'El banco no confirmo el estado de la transaccion en el tiempo establecido.',
  '00018': 'La transaccion fue cambiada de aprobada a rechazada por la Entidad Financiera.',
  '00019': 'Transaccion declinada por sospecha de fraude (Monitor Plus).',
  '00020': 'Abandonaste la transaccion al regresar al comercio.',
  '00021': 'Abandonaste la transaccion al cerrar el navegador.',
  '00022': 'Tu navegador no es compatible con PSE. Usa Chrome 84+, Edge 18+, Firefox 79+, Opera 69+ o Safari 13.1+.',
  '00023': 'No presentaste actividad en PSE (TIMEOUT).',
  '00025': 'Credibanco no confirmo la transaccion.',
  '00026': 'OTP no informado. Agotaste los reenvios configurados por la Entidad Financiera.',
  '00027': 'OTP invalida. Verifica el codigo enviado por tu banco.',
  '10001': 'La transaccion excede el limite asignado a la empresa en PSE.',
  '10002': 'No se puede conectar a la Entidad Financiera.',
  '10003': 'La Entidad Financiera no acepto iniciar la transaccion.'
};

export function getCausalMessage(code: string): string {
  return CAUSAL_REJECTION[code] || `Causal ${code}`;
}
