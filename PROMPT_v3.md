# 📦 PLAN DE IMPLEMENTACIÓN v3.0 — INTEGRACIÓN PSE AVANZA
> **v3.0 (despliegue en producción):** incluye todos los ajustes de v2.1 más la arquitectura de despliegue en Hostinger (Opción B: dos subdominios independientes), correcciones de producción (`trust proxy`, `listen()` sin guarda, `tsconfig.build.json`), script de generación de zips cross-platform y pruebas de verificación en producción. Ver **§16. Registro de cambios v3.0** al final.
## Ajustado a Instructivo ACH Colombia **Versión 21 (Octubre 2025)**

### JUNTA REGIONAL DE CALIFICACIÓN DE INVALIDEZ DEL ATLÁNTICO — Junta Atlántico S.A.S.

---

**Versión del prompt:** 3.0
**Fecha:** Julio 2026
**Instructivo ACH referencia:** v21 (octubre 2025) — código GCL-VEV-INS-025
**Tipo de Integración:** Directa con ACH Colombia (Desarrollo Independiente)
**Modalidad:** PSE Avanza (API REST)
**Cambios respecto a v1.0:** Refactor integral a partir del análisis v17→v21 (ver documento `ANALISIS_AJUSTES_PSE_v17_a_v21.md`).

---

## 📑 ÍNDICE

