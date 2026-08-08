-- Add address and phone columns to batch_payments table
ALTER TABLE batch_payments ADD COLUMN direccion VARCHAR(200) NULL AFTER file_name;
ALTER TABLE batch_payments ADD COLUMN telefono VARCHAR(20) NULL AFTER direccion;
