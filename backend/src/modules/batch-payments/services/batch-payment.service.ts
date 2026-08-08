import crypto from 'crypto';
import { getPool } from '../../../database/connection';
import { BatchPayment, BatchPaymentBeneficiary, UploadResult, BatchPaymentListQuery, BatchPaymentListResponse } from '../types/batch-payment.types';
import excelParser from './excel-parser.service';
import logger from '../../../../utils/logger';

const BATCH_SIZE = 500;

class BatchPaymentService {
  async uploadExcel(buffer: Buffer, fileName: string, userId: string, entityId: string): Promise<UploadResult> {
    const { data, errors } = excelParser.parseExcel(buffer, fileName);

    if (errors.length > 0) {
      throw { type: 'VALIDATION', errors };
    }

    if (data.length === 0) {
      throw { type: 'VALIDATION', errors: [{ row: null, field: 'ARCHIVO', message: 'No se encontraron registros validos' }] };
    }

    if (data.length > 10000) {
      throw { type: 'VALIDATION', errors: [{ row: null, field: 'ARCHIVO', message: 'Maximo 10,000 beneficiarios por archivo' }] };
    }

    const fileId = excelParser.cacheFile(data, fileName);
    const montoTotal = data.reduce((sum, r) => sum + r.VALOR, 0);

    return {
      fileId,
      fileName,
      totalBeneficiarios: data.length,
      montoTotal: Math.round(montoTotal * 100) / 100,
      preview: data.slice(0, 10)
    };
  }