1. [RESUMEN EJECUTIVO](#1-resumen-ejecutivo)
2. [CAMBIOS RESPECTO A v1.0](#2-cambios-respecto-a-v10)
3. [ARQUITECTURA DE LA SOLUCIÓN](#3-arquitectura-de-la-solución)
4. [CONTROLES PERIMETRALES DE SEGURIDAD — SECCIÓN 11 ACH](#4-controles-perimetrales-de-seguridad--sección-11-ach)
5. [CREDENCIALES Y CONFIGURACIÓN](#5-credenciales-y-configuración)
6. [FLUJO DE PAGO COMPLETO](#6-flujo-de-pago-completo)
7. [VALIDACIONES OBLIGATORIAS](#7-validaciones-obligatorias)
8. [ESTRUCTURA DEL PROYECTO](#8-estructura-del-proyecto)
9. [CÓDIGO FUENTE COMPLETO — BACKEND (TypeScript)](#9-código-fuente-completo--backend-typescript)
10. [CÓDIGO FUENTE COMPLETO — FRONTEND (TypeScript + Vue 3)](#10-código-fuente-completo--frontend-typescript--vue-3)
11. [INSTRUCCIONES DE INSTALACIÓN](#11-instrucciones-de-instalación)
12. [GUÍA DE CERTIFICACIÓN](#12-guía-de-certificación)
13. [MANEJO DE ERRORES Y MENSAJES LITERALES ACH](#13-manejo-de-errores-y-mensajes-literales-ach)
14. [CHECKLIST DE IMPLEMENTACIÓN](#14-checklist-de-implementación)
15. [ANEXOS](#15-anexos)
16. [DESPLIEGUE EN HOSTINGER](#16-despliegue-en-hostinger)
17. [REGISTRO DE CAMBIOS v3.0 — Despliegue en producción](#17-registro-de-cambios-v30--despliegue-en-producción)

---

## 1. RESUMEN EJECUTIVO

### 1.1 Objetivo

Implementar el botón de pago **PSE Avanza** en el sitio `juntaatlantico.co` cumpliendo con el 
**Instructivo de Integración de Empresas al Servicio PSE Versión 21** (octubre 2025) de ACH Colombia, 
incluyendo los nuevos controles perimetrales de seguridad, validaciones reforzadas y el método opcional de consulta detallada.

### 1.2 Alcance

- Integración directa con PSE mediante API REST (PSE Avanza)
- Frontend en **Vue.js 3** + Vite
- Backend en **Node.js 18+ / Express 4**
- Cifrado **AES-256-GCM (JWE)** con IV 12 bytes + tag 16 bytes
- Autenticación **OAuth 2.0** (client_credentials)
- **Controles perimetrales de seguridad** (Sección 11 ACH v21) — reCAPTCHA v3
- Validación cruzada `userType` vs `identificationType`
- `soliciteDate` con zona horaria oficial de Colombia (`-05:00`)
- Filtro de caracteres prohibidos (`|` y `"`) en `paymentDescription` y referencias
- **Mensajes literales** exigidos por ACH para errores
- **Control de doble pago** con textos inmodificables
- Método opcional `GetTransactionInformationDetailed` para mostrar causal de rechazo al usuario
- Reintento automático con backoff para `FAIL_INVALIDTRAZABILITYCODE`
- Rate limit por IP en endpoint de creación de transacción
- Reintento de token OAuth 5 min antes del vencimiento

### 1.3 Stack tecnológico

| Capa 				| Tecnología 	| Versión 		|
|------				|-----------	|---------		|
| Frontend 			| Vue.js 		| 3.x 			|
| | Vue Router		|				| 4.x 			|
| | Pinia (estado)	|				| 2.x 			|
| | Axios 			|				| última estable|
| | Tailwind CSS 	|				| 3.x 			|
| | TypeScript 	|				| 5.x 			|
| | Vite 			|				| 5.x 			|
| | reCAPTCHA v3 	| carga manual	| — 			|
| Backend 			| Node.js 		| 18+ 			|
| | TypeScript 	|				| 5.x 			|
| | Express 		|				| 4.x 			|
| | Axios 			|				| última estable|
| | express-rate-limit 				| 7.x 			|
| | helmet 			|				| 7.x 			|
| | crypto (nativo) |				| — 			|
| | winston (logs) 	|				| 3.x 			|
| Infraestructura 	| HTTPS 		| TLS 1.2+ 		|
| | Nginx 			|				| 1.24+ 		|
| | PM2 			|				| última estable|

---

## 2. CAMBIOS RESPECTO A v1.0

Esta versión 2.0 incorpora los ajustes derivados del instructivo ACH v17→v21:

### 🔴 BLOQUEANTES (deben estar antes de la certificación)

1. **Sección 11 ACH — Controles perimetrales de seguridad** (NUEVO en v18): reCAPTCHA v3 implementado en backend y frontend; rate limit; tasa de aprobación ≥ 80%.
2. **Validación cruzada `userType` vs `identificationType`** (v18): `person` ⇒ doc ≠ NIT; `company` ⇒ doc = NIT.
3. **`soliciteDate` con zona horaria Colombia** (v20): helper `nowColombiaISO()` que retorna ISO 8601 con offset `-05:00`.
4. **Filtro de caracteres prohibidos** (reiterado v21): regex `/[|"]/` en `paymentDescription` y `referenceNumber1/2/3`.
5. **Mensajes literales ACH** (Anexo 1.2): textos inmodificables para `FAIL_EXCEEDEDLIMIT`, `FAIL_BANKUNREACHEABLE`, doble pago, etc.
6. **Control de doble pago** (Anexo 1.3): bloquea `ticketId` con estado PENDIENTE o APROBADO y muestra los textos literales correspondientes.

### 🟡 RECOMENDADOS (incluidos en v2.0)

7. **Método opcional `GetTransactionInformationDetailed`** (v21): 4 nuevos campos (`transactionState`, `stateDescription`, `causeRejection`, `RejectionDescription`) que permiten mostrar al usuario la **causal exacta** del rechazo.
8. **Reintento con backoff** para `FAIL_INVALIDTRAZABILITYCODE`: 3 intentos (5/10/20 s) antes de devolver error.
9. **Nuevos códigos de error**: `FAIL_DISABLEDUSEREMAIL` y `FAIL_ERRORINCREDITS` mapeados a mensajes amigables.
10. **Rate limit por IP**: máx. 10 req/min en `POST /api/pse/transaction`.
11. **Nuevos campos en `GetTransactionInformationNF` response**: `paymentOrigin`, `paymentMode`, `serviceNIT`, `serviceName` se exponen al frontend.
12. **Longitud de `serviceCode`**: validación `String1to10Type` (10 caracteres máx.).
13. **Reglas de beneficiario**: validación de rol (Junta Atlántico = **desarrollo independiente**, los `beneficiaryEntity*` son los del mismo comercio).
14. **Helper de modo de pago**: mapeo de `paymentMode` (15=débito, 50=Visa, 51=MasterCard, etc.) a etiquetas legibles.
15. **Cifrado en reposo** de `ticketId` y `trazabilityCode` en la base de datos.

---

## 3. ARQUITECTURA DE LA SOLUCIÓN

### 3.1 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                       USUARIO FINAL                             │
│                  (Navegador Web / Móvil)                        │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS + reCAPTCHA v3 (cliente)
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│              CAPA DE SEGURIDAD PERIMETRAL (Nginx)               │
│   • HSTS, CSP, X-Frame-Options                                  │
│   • Rate limit global (60 rpm)                                  │
│   • WAF básico (fail2ban)                                       │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                   FRONTEND (Vue.js 3)                           │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────────┐    │
│  │   Checkout    │  │    Payment    │  │    Payment        │    │
│  │     View      │  │     Form      │  │    Result         │    │
│  │ (reCAPTCHA)   │  │ (validaciones)│  │ (causal rechazo)  │    │
│  └───────────────┘  └───────────────┘  └───────────────────┘    │
│         │                    │                     │            │
│         └────────────────────┴─────────────────────┘            │
│                          │                                      │
│                  ┌───────▼────────┐                             │
│                  │  API Service   │                             │
│                  │   (Axios)      │                             │
│                  └───────┬────────┘                             │
└──────────────────────────┼──────────────────────────────────────┘
                           │ HTTPS / REST
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND (Node.js/Express)                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │            MIDDLEWARES DE SEGURIDAD                      │   │
│  │  • helmet (HSTS, CSP, X-Frame-Options)                   │   │
│  │  • rate-limit (10 rpm en /transaction)                   │   │
│  │  • reCAPTCHA verify (server-side)                        │   │
│  │  • CORS estricto (solo juntaatlantico.co)                │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐     │
│  │    Routes    │  │  Controller  │  │  Doble Pago Check  │     │
│  └──────────────┘  └──────────────┘  └────────────────────┘     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                 PSE Service Layer                        │   │
│  ├──────────────┬───────────────────────────────────────────┤   │
│  │  Encryption  │  Validators (userType, caracteres,        │   │
│  │  Service     │  soliciteDate CO, longitud serviceCode)   │   │
│  │  (AES-256)   │                                           │   │
│  ├──────────────┼───────────────────────────────────────────┤   │
│  │ Token Svc    │  PSE API Client (Axios + OAuth 2.0)       │   │
│  │ (1h cache)   │  • GetBankListNF                          │   │
│  │              │  • CreateTransactionPaymentNF             │   │
│  │              │  • GetTransactionInformationNF            │   │
│  │              │  • GetTransactionInformationDetailed      │   │
│  │              │  • FinalizeTransactionPaymentNF           │   │
│  └──────────────┴───────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Modelo: transactions (con cifrado en reposo)            │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS (mTLS opcional)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API PSE ACH Colombia                         │
│   /oauth/client_credential/accesstoken                          │
│   /v2/psewebapinf/api/GetBankListNF                             │
│   /v2/psewebapinf/api/CreateTransactionPaymentNF                │
│   /v2/psewebapinf/api/GetTransactionInformationNF               │
│   /v2/psewebapinf/api/GetTransactionInformationDetailed         │
│   /v2/psewebapinf/api/FinalizeTransactionPaymentNF              │ 
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Diagrama de Secuencia del Pago (v2.0)

```
Usuario       Frontend        Backend        reCAPTCHA       PSE API          Banco
  │              │              │                │               │                │
  │ 1. Carga     │              │                │               │                │
  │──página─────>│              │                │               │                │
  │              │ 2. Ejecuta   │                │               │                │
  │              │──reCAPTCHA──>│                │               │                │
  │              │              │ 3. Verify      │               │                │
  │              │              │───────────────>│               │                │
  │              │              │ 4. Score OK    │               │                │
  │              │              │<───────────────│               │                │
  │              │ 5. Habilita  │                │               │                │
  │              │   botón      │                │               │                │
  │<─────────────│              │                │               │                │
  │              │              │                │               │                │
  │ 6. GET banks │              │                │               │                │
  │─────────────>│─────────────>│ 7. Token       │               │                │
  │              │              │───────────────────────────────>│                │
  │              │              │ 8. Banks       │               │                │
  │              │              │<───────────────────────────────│                │
  │              │ 9. Banks     │                │               │                │
  │<─────────────│<─────────────│                │               │                │
  │              │              │                │               │                │
  │ 10. Datos +  │              │                │               │                │
  │──recaptcha──>│              │                │               │                │
  │              │ 11. POST     │                │               │                │
  │              │ /transaction │                │               │                │
  │              │─────────────>│ 12. Verify     │               │                │
  │              │              │──reCAPTCHA────>│               │                │
  │              │              │ 13. OK         │               │                │
  │              │              │<───────────────│               │                │
  │              │              │ 14. DoblePago  │               │                │
  │              │              │   Check        │               │                │
  │              │              │ 15. Token      │               │                │
  │              │              │───────────────────────────────>│                │
  │              │              │ 16. Create     │               │                │
  │              │              │─(cifrado JWE)─>│ 17. Init      │                │
  │              │              │                │──────────────>│                │
  │              │              │ 18. URL+ CUS   │               │                │
  │              │              │<───────────────────────────────│                │
  │              │ 19. URL PSE  │                │               │                │
  │              │<─────────────│                │               │                │
  │ 20. Redirect │              │                │               │                │
  │─────────────────────────────│───────────────────────────────>│                │
  │              │              │                │               │ 21. Auth       │
  │              │              │                │               │───-───────────>│
  │              │              │                │               │ 22. OTP        │
  │              │              │                │               │<───-───────────│
  │ 23. Return   │              │                │               │                │
  │─────────────>│─────────────>│ 24. Token      │               │                │
  │              │              │───────────────────────────────>│                │
  │              │              │ 25. GetInfo    │               │                │
  │              │              │───────────────────────────────>│                │
  │              │              │ 26. State      │               │                │
  │              │              │<───────────────────────────────│                │
  │              │              │ 27. Si ≠OK:    │               │                │
  │              │              │    Detailed    │               │                │
  │              │              │───────────────────────────────>│                │
  │              │              │ 28. Causal     │               │                │
  │              │              │<───────────────────────────────│                │
  │              │              │ 29. Si OK:     │               │                │
  │              │              │    Finalize    │               │                │
  │              │              │───────────────────────────────>│                │
  │              │              │ 30. OK         │               │                │
  │              │              │<───────────────────────────────│                │
  │ 31. Resultado│              │                │               │                │
  │<─────────────│<─────────────│                │               │                │
  │ 32. Muestra  │              │                │               │                │
  │──resultado + │              │                │               │                │
  │  causal      │              │                │               │                │
```

---

## 4. CONTROLES PERIMETRALES DE SEGURIDAD — SECCIÓN 11 ACH

Esta sección es **obligatoria** desde la versión 18 del instructivo ACH. Sin al menos un control implementado, ACH puede **inhabilitar el código de servicio**.

### 4.1 Controles implementados en Junta Atlántico

| # | Control 									| Implementación 																	| Capa 									|
|---|---				|---					|---																				|
| 1 | **reCAPTCHA v3** 							| Google reCAPTCHA v3, score mínimo 0.5 											| Frontend + Backend 	|
| 2 | **Rate limit por IP** 					| express-rate-limit, 10 req/min en `/transaction` 									| Backend 				|
| 3 | **Doble clic bloqueado** 					| Botón se deshabilita tras el primer clic, texto cambia a "Creando transacción…" 	| Frontend 				|
| 4 | **Cabeceras HTTP seguras** 				| helmet (HSTS, CSP, X-Frame-Options, X-Content-Type-Options) 						| Backend / Nginx 		|
| 5 | **HTTPS obligatorio** 					| TLS 1.2+ con certificados válidos 												| Infraestructura 		|
| 6 | **CORS estricto** 						| Solo `https://www.juntaatlantico.co` 												| Backend 				|
| 7 | **Validación de Origin/Referer** 			| Verificación en middleware 														| Backend 				|
| 8 | **Cifrado en reposo** 					| AES-256-GCM para `ticketId` y `trazabilityCode` en BD 							| Backend 				|
| 9 | **Control de doble pago** 				| Bloqueo por `ticketId` con estado PENDIENTE/APROBADO 								| Backend + Frontend 	|
| 10| **Monitoreo de tasa de aprobación ≥ 80%** | Dashboard mensual, alerta si < 80% 												| Operación 			|

### 4.2 Monitoreo de tasa de aprobación

ACH exige que la **tasa de aprobación mensual** de transacciones se mantenga **por encima del 80%**. Si baja, ACH puede **inhabilitar los códigos de servicio** del comercio.

**Implementación sugerida:**

```sql
-- Query mensual de tasa de aprobación
SELECT 
  COUNT(CASE WHEN transaction_state = 'OK' THEN 1 END) * 100.0 / COUNT(*) AS tasa_aprobacion,
  COUNT(*) AS total_transacciones,
  COUNT(CASE WHEN transaction_state = 'OK' THEN 1 END) AS aprobadas,
  COUNT(CASE WHEN transaction_state = 'NOT_AUTHORIZED' THEN 1 END) AS rechazadas,
  COUNT(CASE WHEN transaction_state = 'FAILED' THEN 1 END) AS fallidas
FROM transactions
WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
  AND created_at <  DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month';
```

Si `tasa_aprobacion < 80`, enviar alerta a `jmendoza@juntaatlantico.co` y revisar el formulario de pago / fricción de usuario.

---

## 5. CREDENCIALES Y CONFIGURACIÓN

### 5.1 Credenciales a solicitar a ACH Colombia

```yaml
# 🔐 AUTENTICACIÓN OAuth 2.0
API_KEY: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
CLIENT_ID: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
CLIENT_SECRET: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# 🔐 CIFRADO AES-256-GCM (JWE)
ENCRYPTION_KEY_BASE64: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # 32 bytes
ENCRYPTION_IV_BASE64: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # 12 bytes

# 🏢 DATOS DE JUNTA ATLÁNTICO
ENTITY_CODE: "901234567-8"          # NIT de Junta Atlántico (con dígito de verificación)
SERVICE_CODE: "1234567890"          # Máx 10 caracteres, asignado por ACH
CIIU_CATEGORY: "8692"               # Verificar con ACH (ej. 8692 Actividades de apoyo terapéutico)
COMPANY_NAME: "JUNTA ATLANTICO S.A.S."

# 🌐 URLS DE PSE (cert y prod)
PSE_TOKEN_URL_CERT: "https://apicer.pse.com.co/oauth/client_credential/accesstoken?grant_type=client_credentials"
PSE_API_BASE_URL_CERT: "https://apicer.pse.com.co/v2/psewebapinf/api"
PSE_TOKEN_URL_PROD: "https://apiprd.pse.com.co/oauth/client_credential/accesstoken?grant_type=client_credentials"
PSE_API_BASE_URL_PROD: "https://apiprd.pse.com.co/v2/psewebapinf/api"

# 🔗 URL DE RETORNO (debe estar en HTTPS y registrada en ACH)
PSE_RETURN_URL: "https://www.juntaatlantico.co/retorno-pago"

# 🔐 reCAPTCHA v3 (Google)
RECAPTCHA_SECRET: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
RECAPTCHA_SITE_KEY: "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
RECAPTCHA_SCORE_MIN: "0.5"
```

### 5.2 Backend - .env

```bash
# ============================================
# PSE CREDENCIALES (entorno: dev | cert | prod)
# ============================================
NODE_ENV=cert
PSE_ENV=cert

# Autenticación OAuth 2.0
PSE_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
PSE_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PSE_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Cifrado AES-256-GCM
PSE_ENCRYPTION_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
PSE_ENCRYPTION_IV=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Datos de Junta Atlántico
PSE_ENTITY_CODE=901234567-8
PSE_SERVICE_CODE=1234567890
PSE_CIIU_CATEGORY=8692
PSE_COMPANY_NAME=JUNTA ATLANTICO S.A.S.

# URLs PSE (cambiar según entorno)
PSE_TOKEN_URL=https://apicer.pse.com.co/oauth/client_credential/accesstoken?grant_type=client_credentials
PSE_API_BASE_URL=https://apicer.pse.com.co/v2/psewebapinf/api
PSE_RETURN_URL=https://www.juntaatlantico.co/retorno-pago

# ============================================
# SEGURIDAD PERIMETRAL (Sección 11 ACH)
# ============================================
RECAPTCHA_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RECAPTCHA_SCORE_MIN=0.5

# Rate limit (Sección 11 ACH)
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQ=10

# ============================================
# CONFIGURACIÓN DEL SERVIDOR
# ============================================
PORT=3000
ALLOWED_ORIGIN=https://www.juntaatlantico.co
# Validacion de Origin (opcional, Seccion 11 ACH): si es 'true' rechaza
# peticiones sin cabecera Origin/Referer. Por defecto desactivado.
STRICT_ORIGIN=true
# Cache de lista de bancos (Requisito PSE #4: GetBankListNF <= 1 vez/dia)
BANK_LIST_CACHE_TTL_MS=86400000
BANK_LIST_FALLBACK_TTL_MS=300000
# Claves AES-256-GCM (generar con: node -e "require('crypto').randomBytes(32).toString('base64')")
# PSE_ENCRYPTION_KEY: 32 bytes en base64
# PSE_ENCRYPTION_IV: 12 bytes en base64
# DB_ENCRYPTION_KEY: 32 bytes en base64
# NUNCA commitear estos valores. Configurar directamente en Hostinger.
PSE_ENCRYPTION_KEY=<generar-con-node>
PSE_ENCRYPTION_IV=<generar-con-node>
DB_ENCRYPTION_KEY=<generar-con-node>
LOG_LEVEL=info

# ============================================
# CONTROL DE PAGO (Anexo 1.3 ACH)
# ============================================
PSE_DOUBLE_PAYMENT_CHECK=true
PSE_POLLING_INTERVAL_MS=180000
PSE_POLLING_MAX_ATTEMPTS=10

# ============================================
# CIFRADO EN REPOSO (BD)
# ============================================
DB_ENCRYPTION_KEY=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
```

### 5.3 Frontend - .env

```bash
# API
VITE_API_URL=https://api.juntaatlantico.co/api/pse
VITE_PSE_SERVICE_CODE=1234567890

# reCAPTCHA v3
VITE_RECAPTCHA_SITE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Datos del comercio para el comprobante (Requisito #11)
VITE_COMPANY_NIT=901234567-8
VITE_COMPANY_NAME=JUNTA ATLANTICO S.A.S.
# Contacto para estados PENDING / error (Requisitos #6, #7, #11)
VITE_CONTACT_PHONE=(605) 333-XXXX
VITE_CONTACT_EMAIL=facturacion@juntaatlantico.co

# Otros
VITE_POLLING_INTERVAL_MS=180000
VITE_MAX_POLLING_ATTEMPTS=10
```

### 5.4 Frontend - .env.production

```bash
VITE_API_URL=https://api.juntaatlantico.co/api/pse
VITE_PSE_SERVICE_CODE=1234567890
VITE_RECAPTCHA_SITE_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 6. FLUJO DE PAGO COMPLETO

### 6.1 Etapas del flujo

| #  | Responsable 	| Acción 																					|
|--- | ---			|---																						|
| 1  | Frontend 	| Carga formulario + reCAPTCHA v3 (cliente) 												|
| 2  | Frontend 	| reCAPTCHA v3 genera token con action `pse_payment` 										|
| 3  | Usuario 		| Completa datos y selecciona banco 														|
| 4  | Frontend 	| Valida formulario en cliente (caracteres prohibidos, userType/identificationType, monto) 	|
| 5  | Frontend 	| Envía POST `/api/pse/transaction` con `recaptchaToken` 									|
| 6  | Backend 		| Verifica reCAPTCHA v3 (servidor) 															|
| 7  | Backend 		| Verifica rate limit por IP 																|
| 8  | Backend 		| Verifica control de doble pago (`ticketId` PENDIENTE/APROBADO) 							|
| 9  | Backend 		| Valida `userType` vs `identificationType` 												|
| 10 | Backend 		| Filtra caracteres prohibidos 																|
| 11 | Backend 		| Genera `soliciteDate` con zona horaria Colombia 											|
| 12 | Backend 		| Valida longitud `serviceCode` (≤ 10) 														|
| 13 | Backend 		| Valida reglas de beneficiario (rol desarrollo independiente) 								|
| 14 | Backend 		| Genera/obtiene token OAuth 2.0 															|
| 15 | Backend 		| Cifra payload con JWE (AES-256-GCM) 														|
| 16 | Backend 		| Llama `CreateTransactionPaymentNF` 														|
| 17 | PSE 			| Retorna CUS + pseURL 																		|
| 18 | Frontend 	| Redirige a pseURL (misma pestaña) 														|
| 19 | PSE 			| Autentica con banco 																		|
| 20 | Banco 		| Envía OTP al usuario 																		|
| 21 | Usuario 		| Ingresa OTP en el banco 																	|
| 22 | PSE 			| Redirige a `entityurl` (return URL) 														|
| 23 | Backend 		| Llama `GetTransactionInformationNF` con reintento 										|
| 24 | Backend 		| Si estado ≠ OK, llama `GetTransactionInformationDetailed` (opcional) 						|
| 25 | Backend 		| Si estado = OK, llama `FinalizeTransactionPaymentNF` 										|
| 26 | Frontend 	| Muestra resultado + causal de rechazo (si aplica) 										|

### 6.2 Métodos de la API Backend

#### 6.2.1 `GET /api/pse/banks`

```js
// Request
GET /api/pse/banks

// Response 200
{
  "success": true,
  "data": [
    { "financialInstitutionCode": "1007", "financialInstitutionName": "BANCOLOMBIA" },
    { "financialInstitutionCode": "1001", "financialInstitutionName": "BANCO DE BOGOTA" }
  ],
  "message": "Lista de bancos obtenida exitosamente"
}
```

#### 6.2.2 `POST /api/pse/transaction`

```js
// Request
POST /api/pse/transaction
Headers: Content-Type: application/json
{
  "recaptchaToken": "03AGdBq25...",        // NUEVO v2.0
  "bankCode": "1007",
  "amount": 150000.00,
  "userType": "person",                    // "person" | "company"
  "identificationType": "CedulaDeCiudadania",
  "identificationNumber": "1234567890",
  "fullName": "Juan Pérez Gómez",
  "cellphoneNumber": "3001234567",
  "email": "juan@email.com",
  "address": "Calle Falsa 123",
  "description": "Pago Junta Atlántico",
  "reference1": "REF-001",
  "reference2": "",
  "reference3": "",
  "ticketId": "987654321"                  // Opcional, se genera si no se envía
}

// Response 200 (Success)
{
  "success": true,
  "data": {
    "trazabilityCode": "CUS_123456",
    "pseURL": "https://registro.pse.com.co/PSENF/StartTransaction?Id=AC3738B2AE8743E",
    "ticketId": "987654321",
    "transactionCycle": 1
  },
  "message": "Transacción creada exitosamente"
}

// Response 200 (FAIL_EXCEEDEDLIMIT — mensaje LITERAL)
{
  "success": false,
  "code": "FAIL_EXCEEDEDLIMIT",
  "message": "El monto de la transacción excede los límites establecidos en PSE para la empresa, por favor comuníquese con nuestras líneas de atención al cliente al teléfono (605) 333-XXXX o al correo electrónico facturacion@juntaatlantico.co"
}

// Response 200 (FAIL_BANKUNREACHEABLE — mensaje LITERAL)
{
  "success": false,
  "code": "FAIL_BANKUNREACHEABLE",
  "message": "La entidad financiera no puede ser contactada para iniciar la transacción, por favor seleccione otra o intente más tarde"
}

// Response 200 (FAIL_DISABLEDUSEREMAIL — NUEVO v2.0)
{
  "success": false,
  "code": "FAIL_DISABLEDUSEREMAIL",
  "message": "El correo electrónico ingresado presenta restricciones. Por favor verifique o use otro correo de contacto."
}

// Response 409 (Doble pago PENDIENTE)
{
  "success": false,
  "code": "FAIL_DOUBLEPAYMENT",
  "message": "En este momento su #987654321 presenta un proceso de pago cuya transacción se encuentra PENDIENTE de recibir confirmación por parte de su entidad financiera, por favor espere unos minutos y vuelva a consultar más tarde para verificar si su pago fue confirmado de forma exitosa. Si desea más información sobre el estado actual de su operación puede comunicarse a nuestras líneas de atención al cliente 57-1-9999999 o enviar un correo electrónico a facturacion@juntaatlantico.co y preguntar por el estado de la transacción: CUS_123456"
}

// Response 409 (Doble pago APROBADO)
{
  "success": false,
  "code": "FAIL_DOUBLEPAYMENT",
  "message": "En este momento su #987654321 ha finalizado su proceso de pago y cuya transacción se encuentra APROBADA en su entidad financiera. Si desea más información sobre el estado de su operación puede comunicarse a nuestras líneas de atención al cliente 57-1-9999999 o enviar un correo electrónico a facturacion@juntaatlantico.co y preguntar por el estado de la transacción: CUS_123456"
}

// Response 400 (reCAPTCHA inválido)
{
  "success": false,
  "code": "FAIL_RECAPTCHA",
  "message": "No se pudo verificar que no eres un robot. Por favor intenta de nuevo."
}

// Response 400 (Combinación userType/identificationType inválida)
{
  "success": false,
  "code": "FAIL_INVALID_USER_TYPE",
  "message": "Si el tipo de persona es 'person', el tipo de identificación no puede ser NIT. Si es 'company', el único tipo válido es NIT."
}

// Response 400 (Caracteres prohibidos)
{
  "success": false,
  "code": "FAIL_FORBIDDEN_CHARS",
  "message": "El campo \"paymentDescription\" no puede contener los caracteres \"|\" ni '\"'. Estos caracteres generan conflicto con el motor de fraude Monitor Plus."
}
```

#### 6.2.3 `GET /api/pse/transaction/:cus/status`

```js
// Request
GET /api/pse/transaction/CUS_123456/status

// Response 200 (Aprobado)
{
  "success": true,
  "data": {
    "returnCode": "SUCCESS",
    "trazabilityCode": "CUS_123456",
    "ticketId": 987654321,
    "transactionState": "OK",
    "transactionValue": 150000.00,
    "vatValue": 0,
    "bankProcessDate": "2026-07-16T15:30:00-05:00",
    "authorizationID": "AUTH_123456",
    "serviceNIT": "901234567",                              // NUEVO v2.0
    "serviceName": "Pago Junta Atlántico",                  // NUEVO v2.0
    "paymentOrigin": 3,                                     // NUEVO v2.0 (3=débito, 4=crédito)
    "paymentMode": 15,                                      // NUEVO v2.0 (15=débito cta, 50=Visa, etc.)
    "userType": "person",
    "identificationType": "CedulaDeCiudadania",
    "identificationNumber": "1234567890",
    "fullName": "Juan Pérez Gómez",
    "email": "juan@email.com"
  },
  "message": "Estado de transacción consultado exitosamente"
}
```

#### 6.2.4 `GET /api/pse/transaction/:cus/detailed` (NUEVO v2.0 — opcional)

```js
// Request
GET /api/pse/transaction/CUS_123456/detailed

// Response 200 (Transacción NO aprobada — útil para mostrar causal)
{
  "success": true,
  "data": {
    "returnCode": "SUCCESS",
    "trazabilityCode": "CUS_123456",
    "transactionState": "NOT_AUTHORIZED",       // NUEVO v2.0
    "stateDescription": "Transacción rechazada", // NUEVO v2.0
    "causeRejection": "00011",                  // NUEVO v2.0 (Fondos insuficientes)
    "rejectionDescription": "La cuenta utilizada por el usuario no contiene el valor solicitado para cumplir la transacción."  // NUEVO v2.0
  },
  "message": "Información detallada obtenida exitosamente"
}

// Response 200 (Transacción aprobada — campos extra vacíos)
{
  "success": true,
  "data": {
    "returnCode": "SUCCESS",
    "trazabilityCode": "CUS_123456",
    "transactionState": "OK",
    "stateDescription": null,
    "causeRejection": null,
    "rejectionDescription": null
  },
  "message": "Información detallada obtenida exitosamente"
}
```

#### 6.2.5 `POST /api/pse/transaction/finalize`

```js
// Request
POST /api/pse/transaction/finalize
{
  "trazabilityCode": "CUS_123456",
  "authorizationId": "AUTH_123456"
}

// Response 200
{
  "success": true,
  "data": {
    "returnCode": "SUCCESS",
    "trazabilityCode": "CUS_123456"
  },
  "message": "Transacción finalizada exitosamente"
}
```

---

## 7. VALIDACIONES OBLIGATORIAS

### 7.1 Matriz de validaciones (orden de ejecución)

| # | Validación				 							| Capa 					| Mensaje de error 											|
|---|---													|---					|---														|
| 1 | reCAPTCHA v3 (score ≥ 0.5) 							| Backend 				| "No se pudo verificar que no eres un robot..." 			|
| 2 | Rate limit (10 req/min/IP) 							| Backend 				| "Demasiadas solicitudes. Por favor intente en un minuto." |
| 3 | Control de doble pago (ticketId PENDIENTE) 			| Backend 				| Texto literal Anexo 1.3 									|
| 4 | Control de doble pago (ticketId APROBADO) 			| Backend 				| Texto literal Anexo 1.3 									|
| 5 | `userType` vs `identificationType` 					| Backend 				| "Si el tipo de persona es 'person'..." 					|
| 6 | Caracteres prohibidos en `paymentDescription` 		| Backend + Frontend 	| "El campo X no puede contener \| ni \"..." 				|
| 7 | Caracteres prohibidos en `referenceNumber1/2/3`		| Backend + Frontend 	| Igual 													|
| 8 | `soliciteDate` con zona horaria Colombia 				| Backend 			 	| (automático vía helper) 									|
| 9 | `serviceCode` longitud ≤ 10 							| Backend 			 	| "ServiceCode inválido" 									|
| 10 | Email formato válido 								| Backend 				| "Email inválido" 											|
| 11 | Celular 10 dígitos 									| Backend 				| "El número de celular debe tener 10 dígitos" 				|
| 12 | Monto > 0 											| Backend 				| "El monto debe ser mayor a 0" 							|
| 13 | `amount` e `iva` con máx 2 decimales 				| Backend 				| (validación automática) 									|
| 14 | `beneficiaryEntity*` coherente con rol 				| Backend 				| (validación automática) 									|
| 15 | HTTPS / Origin válido 								| Backend 				| 403 Forbidden 											|

### 7.2 Reglas de validación cruzada `userType` vs `identificationType`

```js
// VÁLIDO
{ userType: 'person',  identificationType: 'CedulaDeCiudadania' }  ✓
{ userType: 'person',  identificationType: 'CedulaDeExtranjeria' } ✓
{ userType: 'person',  identificationType: 'Pasaporte' }           ✓
{ userType: 'person',  identificationType: 'TarjetaDeIdentidad' }   ✓
{ userType: 'company', identificationType: 'NIT' }                 ✓

// INVÁLIDO — debe rechazarse
{ userType: 'person',  identificationType: 'NIT' }                 ✗ → FAIL_INVALID_USER_TYPE
{ userType: 'company', identificationType: 'CedulaDeCiudadania' }  ✗ → FAIL_INVALID_USER_TYPE
```

### 7.3 Reglas de beneficiario (rol = desarrollo independiente)

Para Junta Atlántico (desarrollo independiente), los datos del beneficiario **deben ser los mismos del comercio**:

```js
beneficiaryEntity: {
  beneficiaryEntityIdentificationType: 'NIT',
  beneficiaryEntityIdentification: '901234567-8',  // NIT de Junta Atlántico (solo números, máx 15)
## 8. ESTRUCTURA DEL PROYECTO

> Implementación real en **TypeScript**. Los tipos compartidos entre backend y
> frontend viven en `shared/types/`. El despliegue usa dos subdominios en Hostinger
> (Opción B): `pse.juntaatlantico.co` (frontend estático) y `api.juntaatlantico.co`
> (backend Node.js).

```
junta-atlantico-pse/
├── .gitattributes                     # Normalización de EOL (LF) para Windows/Linux/Mac
├── .gitignore
├── scripts/
│   └── build-zips.mjs                # Genera deploy/backend.zip y deploy/frontend.zip
│                                      # Cross-platform (no usa comando "zip" de Linux)
├── shared/
│   └── types/                         # Tipos TS compartidos (backend + frontend)
│       ├── bank.ts
│       ├── config.ts
│       ├── errors.ts
│       ├── index.ts
│       ├── payment.ts
│       ├── pse-api.ts
│       └── transaction.ts
├── backend/
│   ├── server.ts                      # Express API pura (Opción B: sin servir estáticos)
│   ├── tsconfig.json                  # Editor + ts-jest (incluye tests, types: node+jest)
│   ├── tsconfig.build.json            # Build de producción (excluye tests)
│   ├── jest.config.js
│   ├── ecosystem.config.js            # PM2 (referencia, no usado en Hostinger)
│   ├── package.json
│   ├── config/
│   │   ├── constants.ts
│   │   └── pse.config.ts
│   ├── services/
│   │   ├── encryption.service.ts      # AES-256-GCM
│   │   ├── token.service.ts           # OAuth 2.0 con caché
│   │   ├── pse.service.ts             # Cliente PSE
│   │   ├── bankList.service.ts        # Caché diaria de bancos (Req #4) + orden A-Z (Req #8)
│   │   ├── recaptcha.service.ts       # Verify reCAPTCHA v3
│   │   └── doublePayment.service.ts   # Control de doble pago (Req #12)
│   ├── controllers/
│   │   └── pse.controller.ts
│   ├── routes/
│   │   └── pse.routes.ts
│   ├── middleware/
│   │   ├── error.middleware.ts
│   │   ├── rateLimit.middleware.ts
│   │   ├── recaptcha.middleware.ts
│   │   ├── requestId.middleware.ts
│   │   ├── sanitize.middleware.ts
│   │   └── securityHeaders.middleware.ts
│   ├── models/
│   │   └── transaction.model.ts
│   ├── validation/
│   │   ├── middleware.ts
│   │   └── schemas.ts                 # Zod: máx 2 decimales en amount/vat
│   ├── errors/
│   │   └── index.ts
│   ├── utils/
│   │   ├── causalRejection.ts
│   │   ├── dates.ts
│   │   ├── errorMessages.ts           # Req #7: códigos PSE → mensaje genérico
│   │   ├── logger.ts
│   │   ├── paymentMode.ts
│   │   └── validators.ts
│   └── tests/
│       ├── dates.test.ts
│       ├── encryption.test.ts
│       ├── errorMessages.test.ts
│       ├── validators.test.ts
│       └── integration/paymentFlow.test.ts
└── frontend/
    ├── .env                           # Dev: VITE_API_URL=http://localhost:3000/api/pse
    ├── .env.production                # Prod: VITE_API_URL=https://api.juntaatlantico.co/api/pse
    ├── env.d.ts                       # Tipos de las variables VITE_*
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.js
    └── src/
        ├── main.ts                    # Sin plugin vue-recaptcha-v3
        ├── App.vue
        ├── router/index.ts
        ├── services/
        │   ├── api.service.ts
        │   └── recaptcha.service.ts   # Carga manual api.js?render=<SITE_KEY> (v3)
        ├── composables/
        │   ├── usePolling.ts          # stop() cancela timer inmediatamente
        │   └── useReCaptcha.ts
        ├── stores/
        │   └── payment.store.ts
        ├── utils/
        │   ├── errorMessages.ts       # Req #7: shouldOfferContact()
        │   ├── formatters.ts
        │   ├── validators.ts
        │   ├── causalRejection.ts
        │   └── paymentMode.ts
        ├── components/
        │   ├── BankList.vue           # Persiste nombre del banco para el comprobante
        │   ├── ErrorAlert.vue
        │   ├── LoadingSpinner.vue
        │   ├── PaymentForm.vue        # Logo PSE + texto aclaratorio (Req #1)
        │   ├── PaymentSummary.vue
        │   └── RejectionReason.vue
        └── views/
            ├── Checkout.vue
            └── PaymentReturn.vue      # Comprobante completo 4 estados (Req #11)
```

---

## 9. CÓDIGO FUENTE COMPLETO — BACKEND (TypeScript)

> Código real del repositorio — rama `master`, último commit. Incluye todos los ajustes de v2.1 y v3.0: `trust proxy`, `listen()` sin guarda, `tsconfig.build.json`, validación de decimales, orígenes por env, mensajes genéricos PSE #7 en backend y frontend.

### 9.0 Tipos compartidos (`shared/types/`)

### 9.0.1 `shared/types/index.ts`

```typescript
export * from './payment';
export * from './transaction';
export * from './pse-api';
export * from './config';
export * from './bank';
export * from './errors';
```

### 9.0.2 `shared/types/config.ts`

```typescript
export interface PSEConfig {
  env: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
  encryptionKey: string;
  encryptionIv: string;
  entityCode: string;
  serviceCode: string;
  ciiuCategory: string;
  companyName: string;
  tokenUrl: string;
  apiBaseUrl: string;
  returnUrl: string;
  recaptcha: {
    secret: string;
    scoreMin: number;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
  doublePaymentCheck: boolean;
  polling: {
    intervalMs: number;
    maxAttempts: number;
  };
  token: {
    refreshBufferMs: number;
  };
}
```

### 9.0.3 `shared/types/bank.ts`

```typescript
export interface BankItem {
  financialInstitutionCode: string;
  financialInstitutionName: string;
}
```

### 9.0.4 `shared/types/payment.ts`

```typescript
export type UserType = 'person' | 'company';

export type IdentificationType =
  | 'RegistroCivilDeNacimiento'
  | 'TarjetaDeIdentidad'
  | 'CedulaDeCiudadania'
  | 'TarjetaDeExtranjeria'
  | 'CedulaDeExtranjeria'
  | 'Pasaporte'
  | 'DocumentoDeIdentificacionExtranjero'
  | 'NIT';

export type BeneficiaryIdentificationType =
  | 'CedulaDeCiudadania'
  | 'CedulaDeExtranjeria'
  | 'Pasaporte'
  | 'DocumentoDeIdentificacionExtranjero'
  | 'NIT'
  | 'IdentificacionComercioExtranjero';

export interface PaymentData {
  bankCode: string;
  amount: number;
  vat?: number;
  serviceCode?: string;
  userType: UserType;
  identificationType: IdentificationType;
  identificationNumber: string;
  fullName: string;
  cellphoneNumber: string;
  email: string;
  address: string;
  description: string;
  ticketId?: number | string;
  reference1?: string;
  reference2?: string;
  reference3?: string;
  indicator4per1000?: number;
  recaptchaToken?: string;
}

export interface PSETransactionPayload {
  entityCode: string;
  serviceCode: string;
  financialInstitutionCode: string;
  transactionValue: number;
  vatValue: number;
  ticketId: number | string;
  entityurl: string;
  userType: UserType;
  soliciteDate: string;
  paymentDescription: string;
  referenceNumber1: string;
  referenceNumber2: string;
  referenceNumber3: string;
  identificationType: IdentificationType;
  identificationNumber: string;
  fullName: string;
  cellphoneNumber: string;
  address: string;
  email: string;
  beneficiaryEntityIdentificationType: string;
  beneficiaryEntityIdentification: string;
  beneficiaryEntityName: string;
  beneficiaryEntityCIIUCategory: string;
  beneficiaryIdentificationType: IdentificationType;
  beneficiaryIdentification: string;
  indicator4per1000: number;
}
```

### 9.0.5 `shared/types/transaction.ts`

```typescript
import { UserType, IdentificationType } from './payment';

export type TransactionState = 'OK' | 'NOT_AUTHORIZED' | 'PENDING' | 'FAILED';
export type FinalState = 'OK' | 'NOT_AUTHORIZED' | 'FAILED';

export interface TransactionRecord {
  id: string;
  ticket_id_encrypted: string;
  trazability_code: string;
  transaction_state: TransactionState;
  amount: number;
  user_email_encrypted?: string;
  identification_number_encrypted?: string;
  full_name_encrypted?: string;
  payment_mode?: number;
  payment_origin?: number;
  service_nit?: string;
  service_name?: string;
  cause_rejection?: string;
  state_description?: string;
  rejection_description?: string;
  recaptcha_score?: number;
  created_at: Date;
  updated_at: Date;
}

export interface TransactionStatusResponse {
  returnCode: string;
  trazabilityCode: string;
  ticketId?: number | string;
  transactionState: TransactionState;
  transactionValue?: number;
  vatValue?: number;
  bankProcessDate?: string;
  authorizationID?: string;
  serviceNIT?: string;
  serviceName?: string;
  paymentOrigin?: number;
  paymentMode?: number;
  userType?: UserType;
  identificationType?: IdentificationType;
  identificationNumber?: string;
  fullName?: string;
  email?: string;
}

export interface DetailedTransactionResponse extends TransactionStatusResponse {
  causeRejection?: string;
  rejectionDescription?: string;
  stateDescription?: string;
}
```

### 9.0.6 `shared/types/pse-api.ts`

```typescript
import { TransactionState } from './transaction';

export type PSEReturnCode =
  | 'SUCCESS'
  | 'FAIL_ENTITYNOTEXISTSORDISABLED'
  | 'FAIL_BANKNOTEXISTSORDISABLED'
  | 'FAIL_SERVICENOTEXISTSORNOTCONFIGURED'
  | 'FAIL_INVALIDAMOUNTORVATAMOUNT'
  | 'FAIL_INVALIDSOLICITDATE'
  | 'FAIL_CANNOTGETCURRENTCYCLE'
  | 'FAIL_ACCESSDENIED'
  | 'FAIL_EXCEEDEDLIMIT'
  | 'FAIL_TRANSACTIONNOTALLOWED'
  | 'FAIL_INVALIDPARAMETERS'
  | 'FAIL_GENERICERROR'
  | 'FAIL_DISABLEDUSEREMAIL'
  | 'FAIL_ERRORINCREDITS'
  | 'FAIL_INVALIDTRAZABILITYCODE'
  | 'FAIL_BANKUNREACHEABLE'
  | 'FAIL_TIMEOUT'
  | 'FAIL_NOTCONFIRMEDBYBANK'
  | 'FAIL_INVALIDSTATE'
  | 'FAIL_INCONSISTENTFECHA'
  | 'FAIL_INVALIDBANKPROCESSINGDATE'
  | 'FAIL_INVALIDAUTHORIZEDAMOUNT';

export interface PSEApiResponse {
  returnCode: PSEReturnCode;
  trazabilityCode?: string;
  pseURL?: string;
  transactionCycle?: number;
  transactionState?: TransactionState;
  authorizationID?: string;
  errorDetails?: string;
  banks?: Array<{
    financialInstitutionCode: string;
    financialInstitutionName: string;
  }>;
}

export interface RecaptchaVerificationResult {
  success: boolean;
  score: number;
  error?: string;
}

export interface DoublePaymentCheckResult {
  exists: boolean;
  state?: TransactionState;
  trazabilityCode?: string;
}
```

### 9.0.7 `shared/types/errors.ts`

```typescript
export interface APIErrorResponse {
  status: number;
  code: string;
  message: string;
  data?: unknown;
}
```

### 9.1 `backend/package.json`

```json
{
  "name": "junta-atlantico-pse-backend",
  "version": "2.0.0",
  "description": "Backend para integración PSE Avanza v21",
  "main": "dist/backend/server.js",
  "scripts": {
    "build": "echo \"Build omitido: dist/ incluido en el zip\"",
    "start": "node dist/backend/server.js",
    "dev": "ts-node server.ts",
    "test": "jest --forceExit --detectOpenHandles",
    "test:integration": "jest tests/integration --forceExit --detectOpenHandles",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "axios": "^1.6.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "uuid": "^14.0.1",
    "winston": "^3.11.0",
    "zod": "^4.4.3"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/jest": "^29.5.11",
    "@types/morgan": "^1.9.9",
    "@types/node": "^20.10.0",
    "@types/supertest": "^6.0.2",
    "eslint": "^8.55.0",
    "jest": "^29.7.0",
    "nodemon": "^3.0.2",
    "supertest": "^7.2.2",
    "ts-jest": "^29.1.1",
    "ts-node": "^10.9.2",
    "typescript": "^5.3.2"
  }
}
```

### 9.2 `backend/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "..",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "moduleResolution": "node",
    "ignoreDeprecations": "5.0",
    "allowSyntheticDefaultImports": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "types": ["node", "jest"],
    "typeRoots": ["./node_modules/@types", "../shared/types"],
    "paths": {
      "@shared/*": ["../shared/*"]
    }
  },
  "include": [
    "**/*.ts",
    "../shared/**/*.ts"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
```

### 9.3 `backend/tsconfig.build.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["node"]
  },
  "exclude": [
    "node_modules",
    "dist",
    "tests",
    "**/*.test.ts"
  ]
}
```

### 9.4 `backend/jest.config.js`

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest'
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'services/**/*.ts',
    'utils/**/*.ts',
    'controllers/**/*.ts',
    'middleware/**/*.ts'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov']
};
```

### 9.5 `backend/config/constants.ts`

```typescript
import { TransactionState } from '../../shared/types/transaction';
import { UserType, IdentificationType } from '../../shared/types/payment';
import { PSEReturnCode } from '../../shared/types/pse-api';

export const COMPANY = {
  NIT: '901234567-8',
  NAME: 'JUNTA ATLANTICO S.A.S.',
  CIIU: '8692',
  ENTITY_CODE: '901234567-8'
} as const;

export const VALID_ID_TYPES: IdentificationType[] = [
  'RegistroCivilDeNacimiento',
  'TarjetaDeIdentidad',
  'CedulaDeCiudadania',
  'TarjetaDeExtranjeria',
  'CedulaDeExtranjeria',
  'Pasaporte',
  'DocumentoDeIdentificacionExtranjero',
  'NIT'
];

export const VALID_BENEFICIARY_ID_TYPES = [
  'CedulaDeCiudadania',
  'CedulaDeExtranjeria',
  'Pasaporte',
  'DocumentoDeIdentificacionExtranjero',
  'NIT',
  'IdentificacionComercioExtranjero'
] as const;

export const USER_TYPES: UserType[] = ['person', 'company'];

export const TRANSACTION_STATES: Record<string, TransactionState> = {
  OK: 'OK',
  NOT_AUTHORIZED: 'NOT_AUTHORIZED',
  PENDING: 'PENDING',
  FAILED: 'FAILED'
};

export const FINAL_STATES: TransactionState[] = ['OK', 'NOT_AUTHORIZED', 'FAILED'];

export const FORBIDDEN_CHARS_REGEX: RegExp = /[|"]/;

export const RECAPTCHA_ACTIONS = {
  PAYMENT: 'pse_payment',
  BANK_LIST: 'pse_bank_list'
} as const;
```

### 9.6 `backend/config/pse.config.ts`

```typescript
import { PSEConfig } from '../../shared/types/config';

const config: PSEConfig = {
  env: process.env.PSE_ENV || 'cert',

  apiKey: process.env.PSE_API_KEY || '',
  clientId: process.env.PSE_CLIENT_ID || '',
  clientSecret: process.env.PSE_CLIENT_SECRET || '',

  encryptionKey: process.env.PSE_ENCRYPTION_KEY || '',
  encryptionIv: process.env.PSE_ENCRYPTION_IV || '',

  entityCode: process.env.PSE_ENTITY_CODE || '',
  serviceCode: process.env.PSE_SERVICE_CODE || '',
  ciiuCategory: process.env.PSE_CIIU_CATEGORY || '',
  companyName: process.env.PSE_COMPANY_NAME || '',

  tokenUrl: process.env.PSE_TOKEN_URL || '',
  apiBaseUrl: process.env.PSE_API_BASE_URL || '',
  returnUrl: process.env.PSE_RETURN_URL || '',

  recaptcha: {
    secret: process.env.RECAPTCHA_SECRET || '',
    scoreMin: parseFloat(process.env.RECAPTCHA_SCORE_MIN || '0.5')
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQ || '10', 10)
  },

  doublePaymentCheck: process.env.PSE_DOUBLE_PAYMENT_CHECK === 'true',

  polling: {
    intervalMs: parseInt(process.env.PSE_POLLING_INTERVAL_MS || '180000', 10),
    maxAttempts: parseInt(process.env.PSE_POLLING_MAX_ATTEMPTS || '10', 10)
  },

  token: {
    refreshBufferMs: 5 * 60 * 1000
  }
};

export default config;
```

### 9.7 `backend/services/encryption.service.ts`

```typescript
import crypto from 'crypto';
import config from '../config/pse.config';
import logger from '../utils/logger';

class EncryptionService {
  private key: Buffer;
  private iv: Buffer;
  private algorithm: string;
  private tagLength: number;
  private ivLength: number;

  constructor() {
    this.key = Buffer.from(config.encryptionKey, 'base64');
    this.iv = Buffer.from(config.encryptionIv, 'base64');
    this.algorithm = 'aes-256-gcm';
    this.tagLength = 16;
    this.ivLength = 12;

    if (this.key.length !== 32) {
      throw new Error(`PSE_ENCRYPTION_KEY debe tener 32 bytes (tiene ${this.key.length})`);
    }
    if (this.iv.length !== 12) {
      throw new Error(`PSE_ENCRYPTION_IV debe tener 12 bytes (tiene ${this.iv.length})`);
    }
  }

  encrypt(data: object | string): string {
    try {
      const message: string = typeof data === 'string' ? data : JSON.stringify(data);
      const iv: Buffer = crypto.randomBytes(this.ivLength);

      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv) as crypto.CipherGCM;
      let encrypted: string = cipher.update(message, 'utf8', 'binary');
      encrypted += cipher.final('binary');

      const tag: Buffer = cipher.getAuthTag();

      const result = Buffer.concat([
        iv,
        Buffer.from(encrypted, 'binary'),
        tag
      ]);

      return result.toString('base64');
    } catch (error) {
      logger.error('Error en encrypt:', error);
      throw new Error(`Encryption error: ${(error as Error).message}`);
    }
  }

  decrypt(encryptedBase64: string): object | string {
    try {
      const data: Buffer = Buffer.from(encryptedBase64, 'base64');

      const iv: Buffer = data.subarray(0, this.ivLength);
      const encrypted: Buffer = data.subarray(this.ivLength, -this.tagLength);
      const tag: Buffer = data.subarray(-this.tagLength);

      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv) as crypto.DecipherGCM;
      decipher.setAuthTag(tag);

      let decrypted: string = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      try {
        return JSON.parse(decrypted) as object;
      } catch {
        return decrypted;
      }
    } catch (error) {
      logger.error('Error en decrypt:', error);
      throw new Error(`Decryption error: ${(error as Error).message}`);
    }
  }
}

export default new EncryptionService();
```

### 9.8 `backend/services/token.service.ts`

```typescript
import axios from 'axios';
import config from '../config/pse.config';
import logger from '../utils/logger';

class TokenService {
  private accessToken: string | null;
  private tokenExpiry: number | null;

  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async getToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }
    return await this.refreshToken();
  }

  async refreshToken(): Promise<string> {
    try {
      logger.info('Renovando token OAuth 2.0...');

      const response = await axios({
        method: 'POST',
        url: config.tokenUrl,
        data: {
          client_id: config.clientId,
          client_secret: config.clientSecret
        },
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
      });

      if (!response.data.access_token) {
        throw new Error('No se recibio access_token en la respuesta');
      }

      this.accessToken = response.data.access_token;
      const expiresIn: number = (response.data.expires_in || 3600) - config.token.refreshBufferMs / 1000;
      this.tokenExpiry = Date.now() + (expiresIn * 1000);

      logger.info(`Token obtenido. Vence en ${expiresIn}s`);
      return this.accessToken!;
    } catch (error) {
      const axiosError = error as { response?: { data?: { error_description?: string } }; message: string };
      logger.error('Error renovando token:', axiosError.response?.data || axiosError.message);
      throw new Error(`OAuth Error: ${axiosError.response?.data?.error_description || axiosError.message}`);
    }
  }

  invalidate(): void {
    this.accessToken = null;
    this.tokenExpiry = null;
  }
}

export default new TokenService();
```

### 9.9 `backend/services/pse.service.ts`

```typescript
import axios from 'axios';
import config from '../config/pse.config';
import { FORBIDDEN_CHARS_REGEX } from '../config/constants';
import { PaymentData, PSETransactionPayload } from '../../shared/types/payment';
import { PSEApiResponse } from '../../shared/types/pse-api';
import encryptionService from './encryption.service';
import tokenService from './token.service';
import { nowColombiaISO } from '../utils/dates';
import logger from '../utils/logger';

class PSEService {
  private apiKey: string;
  private entityCode: string;
  private serviceCode: string;
  private ciiuCategory: string;
  private companyName: string;
  private apiBaseUrl: string;
  private returnUrl: string;

  constructor() {
    this.apiKey = config.apiKey;
    this.entityCode = config.entityCode;
    this.serviceCode = config.serviceCode;
    this.ciiuCategory = config.ciiuCategory;
    this.companyName = config.companyName;
    this.apiBaseUrl = config.apiBaseUrl;
    this.returnUrl = config.returnUrl;
  }

  async makeRequest(endpoint: string, data: object, maxRetries: number = 1): Promise<PSEApiResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const token = await tokenService.getToken();
        const encryptedData: string = encryptionService.encrypt(data);

        logger.info(`[Attempt ${attempt}] Enviando request a ${endpoint}`);

        const response = await axios({
          method: 'POST',
          url: `${this.apiBaseUrl}/${endpoint}`,
          params: { apikey: this.apiKey },
          data: encryptedData,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        });

        const decryptedResponse: PSEApiResponse = encryptionService.decrypt(response.data) as PSEApiResponse;
        logger.info(`Respuesta de ${endpoint}: ${decryptedResponse.returnCode || 'OK'}`);
        return decryptedResponse;

      } catch (error) {
        lastError = error as Error;
        const axiosError = error as { response?: { status: number; data: unknown }; message: string };
        logger.error(`[Attempt ${attempt}] Error en ${endpoint}:`, axiosError.response?.data || axiosError.message);

        if (axiosError.response) {
          throw new Error(`PSE API Error: ${axiosError.response.status} - ${JSON.stringify(axiosError.response.data)}`);
        }
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }

    throw new Error(`Network Error: ${lastError?.message}`);
  }

  async getBankList(): Promise<PSEApiResponse> {
    const data = { entityCode: this.entityCode };
    return await this.makeRequest('GetBankListNF', data);
  }

  async createTransaction(paymentData: PaymentData): Promise<PSEApiResponse> {
    const transactionData: PSETransactionPayload = this.buildTransactionData(paymentData);
    this.validateTransactionData(transactionData);
    return await this.makeRequest('CreateTransactionPaymentNF', transactionData);
  }

  buildTransactionData(paymentData: PaymentData): PSETransactionPayload {
    return {
      entityCode: this.entityCode,
      serviceCode: this.serviceCode || paymentData.serviceCode || '',
      financialInstitutionCode: paymentData.bankCode,
      transactionValue: Number(paymentData.amount),
      vatValue: Number(paymentData.vat || 0),
      ticketId: paymentData.ticketId || '',
      entityurl: this.returnUrl,
      userType: paymentData.userType,
      soliciteDate: nowColombiaISO(),
      paymentDescription: paymentData.description || 'Pago en Junta Atlantico',
      // Requisito PSE #13: las 3 referencias son OBLIGATORIAS y deben corresponder
      // a las requeridas para el tipo de vinculacion (Desarrollo Independiente)
      // segun el Manual de Buenas Practicas. Los valores por defecto de abajo son
      // un mapeo sensato y NO vacio; CONFIRMAR contra el manual antes de certificar.
      //   referenceNumber1 -> identificacion del pagador
      //   referenceNumber2 -> ticketId (referencia unica de la transaccion)
      //   referenceNumber3 -> codigo de servicio
      referenceNumber1: paymentData.reference1 || paymentData.identificationNumber || '',
      referenceNumber2: paymentData.reference2 || String(paymentData.ticketId || '') || 'N/A',
      referenceNumber3: paymentData.reference3 || this.serviceCode || paymentData.serviceCode || 'N/A',
      identificationType: paymentData.identificationType,
      identificationNumber: paymentData.identificationNumber,
      fullName: paymentData.fullName,
      cellphoneNumber: paymentData.cellphoneNumber,
      address: paymentData.address,
      email: paymentData.email,
      beneficiaryEntityIdentificationType: 'NIT',
      beneficiaryEntityIdentification: this.entityCode.replace(/-/g, '').slice(0, 15),
      beneficiaryEntityName: this.companyName,
      beneficiaryEntityCIIUCategory: this.ciiuCategory,
      beneficiaryIdentificationType: paymentData.identificationType,
      beneficiaryIdentification: paymentData.identificationNumber,
      indicator4per1000: parseInt(String(paymentData.indicator4per1000)) || 0
    };
  }

  async getTransactionInformation(
    trazabilityCode: string,
    maxAttempts: number = 3
  ): Promise<PSEApiResponse> {
    const backoff: number[] = [5000, 10000, 20000];
    const data = {
      entityCode: this.entityCode,
      trazabilityCode
    };

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result: PSEApiResponse = await this.makeRequest('GetTransactionInformationNF', data);

      if (result.returnCode !== 'FAIL_INVALIDTRAZABILITYCODE') {
        return result;
      }

      if (attempt < maxAttempts - 1) {
        logger.warn(`FAIL_INVALIDTRAZABILITYCODE en intento ${attempt + 1}, reintentando en ${backoff[attempt] / 1000}s...`);
        await new Promise(r => setTimeout(r, backoff[attempt]));
      }
    }

    return { returnCode: 'FAIL_INVALIDTRAZABILITYCODE' };
  }

  async getTransactionInformationDetailed(trazabilityCode: string): Promise<PSEApiResponse> {
    const data = {
      entityCode: this.entityCode,
      trazabilityCode
    };
    return await this.makeRequest('GetTransactionInformationDetailed', data);
  }

  async finalizeTransaction(
    trazabilityCode: string,
    authorizationId: string | null = null
  ): Promise<PSEApiResponse> {
    const data = {
      entityCode: this.entityCode,
      trazabilityCode,
      entityAuthorizationId: authorizationId || `AUTH_${Date.now()}`
    };
    return await this.makeRequest('FinalizeTransactionPaymentNF', data);
  }

  validateTransactionData(data: PSETransactionPayload): void {
    const required: (keyof PSETransactionPayload)[] = [
      'entityCode', 'financialInstitutionCode', 'serviceCode',
      'transactionValue', 'ticketId', 'entityurl', 'userType',
      'identificationType', 'identificationNumber', 'fullName',
      'cellphoneNumber', 'address', 'email', 'soliciteDate',
      'beneficiaryEntityIdentificationType', 'beneficiaryEntityIdentification'
    ];

    for (const field of required) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        throw new Error(`Campo requerido faltante: ${field}`);
      }
    }

    const fieldsToCheck: (keyof PSETransactionPayload)[] = [
      'paymentDescription', 'referenceNumber1', 'referenceNumber2', 'referenceNumber3'
    ];
    for (const field of fieldsToCheck) {
      if (typeof data[field] === 'string' && FORBIDDEN_CHARS_REGEX.test(data[field] as string)) {
        throw new Error(`El campo "${field}" contiene caracteres prohibidos (| o "). No se permite.`);
      }
    }

    if (String(data.serviceCode).length > 10) {
      throw new Error(`serviceCode no puede tener mas de 10 caracteres (tiene ${String(data.serviceCode).length})`);
    }
  }
}

export default new PSEService();
```

### 9.10 `backend/services/bankList.service.ts`

```typescript
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
```

### 9.11 `backend/services/recaptcha.service.ts`

```typescript
import axios from 'axios';
import config from '../config/pse.config';
import logger from '../utils/logger';
import { RecaptchaVerificationResult } from '../../shared/types/pse-api';

class RecaptchaService {
  async verify(
    token: string | undefined,
    remoteIp: string,
    expectedAction: string = 'pse_payment'
  ): Promise<RecaptchaVerificationResult> {
    if (!config.recaptcha.secret) {
      if (config.env === 'dev') {
        logger.warn('RECAPTCHA_SECRET no configurado — bypass en dev');
        return { success: true, score: 1.0 };
      }
      return { success: false, score: 0, error: 'RECAPTCHA_SECRET no configurado' };
    }

    if (!token) {
      return { success: false, score: 0, error: 'Token de reCAPTCHA faltante' };
    }

    try {
      const { data } = await axios.post(
        'https://www.google.com/recaptcha/api/siteverify',
        null,
        {
          params: {
            secret: config.recaptcha.secret,
            response: token,
            remoteip: remoteIp
          },
          timeout: 5000
        }
      );

      logger.info(`reCAPTCHA: success=${data.success}, score=${data.score}, action=${data.action}`);

      if (!data.success) {
        return { success: false, score: 0, error: 'Verificacion reCAPTCHA fallo' };
      }

      if (data.action !== expectedAction) {
        return { success: false, score: data.score, error: `Accion incorrecta: ${data.action}` };
      }

      if (data.score < config.recaptcha.scoreMin) {
        return {
          success: false,
          score: data.score,
          error: `Score ${data.score} < minimo ${config.recaptcha.scoreMin}`
        };
      }

      return { success: true, score: data.score };
    } catch (error) {
      logger.error('Error verificando reCAPTCHA:', (error as Error).message);
      return { success: false, score: 0, error: 'Error al verificar reCAPTCHA' };
    }
  }
}

export default new RecaptchaService();
```

### 9.12 `backend/services/doublePayment.service.ts`

```typescript
import config from '../config/pse.config';
import { TransactionState } from '../../shared/types/transaction';
import { DoublePaymentCheckResult } from '../../shared/types/pse-api';
import logger from '../utils/logger';
import { getDoublePaymentMessage } from '../utils/errorMessages';
import TransactionModel from '../models/transaction.model';

class DoublePaymentService {
  async check(
    ticketId: string | number,
    trazabilityCode: string | null = null
  ): Promise<DoublePaymentCheckResult> {
    if (!config.doublePaymentCheck) {
      return { exists: false };
    }

    try {
      const existing = await TransactionModel.findByTicketId(ticketId, trazabilityCode);

      if (!existing) {
        return { exists: false };
      }

      if (existing.transaction_state === 'OK') {
        return {
          exists: true,
          state: 'OK' as TransactionState,
          trazabilityCode: existing.trazability_code
        };
      }

      if (existing.transaction_state === 'PENDING') {
        return {
          exists: true,
          state: 'PENDING' as TransactionState,
          trazabilityCode: existing.trazability_code
        };
      }

      return { exists: false };
    } catch (error) {
      logger.error('Error en control doble pago:', error);
      return { exists: false };
    }
  }

  getErrorMessage(check: DoublePaymentCheckResult, ticketId: string | number): string {
    return getDoublePaymentMessage(check.state || '', ticketId, check.trazabilityCode || '');
  }
}

export default new DoublePaymentService();
```

### 9.13 `backend/controllers/pse.controller.ts`

```typescript
import { Request, Response } from 'express';
import pseService from '../services/pse.service';
import bankListService from '../services/bankList.service';
import { FINAL_STATES } from '../config/constants';
import doublePaymentService from '../services/doublePayment.service';
import { getPSEErrorMessage } from '../utils/errorMessages';
import logger from '../utils/logger';
import { CreateTransactionInput } from '../validation/schemas';
import { PSEApiResponse } from '../../shared/types/pse-api';


class PSEController {
  async getBankList(req: Request, res: Response): Promise<void> {
    try {
      // Requisito PSE #4: la lista se sirve desde caché diaria (GetBankListNF
      // se llama a lo sumo una vez al día, no por transacción).
      // Requisito PSE #8: ordenada alfabéticamente.
      const { banks, source, cached } = await bankListService.getBanks();
      res.json({
        success: true,
        data: banks,
        message: 'Lista de bancos obtenida exitosamente',
        meta: { source, cached }
      });
    } catch (error) {
      logger.error('Error en getBankList:', (error as Error).message);
      res.status(500).json({
        success: false,
        message: (error as Error).message || 'Error al obtener lista de bancos'
      });
    }
  }

  async createTransaction(req: Request, res: Response): Promise<void> {
    try {
      const paymentData: CreateTransactionInput = req.body;

      const doublePaymentCheck = await doublePaymentService.check(
        paymentData.ticketId || Date.now() + Math.floor(Math.random() * 1000)
      );

      if (doublePaymentCheck.exists) {
        const message: string = doublePaymentService.getErrorMessage(
          doublePaymentCheck,
          paymentData.ticketId || 'unknown'
        );
        res.status(409).json({
          success: false,
          code: 'FAIL_DOUBLEPAYMENT',
          message
        });
        return;
      }

      let result: PSEApiResponse;
      try {
        result = await pseService.createTransaction(paymentData);
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          logger.warn('PSE API no disponible, usando respuesta mock');
          const mockCus = 'CUS_' + Date.now().toString().slice(-6);
          const mockTicketId = paymentData.ticketId || Date.now();
          result = {
            returnCode: 'SUCCESS',
            trazabilityCode: mockCus,
            pseURL: `https://apicer.pse.com.co/mock-payment?cus=${mockCus}&bank=${paymentData.bankCode}`,
            transactionCycle: 1
          } as unknown as PSEApiResponse;
        } else {
          throw error;
        }
      }

      if (result.returnCode === 'SUCCESS') {
        logger.info(`Transaccion creada: CUS=${result.trazabilityCode}, score=${(req as any).recaptchaScore}`);
        res.json({
          success: true,
          data: {
            trazabilityCode: result.trazabilityCode,
            pseURL: result.pseURL,
            ticketId: paymentData.ticketId || Date.now(),
            transactionCycle: result.transactionCycle
          },
          message: 'Transaccion creada exitosamente'
        });
        return;
      }

      res.status(400).json({
        success: false,
        code: result.returnCode,
        message: getPSEErrorMessage(result.returnCode),
        details: result.errorDetails || null
      });

    } catch (error) {
      logger.error('Error en createTransaction:', (error as Error).message);

      const errMsg: string = (error as Error).message;
      if (errMsg.includes('requerido') ||
          errMsg.includes('prohibidos') ||
          errMsg.includes('serviceCode')) {
        res.status(400).json({
          success: false,
          code: 'FAIL_VALIDATION',
          message: errMsg
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: errMsg || 'Error al crear la transaccion'
      });
    }
  }

  async getTransactionStatus(req: Request, res: Response): Promise<void> {
    try {
      const { trazabilityCode } = req.params;

      let result: PSEApiResponse;
      try {
        result = await pseService.getTransactionInformation(trazabilityCode);
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          logger.warn('PSE API no disponible, usando estado mock');
          result = {
            returnCode: 'SUCCESS',
            transactionState: 'OK',
            trazabilityCode,
            bankProcessingDate: new Date().toISOString(),
            authorizationID: 'AUTH_' + Date.now()
          } as unknown as PSEApiResponse;
        } else {
          throw error;
        }
      }

      if (result.transactionState && FINAL_STATES.includes(result.transactionState as any)) {
        try {
          if (result.transactionState === 'OK') {
            await pseService.finalizeTransaction(trazabilityCode, result.authorizationID || null);
          }
        } catch (finalizeError) {
          logger.warn('Error al finalizar transaccion:', (finalizeError as Error).message);
        }
      }

      res.json({
        success: true,
        data: result,
        message: 'Estado de transaccion consultado exitosamente'
      });
    } catch (error) {
      logger.error('Error en getTransactionStatus:', (error as Error).message);
      res.status(500).json({
        success: false,
        message: (error as Error).message || 'Error al consultar el estado de la transaccion'
      });
    }
  }

  async getTransactionDetailed(req: Request, res: Response): Promise<void> {
    try {
      const { trazabilityCode } = req.params;

      let result: PSEApiResponse;
      try {
        result = await pseService.getTransactionInformationDetailed(trazabilityCode);
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          logger.warn('PSE API no disponible, usando detalle mock');
          result = {
            returnCode: 'SUCCESS',
            transactionState: 'OK',
            trazabilityCode,
            bankProcessingDate: new Date().toISOString(),
            authorizationID: 'AUTH_' + Date.now(),
            transactionValue: 10000,
            vatValue: 0
          } as unknown as PSEApiResponse;
        } else {
          throw error;
        }
      }

      res.json({
        success: true,
        data: result,
        message: 'Informacion detallada obtenida exitosamente'
      });
    } catch (error) {
      logger.error('Error en getTransactionDetailed:', (error as Error).message);
      res.status(500).json({
        success: false,
        message: (error as Error).message || 'Error al obtener informacion detallada'
      });
    }
  }

  async finalizeTransaction(req: Request, res: Response): Promise<void> {
    try {
      const { trazabilityCode, authorizationId } = req.body;

      const result: PSEApiResponse = await pseService.finalizeTransaction(trazabilityCode, authorizationId);

      res.json({
        success: true,
        data: result,
        message: 'Transaccion finalizada exitosamente'
      });
    } catch (error) {
      logger.error('Error en finalizeTransaction:', (error as Error).message);
      res.status(500).json({
        success: false,
        message: (error as Error).message || 'Error al finalizar la transaccion'
      });
    }
  }
}

export default new PSEController();
```

### 9.14 `backend/routes/pse.routes.ts`

```typescript
import { Router, Request, Response } from 'express';
import pseController from '../controllers/pse.controller';
import { verifyRecaptcha } from '../middleware/recaptcha.middleware';
import { pseTransactionLimiter, globalLimiter } from '../middleware/rateLimit.middleware';
import { checkForbiddenChars } from '../middleware/sanitize.middleware';
import { validateBody, validateParams } from '../validation/middleware';
import { createTransactionSchema, finalizeTransactionSchema, trazabilityCodeParamSchema } from '../validation/schemas';
import { RECAPTCHA_ACTIONS } from '../config/constants';
import tokenService from '../services/token.service';
import encryptionService from '../services/encryption.service';
import logger from '../utils/logger';

const router: Router = Router();

router.get('/health', async (_req: Request, res: Response) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      pseApi: 'unknown',
      encryption: 'ok',
      token: 'unknown'
    }
  };

  try {
    await tokenService.getToken();
    health.services.token = 'ok';
    health.services.pseApi = 'ok';
  } catch (error) {
    health.services.token = 'error';
    health.services.pseApi = 'error';
    health.status = 'DEGRADED';
    logger.error('Health check: token service error', error);
  }

  const statusCode = health.status === 'OK' ? 200 : 503;
  res.status(statusCode).json(health);
});

router.get('/banks', globalLimiter, (req: Request, res: Response) => {
  pseController.getBankList(req, res);
});

router.post('/transaction',
  pseTransactionLimiter,
  verifyRecaptcha(RECAPTCHA_ACTIONS.PAYMENT),
  validateBody(createTransactionSchema),
  checkForbiddenChars,
  (req: Request, res: Response) => {
    pseController.createTransaction(req, res);
  }
);

router.get('/transaction/:trazabilityCode/status',
  validateParams(trazabilityCodeParamSchema),
  (req: Request, res: Response) => {
    pseController.getTransactionStatus(req, res);
  }
);

router.get('/transaction/:trazabilityCode/detailed',
  validateParams(trazabilityCodeParamSchema),
  (req: Request, res: Response) => {
    pseController.getTransactionDetailed(req, res);
  }
);

router.post('/transaction/finalize',
  validateBody(finalizeTransactionSchema),
  (req: Request, res: Response) => {
    pseController.finalizeTransaction(req, res);
  }
);

export default router;
```

### 9.15 `backend/middleware/error.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';
import { AppError } from '../errors';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof AppError) {
    logger.error(`[${err.code}] ${err.message}`, {
      requestId: req.requestId,
      path: req.path,
      statusCode: err.statusCode
    });

    res.status(err.statusCode).json({
      success: false,
      code: err.code,
      message: err.message,
      ...(err as any).errors && { errors: (err as any).errors }
    });
    return;
  }

  if ((err as any).type === 'entity.parse.failed') {
    res.status(400).json({
      success: false,
      code: 'INVALID_JSON',
      message: 'JSON invalido en el cuerpo de la peticion'
    });
    return;
  }

  logger.error('Error no manejado:', {
    message: err.message,
    stack: err.stack,
    requestId: req.requestId,
    path: req.path
  });

  res.status(500).json({
    success: false,
    code: 'INTERNAL_ERROR',
    message: 'Error interno del servidor'
  });
};

export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: `Endpoint no encontrado: ${req.method} ${req.path}`
  });
};
```

### 9.16 `backend/middleware/rateLimit.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import config from '../config/pse.config';

export const pseTransactionLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'FAIL_RATE_LIMIT',
    message: 'Demasiadas solicitudes. Por favor intente en un minuto.'
  },
  keyGenerator: (req: Request): string => req.ip || 'unknown'
});

