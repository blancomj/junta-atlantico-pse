import pseService from './pse.service';
import logger from '../utils/logger';
import { BankItem } from '../../shared/types/bank';
import { PSEApiResponse } from '../../shared/types/pse-api';

/**
 * Servicio de lista de bancos con CACHÉ DIARIA.
 *
 * Requisito PSE #4: GetBankListNF NO debe ejecutarse por cada transacción;
 * se permite a lo sumo una vez por día. Este servicio cachea el resultado
 * durante BANK_LIST_CACHE_TTL_MS (24 h por defecto) y solo vuelve a llamar a
 * PSE cuando la caché expira.
 *
 * Requisito PSE #8: la lista se entrega ordenada alfabéticamente por nombre.
 */

const MOCK_BANKS: BankItem[] = [
  { financialInstitutionCode: '001', financialInstitutionName: 'BANCO DE BOGOTA' },
  { financialInstitutionCode: '007', financialInstitutionName: 'BANCO DAVIVIENDA' },
  { financialInstitutionCode: '006', financialInstitutionName: 'BANCO DE OCCIDENTE' },
  { financialInstitutionCode: '009', financialInstitutionName: 'BANCO POPULAR' },
  { financialInstitutionCode: '040', financialInstitutionName: 'BANCO BBVA COLOMBIA' },
  { financialInstitutionCode: '052', financialInstitutionName: 'BANCO FALABELLA' },
  { financialInstitutionCode: '058', financialInstitutionName: 'BANCO MUNDO MUJER' },
  { financialInstitutionCode: '060', financialInstitutionName: 'BANCO PICHINCHA' },
  { financialInstitutionCode: '062', financialInstitutionName: 'BANCO W' },
  { financialInstitutionCode: '063', financialInstitutionName: 'BANCO SERFINANZA' },
  { financialInstitutionCode: '066', financialInstitutionName: 'BANCO COOPERATIVO COOPCENTRAL' },
  { financialInstitutionCode: '067', financialInstitutionName: 'BANCO CAJA SOCIAL' },
  { financialInstitutionCode: '069', financialInstitutionName: 'BANCO AV VILLAS' },
  { financialInstitutionCode: '112', financialInstitutionName: 'BANCO PRODUBANCO' },
  { financialInstitutionCode: '120', financialInstitutionName: 'BANCO ITAU' }
];

// TTL de la caché exitosa (24 h por defecto).
const CACHE_TTL_MS: number = parseInt(process.env.BANK_LIST_CACHE_TTL_MS || '86400000', 10);
// TTL corto cuando se sirve mock por caída de PSE (para reintentar pronto).
const FALLBACK_TTL_MS: number = parseInt(process.env.BANK_LIST_FALLBACK_TTL_MS || '300000', 10);

interface BankCache {
  banks: BankItem[];
  expiresAt: number;
  source: 'pse' | 'mock';
}

let cache: BankCache | null = null;

function sortAlphabetical(banks: BankItem[]): BankItem[] {
  return [...banks].sort((a, b) =>
    a.financialInstitutionName.localeCompare(b.financialInstitutionName, 'es', { sensitivity: 'base' })
  );
}

export default {
  /**
   * Devuelve la lista de bancos ordenada. Usa caché diaria; solo llama a
   * GetBankListNF cuando la caché expiró.
   */
  async getBanks(): Promise<{ banks: BankItem[]; source: 'pse' | 'mock'; cached: boolean }> {
    const now = Date.now();

    if (cache && now < cache.expiresAt) {
      return { banks: cache.banks, source: cache.source, cached: true };
    }

    try {
      const response: PSEApiResponse = await pseService.getBankList();
      const raw = (response.banks || []) as BankItem[];

      if (!raw.length) {
        throw new Error('GetBankListNF devolvió una lista vacía');
      }

      const banks = sortAlphabetical(raw);
      cache = { banks, expiresAt: now + CACHE_TTL_MS, source: 'pse' };
      logger.info(`Lista de bancos actualizada desde PSE (${banks.length}). Próxima recarga en ${Math.round(CACHE_TTL_MS / 3600000)} h`);
      return { banks, source: 'pse', cached: false };
    } catch (error) {
      logger.warn('PSE API no disponible para GetBankListNF, usando bancos mock:', (error as Error).message);
      const banks = sortAlphabetical(MOCK_BANKS);
      // Se cachea el mock por poco tiempo para no golpear PSE en cada request
      // mientras esté degradado, pero reintentando pronto.
      cache = { banks, expiresAt: now + FALLBACK_TTL_MS, source: 'mock' };
      return { banks, source: 'mock', cached: false };
    }
  },

  /** Fuerza el refresco en la siguiente llamada (p. ej. tarea programada diaria). */
  invalidate(): void {
    cache = null;
  }
};
