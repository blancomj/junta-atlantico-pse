import * as XLSX from 'xlsx';
import { ExcelRow, ValidationError } from '../types/batch-payment.types';

// In-memory cache for uploaded files (expires in 30 min)
const fileCache = new Map<string, { data: ExcelRow[]; fileName: string; expiresAt: number }>();
const FILE_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function generateFileId(): string {
  return 'file_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
}

export default {
  parseExcel(buffer: Buffer, fileName: string): { data: ExcelRow[]; errors: ValidationError[] } {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return { data: [], errors: [{ row: null, field: 'ARCHIVO', message: 'El archivo esta vacio' }] };
    }

    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<Record<string, any>>(sheet);

    if (rawData.length === 0) {
      return { data: [], errors: [{ row: null, field: 'ARCHIVO', message: 'El archivo no contiene datos' }] };
    }

    const errors: ValidationError[] = [];
    const data: ExcelRow[] = [];
    const seenIdentifications = new Map<string, number>();

    // Validate headers
    const firstRow = rawData[0];
    const headers = Object.keys(firstRow);
    const requiredHeaders = ['NUMERO_IDENTIFICACION', 'NOMBRE', 'NUMERO_EXPEDIENTE', 'VALOR'];
    
    for (const required of requiredHeaders) {
      if (!headers.includes(required)) {
        errors.push({ row: null, field: required, message: `Columna "${required}" no encontrada en el archivo` });
      }
    }

    if (errors.length > 0) {
      return { data: [], errors };
    }

    // Validate rows
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i];
      const rowNum = i + 2; // +2 because row 1 is header

      // NUMERO_IDENTIFICACION
      const identificacion = String(row.NUMERO_IDENTIFICACION || '').trim();
      if (!identificacion) {
        errors.push({ row: rowNum, field: 'NUMERO_IDENTIFICACION', message: 'Campo requerido' });
      } else if (!/^\d{6,12}$/.test(identificacion)) {
        errors.push({ row: rowNum, field: 'NUMERO_IDENTIFICACION', message: 'Debe ser numerico de 6-12 digitos' });
      } else if (seenIdentifications.has(identificacion)) {
        errors.push({ 
          row: rowNum, 
          field: 'NUMERO_IDENTIFICACION', 
          message: `Duplicada en filas ${seenIdentifications.get(identificacion)} y ${rowNum}` 
        });
      } else {
        seenIdentifications.set(identificacion, rowNum);
      }

      // NOMBRE
      const nombre = String(row.NOMBRE || '').trim();
      if (!nombre) {
        errors.push({ row: rowNum, field: 'NOMBRE', message: 'Campo requerido' });
      } else if (nombre.length > 200) {
        errors.push({ row: rowNum, field: 'NOMBRE', message: 'Maximo 200 caracteres' });
      }

      // NUMERO_EXPEDIENTE
      const expediente = String(row.NUMERO_EXPEDIENTE || '').trim();
      if (!expediente) {
        errors.push({ row: rowNum, field: 'NUMERO_EXPEDIENTE', message: 'Campo requerido' });
      } else if (expediente.length > 50) {
        errors.push({ row: rowNum, field: 'NUMERO_EXPEDIENTE', message: 'Maximo 50 caracteres' });
      }

      // VALOR
      const valor = Number(row.VALOR);
      if (isNaN(valor) || valor <= 0) {
        errors.push({ row: rowNum, field: 'VALOR', message: 'Debe ser un numero mayor a 0' });
      } else if (Math.round(valor * 100) !== valor * 100) {
        errors.push({ row: rowNum, field: 'VALOR', message: 'Maximo 2 decimales' });
      }

      if (errors.length === 0 || (errors.filter(e => e.row === rowNum).length === 0)) {
        data.push({
          NUMERO_IDENTIFICACION: identificacion,
          NOMBRE: nombre,
          NUMERO_EXPEDIENTE: expediente,
          VALOR: valor
        });
      }
    }

    return { data, errors };
  },

  cacheFile(data: ExcelRow[], fileName: string): string {
    const fileId = generateFileId();
    fileCache.set(fileId, {
      data,
      fileName,
      expiresAt: Date.now() + FILE_CACHE_TTL
    });
    return fileId;
  },

  getCachedFile(fileId: string): { data: ExcelRow[]; fileName: string } | null {
    const cached = fileCache.get(fileId);
    if (!cached || Date.now() > cached.expiresAt) {
      fileCache.delete(fileId);
      return null;
    }
    return { data: cached.data, fileName: cached.fileName };
  },

  deleteCachedFile(fileId: string): void {
    fileCache.delete(fileId);
  },

  // Cleanup expired files periodically
  cleanup(): void {
    const now = Date.now();
    for (const [key, value] of fileCache.entries()) {
      if (now > value.expiresAt) {
        fileCache.delete(key);
      }
    }
  }
};