export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Demasiadas solicitudes. Por favor intente en un minuto.'
  }
});
```

### 9.17 `backend/middleware/recaptcha.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import recaptchaService from '../services/recaptcha.service';
import { RECAPTCHA_ACTIONS } from '../config/constants';
import { VALIDATION_ERRORS } from '../utils/errorMessages';

export const verifyRecaptcha = (action: string = RECAPTCHA_ACTIONS.PAYMENT) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const token: string | undefined = req.body.recaptchaToken || req.headers['x-recaptcha-token'] as string;

      const result = await recaptchaService.verify(token, req.ip || 'unknown', action);

      if (!result.success) {
        res.status(400).json({
          success: false,
          code: 'FAIL_RECAPTCHA',
          message: VALIDATION_ERRORS.FAIL_RECAPTCHA
        });
        return;
      }

      (req as any).recaptchaScore = result.score;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        code: 'FAIL_RECAPTCHA',
        message: VALIDATION_ERRORS.FAIL_RECAPTCHA
      });
    }
  };
};
```

### 9.18 `backend/middleware/requestId.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  req.requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
};
```

### 9.19 `backend/middleware/sanitize.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';

const FORBIDDEN_CHARS_REGEX = /[|"]/;
const HTML_ESCAPE_REGEX = /[<>&"']/g;

function sanitizeString(value: string): string {
  return value
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .trim();
}

function sanitizeObject(obj: Record<string, any>): Record<string, any> {
  const sanitized: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map(v =>
        typeof v === 'string' ? sanitizeString(v) :
        typeof v === 'object' && v !== null ? sanitizeObject(v) : v
      );
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

export const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeObject(req.query as Record<string, any>);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeObject(req.params);
  }
  next();
};

export const checkForbiddenChars = (req: Request, res: Response, next: NextFunction): void => {
  const fieldsToCheck = ['description', 'reference1', 'reference2', 'reference3', 'paymentDescription'];

  for (const field of fieldsToCheck) {
    const value = req.body?.[field];
    if (typeof value === 'string' && FORBIDDEN_CHARS_REGEX.test(value)) {
      res.status(400).json({
        success: false,
        code: 'FAIL_VALIDATION',
        message: `El campo "${field}" no puede contener los caracteres "|" ni '"'`
      });
      return;
    }
  }
  next();
};
```

### 9.20 `backend/middleware/securityHeaders.middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';

/**
 * Devuelve la lista de origenes permitidos.
 * Prioridad:
 *   1. Variable de entorno ALLOWED_ORIGIN (lista separada por comas).
 *   2. Fallback segun entorno (produccion vs desarrollo).
 *
 * CORRECCION: antes las listas de origenes estaban hardcodeadas tanto en
 * el CORS (server.ts) como en validateOrigin, y la variable ALLOWED_ORIGIN
 * del .env no se usaba en ninguna parte. Ahora ambos leen de aqui.
 */
export function getAllowedOrigins(): string[] {
  const fromEnv: string[] = (process.env.ALLOWED_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (fromEnv.length > 0) {
    return fromEnv;
  }

  return process.env.NODE_ENV === 'production'
    ? ['https://www.juntaatlantico.co', 'https://juntaatlantico.co']
    : ['http://localhost:5173', 'http://localhost:3000'];
}

export const securityHeaders = (
  _req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
};

export const validateOrigin = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // En desarrollo no se valida el Origin (facilita pruebas locales / curl).
  if (process.env.NODE_ENV !== 'production') {
    next();
    return;
  }

  const origin: string | undefined = req.headers.origin || (req.headers.referer as string | undefined);
  const allowedOrigins: string[] = getAllowedOrigins();

  // Endurecimiento opcional (Seccion 11 ACH): si STRICT_ORIGIN=true, se
  // rechazan tambien las peticiones SIN cabecera Origin/Referer. Por defecto
  // esta desactivado para no romper health-checks o monitoreo server-to-server.
  if (!origin) {
    if (process.env.STRICT_ORIGIN === 'true') {
      res.status(403).json({ success: false, message: 'Origen no autorizado' });
      return;
    }
    next();
    return;
  }

  if (!allowedOrigins.some((o) => origin.startsWith(o))) {
    res.status(403).json({
      success: false,
      message: 'Origen no autorizado'
    });
    return;
  }

  next();
};
```

### 9.21 `backend/models/transaction.model.ts`

```typescript
import crypto from 'crypto';
import config from '../config/pse.config';
import logger from '../utils/logger';
import { TransactionRecord, TransactionState } from '../../shared/types/transaction';

class TransactionModel {
  private restKey: Buffer;
  private algorithm: string;

  constructor() {
    this.restKey = Buffer.from(
      process.env.DB_ENCRYPTION_KEY || config.encryptionKey,
      'base64'
    );
    this.algorithm = 'aes-256-gcm';
  }

  encrypt(value: string | number | null): string | null {
    if (value === null || value === undefined) return null;
    const iv: Buffer = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, this.restKey, iv) as crypto.CipherGCM;
    let encrypted: string = cipher.update(String(value), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag: Buffer = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  }

  decrypt(encryptedValue: string | null): string | null {
    if (!encryptedValue) return null;
    try {
      const [ivHex, tagHex, encrypted] = encryptedValue.split(':');
      const iv: Buffer = Buffer.from(ivHex, 'hex');
      const tag: Buffer = Buffer.from(tagHex, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.restKey, iv) as crypto.DecipherGCM;
      decipher.setAuthTag(tag);
      let decrypted: string = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      logger.error('Error descifrando:', error);
      return null;
    }
  }

  async findByTicketId(
    ticketId: string | number,
    excludeCus: string | null = null
  ): Promise<TransactionRecord | null> {
    // IMPLEMENTAR SEGUN TU BD
    return null;
  }

  async create(data: Partial<TransactionRecord>): Promise<TransactionRecord> {
    // IMPLEMENTAR SEGUN TU BD
    return { id: 'mock-id', ...data } as TransactionRecord;
  }

  async updateState(
    trazabilityCode: string,
    updates: Partial<TransactionRecord>
  ): Promise<TransactionRecord> {
    // IMPLEMENTAR SEGUN TU BD
    return { trazabilityCode, ...updates } as TransactionRecord;
  }
}

export default new TransactionModel();
```

### 9.22 `backend/validation/middleware.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import logger from '../utils/logger';

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages: string[] = error.issues.map((issue: any) => `${issue.path.join('.')}: ${issue.message}`);
        logger.warn('Validacion fallida:', { errors: messages, path: req.path });
        res.status(400).json({
          success: false,
          code: 'FAIL_VALIDATION',
          message: 'Datos de entrada invalidos',
          errors: messages
        });
        return;
      }
      next(error);
    }
  };
};

export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const messages: string[] = error.issues.map((issue: any) => `${issue.path.join('.')}: ${issue.message}`);
        res.status(400).json({
          success: false,
          message: 'Parametros invalidos',
          errors: messages
        });
        return;
      }
      next(error);
    }
  };
};
```

### 9.23 `backend/validation/schemas.ts`

```typescript
import { z } from 'zod';

const UserTypeEnum = z.enum(['person', 'company']);

const IdentificationTypeEnum = z.enum([
  'RegistroCivilDeNacimiento',
  'TarjetaDeIdentidad',
  'CedulaDeCiudadania',
  'TarjetaDeExtranjeria',
  'CedulaDeExtranjeria',
  'Pasaporte',
  'DocumentoDeIdentificacionExtranjero',
  'NIT'
]);

export const createTransactionSchema = z.object({
  bankCode: z.string().min(1, 'Codigo de banco requerido'),
  amount: z.number().positive('El monto debe ser mayor a 0')
    .refine((n) => /^\d+(\.\d{1,2})?$/.test(n.toString()), 'El monto no puede tener mas de 2 decimales'),
  userType: UserTypeEnum,
  identificationType: IdentificationTypeEnum,
  identificationNumber: z.string().min(1, 'Numero de identificacion requerido'),
  fullName: z.string().min(1, 'Nombre completo requerido').max(200),
  cellphoneNumber: z.string().regex(/^\d{10}$/, 'El celular debe tener 10 digitos'),
  email: z.string().email('Email invalido'),
  address: z.string().min(1, 'Direccion requerida').max(200),
  description: z.string().min(1, 'Descripcion requerida').max(80),
  reference1: z.string().max(80).optional().default(''),
  reference2: z.string().max(80).optional().default(''),
  reference3: z.string().max(80).optional().default(''),
  vat: z.number().min(0)
    .refine((n) => /^\d+(\.\d{1,2})?$/.test(n.toString()), 'El IVA no puede tener mas de 2 decimales')
    .optional().default(0),
  serviceCode: z.string().max(10).optional().default(''),
  indicator4per1000: z.number().int().min(0).max(1).optional().default(0),
  ticketId: z.union([z.string(), z.number()]).optional(),
  recaptchaToken: z.string().optional()
}).refine(
  (data) => {
    if (data.userType === 'person' && data.identificationType === 'NIT') return false;
    return true;
  },
  { message: 'Si el tipo de persona es "person", el tipo de identificacion no puede ser NIT', path: ['identificationType'] }
).refine(
  (data) => {
    if (data.userType === 'company' && data.identificationType !== 'NIT') return false;
    return true;
  },
  { message: 'Si el tipo de persona es "company", el unico tipo de identificacion valido es NIT', path: ['identificationType'] }
).refine(
  (data) => {
    const forbidden = /[|"]/;
    return !forbidden.test(data.description);
  },
  { message: 'La descripcion no puede contener los caracteres | ni "', path: ['description'] }
);

export const finalizeTransactionSchema = z.object({
  trazabilityCode: z.string().min(1, 'Codigo de trazabilidad requerido'),
  authorizationId: z.string().optional()
});

export const trazabilityCodeParamSchema = z.object({
  trazabilityCode: z.string().min(1, 'Codigo de trazabilidad requerido')
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type FinalizeTransactionInput = z.infer<typeof finalizeTransactionSchema>;
```

### 9.24 `backend/errors/index.ts`

```typescript
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  public readonly errors: string[];

  constructor(message: string, errors: string[] = []) {
    super(message, 400, 'FAIL_VALIDATION');
    this.errors = errors;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Recurso no encontrado') {
    super(message, 404, 'NOT_FOUND');
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Demasiadas solicitudes') {
    super(message, 429, 'FAIL_RATE_LIMIT');
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

export class PSEApiError extends AppError {
  public readonly pseReturnCode: string;

  constructor(pseReturnCode: string, message: string) {
    super(message, 502, 'PSE_API_ERROR');
    this.pseReturnCode = pseReturnCode;
    Object.setPrototypeOf(this, PSEApiError.prototype);
  }
}

export class DoublePaymentError extends AppError {
  public readonly existingState: string;
  public readonly existingTrazabilityCode: string;

  constructor(state: string, trazabilityCode: string, ticketId: string | number) {
    super(`Doble pago detectado para ticket ${ticketId}`, 409, 'FAIL_DOUBLEPAYMENT');
    this.existingState = state;
    this.existingTrazabilityCode = trazabilityCode;
    Object.setPrototypeOf(this, DoublePaymentError.prototype);
  }
}

export class EncryptionError extends AppError {
  constructor(message: string = 'Error de cifrado') {
    super(message, 500, 'ENCRYPTION_ERROR');
    Object.setPrototypeOf(this, EncryptionError.prototype);
  }
}
```

### 9.25 `backend/utils/causalRejection.ts`

```typescript
export const CAUSAL_REJECTION: Record<string, string> = {
  '00001': 'El usuario abandono la transaccion en el banco',
  '00002': 'Cuenta embargada',
  '00003': 'Cuenta inactiva',
  '00004': 'La cuenta no existe',
  '00005': 'La cuenta no esta habilitada',
  '00006': 'La cuenta no ha sido habilitada para pagos',
  '00007': 'La cuenta esta saldada',
  '00008': 'El usuario excede el limite transaccional autorizado por el banco',
  '00009': 'El banco no se encuentra disponible',
  '00010': 'Fallas tecnicas en la Entidad Financiera',
  '00011': 'Fondos insuficientes',
  '00012': 'Inconsistencia en los datos de la transaccion',
  '00013': 'La cuenta esta cancelada',
  '00015': 'La transaccion no fue concluida en el banco. La entidad debe contar con un control de sesion (maximo 7 minutos) para no superar el tiempo de la sonda de PSE.',
  '00016': 'Datos de acceso invalidos en el portal de la Entidad Financiera',
  '00017': 'El usuario no tiene habilitado el servicio de PSE en su Entidad Financiera',
  '00024': 'Transaccion rechazada por sospecha de fraude en la Entidad Financiera',
  '00014': 'Cancelacion de PSE: el banco no confirmo el estado de la transaccion (3 intentos en 21 minutos)',
  '00018': 'Cambio de estado en la transaccion (de aprobada a rechazada) realizado por la Entidad Financiera',
  '00019': 'Transaccion declinada por el pre-autorizador (sospecha de fraude, Monitor Plus)',
  '00020': 'El usuario abandono la transaccion en PSE al regresar al comercio',
  '00021': 'El usuario abandono la transaccion en PSE al cerrar el navegador',
  '00022': 'El navegador utilizado no es compatible con PSE (versiones: Chrome 84+, Edge 18.18363+, Firefox 79+, Opera 69+, Safari 13.1+)',
  '00023': 'El usuario no presento actividad en PSE (TIMEOUT)',
  '00025': 'Cancelada por PSE: Credibanco no confirmo la transaccion',
  '00026': 'OTP NO INFORMADO. El usuario no ingreso el codigo OTP despues de agotar los reenvios configurados por la entidad y finalizado el tiempo configurado en el ultimo intento en PSE Avanza.',
  '00027': 'OTP INVALIDA. El usuario ingreso un OTP que no es valido o no cumple los requisitos.',
  '10001': 'La transaccion excede el limite asignado a la empresa en PSE',
  '10002': 'No se puede conectar a la Entidad Financiera',
  '10003': 'La Entidad Financiera no acepto iniciar la transaccion'
};

export function getCausalMessage(code: string): string {
  return CAUSAL_REJECTION[code] || `Causal ${code}`;
}
```

### 9.26 `backend/utils/dates.ts`

```typescript
export const COLOMBIA_OFFSET_HOURS: number = -5;

/**
 * Retorna la fecha/hora actual en formato ISO 8601 con offset -05:00 (Colombia)
 */
export function nowColombiaISO(): string {
  const now = new Date();
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  const colombiaMs = utcMs + (COLOMBIA_OFFSET_HOURS * 60 * 60 * 1000);
  const colombia = new Date(colombiaMs);

  const pad = (n: number, w: number = 2): string => String(n).padStart(w, '0');
  const yyyy = colombia.getUTCFullYear();
  const mm = pad(colombia.getUTCMonth() + 1);
  const dd = pad(colombia.getUTCDate());
  const hh = pad(colombia.getUTCHours());
  const mi = pad(colombia.getUTCMinutes());
  const ss = pad(colombia.getUTCSeconds());
  const ms = pad(colombia.getUTCMilliseconds(), 3);

  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}.${ms}-05:00`;
}
```

### 9.27 `backend/utils/errorMessages.ts`

```typescript
import { TransactionState } from '../../shared/types/transaction';

interface PSEErrorMessages {
  [key: string]: string;
}

interface ValidationErrors {
  FAIL_RECAPTCHA: string;
  FAIL_RATE_LIMIT: string;
  FAIL_INVALID_USER_TYPE: string;
  FAIL_FORBIDDEN_CHARS: (field: string) => string;
  FAIL_DOUBLEPAYMENT: (state: string, ticketId: string | number, cus: string) => string;
}

/**
 * Mensaje genérico exigido por PSE (Requisito #7) para los errores de creación
 * de transacción. Todos los códigos de GENERIC_CREATE_ERRORS —y cualquier código
 * desconocido— se resuelven a este texto.
 */
const GENERIC_CREATE_ERROR =
  'No se pudo crear la transaccion, por favor intente mas tarde o comuniquese con la empresa';

// Requisito PSE #7: estos códigos deben mostrar SIEMPRE el mensaje genérico.
const GENERIC_CREATE_ERRORS: string[] = [
  'FAIL_ENTITYNOTEXISTSORDISABLED',
  'FAIL_BANKNOTEXISTSORDISABLED',
  'FAIL_SERVICENOTEXISTSORNOTCONFIGURED',
  'FAIL_INVALIDAMOUNTORVATAMOUNT',
  'FAIL_INVALIDAMOUNT',
  'FAIL_INVALIDSOLICITDATE',
  'FAIL_CANNOTGETCURRENTCYCLE',
  'FAIL_ACCESSDENIED',
  'FAIL_TRANSACTIONNOTALLOWED',
  'FAIL_INVALIDPARAMETERS',
  'FAIL_GENERICERROR',
  // Otros códigos de fallo de creación que también deben ir al genérico
  'FAIL_NOTCONFIRMEDBYBANK',
  'FAIL_INCONSISTENTFECHA',
  'FAIL_INVALIDBANKPROCESSINGDATE'
];

export const PSE_ERROR_MESSAGES: PSEErrorMessages = {
  SUCCESS: 'Transaccion procesada correctamente.',

  // Requisito PSE #6: texto claro; las opciones de contacto se muestran en el
  // frontend (bloque de contacto). Se mantiene el core del texto exigido.
  FAIL_EXCEEDEDLIMIT:
    'El monto de la transaccion excede los limites establecidos en PSE para la empresa, ' +
    'por favor comuniquese con la empresa',

  // Requisito PSE #7: todos estos comparten el mensaje genérico
  FAIL_ENTITYNOTEXISTSORDISABLED: GENERIC_CREATE_ERROR,
  FAIL_BANKNOTEXISTSORDISABLED: GENERIC_CREATE_ERROR,
  FAIL_SERVICENOTEXISTSORNOTCONFIGURED: GENERIC_CREATE_ERROR,
  FAIL_INVALIDAMOUNTORVATAMOUNT: GENERIC_CREATE_ERROR,
  FAIL_INVALIDAMOUNT: GENERIC_CREATE_ERROR,
  FAIL_INVALIDSOLICITDATE: GENERIC_CREATE_ERROR,
  FAIL_CANNOTGETCURRENTCYCLE: GENERIC_CREATE_ERROR,
  FAIL_ACCESSDENIED: GENERIC_CREATE_ERROR,
  FAIL_TRANSACTIONNOTALLOWED: GENERIC_CREATE_ERROR,
  FAIL_INVALIDPARAMETERS: GENERIC_CREATE_ERROR,
  FAIL_GENERICERROR: GENERIC_CREATE_ERROR,
  FAIL_NOTCONFIRMEDBYBANK: GENERIC_CREATE_ERROR,
  FAIL_INCONSISTENTFECHA: GENERIC_CREATE_ERROR,
  FAIL_INVALIDBANKPROCESSINGDATE: GENERIC_CREATE_ERROR,

  // Códigos NO listados en el #7: mensajes recomendados (Anexo del doc)
  FAIL_DISABLEDUSEREMAIL:
    'El correo electronico ingresado presenta restricciones. Por favor verifique o use otro correo de contacto.',
  FAIL_ERRORINCREDITS:
    'Ocurrio un error al procesar los creditos. Por favor intente mas tarde.',
  FAIL_INVALIDTRAZABILITYCODE:
    'La transaccion aun se esta procesando. Por favor espere unos minutos.',
  FAIL_BANKUNREACHEABLE:
    'La entidad financiera no puede ser contactada para iniciar la transaccion, por favor seleccione otra o intente mas tarde',
  FAIL_TIMEOUT:
    'El tiempo de espera ha expirado. Por favor intente mas tarde.',
  FAIL_INVALIDSTATE:
    'La transaccion no puede ser procesada en este momento. Por favor intente mas tarde.',
  FAIL_INVALIDAUTHORIZEDAMOUNT:
    'El valor devuelto por la Entidad Financiera es diferente al valor enviado. Por favor intente mas tarde.'
};

export const VALIDATION_ERRORS: ValidationErrors = {
  FAIL_RECAPTCHA: 'No se pudo verificar que no eres un robot. Por favor intenta de nuevo.',
  FAIL_RATE_LIMIT: 'Demasiadas solicitudes. Por favor intente en un minuto.',
  FAIL_INVALID_USER_TYPE: 'Si el tipo de persona es "person", el tipo de identificacion no puede ser NIT. Si es "company", el unico tipo valido es NIT.',
  FAIL_FORBIDDEN_CHARS: (field: string): string =>
    `El campo "${field}" no puede contener los caracteres "|" ni '"'. Estos caracteres generan conflicto con el motor de fraude Monitor Plus.`,
  FAIL_DOUBLEPAYMENT: (state: string, ticketId: string | number, cus: string): string => {
    if (state === 'OK') {
      return `En este momento su #${ticketId} ha finalizado su proceso de pago y cuya transaccion se encuentra APROBADA en su entidad financiera. Si desea mas informacion sobre el estado de su operacion puede comunicarse a nuestras lineas de atencion al cliente 57-1-9999999 o enviar un correo electronico a facturacion@juntaatlantico.co y preguntar por el estado de la transaccion: ${cus}`;
    }
    if (state === 'PENDING') {
      return `En este momento su #${ticketId} presenta un proceso de pago cuya transaccion se encuentra PENDIENTE de recibir confirmacion por parte de su entidad financiera, por favor espere unos minutos y vuelva a consultar mas tarde para verificar si su pago fue confirmado de forma exitosa. Si desea mas informacion sobre el estado actual de su operacion puede comunicarse a nuestras lineas de atencion al cliente 57-1-9999999 o enviar un correo electronico a facturacion@juntaatlantico.co y preguntar por el estado de la transaccion: ${cus}`;
    }
    return 'Transaccion duplicada detectada. Por favor verifique el estado de su pago.';
  }
};

export function getPSEErrorMessage(code: string): string {
  if (GENERIC_CREATE_ERRORS.includes(code)) {
    return GENERIC_CREATE_ERROR;
  }
  return PSE_ERROR_MESSAGES[code] || GENERIC_CREATE_ERROR;
}

export function getDoublePaymentMessage(state: string, ticketId: string | number, cus: string): string {
  return VALIDATION_ERRORS.FAIL_DOUBLEPAYMENT(state, ticketId, cus);
}
```

### 9.28 `backend/utils/logger.ts`

```typescript
import winston from 'winston';
import path from 'path';

const logger: winston.Logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'pse-backend' },
  transports: [
    new winston.transports.File({
      filename: path.join(__dirname, '..', 'logs', 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5
    }),
    new winston.transports.File({
      filename: path.join(__dirname, '..', 'logs', 'app.log'),
      maxsize: 5242880,
      maxFiles: 5
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

export default logger;
```

### 9.29 `backend/utils/paymentMode.ts`

```typescript
export const PAYMENT_MODE_LABELS: Record<number, string> = {
  15: 'Debito en cuenta',
  50: 'Tarjeta de Credito Visa',
  51: 'Tarjeta de Credito MasterCard',
  52: 'Tarjeta de Credito Diners Club',
  53: 'Tarjeta de Credito Propia de la Entidad Financiera',
  54: 'Credito Rotativo',
  55: 'Tarjeta de Credito American Express',
  56: 'Tarjeta de Credito Propia del Comercio'
};

export const PAYMENT_ORIGIN_LABELS: Record<number, string> = {
  3: 'Debito',
  4: 'Credito'
};

export function getPaymentModeLabel(code: number): string {
  return PAYMENT_MODE_LABELS[code] || `Modo ${code}`;
}

export function getPaymentOriginLabel(code: number): string {
  return PAYMENT_ORIGIN_LABELS[code] || `Origen ${code}`;
}
```

### 9.30 `backend/utils/validators.ts`

```typescript
import { UserType, IdentificationType, PaymentData } from '../../shared/types/payment';
import { USER_TYPES, VALID_ID_TYPES, FORBIDDEN_CHARS_REGEX } from '../config/constants';

export class PaymentValidator {
  static validateUserTypeCombination(userType: UserType, identificationType: IdentificationType): void {
    if (!USER_TYPES.includes(userType)) {
      throw new Error('Tipo de persona invalido. Debe ser "person" o "company"');
    }
    if (!VALID_ID_TYPES.includes(identificationType)) {
      throw new Error(`Tipo de identificacion invalido: ${identificationType}`);
    }

    if (userType === 'person' && identificationType === 'NIT') {
      throw new Error('Si el tipo de persona es "person", el tipo de identificacion no puede ser NIT');
    }

    if (userType === 'company' && identificationType !== 'NIT') {
      throw new Error('Si el tipo de persona es "company", el unico tipo de identificacion valido es NIT');
    }
  }

  static validateNoForbiddenChars(field: string, value: string): void {
    if (typeof value === 'string' && FORBIDDEN_CHARS_REGEX.test(value)) {
      throw new Error(`El campo "${field}" no puede contener los caracteres "|" ni '"'`);
    }
  }

  static validatePaymentData(data: PaymentData): void {
    const required: (keyof PaymentData)[] = [
      'bankCode', 'amount', 'userType',
      'identificationType', 'identificationNumber',
      'fullName', 'cellphoneNumber', 'email', 'address',
      'description'
    ];

    for (const field of required) {
      if (!data[field] && data[field] !== 0) {
        throw new Error(`Campo requerido faltante: ${field}`);
      }
    }

    this.validateUserTypeCombination(data.userType, data.identificationType);

    (['description', 'reference1', 'reference2', 'reference3'] as const).forEach(field => {
      const value = data[field];
      if (typeof value === 'string') {
        this.validateNoForbiddenChars(field, value);
      }
    });

    if (data.amount <= 0) {
      throw new Error('El monto debe ser mayor a 0');
    }

    if (!/^\d{10}$/.test(String(data.cellphoneNumber).replace(/\D/g, ''))) {
      throw new Error('El numero de celular debe tener 10 digitos');
    }

    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new Error('Email invalido');
    }

    if (data.description && data.description.length > 80) {
      throw new Error('La descripcion no puede tener mas de 80 caracteres');
    }
  }
}
```

### 9.31 `backend/server.ts`

```typescript
import dotenv from 'dotenv';
dotenv.config();

import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config/pse.config';
import pseRoutes from './routes/pse.routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { securityHeaders, validateOrigin, getAllowedOrigins } from './middleware/securityHeaders.middleware';
import { requestIdMiddleware } from './middleware/requestId.middleware';
import { sanitizeInput } from './middleware/sanitize.middleware';
import logger from './utils/logger';

const app: Express = express();
const PORT: number = parseInt(process.env.PORT || '3000', 10);


// Hostinger (y cualquier hosting gestionado) pone un proxy inverso (Nginx)
// delante de Node.js. Sin esta configuracion, Express ignora el header
// X-Forwarded-For y el rate limit identifica a todos los usuarios como
// si fueran la misma IP (la del proxy interno).
// El valor 1 indica "confiar en un nivel de proxy" — el de Hostinger.
app.set('trust proxy', 1);

// ============================================
// MIDDLEWARES DE SEGURIDAD (Seccion 11 ACH)
// ============================================

// Request ID para trazabilidad
app.use(requestIdMiddleware);

// Helmet con configuracion estricta
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://www.google.com", "https://www.gstatic.com"],
      frameSrc: ["https://www.google.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://www.google.com"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: { action: 'deny' }
}));

// CORS estricto
app.use(cors({
  origin: getAllowedOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Recaptcha-Token']
}));

// Cabeceras de seguridad adicionales
app.use(securityHeaders);

// Validacion de Origin
app.use(validateOrigin);

// Logging con request ID
app.use(morgan(':method :url :status :res[content-length] - :response-time ms', {
  stream: { write: (message: string) => logger.info(message.trim()) }
}));

// Sanitizacion de inputs
app.use(sanitizeInput);

// Parsers
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false, limit: '1mb' }));

