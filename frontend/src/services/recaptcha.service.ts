export default {
  init(): void {
    const siteKey: string | undefined = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    if (!siteKey) {
      console.warn('VITE_RECAPTCHA_SITE_KEY no configurado');
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  },

  async execute(action: string = 'pse_payment'): Promise<string> {
    const siteKey: string | undefined = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    if (!siteKey) {
      return '';
    }

    try {
      const grecaptcha = (window as any).grecaptcha;
      if (grecaptcha && grecaptcha.enterprise) {
        return await grecaptcha.enterprise.execute(siteKey, { action });
      } else if (grecaptcha) {
        return await grecaptcha.execute(siteKey, { action });
      }
      return '';
    } catch (error) {
      console.warn('reCAPTCHA no disponible, continuando sin el:', error);
      return '';
    }
  }
};
