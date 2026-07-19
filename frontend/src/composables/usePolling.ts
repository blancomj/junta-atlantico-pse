import { ref, Ref } from 'vue';

interface PollingResult {
  transactionState: string;
  [key: string]: unknown;
}

interface UsePollingReturn {
  isPolling: Ref<boolean>;
  attempts: Ref<number>;
  start: (
    checkFn: () => Promise<PollingResult>,
    onResult?: (result: PollingResult) => void,
    onError?: (error: Error) => void
  ) => Promise<PollingResult>;
  stop: () => void;
}

export function usePolling(): UsePollingReturn {
  const isPolling: Ref<boolean> = ref(false);
  const attempts: Ref<number> = ref(0);

  const INTERVAL_MS: number = parseInt(import.meta.env.VITE_POLLING_INTERVAL_MS || '180000', 10);
  const MAX_ATTEMPTS: number = parseInt(import.meta.env.VITE_MAX_POLLING_ATTEMPTS || '10', 10);

  // CORRECCION: se guarda el timer y el resolve de la espera para poder
  // cancelarlos al instante desde stop(). Antes, stop() ponia isPolling=false
  // pero si estabamos en medio del await de INTERVAL_MS (hasta 3 min), el
  // bucle no reaccionaba hasta que ese timer terminara.
  let timer: ReturnType<typeof setTimeout> | null = null;
  let wakeUp: (() => void) | null = null;

  function clearWait(): void {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    wakeUp = null;
  }

  async function start(
    checkFn: () => Promise<PollingResult>,
    onResult?: (result: PollingResult) => void,
    onError?: (error: Error) => void
  ): Promise<PollingResult> {
    if (isPolling.value) return { transactionState: 'ALREADY_POLLING' };
    isPolling.value = true;
    attempts.value = 0;

    while (isPolling.value && attempts.value < MAX_ATTEMPTS) {
      try {
        attempts.value++;
        const result: PollingResult = await checkFn();
        onResult?.(result);

        if (['OK', 'NOT_AUTHORIZED', 'FAILED'].includes(result.transactionState)) {
          isPolling.value = false;
          return result;
        }
      } catch (error) {
        onError?.(error as Error);
      }

      if (isPolling.value && attempts.value < MAX_ATTEMPTS) {
        await new Promise<void>((resolve) => {
          wakeUp = resolve;
          timer = setTimeout(resolve, INTERVAL_MS);
        });
        clearWait();
      }
    }

    isPolling.value = false;
    return { transactionState: 'TIMEOUT' };
  }

  function stop(): void {
    isPolling.value = false;
    // Corta la espera en curso de inmediato (no espera a que venza el timer).
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    if (wakeUp) {
      wakeUp();
      wakeUp = null;
    }
  }

  return { isPolling, attempts, start, stop };
}