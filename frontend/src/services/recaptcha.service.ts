// export default {
//   init(): void {
//     const siteKey: string | undefined = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
//     if (!siteKey) {
//       console.warn('VITE_RECAPTCHA_SITE_KEY no configurado');
//       return;
//     }

//     if (document.querySelector(`script[src*="recaptcha"]`)) {
//       return;
//     }

//     const script = document.createElement('script');
//     script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;

//     // console.log("SITE KEY =", siteKey);
//     // console.log("SCRIPT =", script.src);

//     script.async = true;
//     script.defer = true;
//     document.head.appendChild(script);
//   },

//   async waitForReady(timeout: number = 5000): Promise<boolean> {
//     const start = Date.now();
//     while (Date.now() - start < timeout) {
//       const grecaptcha = (window as any).grecaptcha;
//       if (grecaptcha && typeof grecaptcha.execute === 'function') {
//         return true;
//       }
//       await new Promise(r => setTimeout(r, 100));
//     }
//     return false;
//   },

//   async execute(action: string = 'pse_payment'): Promise<string> {
//     const siteKey: string | undefined = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
//     if (!siteKey) {
//       return '';
//     }

//     const ready = await this.waitForReady();
//     if (!ready) {
//       console.warn('reCAPTCHA no se cargo en tiempo esperado');
//       return '';
//     }

//     try {
//       const grecaptcha = (window as any).grecaptcha;
//       if (grecaptcha && grecaptcha.enterprise) {
//         return await grecaptcha.enterprise.execute(siteKey, { action });
//       } else if (grecaptcha) {
//         return await grecaptcha.execute(siteKey, { action });
//       }
//       return '';
//     } catch (error) {
//       console.warn('reCAPTCHA no disponible, continuando sin el:', error);
//       return '';
//     }
//   }
// };



/**
 * Servicio reCAPTCHA v3 (carga manual, sin plugin).
 *
 * CORRECCIONES vs version anterior:
 * 1. El script se identifica con un ID propio y se carga SIEMPRE con
 *    "?render=<SITE_KEY>" (modo v3 automatico). Antes, un selector generico
 *    ('script[src*="recaptcha"]') detectaba el script del plugin
 *    vue-recaptcha-v3 (cargado con "?render=explicit") y se saltaba la carga,
 *    dejando a grecaptcha sin cliente para el site key.
 * 2. Se espera con grecaptcha.ready(), que garantiza que el cliente del
 *    site key ya esta registrado. Antes solo se comprobaba que existiera la
 *    funcion grecaptcha.execute, lo cual ocurre ANTES del registro del
 *    cliente (condicion de carrera).
 * 3. Los fallos LANZAN error en lugar de devolver ''. Un token vacio
 *    enviado al backend se convertia en un FAIL_RECAPTCHA generico que
 *    ocultaba la causa real.
 */

const SCRIPT_ID = 'recaptcha-v3-api-script';

function getSiteKey(): string {
  const siteKey: string | undefined = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  if (!siteKey) {
    throw new Error('RECAPTCHA_UNAVAILABLE: VITE_RECAPTCHA_SITE_KEY no configurado');
  }
  return siteKey;
}

export default {
  init(): void {
    let siteKey: string;
    try {
      siteKey = getSiteKey();
    } catch {
      console.warn('VITE_RECAPTCHA_SITE_KEY no configurado');
      return;
    }

    // Deduplicar SOLO contra nuestro propio script (por ID),
    // no contra cualquier script que contenga "recaptcha" en la URL.
    if (document.getElementById(SCRIPT_ID)) {
      return;
    }

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  },

  /**
   * Espera a que api.js este cargado Y el cliente del site key registrado.
   * Lanza error si no ocurre dentro del timeout.
   */
  async waitForReady(timeout: number = 10000): Promise<void> {
    const start = Date.now();

    // 1) Esperar a que window.grecaptcha exista con su metodo ready()
    while (Date.now() - start < timeout) {
      const grecaptcha = (window as any).grecaptcha;
      if (grecaptcha && typeof grecaptcha.ready === 'function') {
        // 2) ready() resuelve cuando el cliente del site key esta registrado
        await new Promise<void>((resolve) => grecaptcha.ready(resolve));
        return;
      }
      await new Promise((r) => setTimeout(r, 100));
    }

    throw new Error(
      'RECAPTCHA_UNAVAILABLE: el script de reCAPTCHA no cargo en el tiempo esperado'
    );
  },

  /**
   * Genera un token v3 para la accion indicada.
   * Lanza error si reCAPTCHA no esta disponible (NUNCA devuelve '').
   */
  async execute(action: string = 'pse_payment'): Promise<string> {
    const siteKey = getSiteKey();

    // Asegurar que el script este inyectado aunque init() no se haya llamado
    this.init();
    await this.waitForReady();

    const grecaptcha = (window as any).grecaptcha;
    const token: string = await grecaptcha.execute(siteKey, { action });

    if (!token) {
      throw new Error('RECAPTCHA_UNAVAILABLE: Google devolvio un token vacio');
    }

    return token;
  }
};