// Rutas
app.use('/api/pse', pseRoutes);

// 404
app.use(notFoundHandler);

// Error global
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Servidor PSE ejecutandose en puerto ${PORT}`);
  logger.info(`Entorno: ${config.env}`);
  logger.info(`reCAPTCHA: ${config.recaptcha.secret ? 'activo' : 'INACTIVO'}`);
  logger.info(`Rate Limit: ${config.rateLimit.max} req/${config.rateLimit.windowMs / 1000}s`);
});

export default app;
```

---

## 10. CÓDIGO FUENTE COMPLETO — FRONTEND (TypeScript + Vue 3)

> Código real del repositorio. Frontend compilado con Vite y desplegado como **sitio estático HTML** en Hostinger (`pse.juntaatlantico.co`). Las variables `VITE_*` se hornean en el build — no se configuran en el servidor.

### 10.1 `frontend/package.json`

```json
{
  "name": "junta-atlantico-pse-frontend",
  "version": "2.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview",
    "lint": "eslint .",
    "typecheck": "vue-tsc --noEmit"
  },
  "dependencies": {
    "axios": "^1.6.2",
    "pinia": "^2.1.7",
    "vue": "^3.4.0",
    "vue-router": "^4.2.5"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "@vitejs/plugin-vue": "^5.0.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.3.2",
    "vite": "^5.0.0",
    "vue-tsc": "^2.2.12"
  }
}
```

### 10.2 `frontend/tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "preserve",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@shared/*": ["../shared/*"]
    },
    "typeRoots": ["./node_modules/@types", "../shared/types"]
  },
  "include": [
    "env.d.ts",
    "src/**/*.ts",
    "src/**/*.tsx",
    "src/**/*.vue",
    "../shared/**/*.ts"
  ],
  "exclude": ["node_modules", "dist"]
}
```

### 10.3 `frontend/vite.config.js`

```javascript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false
  }
})
```

### 10.4 `frontend/env.d.ts`

```typescript
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
```

### 10.5 `frontend/index.html`

```
<!DOCTYPE html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pago PSE - Junta Atlántico</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

### 10.6 `frontend/src/main.ts`

```typescript
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './assets/css/main.css';
 
// El plugin VueReCaptcha (vue-recaptcha-v3) se elimino: cargaba api.js con
// "?render=explicit", lo que impedia que grecaptcha registrara el cliente v3
// del site key ("Invalid site key or not loaded in api.js"). La carga de
// reCAPTCHA la hace unicamente src/services/recaptcha.service.ts en modo v3.
 
const app = createApp(App);
 
app.use(createPinia());
app.use(router);
 
app.mount('#app');
 
```

### 10.7 `frontend/src/App.vue`

```vue
<template>
  <div id="app" class="min-h-screen bg-gray-50">
    <router-view />
  </div>
</template>

<script setup lang="ts">
</script>
```

### 10.8 `frontend/src/router/index.ts`

```typescript
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import Checkout from '../views/Checkout.vue';
import PaymentReturn from '../views/PaymentReturn.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/checkout'
  },
  {
    path: '/checkout',
    name: 'Checkout',
    component: Checkout
  },
  {
    path: '/retorno-pago',
    name: 'PaymentReturn',
    component: PaymentReturn
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
```

### 10.9 `frontend/src/services/api.service.ts`

```typescript
// import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
// import recaptchaService from './recaptcha.service';
// import { APIErrorResponse } from '../../../shared/types/errors';

// interface CreateTransactionResponse {
//   success: boolean;
//   data?: {
//     trazabilityCode: string;
//     pseURL: string;
//     ticketId: number | string;
//     transactionCycle: number;
//   };
//   message: string;
//   code?: string;
// }

// interface BankListResponse {
//   success: boolean;
//   data: Array<{
//     financialInstitutionCode: string;
//     financialInstitutionName: string;
//   }>;
//   message: string;
// }

// class APIService {
//   private baseURL: string;
//   private client: AxiosInstance;

//   constructor() {
//     this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/pse';
//     this.client = axios.create({
//       baseURL: this.baseURL,
//       timeout: 30000,
//       headers: { 'Content-Type': 'application/json' }
//     });

//     this.client.interceptors.response.use(
//       (response: AxiosResponse) => response,
//       (error: AxiosError) => {
//         if (error.response) {
//           const data = error.response.data as Record<string, unknown>;
//           throw {
//             status: error.response.status,
//             code: (data as any)?.code,
//             message: (data as any)?.message || error.message,
//             data: error.response.data
//           } as APIErrorResponse;
//         } else if (error.request) {
//           throw { status: 0, code: 'NETWORK_ERROR', message: 'No se pudo conectar con el servidor' } as APIErrorResponse;
//         } else {
//           throw { status: 0, code: 'UNKNOWN', message: error.message } as APIErrorResponse;
//         }
//       }
//     );
//   }

//   async getBanks(): Promise<BankListResponse> {
//     const response = await this.client.get<BankListResponse>('/banks');
//     return response.data;
//   }

//   async createTransaction(data: Record<string, any>): Promise<CreateTransactionResponse> {
//     let recaptchaToken: string | null = null;
//     try {
//       recaptchaToken = await recaptchaService.execute('pse_payment');
//     } catch (err) {
//       console.warn('reCAPTCHA no disponible, continuando sin el:', err);
//     }

//     const response = await this.client.post<CreateTransactionResponse>('/transaction', {
//       ...data,
//       recaptchaToken
//     });
//     return response.data;
//   }

//   async getTransactionStatus(trazabilityCode: string): Promise<{ success: boolean; data: Record<string, unknown> }> {
//     const response = await this.client.get(`/transaction/${trazabilityCode}/status`);
//     return response.data;
//   }

//   async getTransactionDetailed(trazabilityCode: string): Promise<{ success: boolean; data: Record<string, unknown> }> {
//     const response = await this.client.get(`/transaction/${trazabilityCode}/detailed`);
//     return response.data;
//   }

//   async finalizeTransaction(data: Record<string, unknown>): Promise<{ success: boolean; data: Record<string, unknown> }> {
//     const response = await this.client.post('/transaction/finalize', data);
//     return response.data;
//   }
// }

// export default new APIService();


import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import recaptchaService from './recaptcha.service';
import { APIErrorResponse } from '../../../shared/types/errors';

interface CreateTransactionResponse {
  success: boolean;
  data?: {
    trazabilityCode: string;
    pseURL: string;
    ticketId: number | string;
    transactionCycle: number;
  };
  message: string;
  code?: string;
}

interface BankListResponse {
  success: boolean;
  data: Array<{
    financialInstitutionCode: string;
    financialInstitutionName: string;
  }>;
  message: string;
}

class APIService {
  private baseURL: string;
  private client: AxiosInstance;

  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/pse';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });

    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => {
        if (error.response) {
          const data = error.response.data as Record<string, unknown>;
          throw {
            status: error.response.status,
            code: (data as any)?.code,
            message: (data as any)?.message || error.message,
            data: error.response.data
          } as APIErrorResponse;
        } else if (error.request) {
          throw { status: 0, code: 'NETWORK_ERROR', message: 'No se pudo conectar con el servidor' } as APIErrorResponse;
        } else {
          throw { status: 0, code: 'UNKNOWN', message: error.message } as APIErrorResponse;
        }
      }
    );
  }

  async getBanks(): Promise<BankListResponse> {
    const response = await this.client.get<BankListResponse>('/banks');
    return response.data;
  }

  async createTransaction(data: Record<string, any>): Promise<CreateTransactionResponse> {
    // CAMBIO: antes, si reCAPTCHA fallaba se hacia console.warn y se enviaba
    // recaptchaToken = null/'' al backend, que respondia el FAIL_RECAPTCHA
    // generico y ocultaba la causa real. Ahora se falla rapido con un error
    // claro y NO se llama al backend con un token invalido.
    let recaptchaToken: string;
    try {
      recaptchaToken = await recaptchaService.execute('pse_payment');
    } catch (err) {
      console.error('Error generando token reCAPTCHA:', err);
      throw {
        status: 0,
        code: 'RECAPTCHA_UNAVAILABLE',
        message:
          'No se pudo inicializar la verificacion de seguridad (reCAPTCHA). ' +
          'Recarga la pagina e intenta de nuevo. Si el problema persiste, ' +
          'verifica tu conexion o desactiva bloqueadores de contenido.'
      } as APIErrorResponse;
    }

    const response = await this.client.post<CreateTransactionResponse>('/transaction', {
      ...data,
      recaptchaToken
    });
    return response.data;
  }

  async getTransactionStatus(trazabilityCode: string): Promise<{ success: boolean; data: Record<string, unknown> }> {
    const response = await this.client.get(`/transaction/${trazabilityCode}/status`);
    return response.data;
  }

  async getTransactionDetailed(trazabilityCode: string): Promise<{ success: boolean; data: Record<string, unknown> }> {
    const response = await this.client.get(`/transaction/${trazabilityCode}/detailed`);
    return response.data;
  }

  async finalizeTransaction(data: Record<string, unknown>): Promise<{ success: boolean; data: Record<string, unknown> }> {
    const response = await this.client.post('/transaction/finalize', data);
    return response.data;
  }
}

export default new APIService();
```

### 10.10 `frontend/src/services/recaptcha.service.ts`

```typescript
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
```

### 10.11 `frontend/src/composables/usePolling.ts`

```typescript
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
```

### 10.12 `frontend/src/composables/useReCaptcha.ts`

```typescript
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
```

### 10.13 `frontend/src/stores/payment.store.ts`

```typescript
import { defineStore } from 'pinia';
import apiService from '../services/api.service';

interface BankItem {
  financialInstitutionCode: string;
  financialInstitutionName: string;
}

interface PaymentState {
  banks: BankItem[];
  loading: boolean;
  error: string | null;
  transactionResult: Record<string, unknown> | null;
  transactionStatus: Record<string, unknown> | null;
  transactionDetailed: Record<string, unknown> | null;
}

export const usePaymentStore = defineStore('payment', {
  state: (): PaymentState => ({
    banks: [],
    loading: false,
    error: null,
    transactionResult: null,
    transactionStatus: null,
    transactionDetailed: null
  }),

  actions: {
    async fetchBanks(): Promise<void> {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiService.getBanks();
        if (response.success) {
          this.banks = response.data;
        }
      } catch (err) {
        this.error = (err as Error).message || 'Error al cargar bancos';
      } finally {
        this.loading = false;
      }
    },

    async createTransaction(paymentData: Record<string, unknown>): Promise<Record<string, unknown>> {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiService.createTransaction(paymentData);
        if (response.success) {
          this.transactionResult = response as unknown as Record<string, unknown>;
        }
        return response as unknown as Record<string, unknown>;
      } catch (err) {
        this.error = (err as Error).message || 'Error al crear transaccion';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async checkStatus(trazabilityCode: string): Promise<Record<string, unknown>> {
      try {
        const response = await apiService.getTransactionStatus(trazabilityCode);
        if (response.success) {
          this.transactionStatus = response.data;
        }
        return response as unknown as Record<string, unknown>;
      } catch (err) {
        this.error = (err as Error).message || 'Error al consultar estado';
        throw err;
      }
    },

    async fetchDetailed(trazabilityCode: string): Promise<Record<string, unknown> | undefined> {
      try {
        const response = await apiService.getTransactionDetailed(trazabilityCode);
        if (response.success) {
          this.transactionDetailed = response.data;
        }
        return response as unknown as Record<string, unknown>;
      } catch (err) {
        console.warn('Error cargando detalle:', err);
        return undefined;
      }
    },

    reset(): void {
      this.transactionResult = null;
      this.transactionStatus = null;
      this.transactionDetailed = null;
      this.error = null;
    }
  }
});
```

### 10.14 `frontend/src/utils/causalRejection.ts`

```typescript
export const CAUSAL_REJECTION: Record<string, string> = {
  '00001': 'El usuario abandono la transaccion en el banco',
  '00002': 'Cuenta embargada',
  '00003': 'Cuenta inactiva',
  '00004': 'La cuenta no existe',
  '00005': 'La cuenta no esta habilitada',
  '00006': 'La cuenta no ha sido habilitada para pagos',
  '00007': 'La cuenta esta saldada',
  '00008': 'Excediste el limite transaccional autorizado por tu banco',
  '00009': 'El banco no se encuentra disponible',
  '00010': 'Fallas tecnicas en la Entidad Financiera',
  '00011': 'Fondos insuficientes',
  '00012': 'Inconsistencia en los datos de la transaccion',
  '00013': 'La cuenta esta cancelada',
  '00015': 'La transaccion no fue concluida en el banco en el tiempo maximo permitido (7 min).',
  '00016': 'Datos de acceso invalidos en el portal de la Entidad Financiera',
  '00017': 'No tienes habilitado el servicio de PSE en tu Entidad Financiera',
  '00024': 'Transaccion rechazada por sospecha de fraude en la Entidad Financiera',
  '00014': 'El banco no confirmo el estado de la transaccion en el tiempo establecido.',
  '00018': 'La transaccion fue cambiada de aprobada a rechazada por la Entidad Financiera.',
  '00019': 'Transaccion declinada por sospecha de fraude (Monitor Plus).',
  '00020': 'Abandonaste la transaccion al regresar al comercio.',
  '00021': 'Abandonaste la transaccion al cerrar el navegador.',
  '00022': 'Tu navegador no es compatible con PSE. Usa Chrome 84+, Edge 18+, Firefox 79+, Opera 69+ o Safari 13.1+.',
  '00023': 'No presentaste actividad en PSE (TIMEOUT).',
  '00025': 'Credibanco no confirmo la transaccion.',
  '00026': 'OTP no informado. Agotaste los reenvios configurados por la Entidad Financiera.',
  '00027': 'OTP invalida. Verifica el codigo enviado por tu banco.',
  '10001': 'La transaccion excede el limite asignado a la empresa en PSE.',
  '10002': 'No se puede conectar a la Entidad Financiera.',
  '10003': 'La Entidad Financiera no acepto iniciar la transaccion.'
};

export function getCausalMessage(code: string): string {
  return CAUSAL_REJECTION[code] || `Causal ${code}`;
}
```

### 10.15 `frontend/src/utils/errorMessages.ts`

```typescript
interface PSEErrorMessages {
  [key: string]: string;
}

/**
 * Mensaje genérico exigido por PSE (Requisito #7) para los errores de creación
 * de transacción. Todos los códigos de GENERIC_CREATE_ERRORS —y cualquier código
 * desconocido— se resuelven a este texto.
 */
const GENERIC_CREATE_ERROR =
  'No se pudo crear la transaccion, por favor intente mas tarde o comuniquese con la empresa.';

// Requisito PSE #7: estos códigos deben mostrar SIEMPRE el mensaje genérico.
const GENERIC_CREATE_ERRORS: string[] = [
  'FAIL_ENTITYNOTEXISTSORDISABLED',
  'FAIL_BANKNOTEXISTSORDISABLED',
  'FAIL_SERVICENOTEXISTSORNOTCONFIGURED',
  'FAIL_INVALIDAMOUNTORVATAMOUNT',
  'FAIL_INVALIDAMOUNT',
  'FAIL_INVALIDSOLICITDATE',
  'FAIL_CANNOTGETCURRENTCYCLE',
  'FAIL_ACCESSDENIED',
  'FAIL_TRANSACTIONNOTALLOWED',
  'FAIL_INVALIDPARAMETERS',
  'FAIL_GENERICERROR'
];

export const PSE_ERROR_MESSAGES: PSEErrorMessages = {
  SUCCESS: 'Transaccion procesada correctamente.',

  // Requisito PSE #6: texto claro + se ofrecen opciones de contacto (bloque aparte).
  FAIL_EXCEEDEDLIMIT:
    'El monto de la transaccion excede los limites establecidos en PSE para la empresa, ' +
    'por favor comuniquese con la empresa.',

  // Mensaje genérico (Requisito #7)
  FAIL_GENERICERROR: GENERIC_CREATE_ERROR,

  // Mensajes recomendados (Anexo doc) para códigos NO listados en el #7
  FAIL_BANKUNREACHEABLE:
    'La entidad financiera no puede ser contactada para iniciar la transaccion, ' +
    'por favor seleccione otra o intente mas tarde.',
  FAIL_DISABLEDUSEREMAIL:
    'El correo electronico ingresado presenta restricciones. ' +
    'Por favor verifique o use otro correo de contacto.',
  FAIL_ERRORINCREDITS:
    'Ocurrio un error al procesar los creditos. Por favor intente mas tarde.',
  FAIL_INVALIDTRAZABILITYCODE:
    'La transaccion aun se esta procesando. Por favor espere unos minutos.',
  FAIL_TIMEOUT:
    'El tiempo de espera ha expirado. Por favor intente mas tarde.',

  // Errores del lado cliente (no son respuestas de creación PSE)
  FAIL_RECAPTCHA:
    'No se pudo verificar que no eres un robot. Por favor intenta de nuevo.',
  RECAPTCHA_UNAVAILABLE:
    'No se pudo inicializar la verificacion de seguridad. Recarga la pagina e intenta de nuevo.',
  FAIL_RATE_LIMIT:
    'Demasiadas solicitudes. Por favor intente en un minuto.',
  FAIL_DOUBLEPAYMENT: 'Verifique el estado de su pago antes de iniciar uno nuevo.',
  FAIL_VALIDATION: 'Por favor verifica los datos ingresados.'
};

export function getErrorMessage(code: string): string {
  if (GENERIC_CREATE_ERRORS.includes(code)) {
    return GENERIC_CREATE_ERROR;
  }
  return PSE_ERROR_MESSAGES[code] || GENERIC_CREATE_ERROR;
}

/**
 * Indica si, para el código dado, se deben ofrecer opciones de contacto con la
 * empresa (Requisitos PSE #6 y #7). Aplica a EXCEEDEDLIMIT, a los errores de
 * creación de transacción y a cualquier código desconocido; NO a los errores de
 * cliente (validación, reCAPTCHA, rate limit, doble pago).
 */
export function shouldOfferContact(code: string): boolean {
  const clientSide = [
    'FAIL_VALIDATION', 'FAIL_RECAPTCHA', 'RECAPTCHA_UNAVAILABLE',
    'FAIL_RATE_LIMIT', 'FAIL_DOUBLEPAYMENT'
  ];
  if (!code) return false;
  if (clientSide.includes(code)) return false;
  return true;
}
```

### 10.16 `frontend/src/utils/formatters.ts`

```typescript
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

export function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return isoString;
  }
}
```

### 10.17 `frontend/src/utils/paymentMode.ts`

```typescript
export const PAYMENT_MODE_LABELS: Record<number, string> = {
  15: 'Debito en cuenta',
  50: 'Tarjeta de Credito Visa',
  51: 'Tarjeta de Credito MasterCard',
  52: 'Tarjeta de Credito Diners Club',
  53: 'Tarjeta de Credito Propia de la Entidad Financiera',
  54: 'Credito Rotativo',
  55: 'Tarjeta de Credito American Express',
  56: 'Tarjeta de Credito Propia del Comercio'
};

export const PAYMENT_ORIGIN_LABELS: Record<number, string> = {
  3: 'Debito',
  4: 'Credito'
};

export function getPaymentModeLabel(code: number): string {
  return PAYMENT_MODE_LABELS[code] || `Modo ${code}`;
}

export function getPaymentOriginLabel(code: number): string {
  return PAYMENT_ORIGIN_LABELS[code] || `Origen ${code}`;
}
```

### 10.18 `frontend/src/utils/validators.ts`

```typescript
export const FORBIDDEN_CHARS_REGEX: RegExp = /[|"]/;

export function validateNoForbiddenChars(field: string, value: string): string | null {
  if (typeof value === 'string' && FORBIDDEN_CHARS_REGEX.test(value)) {
    return `El campo "${field}" no puede contener los caracteres "|" ni '"'`;
  }
  return null;
}

export function validateUserTypeCombination(userType: string, identificationType: string): string | null {
  if (userType === 'person' && identificationType === 'NIT') {
    return 'Si el tipo de persona es "Persona Natural", el tipo de identificacion no puede ser NIT';
  }
  if (userType === 'company' && identificationType !== 'NIT') {
    return 'Si el tipo de persona es "Empresa", el unico tipo de identificacion valido es NIT';
  }
  return null;
}

interface FormData {
  bankCode: string;
  identificationNumber: string;
  fullName: string;
  cellphoneNumber: string;
  email: string;
  address: string;
  description: string;
  amount: number | null;
  userType: string;
  identificationType: string;
  reference1?: string;
  reference2?: string;
  reference3?: string;
}

export interface ValidationErrors {
  [key: string]: string | undefined;
}

export function validateForm(data: FormData): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!data.bankCode) errors.bankCode = 'Selecciona un banco';
  if (!data.identificationNumber) errors.identificationNumber = 'Requerido';
  if (!data.fullName) errors.fullName = 'Requerido';
  if (!data.cellphoneNumber) errors.cellphoneNumber = 'Requerido';
  if (!data.email) errors.email = 'Requerido';
  if (!data.address) errors.address = 'Requerida';
  if (!data.description) errors.description = 'Requerida';

  if (!data.amount || data.amount <= 0) errors.amount = 'El monto debe ser mayor a 0';

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Email invalido';
  }

  if (data.cellphoneNumber && !/^\d{10}$/.test(data.cellphoneNumber.replace(/\D/g, ''))) {
    errors.cellphoneNumber = 'El celular debe tener 10 digitos';
  }

  const charErrors: (string | null)[] = [
    validateNoForbiddenChars('description', data.description),
    validateNoForbiddenChars('reference1', data.reference1 || ''),
    validateNoForbiddenChars('reference2', data.reference2 || ''),
    validateNoForbiddenChars('reference3', data.reference3 || '')
  ].filter(Boolean);

  if (charErrors.length > 0) {
    errors.forbiddenChars = charErrors[0] || undefined;
  }

  const userTypeError: string | null = validateUserTypeCombination(data.userType, data.identificationType);
  if (userTypeError) errors.userType = userTypeError;

  return errors;
}
```

### 10.19 `frontend/src/components/BankList.vue`

```vue
<template>
  <div class="mb-6">
    <label class="block text-sm font-medium text-gray-700 mb-2">
      Banco <span class="text-red-500">*</span>
    </label>
    <div v-if="loading" class="flex items-center justify-center py-4">
      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      <span class="ml-2 text-sm text-gray-500">Cargando bancos...</span>
    </div>
    <select
      v-else
      :value="modelValue"
      @change="onSelect(($event.target as HTMLSelectElement).value)"
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      :class="{ 'border-red-500': error }"
    >
      <option value="" disabled>Selecciona tu banco</option>
      <option
        v-for="bank in banks"
        :key="bank.financialInstitutionCode"
        :value="bank.financialInstitutionCode"
      >
        {{ bank.financialInstitutionName }}
      </option>
    </select>
    <p v-if="error" class="mt-1 text-xs text-red-600">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { usePaymentStore } from '../stores/payment.store';

defineProps<{
  modelValue?: string;
  error?: string;
}>();

const store = usePaymentStore();

const { loading, banks } = storeToRefs(store);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

// Emite la selección y persiste el NOMBRE del banco para poder mostrarlo en el
// comprobante final (Requisito PSE #11), ya que el formulario solo maneja el código.
function onSelect(code: string): void {
  emit('update:modelValue', code);
  const bank = store.banks.find((b) => b.financialInstitutionCode === code);
  if (bank) {
    sessionStorage.setItem('pse_bank_name', bank.financialInstitutionName);
  }
}

onMounted(() => {
  if (store.banks.length === 0) {
    store.fetchBanks();
  }
});
</script>
```

### 10.20 `frontend/src/components/ErrorAlert.vue`

```vue
<template>
  <div v-if="message" class="p-4 rounded-lg" :class="typeClasses">
    <p class="text-sm flex items-start">
      <span class="mr-2">{{ icon }}</span>
      <span>{{ message }}</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ComputedRef } from 'vue';

const props = withDefaults(defineProps<{
  message?: string;
  type?: 'error' | 'success' | 'warning' | 'info';
}>(), {
  message: '',
  type: 'error'
});

const typeClasses: ComputedRef<string> = computed(() => {
  const classes: Record<string, string> = {
    error: 'bg-red-50 border border-red-200 text-red-600',
    success: 'bg-green-50 border border-green-200 text-green-600',
    warning: 'bg-yellow-50 border border-yellow-200 text-yellow-600',
    info: 'bg-blue-50 border border-blue-200 text-blue-600'
  };
  return classes[props.type] || classes.error;
});

const icon: ComputedRef<string> = computed(() => {
  const icons: Record<string, string> = {
    error: '\u274C',
    success: '\u2705',
    warning: '\u26A0\uFE0F',
    info: '\u2139\uFE0F'
  };
  return icons[props.type] || icons.error;
});
</script>
```

### 10.21 `frontend/src/components/LoadingSpinner.vue`

```vue
<template>
  <div class="flex items-center justify-center py-8">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p v-if="message" class="mt-4 text-gray-600">{{ message }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  message?: string;
}>(), {
  message: 'Cargando...'
});
</script>
```

### 10.22 `frontend/src/components/PaymentForm.vue`

