import { ref, Ref } from 'vue';
import recaptchaService from '../services/recaptcha.service';

interface UseReCaptchaReturn {
  init: () => Promise<void>;
  execute: (action?: string) => Promise<string>;
  initialized: Ref<boolean>;
  loading: Ref<boolean>;
}

export function useReCaptcha(): UseReCaptchaReturn {
  const initialized: Ref<boolean> = ref(false);
  const loading: Ref<boolean> = ref(false);

  async function init(): Promise<void> {
    if (initialized.value) return;
    loading.value = true;
    try {
      recaptchaService.init();
      initialized.value = true;
    } finally {
      loading.value = false;
    }
  }

  async function execute(action: string = 'pse_payment'): Promise<string> {
    if (!initialized.value) await init();
    return await recaptchaService.execute(action);
  }

  return { init, execute, initialized, loading };
}
