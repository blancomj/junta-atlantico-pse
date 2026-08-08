-- Add direccion and telefono to entity_users for PSE payer data pre-fill
ALTER TABLE entity_users
ADD COLUMN direccion VARCHAR(255) DEFAULT NULL AFTER nit,
ADD COLUMN telefono VARCHAR(20) DEFAULT NULL AFTER direccion;
