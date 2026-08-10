-- Permite registrar pagos individuales (sin entidad ni usuario logueado)
-- en las mismas tablas de batch_payments / batch_payment_beneficiaries.
ALTER TABLE batch_payments
  ADD COLUMN tipo VARCHAR(20) NOT NULL DEFAULT 'lote' AFTER file_name,
  MODIFY COLUMN entity_id CHAR(36) NULL,
  MODIFY COLUMN user_id CHAR(36) NULL;

ALTER TABLE batch_payment_beneficiaries
  MODIFY COLUMN numero_expediente VARCHAR(50) NULL;

CREATE INDEX idx_batch_payments_tipo ON batch_payments(tipo);
