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
        await new Promise(r => setTimeout(r, INTERVAL_MS));
      }
    }

    isPolling.value = false;
    return { transactionState: 'TIMEOUT' };
  }

  function stop(): void {
    isPolling.value = false;
  }

  return { isPolling, attempts, start, stop };
}