  async createPayment(fileId: string, userId: string, entityId: string, direccion?: string, telefono?: string): Promise<BatchPayment> {
    const cached = excelParser.getCachedFile(fileId);
    if (!cached) {
      throw new Error('Archivo no encontrado o expirado. Sube el archivo nuevamente.');
    }

    const pool = getPool();
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const paymentId = crypto.randomUUID();
      const montoTotal = cached.data.reduce((sum, r) => sum + r.VALOR, 0);
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

      // Insert batch payment
      await connection.query(
        `INSERT INTO batch_payments (id, entity_id, user_id, file_name, direccion, telefono, estado, total_beneficiarios, monto_total, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, 'por_pagar', ?, ?, ?)`,
        [paymentId, entityId, userId, cached.fileName, direccion || null, telefono || null, cached.data.length, montoTotal, expiresAt]
      );

      // Insert beneficiaries in batches
      for (let i = 0; i < cached.data.length; i += BATCH_SIZE) {
        const batch = cached.data.slice(i, i + BATCH_SIZE);
        const placeholders = batch.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
        const values = batch.flatMap(row => [
          crypto.randomUUID(), paymentId, row.NUMERO_IDENTIFICACION,
          row.NOMBRE, row.NUMERO_EXPEDIENTE, row.VALOR
        ]);

        await connection.query(
          `INSERT INTO batch_payment_beneficiaries (id, batch_payment_id, numero_identificacion, nombre, numero_expediente, valor)
           VALUES ${placeholders}`,
          values
        );
      }

      await connection.commit();

      // Delete cached file
      excelParser.deleteCachedFile(fileId);

      logger.info(`Batch payment created: ${paymentId} with ${cached.data.length} beneficiaries`);

      return this.findById(paymentId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async findById(id: string): Promise<BatchPayment> {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM batch_payments WHERE id = ?', [id]) as any[];
    if (rows.length === 0) {
      throw new Error('Proceso de pago no encontrado');
    }
    return rows[0];
  }

  async findBeneficiaries(batchPaymentId: string): Promise<BatchPaymentBeneficiary[]> {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM batch_payment_beneficiaries WHERE batch_payment_id = ? ORDER BY nombre',
      [batchPaymentId]
    ) as any[];
    return rows;
  }

  async list(userId: string, entityId: string, role: string, query: BatchPaymentListQuery): Promise<BatchPaymentListResponse> {
    const pool = getPool();
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let where = 'WHERE 1=1';
    const params: any[] = [];

    // Non-admin users only see their own
    if (role !== 'admin') {
      where += ' AND user_id = ?';
      params.push(userId);
    }

    if (query.estado) {
      where += ' AND estado = ?';
      params.push(query.estado);
    }

    if (query.userId) {
      where += ' AND user_id = ?';
      params.push(query.userId);
    }

    if (query.fechaDesde) {
      where += ' AND created_at >= ?';
      params.push(query.fechaDesde);
    }

    if (query.fechaHasta) {
      where += ' AND created_at <= ?';
      params.push(query.fechaHasta);
    }

    const [countRows] = await pool.query(`SELECT COUNT(*) as total FROM batch_payments ${where}`, params) as any[];
    const total = countRows[0].total;

    const selectExtra = role === 'admin' ? ', eu.full_name as user_name' : '';
    const joinExtra = role === 'admin' ? ' LEFT JOIN entity_users eu ON batch_payments.user_id = eu.id' : '';

    const [dataRows] = await pool.query(
      `SELECT batch_payments.*${selectExtra} FROM batch_payments${joinExtra} ${where} ORDER BY batch_payments.created_at DESC LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    ) as any[];

    return { data: dataRows, total, page, pageSize };
  }

  async annul(id: string, userId: string, motivo: string): Promise<BatchPayment> {
    const pool = getPool();
    const payment = await this.findById(id);

    if (payment.user_id !== userId) {
      throw new Error('No tienes permiso para anular este proceso');
    }

    if (payment.estado !== 'por_pagar') {
      throw new Error('Solo se pueden anular procesos en estado "por pagar"');
    }

    await pool.query(
      `UPDATE batch_payments SET estado = 'anulado', motivo_anulacion = ?, updated_at = NOW() WHERE id = ?`,
      [motivo, id]
    );

    logger.info(`Batch payment annulled: ${id}`);
    return this.findById(id);
  }

  async markAsPaid(id: string, trazabilityCode: string, pseUrl: string): Promise<void> {
    const pool = getPool();
    await pool.query(
      `UPDATE batch_payments SET trazability_code = ?, pse_url = ?, updated_at = NOW() WHERE id = ?`,
      [trazabilityCode, pseUrl, id]
    );
  }

  async completePayment(id: string, banco: string, documentoPago: string): Promise<void> {
    const pool = getPool();
    await pool.query(
      `UPDATE batch_payments SET estado = 'pagado', banco_pago = ?, documento_pago = ?, fecha_pago = NOW(), updated_at = NOW() WHERE id = ?`,
      [banco, documentoPago, id]
    );

    // Mark all beneficiaries as paid
    await pool.query(
      `UPDATE batch_payment_beneficiaries SET estado = 'pagado' WHERE batch_payment_id = ?`,
      [id]
    );
  }

  async recordAttempt(id: string, trazabilityCode: string, estado: 'exitoso' | 'fallido', mensaje: string, banco?: string): Promise<void> {
    const pool = getPool();
    await pool.query(
      `INSERT INTO batch_payment_attempts (id, batch_payment_id, trazability_code, estado, mensaje, banco)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [crypto.randomUUID(), id, trazabilityCode, estado, mensaje, banco || null]
    );
  }

  async getAttempts(id: string): Promise<any[]> {
    const pool = getPool();
    const [rows] = await pool.query(
      'SELECT * FROM batch_payment_attempts WHERE batch_payment_id = ? ORDER BY created_at DESC',
      [id]
    ) as any[];
    return rows;
  }

  async searchBeneficiary(query: string, role: string, userId: string): Promise<any[]> {
    const pool = getPool();
    const searchPattern = `%${query}%`;

    let where = `WHERE (bp.numero_identificacion LIKE ? OR bp.nombre LIKE ? OR bp.numero_expediente LIKE ?)`;
    const params: any[] = [searchPattern, searchPattern, searchPattern];

    if (role !== 'admin') {
      where += ` AND bpay.user_id = ?`;
      params.push(userId);
    }

    const [rows] = await pool.query(
      `SELECT DISTINCT bpay.id, bpay.file_name, bpay.estado, bpay.total_beneficiarios, bpay.monto_total,
              bpay.banco_pago, bpay.documento_pago, bpay.fecha_pago, bpay.created_at,
              eu.full_name as user_name
       FROM batch_payment_beneficiaries bp
       INNER JOIN batch_payments bpay ON bp.batch_payment_id = bpay.id
       LEFT JOIN entity_users eu ON bpay.user_id = eu.id
       ${where}
       ORDER BY bpay.created_at DESC
       LIMIT 50`,
      params
    ) as any[];

    return rows;
  }

  // Cron job: expire old payments
  async expirePayments(): Promise<number> {
    const pool = getPool();
    const [result] = await pool.query(
      `UPDATE batch_payments SET estado = 'anulado', motivo_anulacion = 'Expirado por tiempo (48h)', updated_at = NOW()
       WHERE estado = 'por_pagar' AND expires_at < NOW()`
    ) as any[];
    
    if (result.affectedRows > 0) {
      logger.info(`Expired ${result.affectedRows} batch payments`);
    }
    return result.affectedRows;
  }
}

export default new BatchPaymentService();