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
  // Datos del comercio para el comprobante (Requisito PSE #11)
  readonly VITE_COMPANY_NIT: string
  readonly VITE_COMPANY_NAME: string
  // Contacto para estados PENDING / error (Requisitos PSE #6, #7, #11)
  readonly VITE_CONTACT_PHONE: string
  readonly VITE_CONTACT_EMAIL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}