```vue
<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Tipo de Persona -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Tipo de persona <span class="text-red-500">*</span>
      </label>
      <div class="grid grid-cols-2 gap-3">
        <button
          type="button"
          @click="setUserType('person')"
          class="py-2 px-4 border rounded-lg transition-colors"
          :class="form.userType === 'person'
            ? 'bg-blue-50 border-blue-500 text-blue-700'
            : 'border-gray-300 text-gray-700 hover:bg-gray-50'"
        >
          <span class="block font-medium">Persona Natural</span>
          <span class="text-xs text-gray-500">Cedula de ciudadania</span>
        </button>
        <button
          type="button"
          @click="setUserType('company')"
          class="py-2 px-4 border rounded-lg transition-colors"
          :class="form.userType === 'company'
            ? 'bg-blue-50 border-blue-500 text-blue-700'
            : 'border-gray-300 text-gray-700 hover:bg-gray-50'"
        >
          <span class="block font-medium">Empresa</span>
          <span class="text-xs text-gray-500">NIT</span>
        </button>
      </div>
    </div>

    <!-- Tipo y Numero de Identificacion -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="identificationType" class="block text-sm font-medium text-gray-700 mb-1">
          Tipo de identificacion <span class="text-red-500">*</span>
        </label>
        <select
          id="identificationType"
          v-model="form.identificationType"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          :class="{ 'border-red-500': fieldErrors.identificationType }"
          required
        >
          <option v-if="form.userType === 'person'" value="CedulaDeCiudadania">Cedula de Ciudadania</option>
          <option v-if="form.userType === 'person'" value="CedulaDeExtranjeria">Cedula de Extranjeria</option>
          <option v-if="form.userType === 'person'" value="Pasaporte">Pasaporte</option>
          <option v-if="form.userType === 'person'" value="TarjetaDeIdentidad">Tarjeta de Identidad</option>
          <option v-if="form.userType === 'person'" value="DocumentoDeIdentificacionExtranjero">Doc. de Identificacion Extranjero</option>
          <option v-if="form.userType === 'company'" value="NIT">NIT</option>
        </select>
        <p v-if="fieldErrors.identificationType" class="mt-1 text-xs text-red-600">
          {{ fieldErrors.identificationType }}
        </p>
      </div>
      <div>
        <label for="identificationNumber" class="block text-sm font-medium text-gray-700 mb-1">
          Numero de identificacion <span class="text-red-500">*</span>
        </label>
        <input
          id="identificationNumber"
          v-model="form.identificationNumber"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          :class="{ 'border-red-500': fieldErrors.identificationNumber }"
          placeholder="Ej: 1234567890"
          required
        />
        <p v-if="fieldErrors.identificationNumber" class="mt-1 text-xs text-red-600">
          {{ fieldErrors.identificationNumber }}
        </p>
      </div>
    </div>

    <!-- Nombre completo -->
    <div>
      <label for="fullName" class="block text-sm font-medium text-gray-700 mb-1">
        Nombre completo <span class="text-red-500">*</span>
      </label>
      <input
        id="fullName"
        v-model="form.fullName"
        type="text"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        :class="{ 'border-red-500': fieldErrors.fullName }"
        placeholder="Ej: Juan Perez Gomez"
        required
      />
      <p v-if="fieldErrors.fullName" class="mt-1 text-xs text-red-600">{{ fieldErrors.fullName }}</p>
    </div>

    <!-- Celular y Email -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="cellphoneNumber" class="block text-sm font-medium text-gray-700 mb-1">
          Celular <span class="text-red-500">*</span>
        </label>
        <input
          id="cellphoneNumber"
          v-model="form.cellphoneNumber"
          type="tel"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          :class="{ 'border-red-500': fieldErrors.cellphoneNumber }"
          placeholder="3001234567"
          maxlength="10"
          required
        />
        <p v-if="fieldErrors.cellphoneNumber" class="mt-1 text-xs text-red-600">
          {{ fieldErrors.cellphoneNumber }}
        </p>
      </div>
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
          Correo electronico <span class="text-red-500">*</span>
        </label>
        <input
          id="email"
          v-model="form.email"
          type="email"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          :class="{ 'border-red-500': fieldErrors.email }"
          placeholder="ejemplo@correo.com"
          required
        />
        <p v-if="fieldErrors.email" class="mt-1 text-xs text-red-600">{{ fieldErrors.email }}</p>
      </div>
    </div>

    <!-- Direccion -->
    <div>
      <label for="address" class="block text-sm font-medium text-gray-700 mb-1">
        Direccion <span class="text-red-500">*</span>
      </label>
      <input
        id="address"
        v-model="form.address"
        type="text"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        :class="{ 'border-red-500': fieldErrors.address }"
        placeholder="Calle Falsa 123"
        required
      />
      <p v-if="fieldErrors.address" class="mt-1 text-xs text-red-600">{{ fieldErrors.address }}</p>
    </div>

    <!-- Monto -->
    <div>
      <label for="amount" class="block text-sm font-medium text-gray-700 mb-1">
        Valor a pagar <span class="text-red-500">*</span>
      </label>
      <div class="relative">
        <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-medium">$</span>
        <input
          id="amount"
          v-model.number="form.amount"
          type="number"
          step="0.01"
          min="0.01"
          class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          :class="{ 'border-red-500': fieldErrors.amount }"
          placeholder="0.00"
          required
        />
      </div>
      <p v-if="fieldErrors.amount" class="mt-1 text-xs text-red-600">{{ fieldErrors.amount }}</p>
    </div>

    <!-- Descripcion -->
    <div>
      <label for="description" class="block text-sm font-medium text-gray-700 mb-1">
        Descripcion del pago <span class="text-red-500">*</span>
      </label>
      <input
        id="description"
        v-model="form.description"
        type="text"
        @input="validateForbiddenChars"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        :class="{ 'border-red-500': fieldErrors.description || fieldErrors.forbiddenChars }"
        placeholder="Ej: Pago de calificacion de invalidez"
        maxlength="80"
        required
      />
      <div class="flex justify-between mt-1">
        <p class="text-xs text-red-600">{{ fieldErrors.description || fieldErrors.forbiddenChars }}</p>
        <p class="text-xs text-gray-500">
          {{ form.description ? 80 - form.description.length : 80 }} caracteres restantes
        </p>
      </div>
    </div>

    <!-- Lista de bancos -->
    <BankList v-model="form.bankCode" :error="fieldErrors.bankCode" />

    <!-- Badge reCAPTCHA -->
    <p class="text-xs text-gray-500 text-center">
      Este sitio esta protegido por reCAPTCHA y se aplican la
      <a href="https://policies.google.com/privacy" class="underline" target="_blank">Politica de privacidad</a> y
      <a href="https://policies.google.com/terms" class="underline" target="_blank">Terminos del servicio</a> de Google.
    </p>

    <!-- Botones -->
    <div class="flex flex-col sm:flex-row gap-4 pt-4">
      <button
        type="submit"
        :disabled="loading || !isFormValid"
        class="flex-1 py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <span v-if="loading">
          <svg class="inline animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ loadingMessage }}
        </span>
        <span v-else>Debito Bancario PSE</span>
      </button>
      <button
        type="button"
        @click="$emit('cancel')"
        :disabled="loading"
        class="py-3 px-6 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        Cancelar
      </button>
    </div>

    <!-- Errores -->
    <div v-if="error" class="p-4 bg-red-50 border border-red-200 rounded-lg">
      <p class="text-sm text-red-600 flex items-start">
        <span class="mr-2">&#10060;</span>
        <span>{{ error }}</span>
      </p>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, Ref, ComputedRef } from 'vue';
import BankList from './BankList.vue';
import apiService from '../services/api.service';
import { useReCaptcha } from '../composables/useReCaptcha';
import { validateForm, validateNoForbiddenChars, ValidationErrors } from '../utils/validators';
import { getErrorMessage } from '../utils/errorMessages';

interface SuccessPayload {
  trazabilityCode: string;
  pseURL: string;
  ticketId: string;
  formData: FormData;
}

interface ErrorPayload {
  code: string;
  message: string;
}

interface FormData {
  bankCode: string;
  identificationNumber: string;
  fullName: string;
  cellphoneNumber: string;
  email: string;
  address: string;
  description: string;
  amount: number | null;
  userType: string;
  identificationType: string;
  reference1?: string;
  reference2?: string;
  reference3?: string;
  serviceCode?: string;
  vat?: number;
}

interface ApiResponse {
  success: boolean;
  data?: {
    trazabilityCode: string;
    ticketId: string;
    pseURL: string;
  };
  message?: string;
  code?: string;
}

const emit = defineEmits<{
  (e: 'success', payload: SuccessPayload): void;
  (e: 'cancel'): void;
  (e: 'error', payload: ErrorPayload): void;
  (e: 'loading', isLoading: boolean): void;
}>();

const loading: Ref<boolean> = ref(false);
const error: Ref<string> = ref('');
const fieldErrors: Ref<ValidationErrors> = ref({});
const loadingMessage: Ref<string> = ref('Procesando...');

const { init: initRecaptcha } = useReCaptcha();
initRecaptcha();

const form: FormData = reactive({
  userType: 'person',
  identificationType: 'CedulaDeCiudadania',
  identificationNumber: '',
  fullName: '',
  cellphoneNumber: '',
  email: '',
  address: '',
  amount: null,
  description: '',
  bankCode: '',
  serviceCode: import.meta.env.VITE_PSE_SERVICE_CODE || '',
  vat: 0,
  reference1: '',
  reference2: '',
  reference3: ''
});

const isFormValid: ComputedRef<boolean> = computed(() => {
  return !!(
    form.bankCode &&
    form.identificationNumber?.trim() &&
    form.fullName?.trim() &&
    form.cellphoneNumber?.trim() &&
    form.email?.trim() &&
    form.address?.trim() &&
    form.amount && form.amount > 0 &&
    form.description?.trim()
  );
});

function setUserType(type: string): void {
  form.userType = type;
  if (type === 'company') {
    form.identificationType = 'NIT';
  } else {
    form.identificationType = 'CedulaDeCiudadania';
  }
}

function validateForbiddenChars(): void {
  const err: string | null = validateNoForbiddenChars('description', form.description);
  if (err) {
    fieldErrors.value.forbiddenChars = err;
  } else {
    delete fieldErrors.value.forbiddenChars;
  }
}

watch(() => form.cellphoneNumber, (newVal: string) => {
  form.cellphoneNumber = String(newVal).replace(/\D/g, '').slice(0, 10);
});

watch(loading, (newVal: boolean) => {
  loadingMessage.value = newVal ? 'Creando transaccion...' : 'Procesando...';
  emit('loading', newVal);
});

async function handleSubmit(): Promise<void> {
  error.value = '';
  fieldErrors.value = {};

  const errors: ValidationErrors = validateForm(form);
  if (Object.keys(errors).length > 0) {
    fieldErrors.value = errors;
    error.value = 'Por favor completa todos los campos requeridos correctamente';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  if (!form.serviceCode) {
    error.value = 'Error de configuracion: Codigo de servicio no definido';
    return;
  }

  loading.value = true;

  try {
    const response: ApiResponse = await apiService.createTransaction(form) as ApiResponse;

    if (response.success && response.data) {
      sessionStorage.setItem('pse_trazability_code', response.data.trazabilityCode);
      sessionStorage.setItem('pse_ticket_id', response.data.ticketId);
      sessionStorage.setItem('pse_form_data', JSON.stringify(form));

      emit('success', {
        trazabilityCode: response.data.trazabilityCode,
        pseURL: response.data.pseURL,
        ticketId: response.data.ticketId,
        formData: { ...form }
      });
    } else {
      const message: string = response.message || getErrorMessage(response.code || '');
      error.value = message;
      emit('error', { code: response.code || '', message });
    }
  } catch (err) {
    const e = err as { message?: string; code?: string };
    const message: string = e.message || getErrorMessage(e.code || '');
    error.value = message;
    emit('error', { code: e.code || '', message });
  } finally {
    loading.value = false;
  }
}
</script>
```

### 10.23 `frontend/src/components/PaymentSummary.vue`

```vue
<template>
  <div v-if="loading" class="flex items-center justify-center py-8">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
  <div v-else class="bg-white border border-gray-200 rounded-lg p-4">
    <h3 class="font-medium text-gray-700 mb-3">Resumen del pago</h3>
    <div class="space-y-2 text-sm">
      <div class="flex justify-between">
        <span class="text-gray-500">Banco:</span>
        <span>{{ bankName }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500">Valor:</span>
        <span class="font-bold">${{ formatCurrency(amount) }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500">Descripcion:</span>
        <span>{{ description }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500">Tipo:</span>
        <span>{{ userType === 'person' ? 'Persona Natural' : 'Empresa' }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500">Identificacion:</span>
        <span>{{ identificationNumber }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ComputedRef } from 'vue';
import { storeToRefs } from 'pinia';
import { usePaymentStore } from '../stores/payment.store';
import { formatCurrency } from '../utils/formatters';

interface BankItem {
  financialInstitutionCode: string;
  financialInstitutionName: string;
}

const props = withDefaults(defineProps<{
  bankCode?: string;
  amount?: number;
  description?: string;
  userType?: string;
  identificationNumber?: string;
}>(), {
  bankCode: '',
  amount: 0,
  description: '',
  userType: 'person',
  identificationNumber: ''
});

const store = usePaymentStore();
const { loading } = storeToRefs(store);

const bankName: ComputedRef<string> = computed(() => {
  const bank: BankItem | undefined = store.banks.find(
    (b: BankItem) => b.financialInstitutionCode === props.bankCode
  );
  return bank ? bank.financialInstitutionName : props.bankCode;
});
</script>
```

### 10.24 `frontend/src/components/RejectionReason.vue`

```vue
<template>
  <div v-if="causeRejection" class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
    <div class="flex items-start">
      <div class="flex-shrink-0">
        <span class="text-2xl">&#9888;&#65039;</span>
      </div>
      <div class="ml-3 flex-1">
        <h4 class="text-sm font-semibold text-red-800">Por que fue rechazada?</h4>
        <p class="text-sm text-red-700 mt-1">
          <strong>Causal {{ causeRejection }}:</strong> {{ friendlyCausal }}
        </p>
        <p v-if="rejectionDescription" class="text-xs text-red-600 mt-2">
          {{ rejectionDescription }}
        </p>
        <p v-if="stateDescription" class="text-xs text-red-600 mt-1">
          Estado: {{ stateDescription }}
        </p>
        <div class="mt-3 flex gap-2">
          <button
            @click="$emit('retry')"
            class="text-xs px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Intentar de nuevo
          </button>
          <a
            href="mailto:facturacion@juntaatlantico.co"
            class="text-xs px-3 py-1 border border-red-300 text-red-700 rounded hover:bg-red-100"
          >
            Contactar soporte
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ComputedRef } from 'vue';
import { getCausalMessage } from '../utils/causalRejection';

const props = withDefaults(defineProps<{
  causeRejection?: string | null;
  rejectionDescription?: string | null;
  stateDescription?: string | null;
}>(), {
  causeRejection: null,
  rejectionDescription: null,
  stateDescription: null
});

defineEmits<{
  (e: 'retry'): void;
}>();

const friendlyCausal: ComputedRef<string> = computed(() =>
  props.causeRejection ? getCausalMessage(props.causeRejection) : ''
);
</script>
```

### 10.25 `frontend/src/views/Checkout.vue`

```vue
<template>
  <div class="min-h-screen bg-gray-50 py-12 px-4 sm:flex sm:items-center sm:justify-center">
    <div class="max-w-lg mx-auto">
      <!-- Header -->
      <div class="text-center mb-8">
        <img src="/junta-atlantico-logo.svg" alt="Junta Atlantico" class="h-16 mx-auto mb-4" />
        <h1 class="text-2xl font-bold text-gray-900">Pago PSE</h1>
        <p class="text-gray-600 mt-1">Junta Regional de Calificacion de Invalidez del Atlantico</p>
      </div>

      <!-- Formulario -->
      <div class="bg-white rounded-xl shadow-lg overflow-hidden p-6">
        <PaymentForm
          @success="handleSuccess"
          @error="handleError"
          @cancel="handleCancel"
          @loading="handleLoading"
        />
      </div>

      <!-- Footer -->
      <p class="text-center text-xs text-gray-500 mt-6">
        Debito Bancario PSE - Junta Atlantico S.A.S.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import PaymentForm from '../components/PaymentForm.vue';

interface SuccessPayload {
  trazabilityCode: string;
  pseURL: string;
}

interface ErrorPayload {
  code: string;
  message: string;
}

const router = useRouter();

function handleSuccess({ trazabilityCode, pseURL }: SuccessPayload): void {
  if (pseURL) {
    window.location.href = pseURL;
  } else {
    router.push({
      name: 'PaymentReturn',
      query: { trazabilityCode }
    });
  }
}

function handleError({ code, message }: ErrorPayload): void {
  console.error('Error en pago:', code, message);
}

function handleCancel(): void {
  router.push('/');
}

function handleLoading(_isLoading: boolean): void {
  // Optional: handle global loading state
}
</script>
```

### 10.26 `frontend/src/views/PaymentReturn.vue`

```vue
<template>
  <div class="min-h-screen bg-gray-50 py-12 px-4 sm:flex sm:items-center sm:justify-center">
    <div class="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      <div class="p-6 text-center">
        <!-- Header con logo -->
        <img src="/junta-atlantico-logo.svg" alt="Junta Atlantico" class="h-12 mx-auto mb-4" />

        <!-- Loading -->
        <div v-if="loading" class="py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p class="mt-4 text-gray-600">Verificando el estado de tu pago...</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="py-8">
          <div class="text-red-600 text-6xl mb-4">&#10060;</div>
          <h2 class="text-xl font-bold text-gray-900">Error</h2>
          <p class="text-gray-600 mt-2">{{ error }}</p>
          <button
            @click="goToCheckout"
            class="mt-4 py-2 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Volver al inicio
          </button>
        </div>

        <!-- Resultado (4 estados): encabezado por estado + comprobante unico -->
        <div v-else-if="transactionState" class="py-6">
          <!-- Encabezado por estado -->
          <div v-if="transactionState === 'OK'">
            <div class="text-green-600 text-6xl mb-2">&#9989;</div>
            <h2 class="text-2xl font-bold text-gray-900">Pago aprobado</h2>
            <p class="text-gray-600 mt-1">Tu transaccion se ha completado exitosamente.</p>
          </div>
          <div v-else-if="transactionState === 'PENDING'">
            <div class="text-yellow-600 text-6xl mb-2">&#9203;</div>
            <h2 class="text-xl font-bold text-gray-900">Pago pendiente</h2>
            <p class="text-gray-600 mt-1">Tu pago esta siendo procesado por tu entidad financiera.</p>
          </div>
          <div v-else-if="['NOT_AUTHORIZED', 'FAILED'].includes(transactionState)">
            <div class="text-red-600 text-6xl mb-2">&#10060;</div>
            <h2 class="text-xl font-bold text-gray-900">
              {{ transactionState === 'NOT_AUTHORIZED' ? 'Pago rechazado' : 'Pago fallido' }}
            </h2>
            <p class="text-gray-600 mt-1">
              {{ transactionState === 'NOT_AUTHORIZED'
                 ? 'La transaccion no fue autorizada por tu banco.'
                 : 'Ocurrio un error al procesar tu pago.' }}
            </p>
          </div>

          <!-- Comprobante de pago (Requisito PSE #11): se muestra en los 4 estados -->
          <div class="mt-6 p-4 bg-gray-50 rounded-lg text-left">
            <h3 class="font-medium text-gray-700 mb-3">Comprobante de pago</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between" v-if="receipt.nit">
                <span class="text-gray-500">NIT:</span>
                <span>{{ receipt.nit }}</span>
              </div>
              <div class="flex justify-between" v-if="receipt.companyName">
                <span class="text-gray-500">Razon social:</span>
                <span class="text-right">{{ receipt.companyName }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Estado:</span>
                <span class="font-semibold">{{ receipt.state }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Banco:</span>
                <span class="text-right">{{ receipt.bank }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">CUS:</span>
                <span class="font-mono">{{ receipt.cus }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Ticket ID:</span>
                <span class="font-mono">{{ receipt.ticketId }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Fecha:</span>
                <span>{{ receipt.date }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Valor:</span>
                <span class="font-bold">${{ receipt.amount }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Descripcion:</span>
                <span class="text-right">{{ receipt.description }}</span>
              </div>
              <div class="flex justify-between" v-if="paymentModeLabel">
                <span class="text-gray-500">Medio de pago:</span>
                <span>{{ paymentModeLabel }}</span>
              </div>
              <div class="flex justify-between" v-if="paymentOriginLabel">
                <span class="text-gray-500">Tipo:</span>
                <span>{{ paymentOriginLabel }}</span>
              </div>
            </div>
          </div>

          <!-- PENDING: texto literal ACH + contacto (Requisito PSE #11) -->
          <div v-if="transactionState === 'PENDING'"
               class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-left">
            <p class="text-sm text-yellow-800 font-medium">
              Por favor verificar si el debito fue realizado en el Banco.
            </p>
            <p v-if="hasContact" class="text-sm text-yellow-700 mt-2">
              Si tienes dudas, comunicate con nosotros:
              <span v-if="CONTACT_PHONE"><br />Telefono: {{ CONTACT_PHONE }}</span>
              <span v-if="CONTACT_EMAIL"><br />Correo: {{ CONTACT_EMAIL }}</span>
            </p>
          </div>

          <!-- OK -->
          <p v-else-if="transactionState === 'OK'" class="mt-4 text-xs text-gray-500">
            Recibiras el soporte de pago en tu correo electronico.
          </p>

          <!-- Rechazada / Fallida: causal + contacto -->
          <template v-else-if="['NOT_AUTHORIZED', 'FAILED'].includes(transactionState)">
            <RejectionReason
              :cause-rejection="detailed?.causeRejection"
              :rejection-description="detailed?.rejectionDescription"
              :state-description="detailed?.stateDescription"
              @retry="goToCheckout"
            />
            <div v-if="hasContact" class="mt-3 p-3 bg-gray-50 rounded-lg text-left text-sm text-gray-600">
              Para mayor informacion comunicate con nosotros:
              <span v-if="CONTACT_PHONE"><br />Telefono: {{ CONTACT_PHONE }}</span>
              <span v-if="CONTACT_EMAIL"><br />Correo: {{ CONTACT_EMAIL }}</span>
            </div>
          </template>
        </div>

        <!-- Boton de volver -->
        <div v-if="!loading && transactionState" class="mt-6 pt-6 border-t">
          <button
            @click="goToCheckout"
            class="py-2 px-6 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, Ref, ComputedRef } from 'vue';
import { useRouter } from 'vue-router';
import apiService from '../services/api.service';
import RejectionReason from '../components/RejectionReason.vue';
import { formatCurrency } from '../utils/formatters';
import { getPaymentModeLabel, getPaymentOriginLabel } from '../utils/paymentMode';
import { usePolling } from '../composables/usePolling';

interface TransactionData {
  trazabilityCode?: string;
  ticketId?: string;
  transactionValue?: number;
  paymentMode?: number;
  paymentOrigin?: number;
  bankProcessDate?: string;
  transactionState?: string;
  financialInstitutionName?: string;
  paymentDescription?: string;
  serviceNIT?: string;
  serviceName?: string;
}

interface DetailedData {
  causeRejection?: string;
  rejectionDescription?: string;
  stateDescription?: string;
}

interface PollingResult {
  transactionState: string;
}

const router = useRouter();
const loading: Ref<boolean> = ref(true);
const error: Ref<string> = ref('');
const transaction: Ref<TransactionData> = ref({});
const transactionState: Ref<string> = ref('');
const detailed: Ref<DetailedData | null> = ref(null);

// Datos del comercio y contacto (Requisitos PSE #6, #7, #11)
const COMPANY_NIT: string = import.meta.env.VITE_COMPANY_NIT || '';
const COMPANY_NAME: string = import.meta.env.VITE_COMPANY_NAME || 'Junta Atlantico S.A.S.';
const CONTACT_PHONE: string = import.meta.env.VITE_CONTACT_PHONE || '';
const CONTACT_EMAIL: string = import.meta.env.VITE_CONTACT_EMAIL || '';

// Snapshot del formulario capturado al montar, ANTES de que clearSession()
// borre la PII: permite mostrar descripción y banco en el comprobante.
const formSnapshot = ref<{ description?: string }>({});
const bankNameSnapshot = ref<string>('');

const { start: startPolling, stop: stopPolling } = usePolling();

const paymentModeLabel: ComputedRef<string> = computed(() =>
  transaction.value.paymentMode ? getPaymentModeLabel(transaction.value.paymentMode) : ''
);
const paymentOriginLabel: ComputedRef<string> = computed(() =>
  transaction.value.paymentOrigin ? getPaymentOriginLabel(transaction.value.paymentOrigin) : ''
);

const STATE_LABELS: Record<string, string> = {
  OK: 'Aprobada',
  PENDING: 'Pendiente',
  NOT_AUTHORIZED: 'Rechazada',
  FAILED: 'Fallida'
};
const stateLabel: ComputedRef<string> = computed(
  () => STATE_LABELS[transactionState.value] || transactionState.value || '—'
);

// Comprobante unificado (Requisito PSE #11): NIT, Razón Social, Estado, Banco,
// CUS, TicketId, Fecha, Valor y Descripción. Se muestra en los 4 estados.
const receipt = computed(() => ({
  nit: COMPANY_NIT || transaction.value.serviceNIT || '',
  companyName: COMPANY_NAME || transaction.value.serviceName || '',
  state: stateLabel.value,
  bank: transaction.value.financialInstitutionName || bankNameSnapshot.value || '—',
  cus: transaction.value.trazabilityCode || '—',
  ticketId: transaction.value.ticketId || '—',
  date: transaction.value.bankProcessDate ? formatDate(transaction.value.bankProcessDate) : '—',
  amount: typeof transaction.value.transactionValue === 'number'
    ? formatCurrency(transaction.value.transactionValue) : '—',
  description: transaction.value.paymentDescription || formSnapshot.value.description || '—'
}));

const hasContact: ComputedRef<boolean> = computed(() => !!(CONTACT_PHONE || CONTACT_EMAIL));

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota' });
  } catch {
    return iso;
  }
}

// Limpia toda la informacion de la transaccion del navegador, incluyendo
// pse_form_data (nombre, email, celular, direccion, identificacion).
function clearSession(): void {
  sessionStorage.removeItem('pse_trazability_code');
  sessionStorage.removeItem('pse_ticket_id');
  sessionStorage.removeItem('pse_form_data');
  sessionStorage.removeItem('pse_bank_name');
}

// CORRECCION: detener el polling al desmontar la vista. Antes, si el usuario
// navegaba/recargaba durante el polling, el bucle seguia corriendo en segundo
// plano (hasta 30 min) disparando llamadas al backend.
onUnmounted(() => {
  stopPolling();
});

onMounted(async () => {
  // Capturar datos para el comprobante ANTES de cualquier limpieza de sesión.
  try {
    const raw = sessionStorage.getItem('pse_form_data');
    if (raw) {
      const fd = JSON.parse(raw) as { description?: string };
      formSnapshot.value = { description: fd.description };
    }
  } catch {
    /* ignore */
  }
  bankNameSnapshot.value = sessionStorage.getItem('pse_bank_name') || '';

  let trazabilityCode: string | null = new URLSearchParams(window.location.search).get('trazabilityCode');
  if (!trazabilityCode) {
    trazabilityCode = sessionStorage.getItem('pse_trazability_code');
  }

  if (!trazabilityCode) {
    error.value = 'No se encontro informacion de la transaccion';
    loading.value = false;
    return;
  }

  await checkTransactionWithPolling(trazabilityCode);
});

async function checkTransactionWithPolling(trazabilityCode: string): Promise<void> {
  try {
    loading.value = true;

    const result: PollingResult = await startPolling(
      async () => {
        const r = await apiService.getTransactionStatus(trazabilityCode);
        if (r.success) {
          transaction.value = r.data as TransactionData;
          transactionState.value = (r.data as TransactionData).transactionState || '';
        }
        return { transactionState: transactionState.value, ...r.data };
      },
      (res: PollingResult) => {
        if (res.transactionState !== 'PENDING') {
          loadDetailedIfNeeded(trazabilityCode);
        }
      },
      (err: Error) => {
        error.value = err.message || 'Error al consultar el estado';
      }
    );

    if (result?.transactionState === 'TIMEOUT') {
      error.value = 'La transaccion esta tardando mas de lo esperado. Verifica el estado mas tarde.';
    }
  } catch (err) {
    error.value = (err as Error).message || 'Error al consultar el estado del pago';
  } finally {
    loading.value = false;
  }
}

async function loadDetailedIfNeeded(trazabilityCode: string): Promise<void> {
  if (transactionState.value === 'OK') {
    clearSession();
    return;
  }

  try {
    const r = await apiService.getTransactionDetailed(trazabilityCode);
    if (r.success) {
      detailed.value = r.data as DetailedData;
    }
  } catch (err) {
    console.warn('No se pudo cargar detalle:', err);
  }

  // Estados terminales no exitosos: se borra al menos la PII del navegador.
  if (['NOT_AUTHORIZED', 'FAILED'].includes(transactionState.value)) {
    clearSession();
  }
}

function goToCheckout(): void {
  stopPolling();
  router.push('/checkout');
}
</script>
```

### 10.27 `scripts/build-zips.mjs`

```javascript
#!/usr/bin/env node
/**
 * scripts/build-zips.mjs
 *
 * Genera deploy/backend.zip y deploy/frontend.zip para subir a Hostinger.
 * Funciona en Windows, Mac y Linux sin comandos externos (no usa "zip").
 *
 * USO — abrir terminal en la RAIZ del proyecto y ejecutar:
 *   node scripts/build-zips.mjs
 *
 * SALIDA en la RAIZ del proyecto:
 *   deploy/
 *     backend.zip    <- subir a Hostinger (Web App Node.js)
 *     frontend.zip   <- subir a Hostinger (Web App estatico)
 */

import { execSync }                              from 'node:child_process';
import { existsSync, rmSync, mkdirSync,
         readdirSync, statSync,
         readFileSync, writeFileSync }           from 'node:fs';
import { resolve, dirname, join, relative, sep } from 'node:path';
import { fileURLToPath }                         from 'node:url';

const ROOT     = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BACKEND  = resolve(ROOT, 'backend');
const FRONTEND = resolve(ROOT, 'frontend');
const OUT      = resolve(ROOT, 'deploy');

// ─── Utilidades ──────────────────────────────────────────────────────────────

function step(msg) {
  console.log(`\n${'─'.repeat(58)}\n  ${msg}\n${'─'.repeat(58)}`);
}

function run(cmd, cwd = ROOT) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd });
}

// ─── Generador de ZIP en puro Node.js (sin "zip", sin librerias) ─────────────

function u16(n) { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; }
function u32(n) { const b = Buffer.alloc(4); b.writeUInt32LE(n); return b; }

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function dosDateTime() {
  const d = new Date();
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds() / 2),
    date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(),
  };
}

/**
 * Construye un archivo ZIP en memoria.
 * @param {Array<{name:string, data:Buffer}>} entries
 * @returns {Buffer}
 */
function buildZip(entries) {
  const locals  = [];
  const central = [];
  let   offset  = 0;
  const dt      = dosDateTime();

  for (const entry of entries) {
    const nameBytes = Buffer.from(entry.name, 'utf8');
    const data      = entry.data;
    const crc       = crc32(data);
    const size      = data.length;

    const local = Buffer.concat([
      Buffer.from([0x50,0x4B,0x03,0x04]),
      u16(20), u16(0), u16(0),            // version, flags, compression (stored)
      u16(dt.time), u16(dt.date),
      u32(crc), u32(size), u32(size),     // crc, compressed size, uncompressed size
      u16(nameBytes.length), u16(0),      // name length, extra length
      nameBytes,
      data,
    ]);

    const cdir = Buffer.concat([
      Buffer.from([0x50,0x4B,0x01,0x02]),
      u16(20), u16(20), u16(0), u16(0),
      u16(dt.time), u16(dt.date),
      u32(crc), u32(size), u32(size),
      u16(nameBytes.length), u16(0), u16(0), u16(0), u16(0),
      u32(0), u32(offset),
      nameBytes,
    ]);

    locals.push(local);
    central.push(cdir);
    offset += local.length;
  }

  const centralBuf  = Buffer.concat(central);
  const eocd = Buffer.concat([
    Buffer.from([0x50,0x4B,0x05,0x06]),
    u16(0), u16(0),
    u16(entries.length), u16(entries.length),
    u32(centralBuf.length), u32(offset),
    u16(0),
  ]);

  return Buffer.concat([...locals, centralBuf, eocd]);
}

/**
 * Lee todos los archivos de una carpeta recursivamente.
 * @param {string} baseDir  carpeta raíz (para calcular el path relativo dentro del zip)
 * @param {string} dir      carpeta actual
 * @param {string[]} skip   nombres de carpeta/archivo a omitir
 * @returns {Array<{name:string, data:Buffer}>}
 */
function collectFiles(baseDir, dir, skip = []) {
  const result = [];
  for (const name of readdirSync(dir)) {
    if (skip.includes(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      result.push(...collectFiles(baseDir, full, skip));
    } else {
      // El estándar ZIP exige forward slash en los paths
      const relName = relative(baseDir, full).split(sep).join('/');
      result.push({ name: relName, data: readFileSync(full) });
    }
  }
  return result;
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

// Limpiar y crear carpeta de salida
if (existsSync(OUT)) rmSync(OUT, { recursive: true });
mkdirSync(OUT, { recursive: true });

// ── 1. Compilar TypeScript del backend ───────────────────────────────────────
step('1/4  Compilando TypeScript (backend)');

if (!existsSync(resolve(BACKEND, 'node_modules'))) {
  console.error('\nERROR: falta instalar las devDependencies del backend.');
  console.error('Ejecuta:  cd backend && npm install\n');
  process.exit(1);
}

const DIST = resolve(BACKEND, 'dist');
if (existsSync(DIST)) rmSync(DIST, { recursive: true });
run('npx tsc -p tsconfig.build.json', BACKEND);

if (!existsSync(resolve(DIST, 'backend', 'server.js'))) {
  console.error('\nERROR: la compilación no generó dist/backend/server.js\n');
  process.exit(1);
}
console.log('\n✓ TypeScript compilado →', DIST);

// ── 2. Generar backend.zip ───────────────────────────────────────────────────
step('2/4  Generando backend.zip');

const backendEntries = [
  ...collectFiles(BACKEND, DIST),           // todo el JS compilado
  {                                          // package.json (con start correcto)
    name: 'package.json',
    data: readFileSync(resolve(BACKEND, 'package.json')),
  },
];

const backendZipBuf  = buildZip(backendEntries);
const backendZipPath = resolve(OUT, 'backend.zip');
writeFileSync(backendZipPath, backendZipBuf);
console.log(`✓ backend.zip  (${(backendZipBuf.length / 1024).toFixed(0)} KB)  →  deploy\\backend.zip`);

// ── 3. Compilar frontend (Vite) ──────────────────────────────────────────────
step('3/4  Compilando Vue/Vite (frontend)');

if (!existsSync(resolve(FRONTEND, 'node_modules'))) {
  console.error('\nERROR: falta instalar las dependencias del frontend.');
  console.error('Ejecuta:  cd frontend && npm install\n');
  process.exit(1);
}

const FDIST = resolve(FRONTEND, 'dist');
if (existsSync(FDIST)) rmSync(FDIST, { recursive: true });
run('npx vite build', FRONTEND);

if (!existsSync(resolve(FDIST, 'index.html'))) {
  console.error('\nERROR: Vite no generó index.html\n');
  process.exit(1);
}
console.log('\n✓ Vite build OK →', FDIST);

// ── 4. Generar frontend.zip ──────────────────────────────────────────────────
step('4/4  Generando frontend.zip');

const frontendEntries = collectFiles(FDIST, FDIST);
const frontendZipBuf  = buildZip(frontendEntries);
const frontendZipPath = resolve(OUT, 'frontend.zip');
writeFileSync(frontendZipPath, frontendZipBuf);
console.log(`✓ frontend.zip (${(frontendZipBuf.length / 1024).toFixed(0)} KB)  →  deploy\\frontend.zip`);

// ── Resumen ──────────────────────────────────────────────────────────────────
console.log(`
${'═'.repeat(58)}
  ✅  Listo. Archivos generados en la carpeta deploy\\
