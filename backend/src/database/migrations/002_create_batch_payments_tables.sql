-- Batch payments table
CREATE TABLE IF NOT EXISTS batch_payments (
  id CHAR(36) PRIMARY KEY,
  entity_id CHAR(36) NOT NULL,
  user_id CHAR(36) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'por_pagar',
  total_beneficiarios INT NOT NULL,
  monto_total DECIMAL(15,2) NOT NULL,
  trazability_code VARCHAR(100),
  pse_url TEXT,
  banco_pago VARCHAR(100),
  documento_pago VARCHAR(100),
  fecha_pago TIMESTAMP NULL,
  motivo_anulacion TEXT,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (entity_id) REFERENCES entities(id),
  FOREIGN KEY (user_id) REFERENCES entity_users(id)
);

-- Batch payment beneficiaries table
CREATE TABLE IF NOT EXISTS batch_payment_beneficiaries (
  id CHAR(36) PRIMARY KEY,
  batch_payment_id CHAR(36) NOT NULL,
  numero_identificacion VARCHAR(20) NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  numero_expediente VARCHAR(50) NOT NULL,
  valor DECIMAL(15,2) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_payment_id) REFERENCES batch_payments(id) ON DELETE CASCADE
);

-- Batch payment attempts table
CREATE TABLE IF NOT EXISTS batch_payment_attempts (
  id CHAR(36) PRIMARY KEY,
  batch_payment_id CHAR(36) NOT NULL,
  trazability_code VARCHAR(100),
  estado VARCHAR(20) NOT NULL,
  mensaje TEXT,
  banco VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (batch_payment_id) REFERENCES batch_payments(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_batch_payments_entity_id ON batch_payments(entity_id);
CREATE INDEX idx_batch_payments_user_id ON batch_payments(user_id);
CREATE INDEX idx_batch_payments_estado ON batch_payments(estado);
CREATE INDEX idx_batch_payments_expires_at ON batch_payments(expires_at);
CREATE INDEX idx_batch_payment_beneficiaries_batch_id ON batch_payment_beneficiaries(batch_payment_id);
CREATE INDEX idx_batch_payment_beneficiaries_identificacion ON batch_payment_beneficiaries(numero_identificacion);
CREATE INDEX idx_batch_payment_attempts_batch_id ON batch_payment_attempts(batch_payment_id);
