export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  public readonly errors: string[];

  constructor(message: string, errors: string[] = []) {
    super(message, 400, 'FAIL_VALIDATION');
    this.errors = errors;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Recurso no encontrado') {
    super(message, 404, 'NOT_FOUND');
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Demasiadas solicitudes') {
    super(message, 429, 'FAIL_RATE_LIMIT');
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export class PSEApiError extends AppError {
  public readonly pseReturnCode: string;

  constructor(pseReturnCode: string, message: string) {
    super(message, 502, 'PSE_API_ERROR');
    this.pseReturnCode = pseReturnCode;
    Object.setPrototypeOf(this, PSEApiError.prototype);
  }
}

export class DoublePaymentError extends AppError {
  public readonly existingState: string;
  public readonly existingTrazabilityCode: string;

  constructor(state: string, trazabilityCode: string, ticketId: string | number) {
    super(`Doble pago detectado para ticket ${ticketId}`, 409, 'FAIL_DOUBLEPAYMENT');
    this.existingState = state;
    this.existingTrazabilityCode = trazabilityCode;
    Object.setPrototypeOf(this, DoublePaymentError.prototype);
  }
}

export class EncryptionError extends AppError {
  constructor(message: string = 'Error de cifrado') {
    super(message, 500, 'ENCRYPTION_ERROR');
    Object.setPrototypeOf(this, EncryptionError.prototype);
  }
}