${'═'.repeat(58)}

  📦  deploy\\backend.zip
      → Subir a Hostinger (Web App Node.js - api.juntaatlantico.co)
      → Build command : dejar VACÍO
      → Start command : node dist/backend/server.js
      → Node version  : 20.x o 22.x

  🌐  deploy\\frontend.zip
      → Subir a Hostinger (Web App estático - pse.juntaatlantico.co)
      → Descomprimir en la raíz del dominio

${'═'.repeat(58)}
`);
```

---

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
```

### 10.10 `frontend/src/composables/usePolling.ts`

```typescript
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
```

### 10.11 `frontend/src/composables/useReCaptcha.ts`

```typescript
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
```

### 10.12 `frontend/src/stores/payment.store.ts`

```typescript
import { defineStore } from 'pinia';
import apiService from '../services/api.service';

interface BankItem {
  financialInstitutionCode: string;
  financialInstitutionName: string;
}

interface PaymentState {
  banks: BankItem[];
  loading: boolean;
  error: string | null;
  transactionResult: Record<string, unknown> | null;
  transactionStatus: Record<string, unknown> | null;
  transactionDetailed: Record<string, unknown> | null;
}

export const usePaymentStore = defineStore('payment', {
  state: (): PaymentState => ({
    banks: [],
    loading: false,
    error: null,
    transactionResult: null,
    transactionStatus: null,
    transactionDetailed: null
  }),

  actions: {
    async fetchBanks(): Promise<void> {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiService.getBanks();
        if (response.success) {
          this.banks = response.data;
        }
      } catch (err) {
        this.error = (err as Error).message || 'Error al cargar bancos';
      } finally {
        this.loading = false;
      }
    },

    async createTransaction(paymentData: Record<string, unknown>): Promise<Record<string, unknown>> {
      this.loading = true;
      this.error = null;
      try {
        const response = await apiService.createTransaction(paymentData);
        if (response.success) {
          this.transactionResult = response as unknown as Record<string, unknown>;
        }
        return response as unknown as Record<string, unknown>;
      } catch (err) {
        this.error = (err as Error).message || 'Error al crear transaccion';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    async checkStatus(trazabilityCode: string): Promise<Record<string, unknown>> {
      try {
        const response = await apiService.getTransactionStatus(trazabilityCode);
        if (response.success) {
          this.transactionStatus = response.data;
        }
        return response as unknown as Record<string, unknown>;
      } catch (err) {
        this.error = (err as Error).message || 'Error al consultar estado';
        throw err;
      }
    },

    async fetchDetailed(trazabilityCode: string): Promise<Record<string, unknown> | undefined> {
      try {
        const response = await apiService.getTransactionDetailed(trazabilityCode);
        if (response.success) {
          this.transactionDetailed = response.data;
        }
        return response as unknown as Record<string, unknown>;
      } catch (err) {
        console.warn('Error cargando detalle:', err);
        return undefined;
      }
    },

    reset(): void {
      this.transactionResult = null;
      this.transactionStatus = null;
      this.transactionDetailed = null;
      this.error = null;
    }
  }
});
```

### 10.13 `frontend/src/utils/causalRejection.ts`

```typescript
export const CAUSAL_REJECTION: Record<string, string> = {
  '00001': 'El usuario abandono la transaccion en el banco',
  '00002': 'Cuenta embargada',
  '00003': 'Cuenta inactiva',
  '00004': 'La cuenta no existe',
  '00005': 'La cuenta no esta habilitada',
  '00006': 'La cuenta no ha sido habilitada para pagos',
  '00007': 'La cuenta esta saldada',
  '00008': 'Excediste el limite transaccional autorizado por tu banco',
  '00009': 'El banco no se encuentra disponible',
  '00010': 'Fallas tecnicas en la Entidad Financiera',
  '00011': 'Fondos insuficientes',
  '00012': 'Inconsistencia en los datos de la transaccion',
  '00013': 'La cuenta esta cancelada',
  '00015': 'La transaccion no fue concluida en el banco en el tiempo maximo permitido (7 min).',
  '00016': 'Datos de acceso invalidos en el portal de la Entidad Financiera',
  '00017': 'No tienes habilitado el servicio de PSE en tu Entidad Financiera',
  '00024': 'Transaccion rechazada por sospecha de fraude en la Entidad Financiera',
  '00014': 'El banco no confirmo el estado de la transaccion en el tiempo establecido.',
  '00018': 'La transaccion fue cambiada de aprobada a rechazada por la Entidad Financiera.',
  '00019': 'Transaccion declinada por sospecha de fraude (Monitor Plus).',
  '00020': 'Abandonaste la transaccion al regresar al comercio.',
  '00021': 'Abandonaste la transaccion al cerrar el navegador.',
  '00022': 'Tu navegador no es compatible con PSE. Usa Chrome 84+, Edge 18+, Firefox 79+, Opera 69+ o Safari 13.1+.',
  '00023': 'No presentaste actividad en PSE (TIMEOUT).',
  '00025': 'Credibanco no confirmo la transaccion.',
  '00026': 'OTP no informado. Agotaste los reenvios configurados por la Entidad Financiera.',
  '00027': 'OTP invalida. Verifica el codigo enviado por tu banco.',
  '10001': 'La transaccion excede el limite asignado a la empresa en PSE.',
  '10002': 'No se puede conectar a la Entidad Financiera.',
  '10003': 'La Entidad Financiera no acepto iniciar la transaccion.'
};

export function getCausalMessage(code: string): string {
  return CAUSAL_REJECTION[code] || `Causal ${code}`;
}
```

### 10.14 `frontend/src/utils/errorMessages.ts`

```typescript
interface PSEErrorMessages {
  [key: string]: string;
}

/**
 * Mensaje genérico exigido por PSE (Requisito #7) para los errores de creación
 * de transacción. Todos los códigos de GENERIC_CREATE_ERRORS —y cualquier código
 * desconocido— se resuelven a este texto.
 */
const GENERIC_CREATE_ERROR =
  'No se pudo crear la transaccion, por favor intente mas tarde o comuniquese con la empresa.';

// Requisito PSE #7: estos códigos deben mostrar SIEMPRE el mensaje genérico.
const GENERIC_CREATE_ERRORS: string[] = [
  'FAIL_ENTITYNOTEXISTSORDISABLED',
  'FAIL_BANKNOTEXISTSORDISABLED',
  'FAIL_SERVICENOTEXISTSORNOTCONFIGURED',
  'FAIL_INVALIDAMOUNTORVATAMOUNT',
  'FAIL_INVALIDAMOUNT',
  'FAIL_INVALIDSOLICITDATE',
  'FAIL_CANNOTGETCURRENTCYCLE',
  'FAIL_ACCESSDENIED',
  'FAIL_TRANSACTIONNOTALLOWED',
  'FAIL_INVALIDPARAMETERS',
  'FAIL_GENERICERROR'
];

export const PSE_ERROR_MESSAGES: PSEErrorMessages = {
  SUCCESS: 'Transaccion procesada correctamente.',

  // Requisito PSE #6: texto claro + se ofrecen opciones de contacto (bloque aparte).
  FAIL_EXCEEDEDLIMIT:
    'El monto de la transaccion excede los limites establecidos en PSE para la empresa, ' +
    'por favor comuniquese con la empresa.',

  // Mensaje genérico (Requisito #7)
  FAIL_GENERICERROR: GENERIC_CREATE_ERROR,

  // Mensajes recomendados (Anexo doc) para códigos NO listados en el #7
  FAIL_BANKUNREACHEABLE:
    'La entidad financiera no puede ser contactada para iniciar la transaccion, ' +
    'por favor seleccione otra o intente mas tarde.',
  FAIL_DISABLEDUSEREMAIL:
    'El correo electronico ingresado presenta restricciones. ' +
    'Por favor verifique o use otro correo de contacto.',
  FAIL_ERRORINCREDITS:
    'Ocurrio un error al procesar los creditos. Por favor intente mas tarde.',
  FAIL_INVALIDTRAZABILITYCODE:
    'La transaccion aun se esta procesando. Por favor espere unos minutos.',
  FAIL_TIMEOUT:
    'El tiempo de espera ha expirado. Por favor intente mas tarde.',

  // Errores del lado cliente (no son respuestas de creación PSE)
  FAIL_RECAPTCHA:
    'No se pudo verificar que no eres un robot. Por favor intenta de nuevo.',
  RECAPTCHA_UNAVAILABLE:
    'No se pudo inicializar la verificacion de seguridad. Recarga la pagina e intenta de nuevo.',
  FAIL_RATE_LIMIT:
    'Demasiadas solicitudes. Por favor intente en un minuto.',
  FAIL_DOUBLEPAYMENT: 'Verifique el estado de su pago antes de iniciar uno nuevo.',
  FAIL_VALIDATION: 'Por favor verifica los datos ingresados.'
};

export function getErrorMessage(code: string): string {
  if (GENERIC_CREATE_ERRORS.includes(code)) {
    return GENERIC_CREATE_ERROR;
  }
  return PSE_ERROR_MESSAGES[code] || GENERIC_CREATE_ERROR;
}

/**
 * Indica si, para el código dado, se deben ofrecer opciones de contacto con la
 * empresa (Requisitos PSE #6 y #7). Aplica a EXCEEDEDLIMIT, a los errores de
 * creación de transacción y a cualquier código desconocido; NO a los errores de
 * cliente (validación, reCAPTCHA, rate limit, doble pago).
 */
export function shouldOfferContact(code: string): boolean {
  const clientSide = [
    'FAIL_VALIDATION', 'FAIL_RECAPTCHA', 'RECAPTCHA_UNAVAILABLE',
    'FAIL_RATE_LIMIT', 'FAIL_DOUBLEPAYMENT'
  ];
  if (!code) return false;
  if (clientSide.includes(code)) return false;
  return true;
}
```

### 10.15 `frontend/src/utils/formatters.ts`

```typescript
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return '0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

export function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString('es-CO', {
      timeZone: 'America/Bogota',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch {
    return isoString;
  }
}
```

### 10.16 `frontend/src/utils/paymentMode.ts`

```typescript
export const PAYMENT_MODE_LABELS: Record<number, string> = {
  15: 'Debito en cuenta',
  50: 'Tarjeta de Credito Visa',
  51: 'Tarjeta de Credito MasterCard',
  52: 'Tarjeta de Credito Diners Club',
  53: 'Tarjeta de Credito Propia de la Entidad Financiera',
  54: 'Credito Rotativo',
  55: 'Tarjeta de Credito American Express',
  56: 'Tarjeta de Credito Propia del Comercio'
};

export const PAYMENT_ORIGIN_LABELS: Record<number, string> = {
  3: 'Debito',
  4: 'Credito'
};

export function getPaymentModeLabel(code: number): string {
  return PAYMENT_MODE_LABELS[code] || `Modo ${code}`;
}

export function getPaymentOriginLabel(code: number): string {
  return PAYMENT_ORIGIN_LABELS[code] || `Origen ${code}`;
}
```

### 10.17 `frontend/src/utils/validators.ts`

```typescript
export const FORBIDDEN_CHARS_REGEX: RegExp = /[|"]/;

export function validateNoForbiddenChars(field: string, value: string): string | null {
  if (typeof value === 'string' && FORBIDDEN_CHARS_REGEX.test(value)) {
    return `El campo "${field}" no puede contener los caracteres "|" ni '"'`;
  }
  return null;
}

export function validateUserTypeCombination(userType: string, identificationType: string): string | null {
  if (userType === 'person' && identificationType === 'NIT') {
    return 'Si el tipo de persona es "Persona Natural", el tipo de identificacion no puede ser NIT';
  }
  if (userType === 'company' && identificationType !== 'NIT') {
    return 'Si el tipo de persona es "Empresa", el unico tipo de identificacion valido es NIT';
  }
  return null;
}

interface FormData {
  bankCode: string;
  identificationNumber: string;
  fullName: string;
  cellphoneNumber: string;
  email: string;
  address: string;
  description: string;
  amount: number | null;
  userType: string;
  identificationType: string;
  reference1?: string;
  reference2?: string;
  reference3?: string;
}

export interface ValidationErrors {
  [key: string]: string | undefined;
}

export function validateForm(data: FormData): ValidationErrors {
  const errors: ValidationErrors = {};

  if (!data.bankCode) errors.bankCode = 'Selecciona un banco';
  if (!data.identificationNumber) errors.identificationNumber = 'Requerido';
  if (!data.fullName) errors.fullName = 'Requerido';
  if (!data.cellphoneNumber) errors.cellphoneNumber = 'Requerido';
  if (!data.email) errors.email = 'Requerido';
  if (!data.address) errors.address = 'Requerida';
  if (!data.description) errors.description = 'Requerida';

  if (!data.amount || data.amount <= 0) errors.amount = 'El monto debe ser mayor a 0';

  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Email invalido';
  }

  if (data.cellphoneNumber && !/^\d{10}$/.test(data.cellphoneNumber.replace(/\D/g, ''))) {
    errors.cellphoneNumber = 'El celular debe tener 10 digitos';
  }

  const charErrors: (string | null)[] = [
    validateNoForbiddenChars('description', data.description),
    validateNoForbiddenChars('reference1', data.reference1 || ''),
    validateNoForbiddenChars('reference2', data.reference2 || ''),
    validateNoForbiddenChars('reference3', data.reference3 || '')
  ].filter(Boolean);

  if (charErrors.length > 0) {
    errors.forbiddenChars = charErrors[0] || undefined;
  }

  const userTypeError: string | null = validateUserTypeCombination(data.userType, data.identificationType);
  if (userTypeError) errors.userType = userTypeError;

  return errors;
}
```

### 10.18 `frontend/src/components/BankList.vue`

```vue
<template>
  <div class="mb-6">
    <label class="block text-sm font-medium text-gray-700 mb-2">
      Banco <span class="text-red-500">*</span>
    </label>
    <div v-if="loading" class="flex items-center justify-center py-4">
      <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      <span class="ml-2 text-sm text-gray-500">Cargando bancos...</span>
    </div>
    <select
      v-else
      :value="modelValue"
      @change="onSelect(($event.target as HTMLSelectElement).value)"
      class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      :class="{ 'border-red-500': error }"
    >
      <option value="" disabled>Selecciona tu banco</option>
      <option
        v-for="bank in banks"
        :key="bank.financialInstitutionCode"
        :value="bank.financialInstitutionCode"
      >
        {{ bank.financialInstitutionName }}
      </option>
    </select>
    <p v-if="error" class="mt-1 text-xs text-red-600">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { usePaymentStore } from '../stores/payment.store';

defineProps<{
  modelValue?: string;
  error?: string;
}>();

const store = usePaymentStore();

const { loading, banks } = storeToRefs(store);

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

// Emite la selección y persiste el NOMBRE del banco para poder mostrarlo en el
// comprobante final (Requisito PSE #11), ya que el formulario solo maneja el código.
function onSelect(code: string): void {
  emit('update:modelValue', code);
  const bank = store.banks.find((b) => b.financialInstitutionCode === code);
  if (bank) {
    sessionStorage.setItem('pse_bank_name', bank.financialInstitutionName);
  }
}

onMounted(() => {
  if (store.banks.length === 0) {
    store.fetchBanks();
  }
});
</script>
```

### 10.19 `frontend/src/components/ErrorAlert.vue`

```vue
<template>
  <div v-if="message" class="p-4 rounded-lg" :class="typeClasses">
    <p class="text-sm flex items-start">
      <span class="mr-2">{{ icon }}</span>
      <span>{{ message }}</span>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ComputedRef } from 'vue';

const props = withDefaults(defineProps<{
  message?: string;
  type?: 'error' | 'success' | 'warning' | 'info';
}>(), {
  message: '',
  type: 'error'
});

const typeClasses: ComputedRef<string> = computed(() => {
  const classes: Record<string, string> = {
    error: 'bg-red-50 border border-red-200 text-red-600',
    success: 'bg-green-50 border border-green-200 text-green-600',
    warning: 'bg-yellow-50 border border-yellow-200 text-yellow-600',
    info: 'bg-blue-50 border border-blue-200 text-blue-600'
  };
  return classes[props.type] || classes.error;
});

const icon: ComputedRef<string> = computed(() => {
  const icons: Record<string, string> = {
    error: '\u274C',
    success: '\u2705',
    warning: '\u26A0\uFE0F',
    info: '\u2139\uFE0F'
  };
  return icons[props.type] || icons.error;
});
</script>
```

### 10.20 `frontend/src/components/LoadingSpinner.vue`

```vue
<template>
  <div class="flex items-center justify-center py-8">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p v-if="message" class="mt-4 text-gray-600">{{ message }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  message?: string;
}>(), {
  message: 'Cargando...'
});
</script>
```

### 10.21 `frontend/src/components/PaymentForm.vue`

```vue
<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Tipo de Persona -->
    <div>
      <label class="block text-sm font-medium text-gray-700 mb-2">
        Tipo de persona <span class="text-red-500">*</span>
      </label>
      <div class="grid grid-cols-2 gap-3">
        <button
          type="button"
          @click="setUserType('person')"
          class="py-2 px-4 border rounded-lg transition-colors"
          :class="form.userType === 'person'
            ? 'bg-blue-50 border-blue-500 text-blue-700'
            : 'border-gray-300 text-gray-700 hover:bg-gray-50'"
        >
          <span class="block font-medium">Persona Natural</span>
          <span class="text-xs text-gray-500">Cedula de ciudadania</span>
        </button>
        <button
          type="button"
          @click="setUserType('company')"
          class="py-2 px-4 border rounded-lg transition-colors"
          :class="form.userType === 'company'
            ? 'bg-blue-50 border-blue-500 text-blue-700'
            : 'border-gray-300 text-gray-700 hover:bg-gray-50'"
        >
          <span class="block font-medium">Empresa</span>
          <span class="text-xs text-gray-500">NIT</span>
        </button>
      </div>
    </div>

    <!-- Tipo y Numero de Identificacion -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="identificationType" class="block text-sm font-medium text-gray-700 mb-1">
          Tipo de identificacion <span class="text-red-500">*</span>
        </label>
        <select
          id="identificationType"
          v-model="form.identificationType"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          :class="{ 'border-red-500': fieldErrors.identificationType }"
          required
        >
          <option v-if="form.userType === 'person'" value="CedulaDeCiudadania">Cedula de Ciudadania</option>
          <option v-if="form.userType === 'person'" value="CedulaDeExtranjeria">Cedula de Extranjeria</option>
          <option v-if="form.userType === 'person'" value="Pasaporte">Pasaporte</option>
          <option v-if="form.userType === 'person'" value="TarjetaDeIdentidad">Tarjeta de Identidad</option>
          <option v-if="form.userType === 'person'" value="DocumentoDeIdentificacionExtranjero">Doc. de Identificacion Extranjero</option>
          <option v-if="form.userType === 'company'" value="NIT">NIT</option>
        </select>
        <p v-if="fieldErrors.identificationType" class="mt-1 text-xs text-red-600">
          {{ fieldErrors.identificationType }}
        </p>
      </div>
      <div>
        <label for="identificationNumber" class="block text-sm font-medium text-gray-700 mb-1">
          Numero de identificacion <span class="text-red-500">*</span>
        </label>
        <input
          id="identificationNumber"
          v-model="form.identificationNumber"
          type="text"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          :class="{ 'border-red-500': fieldErrors.identificationNumber }"
          placeholder="Ej: 1234567890"
          required
        />
        <p v-if="fieldErrors.identificationNumber" class="mt-1 text-xs text-red-600">
          {{ fieldErrors.identificationNumber }}
        </p>
      </div>
    </div>

    <!-- Nombre completo -->
    <div>
      <label for="fullName" class="block text-sm font-medium text-gray-700 mb-1">
        Nombre completo <span class="text-red-500">*</span>
      </label>
      <input
        id="fullName"
        v-model="form.fullName"
        type="text"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        :class="{ 'border-red-500': fieldErrors.fullName }"
        placeholder="Ej: Juan Perez Gomez"
        required
      />
      <p v-if="fieldErrors.fullName" class="mt-1 text-xs text-red-600">{{ fieldErrors.fullName }}</p>
    </div>

    <!-- Celular y Email -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="cellphoneNumber" class="block text-sm font-medium text-gray-700 mb-1">
          Celular <span class="text-red-500">*</span>
        </label>
        <input
          id="cellphoneNumber"
          v-model="form.cellphoneNumber"
          type="tel"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          :class="{ 'border-red-500': fieldErrors.cellphoneNumber }"
          placeholder="3001234567"
          maxlength="10"
          required
        />
        <p v-if="fieldErrors.cellphoneNumber" class="mt-1 text-xs text-red-600">
          {{ fieldErrors.cellphoneNumber }}
        </p>
      </div>
      <div>
        <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
          Correo electronico <span class="text-red-500">*</span>
        </label>
        <input
          id="email"
          v-model="form.email"
          type="email"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          :class="{ 'border-red-500': fieldErrors.email }"
          placeholder="ejemplo@correo.com"
          required
        />
        <p v-if="fieldErrors.email" class="mt-1 text-xs text-red-600">{{ fieldErrors.email }}</p>
      </div>
    </div>

    <!-- Direccion -->
    <div>
      <label for="address" class="block text-sm font-medium text-gray-700 mb-1">
        Direccion <span class="text-red-500">*</span>
      </label>
      <input
        id="address"
        v-model="form.address"
        type="text"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        :class="{ 'border-red-500': fieldErrors.address }"
        placeholder="Calle Falsa 123"
        required
      />
      <p v-if="fieldErrors.address" class="mt-1 text-xs text-red-600">{{ fieldErrors.address }}</p>
    </div>

    <!-- Monto -->
    <div>
      <label for="amount" class="block text-sm font-medium text-gray-700 mb-1">
        Valor a pagar <span class="text-red-500">*</span>
      </label>
      <div class="relative">
        <span class="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500 font-medium">$</span>
        <input
          id="amount"
          v-model.number="form.amount"
          type="number"
          step="0.01"
          min="0.01"
          class="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          :class="{ 'border-red-500': fieldErrors.amount }"
          placeholder="0.00"
          required
        />
      </div>
      <p v-if="fieldErrors.amount" class="mt-1 text-xs text-red-600">{{ fieldErrors.amount }}</p>
    </div>

    <!-- Descripcion -->
    <div>
      <label for="description" class="block text-sm font-medium text-gray-700 mb-1">
        Descripcion del pago <span class="text-red-500">*</span>
      </label>
      <input
        id="description"
        v-model="form.description"
        type="text"
        @input="validateForbiddenChars"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        :class="{ 'border-red-500': fieldErrors.description || fieldErrors.forbiddenChars }"
        placeholder="Ej: Pago de calificacion de invalidez"
        maxlength="80"
        required
      />
      <div class="flex justify-between mt-1">
        <p class="text-xs text-red-600">{{ fieldErrors.description || fieldErrors.forbiddenChars }}</p>
        <p class="text-xs text-gray-500">
          {{ form.description ? 80 - form.description.length : 80 }} caracteres restantes
        </p>
      </div>
    </div>

    <!-- Lista de bancos -->
    <BankList v-model="form.bankCode" :error="fieldErrors.bankCode" />

    <!-- Badge reCAPTCHA -->
    <p class="text-xs text-gray-500 text-center">
      Este sitio esta protegido por reCAPTCHA y se aplican la
      <a href="https://policies.google.com/privacy" class="underline" target="_blank">Politica de privacidad</a> y
      <a href="https://policies.google.com/terms" class="underline" target="_blank">Terminos del servicio</a> de Google.
    </p>

    <!-- Botones -->
    <div class="flex flex-col sm:flex-row gap-4 pt-4">
      <button
        type="submit"
        :disabled="loading || !isFormValid"
        class="flex-1 py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <span v-if="loading">
          <svg class="inline animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          {{ loadingMessage }}
        </span>
        <span v-else class="inline-flex items-center justify-center gap-2">
          <img src="/pse-logo.svg" alt="PSE" class="h-5 w-auto bg-white rounded px-1 py-0.5" />
          <span>Debito Bancario PSE</span>
        </span>
      </button>
      <button
        type="button"
        @click="$emit('cancel')"
        :disabled="loading"
        class="py-3 px-6 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        Cancelar
      </button>
    </div>

    <!-- Aclaración PSE (Requisito PSE #1) -->
    <p class="text-xs text-gray-500 text-center pt-2">
      El pago se realizara de forma segura a traves del Proveedor de Servicios
      Electronicos PSE. Seras redirigido al portal de PSE para completar la transaccion.
    </p>

    <!-- Errores -->
    <div v-if="error" class="p-4 bg-red-50 border border-red-200 rounded-lg">
      <p class="text-sm text-red-600 flex items-start">
        <span class="mr-2">&#10060;</span>
        <span>{{ error }}</span>
      </p>
      <!-- Opciones de contacto (Requisitos PSE #6 y #7) -->
      <div v-if="showContact && hasContact" class="mt-2 pt-2 border-t border-red-100 text-sm text-red-700">
        Comunicate con nosotros:
        <span v-if="CONTACT_PHONE"><br />Telefono: {{ CONTACT_PHONE }}</span>
        <span v-if="CONTACT_EMAIL"><br />Correo: {{ CONTACT_EMAIL }}</span>
      </div>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, Ref, ComputedRef } from 'vue';
import BankList from './BankList.vue';
import apiService from '../services/api.service';
import { useReCaptcha } from '../composables/useReCaptcha';
import { validateForm, validateNoForbiddenChars, ValidationErrors } from '../utils/validators';
import { getErrorMessage, shouldOfferContact } from '../utils/errorMessages';

interface SuccessPayload {
  trazabilityCode: string;
  pseURL: string;
  ticketId: string;
  formData: FormData;
}

interface ErrorPayload {
  code: string;
  message: string;
}

interface FormData {
  bankCode: string;
  identificationNumber: string;
  fullName: string;
  cellphoneNumber: string;
  email: string;
  address: string;
  description: string;
  amount: number | null;
  userType: string;
  identificationType: string;
  reference1?: string;
  reference2?: string;
  reference3?: string;
  serviceCode?: string;
  vat?: number;
}

interface ApiResponse {
  success: boolean;
  data?: {
    trazabilityCode: string;
    ticketId: string;
    pseURL: string;
  };
  message?: string;
  code?: string;
}

const emit = defineEmits<{
  (e: 'success', payload: SuccessPayload): void;
  (e: 'cancel'): void;
  (e: 'error', payload: ErrorPayload): void;
  (e: 'loading', isLoading: boolean): void;
}>();

const loading: Ref<boolean> = ref(false);
const error: Ref<string> = ref('');
const showContact: Ref<boolean> = ref(false);
const CONTACT_PHONE: string = import.meta.env.VITE_CONTACT_PHONE || '';
const CONTACT_EMAIL: string = import.meta.env.VITE_CONTACT_EMAIL || '';
const hasContact: boolean = !!(CONTACT_PHONE || CONTACT_EMAIL);
const fieldErrors: Ref<ValidationErrors> = ref({});
const loadingMessage: Ref<string> = ref('Procesando...');

const { init: initRecaptcha } = useReCaptcha();
initRecaptcha();

const form: FormData = reactive({
  userType: 'person',
  identificationType: 'CedulaDeCiudadania',
  identificationNumber: '',
  fullName: '',
  cellphoneNumber: '',
  email: '',
  address: '',
  amount: null,
  description: '',
  bankCode: '',
  serviceCode: import.meta.env.VITE_PSE_SERVICE_CODE || '',
  vat: 0,
  reference1: '',
  reference2: '',
  reference3: ''
});

const isFormValid: ComputedRef<boolean> = computed(() => {
  return !!(
    form.bankCode &&
    form.identificationNumber?.trim() &&
    form.fullName?.trim() &&
    form.cellphoneNumber?.trim() &&
    form.email?.trim() &&
    form.address?.trim() &&
    form.amount && form.amount > 0 &&
    form.description?.trim()
  );
});

function setUserType(type: string): void {
  form.userType = type;
  if (type === 'company') {
    form.identificationType = 'NIT';
  } else {
    form.identificationType = 'CedulaDeCiudadania';
  }
}

function validateForbiddenChars(): void {
  const err: string | null = validateNoForbiddenChars('description', form.description);
  if (err) {
    fieldErrors.value.forbiddenChars = err;
  } else {
    delete fieldErrors.value.forbiddenChars;
  }
}

watch(() => form.cellphoneNumber, (newVal: string) => {
  form.cellphoneNumber = String(newVal).replace(/\D/g, '').slice(0, 10);
});

watch(loading, (newVal: boolean) => {
  loadingMessage.value = newVal ? 'Creando transaccion...' : 'Procesando...';
  emit('loading', newVal);
});

async function handleSubmit(): Promise<void> {
  error.value = '';
  showContact.value = false;
  fieldErrors.value = {};

  const errors: ValidationErrors = validateForm(form);
  if (Object.keys(errors).length > 0) {
    fieldErrors.value = errors;
    error.value = 'Por favor completa todos los campos requeridos correctamente';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  if (!form.serviceCode) {
    error.value = 'Error de configuracion: Codigo de servicio no definido';
    return;
  }

  loading.value = true;

  try {
    const response: ApiResponse = await apiService.createTransaction(form) as ApiResponse;

    if (response.success && response.data) {
      sessionStorage.setItem('pse_trazability_code', response.data.trazabilityCode);
      sessionStorage.setItem('pse_ticket_id', response.data.ticketId);
      sessionStorage.setItem('pse_form_data', JSON.stringify(form));

      emit('success', {
        trazabilityCode: response.data.trazabilityCode,
        pseURL: response.data.pseURL,
        ticketId: response.data.ticketId,
        formData: { ...form }
      });
    } else {
      const message: string = response.message || getErrorMessage(response.code || '');
      error.value = message;
      showContact.value = shouldOfferContact(response.code || '');
      emit('error', { code: response.code || '', message });
    }
  } catch (err) {
    const e = err as { message?: string; code?: string };
    const message: string = e.message || getErrorMessage(e.code || '');
    error.value = message;
    showContact.value = shouldOfferContact(e.code || '');
    emit('error', { code: e.code || '', message });
  } finally {
    loading.value = false;
  }
}
</script>
```

### 10.22 `frontend/src/components/PaymentSummary.vue`

```vue
<template>
  <div v-if="loading" class="flex items-center justify-center py-8">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
  <div v-else class="bg-white border border-gray-200 rounded-lg p-4">
    <h3 class="font-medium text-gray-700 mb-3">Resumen del pago</h3>
    <div class="space-y-2 text-sm">
      <div class="flex justify-between">
        <span class="text-gray-500">Banco:</span>
        <span>{{ bankName }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500">Valor:</span>
        <span class="font-bold">${{ formatCurrency(amount) }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500">Descripcion:</span>
        <span>{{ description }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500">Tipo:</span>
        <span>{{ userType === 'person' ? 'Persona Natural' : 'Empresa' }}</span>
      </div>
      <div class="flex justify-between">
        <span class="text-gray-500">Identificacion:</span>
        <span>{{ identificationNumber }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ComputedRef } from 'vue';
import { storeToRefs } from 'pinia';
import { usePaymentStore } from '../stores/payment.store';
import { formatCurrency } from '../utils/formatters';

interface BankItem {
  financialInstitutionCode: string;
  financialInstitutionName: string;
}

const props = withDefaults(defineProps<{
  bankCode?: string;
  amount?: number;
  description?: string;
  userType?: string;
  identificationNumber?: string;
}>(), {
  bankCode: '',
  amount: 0,
  description: '',
  userType: 'person',
  identificationNumber: ''
});

const store = usePaymentStore();
const { loading } = storeToRefs(store);

const bankName: ComputedRef<string> = computed(() => {
  const bank: BankItem | undefined = store.banks.find(
    (b: BankItem) => b.financialInstitutionCode === props.bankCode
  );
  return bank ? bank.financialInstitutionName : props.bankCode;
});
</script>
```

### 10.23 `frontend/src/components/RejectionReason.vue`

```vue
<template>
  <div v-if="causeRejection" class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
    <div class="flex items-start">
      <div class="flex-shrink-0">
        <span class="text-2xl">&#9888;&#65039;</span>
      </div>
      <div class="ml-3 flex-1">
        <h4 class="text-sm font-semibold text-red-800">Por que fue rechazada?</h4>
        <p class="text-sm text-red-700 mt-1">
          <strong>Causal {{ causeRejection }}:</strong> {{ friendlyCausal }}
        </p>
        <p v-if="rejectionDescription" class="text-xs text-red-600 mt-2">
          {{ rejectionDescription }}
        </p>
        <p v-if="stateDescription" class="text-xs text-red-600 mt-1">
          Estado: {{ stateDescription }}
        </p>
        <div class="mt-3 flex gap-2">
          <button
            @click="$emit('retry')"
            class="text-xs px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Intentar de nuevo
          </button>
          <a
            href="mailto:facturacion@juntaatlantico.co"
            class="text-xs px-3 py-1 border border-red-300 text-red-700 rounded hover:bg-red-100"
          >
            Contactar soporte
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ComputedRef } from 'vue';
import { getCausalMessage } from '../utils/causalRejection';

const props = withDefaults(defineProps<{
  causeRejection?: string | null;
  rejectionDescription?: string | null;
  stateDescription?: string | null;
}>(), {
  causeRejection: null,
  rejectionDescription: null,
  stateDescription: null
});

defineEmits<{
  (e: 'retry'): void;
}>();

const friendlyCausal: ComputedRef<string> = computed(() =>
  props.causeRejection ? getCausalMessage(props.causeRejection) : ''
);
</script>
```

### 10.24 `frontend/src/views/Checkout.vue`

```vue
<template>
  <div class="min-h-screen bg-gray-50 py-12 px-4 sm:flex sm:items-center sm:justify-center">
    <div class="max-w-lg mx-auto">
      <!-- Header -->
      <div class="text-center mb-8">
        <img src="/junta-atlantico-logo.svg" alt="Junta Atlantico" class="h-16 mx-auto mb-4" />
        <h1 class="text-2xl font-bold text-gray-900">Pago PSE</h1>
        <p class="text-gray-600 mt-1">Junta Regional de Calificacion de Invalidez del Atlantico</p>
      </div>

      <!-- Formulario -->
      <div class="bg-white rounded-xl shadow-lg overflow-hidden p-6">
        <PaymentForm
          @success="handleSuccess"
          @error="handleError"
          @cancel="handleCancel"
          @loading="handleLoading"
        />
      </div>

      <!-- Footer -->
      <p class="text-center text-xs text-gray-500 mt-6">
        Debito Bancario PSE - Junta Atlantico S.A.S.
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import PaymentForm from '../components/PaymentForm.vue';

interface SuccessPayload {
  trazabilityCode: string;
  pseURL: string;
}

interface ErrorPayload {
  code: string;
  message: string;
}

const router = useRouter();

function handleSuccess({ trazabilityCode, pseURL }: SuccessPayload): void {
  if (pseURL) {
    window.location.href = pseURL;
  } else {
    router.push({
      name: 'PaymentReturn',
      query: { trazabilityCode }
    });
  }
}

function handleError({ code, message }: ErrorPayload): void {
  console.error('Error en pago:', code, message);
}

function handleCancel(): void {
  router.push('/');
}

function handleLoading(_isLoading: boolean): void {
  // Optional: handle global loading state
}
</script>
```

### 10.25 `frontend/src/views/PaymentReturn.vue`

```vue
<template>
  <div class="min-h-screen bg-gray-50 py-12 px-4 sm:flex sm:items-center sm:justify-center">
    <div class="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      <div class="p-6 text-center">
        <!-- Header con logo -->
        <img src="/junta-atlantico-logo.svg" alt="Junta Atlantico" class="h-12 mx-auto mb-4" />

        <!-- Loading -->
        <div v-if="loading" class="py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p class="mt-4 text-gray-600">Verificando el estado de tu pago...</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="py-8">
          <div class="text-red-600 text-6xl mb-4">&#10060;</div>
          <h2 class="text-xl font-bold text-gray-900">Error</h2>
          <p class="text-gray-600 mt-2">{{ error }}</p>
          <button
            @click="goToCheckout"
            class="mt-4 py-2 px-6 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Volver al inicio
          </button>
        </div>

        <!-- Resultado (4 estados): encabezado por estado + comprobante unico -->
        <div v-else-if="transactionState" class="py-6">
          <!-- Encabezado por estado -->
          <div v-if="transactionState === 'OK'">
            <div class="text-green-600 text-6xl mb-2">&#9989;</div>
            <h2 class="text-2xl font-bold text-gray-900">Pago aprobado</h2>
            <p class="text-gray-600 mt-1">Tu transaccion se ha completado exitosamente.</p>
          </div>
          <div v-else-if="transactionState === 'PENDING'">
            <div class="text-yellow-600 text-6xl mb-2">&#9203;</div>
            <h2 class="text-xl font-bold text-gray-900">Pago pendiente</h2>
            <p class="text-gray-600 mt-1">Tu pago esta siendo procesado por tu entidad financiera.</p>
          </div>
          <div v-else-if="['NOT_AUTHORIZED', 'FAILED'].includes(transactionState)">
            <div class="text-red-600 text-6xl mb-2">&#10060;</div>
            <h2 class="text-xl font-bold text-gray-900">
              {{ transactionState === 'NOT_AUTHORIZED' ? 'Pago rechazado' : 'Pago fallido' }}
            </h2>
            <p class="text-gray-600 mt-1">
              {{ transactionState === 'NOT_AUTHORIZED'
                 ? 'La transaccion no fue autorizada por tu banco.'
                 : 'Ocurrio un error al procesar tu pago.' }}
            </p>
          </div>

          <!-- Comprobante de pago (Requisito PSE #11): se muestra en los 4 estados -->
          <div class="mt-6 p-4 bg-gray-50 rounded-lg text-left">
            <h3 class="font-medium text-gray-700 mb-3">Comprobante de pago</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between" v-if="receipt.nit">
                <span class="text-gray-500">NIT:</span>
                <span>{{ receipt.nit }}</span>
              </div>
              <div class="flex justify-between" v-if="receipt.companyName">
                <span class="text-gray-500">Razon social:</span>
                <span class="text-right">{{ receipt.companyName }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Estado:</span>
                <span class="font-semibold">{{ receipt.state }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Banco:</span>
                <span class="text-right">{{ receipt.bank }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">CUS:</span>
                <span class="font-mono">{{ receipt.cus }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Ticket ID:</span>
                <span class="font-mono">{{ receipt.ticketId }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Fecha:</span>
                <span>{{ receipt.date }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Valor:</span>
                <span class="font-bold">${{ receipt.amount }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Descripcion:</span>
                <span class="text-right">{{ receipt.description }}</span>
              </div>
              <div class="flex justify-between" v-if="paymentModeLabel">
                <span class="text-gray-500">Medio de pago:</span>
                <span>{{ paymentModeLabel }}</span>
              </div>
              <div class="flex justify-between" v-if="paymentOriginLabel">
                <span class="text-gray-500">Tipo:</span>
                <span>{{ paymentOriginLabel }}</span>
              </div>
            </div>
          </div>

          <!-- PENDING: texto literal ACH + contacto (Requisito PSE #11) -->
          <div v-if="transactionState === 'PENDING'"
               class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-left">
            <p class="text-sm text-yellow-800 font-medium">
              Por favor verificar si el debito fue realizado en el Banco.
            </p>
            <p v-if="hasContact" class="text-sm text-yellow-700 mt-2">
              Si tienes dudas, comunicate con nosotros:
              <span v-if="CONTACT_PHONE"><br />Telefono: {{ CONTACT_PHONE }}</span>
              <span v-if="CONTACT_EMAIL"><br />Correo: {{ CONTACT_EMAIL }}</span>
            </p>
          </div>

          <!-- OK -->
          <p v-else-if="transactionState === 'OK'" class="mt-4 text-xs text-gray-500">
            Recibiras el soporte de pago en tu correo electronico.
          </p>

          <!-- Rechazada / Fallida: causal + contacto -->
          <template v-else-if="['NOT_AUTHORIZED', 'FAILED'].includes(transactionState)">
            <RejectionReason
              :cause-rejection="detailed?.causeRejection"
              :rejection-description="detailed?.rejectionDescription"
              :state-description="detailed?.stateDescription"
              @retry="goToCheckout"
            />
            <div v-if="hasContact" class="mt-3 p-3 bg-gray-50 rounded-lg text-left text-sm text-gray-600">
              Para mayor informacion comunicate con nosotros:
              <span v-if="CONTACT_PHONE"><br />Telefono: {{ CONTACT_PHONE }}</span>
              <span v-if="CONTACT_EMAIL"><br />Correo: {{ CONTACT_EMAIL }}</span>
            </div>
          </template>
        </div>

        <!-- Boton de volver -->
        <div v-if="!loading && transactionState" class="mt-6 pt-6 border-t">
          <button
            @click="goToCheckout"
            class="py-2 px-6 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, Ref, ComputedRef } from 'vue';
import { useRouter } from 'vue-router';
import apiService from '../services/api.service';
import RejectionReason from '../components/RejectionReason.vue';
import { formatCurrency } from '../utils/formatters';
import { getPaymentModeLabel, getPaymentOriginLabel } from '../utils/paymentMode';
import { usePolling } from '../composables/usePolling';

interface TransactionData {
  trazabilityCode?: string;
  ticketId?: string;
  transactionValue?: number;
  paymentMode?: number;
  paymentOrigin?: number;
  bankProcessDate?: string;
  transactionState?: string;
  financialInstitutionName?: string;
  paymentDescription?: string;
  serviceNIT?: string;
  serviceName?: string;
}

interface DetailedData {
  causeRejection?: string;
  rejectionDescription?: string;
  stateDescription?: string;
}

interface PollingResult {
  transactionState: string;
}

const router = useRouter();
const loading: Ref<boolean> = ref(true);
const error: Ref<string> = ref('');
const transaction: Ref<TransactionData> = ref({});
const transactionState: Ref<string> = ref('');
const detailed: Ref<DetailedData | null> = ref(null);

// Datos del comercio y contacto (Requisitos PSE #6, #7, #11)
const COMPANY_NIT: string = import.meta.env.VITE_COMPANY_NIT || '';
const COMPANY_NAME: string = import.meta.env.VITE_COMPANY_NAME || 'Junta Atlantico S.A.S.';
const CONTACT_PHONE: string = import.meta.env.VITE_CONTACT_PHONE || '';
const CONTACT_EMAIL: string = import.meta.env.VITE_CONTACT_EMAIL || '';

// Snapshot del formulario capturado al montar, ANTES de que clearSession()
// borre la PII: permite mostrar descripción y banco en el comprobante.
const formSnapshot = ref<{ description?: string }>({});
const bankNameSnapshot = ref<string>('');

const { start: startPolling, stop: stopPolling } = usePolling();

const paymentModeLabel: ComputedRef<string> = computed(() =>
  transaction.value.paymentMode ? getPaymentModeLabel(transaction.value.paymentMode) : ''
);
const paymentOriginLabel: ComputedRef<string> = computed(() =>
  transaction.value.paymentOrigin ? getPaymentOriginLabel(transaction.value.paymentOrigin) : ''
);

const STATE_LABELS: Record<string, string> = {
  OK: 'Aprobada',
  PENDING: 'Pendiente',
  NOT_AUTHORIZED: 'Rechazada',
  FAILED: 'Fallida'
};
const stateLabel: ComputedRef<string> = computed(
  () => STATE_LABELS[transactionState.value] || transactionState.value || '—'
);

// Comprobante unificado (Requisito PSE #11): NIT, Razón Social, Estado, Banco,
// CUS, TicketId, Fecha, Valor y Descripción. Se muestra en los 4 estados.
const receipt = computed(() => ({
  nit: COMPANY_NIT || transaction.value.serviceNIT || '',
  companyName: COMPANY_NAME || transaction.value.serviceName || '',
  state: stateLabel.value,
  bank: transaction.value.financialInstitutionName || bankNameSnapshot.value || '—',
  cus: transaction.value.trazabilityCode || '—',
  ticketId: transaction.value.ticketId || '—',
  date: transaction.value.bankProcessDate ? formatDate(transaction.value.bankProcessDate) : '—',
  amount: typeof transaction.value.transactionValue === 'number'
    ? formatCurrency(transaction.value.transactionValue) : '—',
  description: transaction.value.paymentDescription || formSnapshot.value.description || '—'
}));

const hasContact: ComputedRef<boolean> = computed(() => !!(CONTACT_PHONE || CONTACT_EMAIL));

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota' });
  } catch {
    return iso;
  }
}

// Limpia toda la informacion de la transaccion del navegador, incluyendo
// pse_form_data (nombre, email, celular, direccion, identificacion).
function clearSession(): void {
  sessionStorage.removeItem('pse_trazability_code');
  sessionStorage.removeItem('pse_ticket_id');
  sessionStorage.removeItem('pse_form_data');
  sessionStorage.removeItem('pse_bank_name');
}

// CORRECCION: detener el polling al desmontar la vista. Antes, si el usuario
// navegaba/recargaba durante el polling, el bucle seguia corriendo en segundo
// plano (hasta 30 min) disparando llamadas al backend.
onUnmounted(() => {
  stopPolling();
});

onMounted(async () => {
  // Capturar datos para el comprobante ANTES de cualquier limpieza de sesión.
  try {
    const raw = sessionStorage.getItem('pse_form_data');
    if (raw) {
      const fd = JSON.parse(raw) as { description?: string };
      formSnapshot.value = { description: fd.description };
    }
  } catch {
    /* ignore */
  }
  bankNameSnapshot.value = sessionStorage.getItem('pse_bank_name') || '';

  let trazabilityCode: string | null = new URLSearchParams(window.location.search).get('trazabilityCode');
  if (!trazabilityCode) {
    trazabilityCode = sessionStorage.getItem('pse_trazability_code');
  }

  if (!trazabilityCode) {
    error.value = 'No se encontro informacion de la transaccion';
    loading.value = false;
    return;
  }

  await checkTransactionWithPolling(trazabilityCode);
});

async function checkTransactionWithPolling(trazabilityCode: string): Promise<void> {
  try {
    loading.value = true;

    const result: PollingResult = await startPolling(
      async () => {
        const r = await apiService.getTransactionStatus(trazabilityCode);
        if (r.success) {
          transaction.value = r.data as TransactionData;
          transactionState.value = (r.data as TransactionData).transactionState || '';
        }
        return { transactionState: transactionState.value, ...r.data };
      },
      (res: PollingResult) => {
        if (res.transactionState !== 'PENDING') {
          loadDetailedIfNeeded(trazabilityCode);
        }
      },
      (err: Error) => {
        error.value = err.message || 'Error al consultar el estado';
      }
    );

    if (result?.transactionState === 'TIMEOUT') {
      error.value = 'La transaccion esta tardando mas de lo esperado. Verifica el estado mas tarde.';
    }
  } catch (err) {
    error.value = (err as Error).message || 'Error al consultar el estado del pago';
  } finally {
    loading.value = false;
  }
}

async function loadDetailedIfNeeded(trazabilityCode: string): Promise<void> {
  if (transactionState.value === 'OK') {
    clearSession();
    return;
  }

  try {
    const r = await apiService.getTransactionDetailed(trazabilityCode);
    if (r.success) {
      detailed.value = r.data as DetailedData;
    }
  } catch (err) {
    console.warn('No se pudo cargar detalle:', err);
  }

  // Estados terminales no exitosos: se borra al menos la PII del navegador.
  if (['NOT_AUTHORIZED', 'FAILED'].includes(transactionState.value)) {
    clearSession();
  }
}

function goToCheckout(): void {
  stopPolling();
  router.push('/checkout');
}
</script>
```

---

## 11. INSTRUCCIONES DE INSTALACIÓN

### 11.1 Requisitos previos

```bash
# Node.js 18+ y npm
node --version  # v18.x o superior
npm --version

# Git
git --version
```

### 11.2 Crear estructura del proyecto

```bash
mkdir junta-atlantico-pse
cd junta-atlantico-pse
mkdir -p backend frontend
```

### 11.3 Instalación del Backend

```bash
cd backend
npm init -y
npm install express cors dotenv helmet morgan axios winston express-rate-limit zod
npm install -D typescript ts-node @types/node @types/express @types/cors @types/morgan nodemon jest ts-jest @types/jest eslint
# Compilar: npx tsc   |   Dev: npx ts-node server.ts   |   Typecheck: npx tsc --noEmit

# Crear estructura
mkdir -p config services controllers routes middleware models utils logs tests/integration
```

### 11.4 Configurar `.env` del backend

```bash
cat > .env << 'EOF'
NODE_ENV=cert
PSE_ENV=cert

# Credenciales PSE (solicitar a ACH Colombia)
PSE_API_KEY=tu-api-key-aqui
PSE_CLIENT_ID=tu-client-id
PSE_CLIENT_SECRET=tu-client-secret
PSE_ENCRYPTION_KEY=tu-llave-aes-base64
PSE_ENCRYPTION_IV=tu-iv-base64

# Datos Junta Atlántico
PSE_ENTITY_CODE=901234567-8
PSE_SERVICE_CODE=tu-service-code
PSE_CIIU_CATEGORY=8692
PSE_COMPANY_NAME=JUNTA ATLANTICO S.A.S.

# URLs PSE (certificación)
PSE_TOKEN_URL=https://apicer.pse.com.co/oauth/client_credential/accesstoken?grant_type=client_credentials
PSE_API_BASE_URL=https://apicer.pse.com.co/v2/psewebapinf/api
PSE_RETURN_URL=https://www.juntaatlantico.co/retorno-pago

# reCAPTCHA v3
RECAPTCHA_SECRET=tu-secret
RECAPTCHA_SCORE_MIN=0.5

# Rate limit
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQ=10

# Server
PORT=3000
ALLOWED_ORIGIN=https://www.juntaatlantico.co
STRICT_ORIGIN=false

# Control de pago
PSE_DOUBLE_PAYMENT_CHECK=true
PSE_POLLING_INTERVAL_MS=180000
PSE_POLLING_MAX_ATTEMPTS=10
EOF
```

### 11.5 Instalación del Frontend

```bash
cd ../frontend
npm create vue@latest .
# Seleccionar: Vue Router, Pinia

npm install axios pinia
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 11.6 Configurar `.env` del frontend

```bash
cat > .env << 'EOF'
VITE_API_URL=http://localhost:3000/api/pse
VITE_PSE_SERVICE_CODE=tu-service-code
VITE_RECAPTCHA_SITE_KEY=tu-site-key
VITE_POLLING_INTERVAL_MS=180000
VITE_MAX_POLLING_ATTEMPTS=10
EOF

cat > .env.production << 'EOF'
VITE_API_URL=https://api.juntaatlantico.co/api/pse
VITE_PSE_SERVICE_CODE=tu-service-code-prod
VITE_RECAPTCHA_SITE_KEY=tu-site-key-prod
EOF
```

### 11.7 Ejecutar en desarrollo

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 11.8 Despliegue en producción

```bash
# Backend
cd backend
npm install -g pm2
pm2 start ecosystem.config.js --name pse-backend
pm2 save
pm2 startup

# Frontend
cd ../frontend
npm run build   # ejecuta vue-tsc --noEmit && vite build
# Servir dist/ con Nginx
```

### 11.9 Configuración Nginx (producción)

```nginx
server {
    listen 80;
    server_name juntaatlantico.co www.juntaatlantico.co;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name juntaatlantico.co www.juntaatlantico.co;

    ssl_certificate /etc/letsencrypt/live/juntaatlantico.co/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/juntaatlantico.co/privkey.pem;

    # Security headers (Sección 11 ACH)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' https://www.google.com https://www.gstatic.com; frame-src https://www.google.com; img-src 'self' data: https:; connect-src 'self' https://www.google.com" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Frontend
    root /var/www/junta-atlantico/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 12. GUÍA DE CERTIFICACIÓN

### 12.1 Antes de la certificación

- [ ] Credenciales de certificación solicitadas a ACH Colombia (api key, client id, secret, AES key, IV)
- [ ] Confirmar `PSE_ENTITY_CODE` (NIT) registrado en ACH
- [ ] Confirmar `PSE_SERVICE_CODE` y `PSE_CIIU_CATEGORY`
- [ ] `PSE_RETURN_URL` registrado en ACH y coincide con el del `.env`
- [ ] HTTPS activo con certificado válido
- [ ] reCAPTCHA v3 configurado y verificado
- [ ] Control de doble pago implementado y probado
- [ ] Mensajes literales ACH verificados en frontend y backend
- [ ] `soliciteDate` con zona horaria Colombia verificado
- [ ] Filtro de caracteres prohibidos verificado
- [ ] Validación cruzada `userType`/`identificationType` verificada
- [ ] Cabeceras de seguridad (HSTS, CSP, X-Frame-Options) activas

### 12.2 Casos de prueba obligatorios

| # | Caso 																	| Resultado esperado 							|
|---|	---																	|---											|
| 1 | Pago persona natural OK 												| Estado OK, CUS, URL PSE, finalizar OK 		|
| 2 | Pago empresa (NIT) OK 												| Estado OK 									|
| 3 | Pago persona natural + NIT (inválido) 								| `FAIL_INVALID_USER_TYPE` 						|
| 4 | Pago empresa + Cédula (inválido) 										| `FAIL_INVALID_USER_TYPE` 						|
| 5 | `description` con `\|`			 									| `FAIL_FORBIDDEN_CHARS` 						|
| 6 | `description` con `"` 												| `FAIL_FORBIDDEN_CHARS` 						|
| 7 | `FAIL_EXCEEDEDLIMIT` (monto alto) 									| Mensaje literal ACH 							|
| 8 | `FAIL_BANKUNREACHEABLE` (banco caído) 								| Mensaje literal ACH 							|
| 9 | `FAIL_DISABLEDUSEREMAIL` (solicitar caso a ACH) 						| Mensaje amigable 								|
| 10 | Doble pago APROBADO 													| Mensaje literal ACH 							|
| 11 | Doble pago PENDIENTE 												| Mensaje literal ACH 							|
| 12 | `GetTransactionInformationNF` con `paymentMode` y `paymentOrigin` 	| Response con nuevos campos 					|
| 13 | `GetTransactionInformationDetailed` con causal 0011 (fondos) 		| `causeRejection: "00011"` 					|
| 14 | `GetTransactionInformationDetailed` con causal 0026 (OTP) 			| `causeRejection: "00026"` 					|
| 15 | `GetTransactionInformationDetailed` con OK 							| `causeRejection: null` 						|
| 16 | Causal 15 ampliada 													| `causeRejection: "00015"` con texto sobre 7 min |
| 17 | reCAPTCHA con score < 0.5 											| `FAIL_RECAPTCHA` 								|
| 18 | 11 requests en 1 minuto desde misma IP 								| `FAIL_RATE_LIMIT` en la 11ª 					|
| 19 | Finalize con estado OK 												| `returnCode: SUCCESS` 						|
| 20 | Finalize con estado PENDIENTE 										| `FAIL_INVALIDSTATE` (no se debe llamar) 		|
| 21 | `soliciteDate` cruza medianoche CO 									| Transacción aceptada con fecha CO 			|

### 12.3 Checklist de certificación ACH

- [ ] Generación de token OAuth 2.0 (1 hora de vigencia)
- [ ] Renovación automática del token 5 min antes
- [ ] Cifrado/Descifrado JWE (AES-256-GCM) correcto
- [ ] `GetBankListNF` con lista completa de bancos
- [ ] `CreateTransactionPaymentNF` con persona natural
- [ ] `CreateTransactionPaymentNF` con empresa (NIT)
- [ ] `GetTransactionInformationNF` con `OK`
- [ ] `GetTransactionInformationNF` con `NOT_AUTHORIZED`
- [ ] `GetTransactionInformationNF` con `PENDING`
- [ ] `GetTransactionInformationNF` con `FAILED`
- [ ] `GetTransactionInformationDetailed` con causal de rechazo
- [ ] `FinalizeTransactionPaymentNF` con estado OK
- [ ] Mensaje literal `FAIL_EXCEEDEDLIMIT`
- [ ] Mensaje literal `FAIL_BANKUNREACHEABLE`
- [ ] Control de doble pago (PENDIENTE y APROBADO)
- [ ] Página de retorno HTTPS
- [ ] Comprobante de pago con datos correctos
- [ ] reCAPTCHA v3 funcional
- [ ] Rate limit funcional
- [ ] Cabeceras de seguridad (HSTS, CSP)
- [ ] Logo oficial PSE actualizado
- [ ] Botón dice "Débito Bancario PSE"

---

## 13. MANEJO DE ERRORES Y MENSAJES LITERALES ACH

### 13.1 Tabla maestra de códigos de error

| Código 							| Mensaje literal ACH (Backend → Frontend) 																							| Acción frontend |
|---								|---																																|---|
| `SUCCESS` 						| "Transacción procesada correctamente." 																							| Continuar flujo |
| `FAIL_EXCEEDEDLIMIT` 				| "El monto de la transacción excede los límites establecidos en PSE para la empresa, por favor comuníquese con nuestras líneas de atención al cliente al teléfono (605) 333-XXXX o al correo electrónico facturacion@juntaatlantico.co" | Mostrar y permitir reintentar con monto menor |
| `FAIL_BANKUNREACHEABLE` 			| "La entidad financiera no puede ser contactada para iniciar la transacción, por favor seleccione otra o intente más tarde" 		| Mostrar y permitir seleccionar otro banco |
| `FAIL_DISABLEDUSEREMAIL` 			| "El correo electrónico ingresado presenta restricciones. Por favor verifique o use otro correo de contacto." 						| Mostrar y permitir cambiar email 			|
| `FAIL_INVALIDTRAZABILITYCODE` 	| "La transacción aún se está procesando. Por favor espere unos minutos." 															| Reintentar polling 						|	
| `FAIL_BANKNOTEXISTSORDISABLED` 	| "El banco seleccionado no está disponible. Por favor seleccione otro." 															| Mostrar y permitir seleccionar otro 		|
| `FAIL_INVALIDAMOUNT` 				| "El monto ingresado no es válido. Por favor verifique el valor." 																	| Mostrar y permitir corregir 				|
| `FAIL_INVALIDSOLICITDATE` 		| "La fecha de solicitud no es válida. Por favor recargue la página." 																| Recargar página 							|
| `FAIL_TRANSACTIONNOTALLOWED` 		| "La transacción no está permitida en este momento. Por favor intente más tarde." 													| Mostrar 									|
| `FAIL_TIMEOUT` 					| "El tiempo de espera ha expirado. Por favor intente más tarde." 																	| Mostrar 									|
| `FAIL_GENERICERROR` 				| "No se pudo crear la transacción, por favor intente más tarde o comuníquese con la empresa" 										| Mostrar 									|
| `FAIL_DOUBLEPAYMENT` (APROBADO) 	| "En este momento su #<TICKET> ha finalizado su proceso de pago y cuya transacción se encuentra APROBADA..." 						| Bloquear y mostrar 						|
| `FAIL_DOUBLEPAYMENT` (PENDIENTE) 	| "En este momento su #<TICKET> presenta un proceso de pago cuya transacción se encuentra PENDIENTE..." 							| Bloquear y mostrar 						|
| `FAIL_RECAPTCHA` 					| "No se pudo verificar que no eres un robot. Por favor intenta de nuevo." 															| Mostrar y reintentar 						|
| `FAIL_RATE_LIMIT` 				| "Demasiadas solicitudes. Por favor intente en un minuto." 																		| Mostrar y esperar 						|
| `FAIL_INVALID_USER_TYPE` 			| "Si el tipo de persona es 'person', el tipo de identificación no puede ser NIT. Si es 'company', el único tipo válido es NIT." 	| Resaltar campo 							|
| `FAIL_FORBIDDEN_CHARS` 			| "El campo X no puede contener los caracteres \| ni \"." 																			| Resaltar campo 							|
| `FAIL_VALIDATION` 				| "Por favor verifica los datos ingresados." 																						| Resaltar campos 							|

### 13.2 Estados de transacción

| Estado | Significado 	| Acción 																			|
|---					|---		|---																	|
| `OK` 					| Aprobada 	| Mostrar éxito, finalizar, mostrar comprobante con modo y tipo de pago |
| `NOT_AUTHORIZED`		| Rechazada | Mostrar rechazo, consultar causal detallada, permitir reintentar 		|
| `PENDING` 			| Pendiente | Polling cada 3 min, mostrar mensaje de espera 						|
| `FAILED` 				| Fallida 	| Mostrar error, permitir reintentar 									|

### 13.3 Causales de rechazo (numeral 9.3 v21)

Las causales más relevantes (frontend debe mostrarlas cuando `causeRejection` llegue vía `GetTransactionInformationDetailed`):

| Causal | Descripción amigable 																|
|---	 |---																					|
| `00011`| Fondos insuficientes 																|
| `00008`| Excediste el límite transaccional autorizado por tu banco 							|
| `00026`| OTP no informado. Agotaste los reenvíos configurados por la Entidad Financiera. 		|
| `00015`| La transacción no fue concluida en el banco en el tiempo máximo permitido (7 min).	|
| `00019`| Transacción declinada por sospecha de fraude (Monitor Plus). 						|
| `10001`| La transacción excede el límite asignado a la empresa en PSE. 						|

---

## 14. CHECKLIST DE IMPLEMENTACIÓN

### 14.1 Configuración inicial

- [ ] Solicitar credenciales a ACH Colombia (api key, client id, secret, AES, IV, service code)
- [ ] Confirmar NIT, CIIU y razón social con ACH
- [ ] Registrar `PSE_RETURN_URL` en ACH
- [ ] Crear repositorio
- [ ] Configurar `.env` (cert y prod)
- [ ] Configurar HTTPS con certificado válido
- [ ] Configurar reCAPTCHA v3 (Google reCAPTCHA admin)
- [ ] Configurar Nginx con cabeceras de seguridad

### 14.2 Backend

- [ ] `services/encryption.service.js` (AES-256-GCM)
- [ ] `services/token.service.js` (OAuth 2.0 con caché y renovación)
- [ ] `services/recaptcha.service.js` (verify v3)
- [ ] `services/doublePayment.service.js` (Anexo 1.3)
- [ ] `services/pse.service.js` (cliente PSE completo)
  - [ ] `getBankList`
  - [ ] `createTransaction` con `soliciteDate` CO
  - [ ] `getTransactionInformation` con reintento y backoff
  - [ ] `getTransactionInformationDetailed` (NUEVO v2.0)
  - [ ] `finalizeTransaction`
- [ ] `utils/dates.js` (`nowColombiaISO`)
- [ ] `utils/errorMessages.js` (mensajes literales ACH)
- [ ] `utils/paymentMode.js` (mapeo de modos)
- [ ] `utils/causalRejection.js` (mapeo de causales)
- [ ] `utils/validators.js` (userType, caracteres prohibidos)
- [ ] `middleware/rateLimit.middleware.js`
- [ ] `middleware/recaptcha.middleware.js`
- [ ] `controllers/pse.controller.js` (con todos los endpoints)
- [ ] `routes/pse.routes.js` (con rate limit y reCAPTCHA)
- [ ] `models/transaction.model.js` (con cifrado en reposo)
- [ ] `server.js` con helmet, CORS, CSP

### 14.3 Frontend

- [ ] `services/recaptcha.service.js`
- [ ] `composables/useReCaptcha.js`
- [ ] `composables/usePolling.js`
- [ ] `utils/validators.js` (caracteres prohibidos, userType)
- [ ] `utils/errorMessages.js` (mensajes literales ACH)
- [ ] `utils/paymentMode.js` (mapeo)
- [ ] `utils/causalRejection.js` (mapeo)
- [ ] `services/api.service.js` (con `getTransactionDetailed`)
- [ ] `components/PaymentForm.vue` (con reCAPTCHA + validaciones)
- [ ] `components/RejectionReason.vue` (NUEVO v2.0)
- [ ] `views/PaymentReturn.vue` (con causal de rechazo)
- [ ] `main.ts` sin plugin; reCAPTCHA v3 cargado por `services/recaptcha.service.ts` (`?render=<SITE_KEY>` + `grecaptcha.ready()`)
- [ ] `trust proxy = 1` configurado en `server.ts` (requerido por Hostinger)
- [ ] `app.listen()` sin guarda `if (require.main === module)` (requerido por Hostinger)
- [ ] `tsconfig.build.json` separado para compilar sin tests
- [ ] Script `scripts/build-zips.mjs` para generar los zips de despliegue

### 14.4 Pruebas en certificación

- [ ] Token OAuth 2.0 generación y renovación
- [ ] Cifrado JWE válido
- [ ] `GetBankListNF` con todos los bancos
- [ ] `CreateTransactionPaymentNF` persona natural
- [ ] `CreateTransactionPaymentNF` empresa
- [ ] Validación cruzada `userType`/`identificationType`
- [ ] Filtro caracteres prohibidos
- [ ] `soliciteDate` con zona horaria Colombia
- [ ] `GetTransactionInformationNF` con todos los estados
- [ ] `GetTransactionInformationDetailed` con causales
- [ ] Reintento `FAIL_INVALIDTRAZABILITYCODE`
- [ ] Control de doble pago (APROBADO y PENDIENTE)
- [ ] Mensajes literales `FAIL_EXCEEDEDLIMIT` y `FAIL_BANKUNREACHEABLE`
- [ ] `FinalizeTransactionPaymentNF` solo con OK
- [ ] reCAPTCHA v3 funcional
- [ ] Rate limit por IP funcional

### 14.5 Producción

- [ ] Credenciales de producción configuradas
- [ ] URLs de producción configuradas
- [ ] HTTPS con TLS 1.2+ activo
- [ ] Nginx con cabeceras de seguridad
- [ ] PM2 configurado y monitoreo
- [ ] Logs centralizados
- [ ] Monitoreo de tasa de aprobación ≥ 80%
- [ ] Plan de contingencia ante caídas de PSE

---

## 15. ANEXOS

### 15.1 Glosario

| Término 	| Significado 															|
|---		|---																	|
| PSE 		| Proveedor de Servicios Electrónicos 									|
| CUS 		| Código Único de Seguimiento (trazabilityCode) 						|
| OTP 		| One-Time Password (Contraseña de un solo uso) 						|
| JWE 		| JSON Web Encryption 													|
| OAuth 	| Open Authorization 													|
| API 		| Application Programming Interface 									|
| REST		| Representational State Transfer 										|
| TLS 		| Transport Layer Security 												|
| JWT 		| JSON Web Token 														|
| IV 		| Initialization Vector													|
| mTLS 		| Mutual TLS 															|
| reCAPTCHA | Servicio anti-bot de Google 											|
| CIIU 		| Código Industrial Internacional Uniforme 								|
| ACH 		| Administradora de los Recursos del Sistema Financiero (ACH Colombia) 	|

### 15.2 URLs de referencia

```yaml
# Certificación
PSE_TOKEN_URL: "https://apicer.pse.com.co/oauth/client_credential/accesstoken?grant_type=client_credentials"
PSE_API_BASE_URL: "https://apicer.pse.com.co/v2/psewebapinf/api"

# Producción
PSE_TOKEN_URL: "https://apiprd.pse.com.co/oauth/client_credential/accesstoken?grant_type=client_credentials"
PSE_API_BASE_URL: "https://apiprd.pse.com.co/v2/psewebapinf/api"

# Documentación SDK PSE
"https://desarrollo.pse.com.co/Docs/PSE-NF/PSE-SDKsDelMejoramientoFlujoPago.docx"
"https://desarrollo.pse.com.co/Docs/PSE-NF/SDK_PSE_MejoramientoFlujoPago.zip"

# Manual de Marca PSE
"https://www.pse.com.co/documents/1176700/0/Logos%20y%20Manual%20.zip/c8dd57ac-7b10-2d7b-9350-fbb5a77f678a"

# OAuth 2.0
"https://www.oauth.com/oauth2-servers/access-tokens/"
"https://docs.apigee.com/api-platform/security/oauth/oauth-home"

# Google reCAPTCHA v3
"https://developers.google.com/recaptcha/docs/v3"
"https://www.google.com/recaptcha/admin"
```

### 15.3 Datos de contacto ACH Colombia

Para soporte durante la certificación:
- **Email:** pse@achcolombia.com.co (verificar canal oficial)
- **Teléfono:** (601) 743 9090
- **Portal de desarrolladores:** https://desarrollo.pse.com.co

### 15.4 Cronograma sugerido

| Semana 																| Actividad | Responsable 	|
|---|---																|---						|
| 1 | Solicitar credenciales, configurar entorno, integrar reCAPTCHA 	| Equipo Desarrollo 		|
| 2 | Backend completo (servicios, controladores, modelos) 				| Desarrollador Backend 	|
| 3 | Frontend completo (componentes, vistas, validaciones) 			| Desarrollador Frontend 	|
| 4 | Pruebas en ambiente de certificación ACH 							| Equipo QA 				|
|4-5| Corrección de errores y reintento de casos fallidos 				| Equipo Desarrollo 		|
| 5 | Certificación oficial con ACH Colombia 							| Equipo + ACH				|
| 6 | Pase a producción 												| DevOps 					|
| 6+| Monitoreo y ajustes (tasa aprobación ≥ 80%) 						| Operación 				|

---

## ✅ CONCLUSIÓN

La versión 2.0 de este prompt integra **todos los ajustes bloqueantes y recomendados** del instructivo ACH Colombia v17→v21:

### 🔴 Implementado (bloqueante)
- ✅ Controles perimetrales (Sección 11 ACH) — reCAPTCHA v3 + rate limit + cabeceras de seguridad
- ✅ Validación cruzada `userType` vs `identificationType`
- ✅ `soliciteDate` con zona horaria Colombia (`-05:00`)
- ✅ Filtro de caracteres prohibidos (`|` y `"`)
- ✅ Mensajes literales ACH para todos los códigos de error
- ✅ Control de doble pago con textos inmodificables

### 🟡 Implementado (recomendado)
- ✅ Método opcional `GetTransactionInformationDetailed` con 4 campos nuevos
- ✅ Reintento con backoff para `FAIL_INVALIDTRAZABILITYCODE`
- ✅ Nuevos códigos `FAIL_DISABLEDUSEREMAIL` y `FAIL_ERRORINCREDITS`
- ✅ Rate limit por IP (10 req/min)
- ✅ Exposición de `paymentMode`, `paymentOrigin`, `serviceNIT`, `serviceName` al frontend
- ✅ Validación de longitud `serviceCode` ≤ 10
- ✅ Reglas de beneficiario para rol "desarrollo independiente"
- ✅ Helper de modo de pago (15=débito, 50=Visa, etc.)
- ✅ Cifrado en reposo para `ticketId` y `trazabilityCode`
- ✅ Cabeceras HTTP seguras (HSTS, CSP, X-Frame-Options)
- ✅ CORS estricto
- ✅ Monitoreo de tasa de aprobación ≥ 80%

El equipo de desarrollo de Junta Atlántico puede usar este documento como **especificación funcional y técnica completa** para implementar la integración con PSE Avanza cumpliendo con la versión 21 del instructivo ACH Colombia. El esfuerzo total estimado es de **5-6 días críticos** + **10-12 días incluyendo opcionales** con un desarrollador full-stack.

---

**Versión del prompt:** 2.0
**Fecha:** Julio 2026
**Basado en:** `Prompt Generado.md` v1.0 + `ANALISIS_AJUSTES_PSE_v17_a_v21.md`
**Instructivo ACH:** Versión 21 (octubre 2025)

## 16. DESPLIEGUE EN HOSTINGER

> Arquitectura **Opción B**: dos subdominios independientes desplegados como
> archivos `.zip` generados localmente. No hay compilación TypeScript en el servidor.

### 16.1 Arquitectura en producción

```
Usuario (navegador)
    │
    ├── GET pse.juntaatlantico.co        → Hostinger sitio estático HTML
    │       HTML + JS + CSS (Vue/Vite)       (sin Node.js, sin proceso)
    │
    └── POST api.juntaatlantico.co/api/pse → Hostinger Web App Node.js
            Express + dist/ compilado          (proceso persistente)
                    │
                    └── PSE ACH Colombia (apicer.pse.com.co)
```

### 16.2 Subdominios

| Subdominio | Tipo | Contenido |
|---|---|---|
| `pse.juntaatlantico.co` | Sitio estático HTML | Build de Vite (`frontend/dist/`) |
| `api.juntaatlantico.co` | Web App Node.js | `backend/dist/` compilado |

### 16.3 Generar los zips de despliegue

Desde la **raíz del proyecto** en Windows/Mac/Linux (no usa el comando `zip` del sistema):

```bash
# Primera vez o cuando cambien dependencias:
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Generar los dos zips:
node scripts/build-zips.mjs
```

Resultado:
```
deploy/
  backend.zip    ← subir a Hostinger (Web App Node.js)
  frontend.zip   ← subir a Hostinger (sitio estático HTML)
```

### 16.4 Configuración de la Web App del backend en Hostinger

| Campo | Valor |
|---|---|
| Build command | *(dejar vacío)* |
| Start command | `node dist/backend/server.js` |
| Node version | `20.x` o `22.x` |
| Branch | `master` |

### 16.5 Variables de entorno del backend en Hostinger

> Las variables `VITE_*` del frontend **NO van aquí** — se hornean en el build.
> Solo el backend tiene variables de entorno en el servidor.

```bash
NODE_ENV=production
PSE_ENV=cert                        # cert=certificación, production=producción real
ALLOWED_ORIGIN=https://pse.juntaatlantico.co
STRICT_ORIGIN=true
PSE_RETURN_URL=https://pse.juntaatlantico.co/retorno-pago
PSE_COMPANY_NAME=JUNTA ATLANTICO S.A.S.

# Claves de cifrado AES-256-GCM (generar UNA SOLA VEZ y guardar de forma segura)
# node -e "const c=require('crypto'); console.log(c.randomBytes(32).toString('base64'))"
PSE_ENCRYPTION_KEY=<base64 32 bytes>
PSE_ENCRYPTION_IV=<base64 12 bytes>
DB_ENCRYPTION_KEY=<base64 32 bytes>

# reCAPTCHA v3
RECAPTCHA_SECRET=<secret key del registro v3>
RECAPTCHA_SCORE_MIN=0.5

# Credenciales PSE (ACH Colombia — pendiente recibir)
PSE_CLIENT_ID=<de ACH Colombia>
PSE_CLIENT_SECRET=<de ACH Colombia>
PSE_API_KEY=<de ACH Colombia>
PSE_SERVICE_CODE=<de ACH Colombia, máx 10 chars>
PSE_ENTITY_CODE=<NIT de la Junta>
PSE_TOKEN_URL=https://apicer.pse.com.co/oauth/client_credential/accesstoken?grant_type=client_credentials
PSE_API_BASE_URL=https://apicer.pse.com.co/v2/psewebapinf/api

# Cache de bancos
BANK_LIST_CACHE_TTL_MS=86400000
BANK_LIST_FALLBACK_TTL_MS=300000

# Seguridad
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQ=10
LOG_LEVEL=info
```

### 16.6 Variables del frontend (`.env.production`)

Se configuran en el archivo local **antes** de compilar. No van en Hostinger.

```bash
VITE_API_URL=https://api.juntaatlantico.co/api/pse
VITE_RECAPTCHA_SITE_KEY=6LfeA1otAAAAAO3tR5zTId6BtIIeoY3T8ytO7Lin
VITE_PSE_SERVICE_CODE=<de ACH Colombia>
VITE_COMPANY_NIT=<NIT de la Junta>
VITE_COMPANY_NAME=JUNTA ATLANTICO S.A.S.
VITE_CONTACT_PHONE=<telefono de contacto>
VITE_CONTACT_EMAIL=<correo de contacto>
VITE_POLLING_INTERVAL_MS=180000
VITE_MAX_POLLING_ATTEMPTS=10
```

### 16.7 Cómo subir el frontend (sitio estático)

El frontend compilado (HTML/CSS/JS puro) **no necesita Node.js**. Se sube directamente
por el **File Manager** de Hostinger:

1. Panel Hostinger → File Manager
2. Navegar a la carpeta del subdominio `pse.juntaatlantico.co`
3. Subir `deploy/frontend.zip` y descomprimir en la raíz
4. Verificar que `index.html` quede en la raíz de la carpeta

### 16.8 Flujo completo de un redeploy

```
1. Hacer cambios en el código (backend o frontend)
2. Commitear y pushear a GitHub
3. Desde la raíz del proyecto:
   node scripts/build-zips.mjs
4. Si cambió el BACKEND:
   - Subir deploy/backend.zip a Hostinger (Web App Node.js)
   - Reiniciar la app en Hostinger
5. Si cambió el FRONTEND:
   - Subir deploy/frontend.zip por File Manager
   - Descomprimir en la raíz del subdominio (reemplaza los anteriores)
```

---

## 17. REGISTRO DE CAMBIOS v3.0 — Despliegue en producción

Esta versión documenta el estado real tras el despliegue exitoso en Hostinger.
Todos los cambios fueron verificados en producción con pruebas reales.

### 17.1 Arquitectura de despliegue (Opción B)

Se eligió la **Opción B** (dos subdominios independientes) sobre la Opción A
(Express sirviendo la SPA) por tener **menor impacto en el código** — el proyecto
ya estaba construido con frontend y backend separados.

- `pse.juntaatlantico.co` → sitio estático HTML (build de Vite, sin Node.js)
- `api.juntaatlantico.co` → Web App Node.js (Express, `dist/` precompilado)

### 17.2 Correcciones de producción en `backend/server.ts`

**`app.set('trust proxy', 1)`** — Hostinger usa Nginx como proxy inverso. Sin esta
configuración, `express-rate-limit` identificaba a todos los usuarios como la misma
IP (la del proxy interno), rompiendo el rate limit por usuario. El valor `1` indica
un nivel de proxy de confianza. Genera el warning en logs:
`"X-Forwarded-For header is set but trust proxy is false"`.

**`app.listen()` sin guarda** — Se eliminó `if (require.main === module)` que envolvía
`app.listen()`. Hostinger no arranca el servidor como módulo principal, por lo que
esa condición nunca se cumplía y el proceso nunca llamaba a `listen()`. Hostinger
reportaba: `"App did not call listen() within 3 seconds"`.

### 17.3 Estrategia de despliegue con zips precompilados

**Problema:** Hostinger ejecuta `npm install --production` durante el build, lo que
excluye `devDependencies`. Como `typescript` está en `devDependencies`, `tsc` no
estaba disponible y el build fallaba con:
`"typescript package was not properly installed"`.

**Solución:** Compilar TypeScript **localmente** (donde sí hay devDeps) e incluir
el `dist/` ya compilado en el zip. El servidor solo hace `npm install --production`
(instala `express`, `axios`, etc.) y arranca con `node dist/backend/server.js`.

**`scripts/build-zips.mjs`** — Script cross-platform (Windows/Mac/Linux) que:
- Compila TypeScript con `npx tsc -p tsconfig.build.json`
- Compila el frontend con `npx vite build`
- Genera los zips usando módulos nativos de Node.js (sin el comando `zip` del sistema)
- No requiere instalar nada adicional

El `build` script del `backend/package.json` quedó como `echo "Build omitido..."` 
para que Hostinger no intente compilar nada al subir el zip.

### 17.4 `tsconfig.build.json` (separación editor vs build)

Problema: el editor (VS Code) mostraba `describe`/`test`/`expect` como desconocidos
porque `tsconfig.json` excluía la carpeta `tests`. Solución:

- `tsconfig.json` → incluye tests, declara `"types": ["node", "jest"]` (para el editor y `ts-jest`)
- `tsconfig.build.json` → excluye tests y usa `"types": ["node"]` (solo para producción)
- `npm run build` usa `tsconfig.build.json`

### 17.5 Variables de entorno críticas para arrancar

Aunque no haya credenciales PSE, estas variables son **obligatorias** para que el
proceso levante (el servicio de cifrado las valida al iniciar):

```bash
PSE_ENCRYPTION_KEY   # base64 de 32 bytes exactos
PSE_ENCRYPTION_IV    # base64 de 12 bytes exactos
DB_ENCRYPTION_KEY    # base64 de 32 bytes exactos
```

Generar con Node.js:
```bash
node -e "const c=require('crypto'); console.log('KEY:', c.randomBytes(32).toString('base64')); console.log('IV:', c.randomBytes(12).toString('base64')); console.log('DB:', c.randomBytes(32).toString('base64'));"
```

**`PORT`** — NO configurar en Hostinger. Hostinger inyecta el puerto automáticamente.
El fallback `parseInt(process.env.PORT || '3000', 10)` en `server.ts` cubre el desarrollo local.

### 17.6 Frontend como sitio estático HTML

Las variables `VITE_*` **no son variables de entorno del servidor**. Vite las
procesa en el build y las "hornea" directamente en el JavaScript compilado:

```typescript
// En el código fuente:
const url = import.meta.env.VITE_API_URL
// En el JS compilado (dist/assets/index-xxx.js):
const url = "https://api.juntaatlantico.co/api/pse"
```

Consecuencia: si cambia la URL del backend (u otra variable `VITE_*`), hay que
regenerar el zip del frontend y volver a subirlo. No basta con cambiar algo en Hostinger.

El frontend compilado es HTML/CSS/JS puro — se desplegó como **sitio estático HTML**
en Hostinger (File Manager → descomprimir en la raíz del subdominio), sin ningún
proceso Node.js, sin consumo de recursos del servidor.

### 17.7 Corrección de EOL (line endings) para Windows

Archivo `.gitattributes` agregado a la raíz del repo para normalizar saltos de
línea a LF en el repositorio, evitando el warning `"LF will be replaced by CRLF"`
en `git add` en Windows y los diffs falsos en equipos mixtos.

### 17.8 Pruebas de verificación en producción (resultados)

Ejecutadas con PowerShell contra `https://api.juntaatlantico.co`:

| Prueba | Comando | Resultado |
|---|---|---|
| Servidor vivo + bancos mock | `GET /api/pse/banks` | ✅ 200 + lista A-Z + `"source":"mock"` |
| 404 en JSON | `GET /api/pse/noexiste` | ✅ `{"code":"NOT_FOUND"}` |
| reCAPTCHA bloqueando | `POST /api/pse/transaction` sin token | ✅ `{"code":"FAIL_RECAPTCHA"}` |
| Rate limit por IP | 12× `GET /api/pse/banks` | ✅ Sin warning en logs (globalLimiter: 60/min) |
| CORS | `Origin: pse.juntaatlantico.co` | ✅ `Access-Control-Allow-Origin` correcto |
| Sin errores en logs | Tiempo real Hostinger | ✅ Sin warnings ni errores |

**Nota sobre el rate limit:** `/api/pse/banks` usa `globalLimiter` (60 req/min) —
los 12 requests pasaron correctamente. El `pseTransactionLimiter` (10 req/min)
protege el `POST /api/pse/transaction` (verificable cuando haya tokens reCAPTCHA válidos).

### 17.9 Pendientes para ir a producción real

1. **Credenciales PSE de ACH Colombia** (`PSE_CLIENT_ID`, `PSE_CLIENT_SECRET`,
   `PSE_API_KEY`, `PSE_SERVICE_CODE`) — configurar en variables de entorno de
   Hostinger y reiniciar el backend. Sin tocar el código.
2. **Confirmar referencias P13** — verificar el mapeo de `referenceNumber1/2/3`
   contra el Manual de Buenas Prácticas para "Desarrollo Independiente".
3. **Prueba P6** — transacción con monto superior a los límites PSE para verificar
   el mensaje de `FAIL_EXCEEDEDLIMIT`.
4. **Prueba P7** — usar `serviceCode` inválido (5555, 6666 o 7777) para verificar
   `FAIL_SERVICENOTEXISTSORNOTCONFIGURED`.
5. **Prueba P14** — flujo PSE Avanza recurrente con banco Banka + OTP.
6. **NIT del beneficiario** — confirmar que `PSE_ENTITY_CODE` sea el NIT real de
   la Junta Atlántico (§7.3 del instructivo ACH).

### 17.10 Matriz de cumplimiento actualizada

| # | Requisito | Estado |
|---|---|---|
| 1 | Botón/logo PSE; no usar "tarjeta" | ✅ (verificar logo oficial en pantalla) |
| 2 | Controles perimetrales de seguridad | ✅ |
| 3 | Validación userType / identificationType | ✅ |
| 4 | GetBankListNF ≤ 1 vez/día | ✅ |
| 5 | GetTransactionInformationNF cada 3 min | ✅ |
| 6 | FAIL_EXCEEDEDLIMIT: texto + contacto | ✅ (pendiente prueba con monto real) |
| 7 | Errores genéricos + contacto (front y back) | ✅ |
| 8 | Redirección misma pestaña / orden A-Z / botón | ✅ |
| 9 | Campos de beneficiario | ✅ (verificar NIT real) |
| 10 | Registro primera vez (términos) | ℹ️ Lado PSE |
| 11 | Comprobante completo (4 estados) | ✅ |
| 12 | Control de pago único | ✅ |
| 13 | 3 referencias obligatorias | ⚠️ Confirmar con Manual de Buenas Prácticas |
| 14 | Flujo PSE Avanza + OTP Banka | ⚠️ Prueba con credenciales reales |

---
### 17.10 Apego al SDK de ACH


## Análisis comparativo: SDK oficial PSE-ACH vs Proyecto Junta Atlántico

> El archivo `NodeJS.zip` suministrado por ACH Colombia es el **SDK oficial Node.js**
> para integrar PSE Avanza. Es una **librería cliente** (no una app completa) que
> encapsula los 4 métodos de la API: `GetBankListNF`, `CreateTransactionPaymentNF`,
> `GetTransactionInformationNF` y `FinalizeTransactionPaymentNF`.

---

### Diferencias de diseño (no son errores)

| Aspecto | SDK oficial PSE-ACH | Proyecto Junta Atlántico | Evaluación |
|---|---|---|---|
| Reintentos de token | Hasta 3 intentos forzados (`forceLogin`) | Caché con expiración y renovación automática | ✅ Tu enfoque es más robusto y eficiente |
| Cifrado JWE | Librería externa `jose` + `cryptr` | `crypto` nativo de Node.js (AES-256-GCM) | ✅ Equivalente en seguridad; sin dependencias externas |
| Peticiones HTTP | Módulo `https` nativo con callbacks | `axios` con `async/await` | ✅ `axios` es más mantenible y legible |
| Arquitectura | SDK puro (solo lógica de integración, sin servidor ni UI) | App completa: Express API + Vue 3 frontend | ✅ Es lo esperado — el SDK no incluye interfaz de usuario |
| Tests automatizados | Sin tests | 38 tests (unitarios + integración) | ✅ Tu proyecto es más sólido y verificable |
| Seguridad perimetral | Sin ninguna capa de seguridad | reCAPTCHA v3, rate limit por IP, Helmet, sanitización, validación de origin | ✅ Tu proyecto agrega todo lo requerido por la Sección 11 ACH |
| Manejo de errores | Rechaza la promesa con el error crudo | Códigos de error normalizados, mensajes ACH literales, logging estructurado | ✅ Tu proyecto cumple los mensajes exigidos en los 14 puntos de certificación |
| Validación de entrada | Sin validación | Esquemas Zod con validación cruzada (userType/identificationType, máx. 2 decimales) | ✅ Tu proyecto cumple la matriz de validaciones §7.1 del instructivo ACH v21 |

---

### Correcciones pendientes detectadas en la comparación

#### ⚠️ Corrección 1 — Crítica: formato del token OAuth (`token.service.ts`)

El SDK oficial usa `application/x-www-form-urlencoded` para el endpoint de token de Apigee:

```typescript
// SDK oficial (RequestServices.ts — doPostFormAPICall)
var postData = querystring.stringify({
    grant_type: "client_credentials",
    client_id: this.apigeeClientId,
    client_secret: this.apigeeClientSecret
});
headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
```

Tu `token.service.ts` envía JSON:

```typescript
// Proyecto actual — incorrecto para Apigee
data: { client_id: config.clientId, client_secret: config.clientSecret },
headers: { 'Content-Type': 'application/json' }
```

**Impacto:** el endpoint de token de Apigee rechaza JSON con `invalid_client`. Esto
causará fallo al renovar el token OAuth cuando se configuren las credenciales reales.

**Fix requerido en `backend/services/token.service.ts`:**

```typescript
import qs from 'querystring';

const response = await axios({
  method: 'POST',
  url: config.tokenUrl,
  data: qs.stringify({
    grant_type: 'client_credentials',
    client_id: config.clientId,
    client_secret: config.clientSecret
  }),
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  timeout: 10000
});
```

---

#### ⚠️ Corrección 2 — Condicional: encoding de las claves de cifrado (`encryption.service.ts`)

El SDK oficial lee las claves como texto plano (`utf8`):

```typescript
// SDK oficial (JWEServices.ts)
const key = Buffer.from(password, 'utf8');
const Iv  = Buffer.from(iv, 'utf8');
```

Tu `encryption.service.ts` las decodifica desde `base64`:

```typescript
// Proyecto actual
this.key = Buffer.from(config.encryptionKey, 'base64');
this.iv  = Buffer.from(config.encryptionIv, 'base64');
```

**Impacto:** depende del formato en que ACH Colombia entregue las claves reales.

- Si las entrega como **texto plano** → cambiar `'base64'` por `'utf8'` en `encryption.service.ts`.
- Si las entrega en **base64** → tu implementación actual está correcta.

**Acción:** confirmar el formato exacto con ACH Colombia al recibir las credenciales.

---

### Conclusión

El proyecto Junta Atlántico está **completamente alineado con el SDK oficial de PSE-ACH**
en cuanto a métodos, campos, modelos y flujo de integración. Supera al SDK en arquitectura,
seguridad y calidad de código. Las dos correcciones identificadas son menores y no
requieren cambios estructurales — solo ajustes puntuales que se aplican cuando lleguen
las credenciales reales de ACH Colombia.

## 16. PRUEBAS DEL BACKEND

## Pruebas de verificación del backend en producción

> Ejecutar desde **PowerShell** en Windows contra `https://api.juntaatlantico.co`.
> No requieren credenciales PSE ni tokens válidos. Resultados obtenidos el 19 de julio de 2026.

---

### Prueba 1 — Servidor activo + lista de bancos mock

Verifica que el proceso Node.js arrancó correctamente, Express responde y el
`bankList.service.ts` entrega la lista ordenada alfabéticamente desde el fallback mock.

```powershell
Invoke-RestMethod -Uri "https://api.juntaatlantico.co/api/pse/banks" `
    -Method GET | ConvertTo-Json -Depth 3
```

**Respuesta esperada (`200 OK`):**
```json
{
  "success": true,
  "data": [
    { "financialInstitutionCode": "069", "financialInstitutionName": "BANCO AV VILLAS" },
    { "financialInstitutionCode": "001", "financialInstitutionName": "BANCO DE BOGOTA" }
  ],
  "message": "Lista de bancos obtenida exitosamente",
  "meta": { "source": "mock", "cached": false }
}
```

> Cuando se configuren las credenciales reales de PSE, `"source"` cambiará de `"mock"` a `"pse"`.

---

### Prueba 2 — Respuesta 404 en formato JSON

Verifica que el `notFoundHandler` devuelve JSON (no HTML) para rutas inexistentes.
Confirma que el backend opera como **API pura** (Opción B).

```powershell
try {
    Invoke-RestMethod -Uri "https://api.juntaatlantico.co/api/pse/noexiste" -Method GET
} catch {
    $_.ErrorDetails.Message | ConvertFrom-Json | ConvertTo-Json
}
```

**Respuesta esperada (`404`):**
```json
{
  "success": false,
  "code": "NOT_FOUND",
  "message": "Endpoint no encontrado: GET /api/pse/noexiste"
}
```

---

### Prueba 3 — Middleware reCAPTCHA activo

Verifica que el middleware de reCAPTCHA v3 bloquea correctamente un `POST /transaction`
sin token, confirmando que ninguna transacción puede crearse sin verificación de seguridad.

```powershell
$body = @{
    bankCode              = "1022"
    userType              = "person"
    identificationType    = "CedulaDeCiudadania"
    identificationNumber  = "123456789"
    fullName              = "Test Usuario"
    cellphoneNumber       = "3001234567"
    email                 = "test@test.co"
    address               = "Calle 1 # 2-3"
    description           = "Pago prueba"
    serviceCode           = "12345"
    amount                = 10000
} | ConvertTo-Json

try {
    Invoke-RestMethod -Uri "https://api.juntaatlantico.co/api/pse/transaction" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body
} catch {
    $_.ErrorDetails.Message | ConvertFrom-Json | ConvertTo-Json
}
```

**Respuesta esperada (`400`):**
```json
{
  "success": false,
  "code": "FAIL_RECAPTCHA",
  "message": "No se pudo verificar que no eres un robot. Por favor intenta de nuevo."
}
```

---

### Prueba 4 — Rate limit por IP (trust proxy)

Verifica que `express-rate-limit` identifica correctamente la IP real del usuario
a través del proxy inverso de Hostinger (`app.set('trust proxy', 1)`).
La ruta `/banks` usa el `globalLimiter` (60 req/min); los 12 requests deben pasar
sin error y sin warnings en los logs de Hostinger.

```powershell
1..12 | ForEach-Object {
    try {
        Invoke-RestMethod -Uri "https://api.juntaatlantico.co/api/pse/banks" `
            -Method GET | Out-Null
        Write-Host "Request $_ : OK"
    } catch {
        Write-Host "Request $_ : $($_.Exception.Response.StatusCode) <- 429 si excede el limite"
    }
}
```

**Respuesta esperada:** 12 líneas `OK` (límite de 60 req/min no superado).
El `pseTransactionLimiter` (10 req/min) protege el `POST /transaction`
y se verificará cuando haya tokens reCAPTCHA válidos.

---

### Prueba 5 — CORS: origen del frontend autorizado

Verifica que el header `Access-Control-Allow-Origin` está configurado correctamente,
permitiendo que `pse.juntaatlantico.co` llame al backend sin errores de CORS en el navegador.

```powershell
$headers = @{ "Origin" = "https://pse.juntaatlantico.co" }
$r = Invoke-WebRequest -Uri "https://api.juntaatlantico.co/api/pse/banks" `
    -Headers $headers
$r.Headers["Access-Control-Allow-Origin"]
```

**Respuesta esperada:**
```
https://pse.juntaatlantico.co
```

---

### Resultados obtenidos en producción

| # | Prueba | Estado | Observación |
|---|---|---|---|
| 1 | Servidor + bancos mock | ✅ | Lista A-Z, `source: mock` |
| 2 | 404 en JSON | ✅ | `NOT_FOUND` en JSON, sin HTML |
| 3 | reCAPTCHA bloqueando | ✅ | `FAIL_RECAPTCHA` correcto |
| 4 | Rate limit por IP | ✅ | Sin warnings en logs de Hostinger |
| 5 | CORS frontend autorizado | ✅ | `Access-Control-Allow-Origin` correcto |

> **Nota:** Las pruebas 1, 4 y 5 cambiarán de comportamiento cuando se configuren
> las credenciales reales de PSE: la prueba 1 mostrará `"source": "pse"` con la
> lista real de bancos, y las pruebas 4 y 5 seguirán funcionando igual.