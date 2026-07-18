/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_PSE_SERVICE_CODE: string
  readonly VITE_RECAPTCHA_SITE_KEY: string
  readonly VITE_POLLING_INTERVAL_MS: string
  readonly VITE_MAX_POLLING_ATTEMPTS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
