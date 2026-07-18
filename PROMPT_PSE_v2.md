# 📦 PLAN DE IMPLEMENTACIÓN v2.0 — INTEGRACIÓN PSE AVANZA
## Ajustado a Instructivo ACH Colombia **Versión 21 (Octubre 2025)**

### JUNTA REGIONAL DE CALIFICACIÓN DE INVALIDEZ DEL ATLÁNTICO — Junta Atlántico S.A.S.

---

**Versión del prompt:** 2.0
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
9. [CÓDIGO FUENTE COMPLETO — BACKEND](#9-código-fuente-completo--backend)
10. [CÓDIGO FUENTE COMPLETO — FRONTEND](#10-código-fuente-completo--frontend)
11. [INSTRUCCIONES DE INSTALACIÓN](#11-instrucciones-de-instalación)
12. [GUÍA DE CERTIFICACIÓN](#12-guía-de-certificación)
13. [MANEJO DE ERRORES Y MENSAJES LITERALES ACH](#13-manejo-de-errores-y-mensajes-literales-ach)
14. [CHECKLIST DE IMPLEMENTACIÓN](#14-checklist-de-implementación)
15. [ANEXOS](#15-anexos)

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
| | vue-recaptcha-v3| 				| última estable|
| Backend 			| Node.js 		| 18+ 			|
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
  beneficiaryEntityName: 'JUNTA ATLANTICO S.A.S.',
  beneficiaryEntityCIIUCategory: '8692'           // CIIU verificado con ACH
}
```

> Si la terna `beneficiaryEntity*` no se envía o viene vacía, PSE **NO crea la transacción**.

### 7.4 Filtro de caracteres prohibidos

```js
// Regex prohibido
const FORBIDDEN_CHARS = /[|"]/;

// Aplica a: paymentDescription, referenceNumber1, referenceNumber2, referenceNumber3
```

---

## 8. ESTRUCTURA DEL PROYECTO

```
junta-atlantico-pse/
│
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── .env
│   ├── .env.cert
│   ├── .env.prod
│   ├── .gitignore
│   │
│   ├── config/
│   │   ├── pse.config.js
│   │   ├── constants.js                  # PSE_COMPANY_INFO, etc.
│   │   └── database.js                   # Conexión BD (opcional)
│   │
│   ├── services/
│   │   ├── encryption.service.js         # AES-256-GCM
│   │   ├── pse.service.js                # Cliente PSE completo
│   │   ├── token.service.js              # OAuth 2.0 con caché
│   │   ├── recaptcha.service.js          # NUEVO v2.0 — verify reCAPTCHA v3
│   │   ├── doublePayment.service.js      # NUEVO v2.0 — control doble pago
│   │   └── doublePaymentDetector.js      # NUEVO v2.0
│   │
│   ├── controllers/
│   │   └── pse.controller.js
│   │
│   ├── routes/
│   │   └── pse.routes.js
│   │
│   ├── middleware/
│   │   ├── cors.middleware.js
│   │   ├── rateLimit.middleware.js       # NUEVO v2.0
│   │   ├── recaptcha.middleware.js       # NUEVO v2.0
│   │   ├── validation.middleware.js
│   │   ├── error.middleware.js
│   │   └── securityHeaders.middleware.js # NUEVO v2.0
│   │
│   ├── models/
│   │   └── transaction.model.js
│   │
│   ├── utils/
│   │   ├── validators.js                 # userType, caracteres, fechas
│   │   ├── dates.js                      # NUEVO v2.0 — nowColombiaISO()
│   │   ├── errorMessages.js              # NUEVO v2.0 — mensajes literales ACH
│   │   ├── formatters.js
│   │   ├── paymentMode.js                # NUEVO v2.0 — mapeo modo de pago
│   │   ├── causalRejection.js            # NUEVO v2.0 — mapeo causales
│   │   └── helpers.js
│   │
│   ├── logs/
│   │   └── app.log
│   │
│   ├── tests/
│   │   ├── encryption.test.js
│   │   ├── pse.service.test.js
│   │   ├── validators.test.js
│   │   └── integration/
│   │       └── paymentFlow.test.js
│   │
│   └── ecosystem.config.js               # PM2
│
├── frontend/
│   ├── package.json
│   ├── index.html
│   ├── .env
│   ├── .env.production
│   ├── vite.config.js
│   │
│   ├── public/
│   │   ├── favicon.ico
│   │   ├── pse-logo.svg
│   │   ├── junta-atlantico-logo.svg
│   │   └── bank-logos/
│   │
│   └── src/
│       ├── main.js
│       ├── App.vue
│       │
│       ├── router/
│       │   └── index.js
│       │
│       ├── views/
│       │   ├── Checkout.vue
│       │   └── PaymentReturn.vue
│       │
│       ├── components/
│       │   ├── PaymentForm.vue           # Con reCAPTCHA v3
│       │   ├── BankList.vue
│       │   ├── PaymentSummary.vue
│       │   ├── PaymentResult.vue         # Con causal de rechazo
│       │   ├── LoadingSpinner.vue
│       │   ├── ErrorAlert.vue
│       │   ├── ReCaptchaBadge.vue        # NUEVO v2.0
│       │   └── RejectionReason.vue       # NUEVO v2.0
│       │
│       ├── services/
│       │   ├── api.service.js            # Con getTransactionDetailed
│       │   └── recaptcha.service.js      # NUEVO v2.0
│       │
│       ├── stores/
│       │   └── payment.store.js
│       │
│       ├── composables/
│       │   ├── usePayment.js
│       │   ├── useValidation.js
│       │   ├── useReCaptcha.js           # NUEVO v2.0
│       │   └── usePolling.js             # NUEVO v2.0
│       │
│       ├── assets/
│       │   ├── css/
│       │   │   └── main.css
│       │   └── images/
│       │
│       └── utils/
│           ├── formatters.js
│           ├── validators.js             # Caracteres prohibidos, userType
│           ├── errorMessages.js          # NUEVO v2.0 — mensajes literales
│           ├── paymentMode.js            # NUEVO v2.0
│           └── causalRejection.js        # NUEVO v2.0
│
└── docs/
    ├── INSTALACION.md
    ├── CERTIFICACION.md
    ├── API_REFERENCE.md
    └── CHANGELOG.md
```

---

## 9. CÓDIGO FUENTE COMPLETO — BACKEND

### 9.1 `package.json`

```json
{
  "name": "junta-atlantico-pse-backend",
  "version": "2.0.0",
  "description": "Backend para integración PSE Avanza v21",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "jest",
    "lint": "eslint .",
    "test:integration": "jest tests/integration"
  },
  "dependencies": {
    "axios": "^1.6.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "express-rate-limit": "^7.1.5",
    "helmet": "^7.1.0",
    "morgan": "^1.10.0",
    "winston": "^3.11.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.2",
    "jest": "^29.7.0",
    "eslint": "^8.55.0"
  }
}
```

### 9.2 `config/pse.config.js`

```js
/**
 * Configuración centralizada de PSE
 */
module.exports = {
  // Entorno
  env: process.env.PSE_ENV || 'cert',
  
  // Autenticación
  apiKey: process.env.PSE_API_KEY,
  clientId: process.env.PSE_CLIENT_ID,
  clientSecret: process.env.PSE_CLIENT_SECRET,
  
  // Cifrado
  encryptionKey: process.env.PSE_ENCRYPTION_KEY,
  encryptionIv: process.env.PSE_ENCRYPTION_IV,
  
  // Datos del comercio
  entityCode: process.env.PSE_ENTITY_CODE,
  serviceCode: process.env.PSE_SERVICE_CODE,
  ciiuCategory: process.env.PSE_CIIU_CATEGORY,
  companyName: process.env.PSE_COMPANY_NAME,
  
  // URLs
  tokenUrl: process.env.PSE_TOKEN_URL,
  apiBaseUrl: process.env.PSE_API_BASE_URL,
  returnUrl: process.env.PSE_RETURN_URL,
  
  // reCAPTCHA
  recaptcha: {
    secret: process.env.RECAPTCHA_SECRET,
    scoreMin: parseFloat(process.env.RECAPTCHA_SCORE_MIN || '0.5')
  },
  
  // Rate limit
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQ || '10', 10)
  },
  
  // Control de doble pago
  doublePaymentCheck: process.env.PSE_DOUBLE_PAYMENT_CHECK === 'true',
  
  // Polling
  polling: {
    intervalMs: parseInt(process.env.PSE_POLLING_INTERVAL_MS || '180000', 10),
    maxAttempts: parseInt(process.env.PSE_POLLING_MAX_ATTEMPTS || '10', 10)
  },
  
  // Token OAuth
  token: {
    refreshBufferMs: 5 * 60 * 1000  // Renovar 5 min antes del vencimiento
  }
};
```

### 9.3 `config/constants.js`

```js
/**
 * Constantes del proyecto Junta Atlántico
 */
module.exports = {
  // Información del comercio (rol: desarrollo independiente)
  COMPANY: {
    NIT: '901234567-8',
    NAME: 'JUNTA ATLANTICO S.A.S.',
    CIIU: '8692',
    ENTITY_CODE: '901234567-8'
  },
  
  // Tipos de identificación válidos
  VALID_ID_TYPES: [
    'RegistroCivilDeNacimiento',
    'TarjetaDeIdentidad',
    'CedulaDeCiudadania',
    'TarjetaDeExtranjeria',
    'CedulaDeExtranjeria',
    'Pasaporte',
    'DocumentoDeIdentificacionExtranjero',
    'NIT'
  ],
  
  // IDs válidos para beneficiario (solo en el contexto de Junta)
  VALID_BENEFICIARY_ID_TYPES: [
    'CedulaDeCiudadania',
    'CedulaDeExtranjeria',
    'Pasaporte',
    'DocumentoDeIdentificacionExtranjero',
    'NIT',
    'IdentificacionComercioExtranjero'
  ],
  
  // Tipos de persona
  USER_TYPES: ['person', 'company'],
  
  // Estados de transacción
  TRANSACTION_STATES: {
    OK: 'OK',
    NOT_AUTHORIZED: 'NOT_AUTHORIZED',
    PENDING: 'PENDING',
    FAILED: 'FAILED'
  },
  
  // Estados finales (no se reintenta)
  FINAL_STATES: ['OK', 'NOT_AUTHORIZED', 'FAILED'],
  
  // Caracteres prohibidos (Anexo 1.2 ACH)
  FORBIDDEN_CHARS_REGEX: /[|"]/,
  
  // reCAPTCHA actions
  RECAPTCHA_ACTIONS: {
    PAYMENT: 'pse_payment',
    BANK_LIST: 'pse_bank_list'
  }
};
```

### 9.4 `services/encryption.service.js`

```js
const crypto = require('crypto');
const config = require('../config/pse.config');
const logger = require('../utils/logger');

/**
 * Servicio de cifrado para PSE Avanza
 * Implementa AES-256-GCM (JWE)
 * Formato: IV (12 bytes) || ciphertext || Tag (16 bytes), todo en Base64
 */
class EncryptionService {
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

  /**
   * Cifra un mensaje usando AES-256-GCM
   * @param {Object|String} data - Datos a cifrar
   * @returns {String} Mensaje cifrado en Base64
   */
  encrypt(data) {
    try {
      const message = typeof data === 'string' ? data : JSON.stringify(data);
      const iv = crypto.randomBytes(this.ivLength);
      
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      let encrypted = cipher.update(message, 'utf8', 'binary');
      encrypted += cipher.final('binary');
      
      const tag = cipher.getAuthTag();
      
      // Formato: IV (12) || ciphertext || Tag (16)
      const result = Buffer.concat([
        iv,
        Buffer.from(encrypted, 'binary'),
        tag
      ]);
      
      return result.toString('base64');
    } catch (error) {
      logger.error('Error en encrypt:', error);
      throw new Error(`Encryption error: ${error.message}`);
    }
  }

  /**
   * Descifra un mensaje usando AES-256-GCM
   * @param {String} encryptedBase64 - Mensaje cifrado en Base64
   * @returns {Object} Datos descifrados
   */
  decrypt(encryptedBase64) {
    try {
      const data = Buffer.from(encryptedBase64, 'base64');
      
      const iv = data.subarray(0, this.ivLength);
      const encrypted = data.subarray(this.ivLength, -this.tagLength);
      const tag = data.subarray(-this.tagLength);
      
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted, 'binary', 'utf8');
      decrypted += decipher.final('utf8');
      
      try {
        return JSON.parse(decrypted);
      } catch {
        return decrypted;
      }
    } catch (error) {
      logger.error('Error en decrypt:', error);
      throw new Error(`Decryption error: ${error.message}`);
    }
  }
}

module.exports = new EncryptionService();
```

### 9.5 `services/token.service.js`

```js
const axios = require('axios');
const config = require('../config/pse.config');
const logger = require('../utils/logger');

/**
 * Servicio de token OAuth 2.0 con caché
 * Regla ACH: 1 token por hora, NO generar uno por petición
 * Renovar 5 min antes del vencimiento
 */
class TokenService {
  constructor() {
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  /**
   * Obtiene un token válido, renovándolo si es necesario
   */
  async getToken() {
    if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }
    return await this.refreshToken();
  }

  /**
   * Renueva el token
   */
  async refreshToken() {
    try {
      logger.info('🔄 Renovando token OAuth 2.0...');
      
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
        throw new Error('No se recibió access_token en la respuesta');
      }

      this.accessToken = response.data.access_token;
      // Renovar 5 min antes del vencimiento oficial
      const expiresIn = (response.data.expires_in || 3600) - 300;
      this.tokenExpiry = Date.now() + (expiresIn * 1000);

      logger.info(`✅ Token obtenido. Vence en ${expiresIn}s (${new Date(this.tokenExpiry).toISOString()})`);
      return this.accessToken;
    } catch (error) {
      logger.error('❌ Error renovando token:', error.response?.data || error.message);
      throw new Error(`OAuth Error: ${error.response?.data?.error_description || error.message}`);
    }
  }

  /**
   * Invalida el token actual (para tests o logout)
   */
  invalidate() {
    this.accessToken = null;
    this.tokenExpiry = null;
  }
}

module.exports = new TokenService();
```

### 9.6 `services/recaptcha.service.js` (NUEVO v2.0)

```js
const axios = require('axios');
const config = require('../config/pse.config');
const logger = require('../utils/logger');

/**
 * Servicio de verificación de Google reCAPTCHA v3
 * Sección 11 ACH — Controles perimetrales de seguridad
 */
class RecaptchaService {
  /**
   * Verifica el token de reCAPTCHA v3 con Google
   * @param {string} token - Token del frontend
   * @param {string} remoteIp - IP del cliente
   * @param {string} expectedAction - Acción esperada (ej: 'pse_payment')
   * @returns {Promise<{success: boolean, score: number, error?: string}>}
   */
  async verify(token, remoteIp, expectedAction = 'pse_payment') {
    // Bypass en desarrollo si no hay secret configurado
    if (!config.recaptcha.secret) {
      if (config.env === 'dev') {
        logger.warn('⚠️ RECAPTCHA_SECRET no configurado — bypass en dev');
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
        return { success: false, score: 0, error: 'Verificación reCAPTCHA falló' };
      }

      if (data.action !== expectedAction) {
        return { success: false, score: data.score, error: `Acción incorrecta: ${data.action}` };
      }

      if (data.score < config.recaptcha.scoreMin) {
        return { 
          success: false, 
          score: data.score, 
          error: `Score ${data.score} < mínimo ${config.recaptcha.scoreMin}` 
        };
      }

      return { success: true, score: data.score };
    } catch (error) {
      logger.error('❌ Error verificando reCAPTCHA:', error.message);
      // En caso de error de Google, fallar cerrado (no permitir)
      return { success: false, score: 0, error: 'Error al verificar reCAPTCHA' };
    }
  }
}

module.exports = new RecaptchaService();
```

### 9.7 `services/doublePayment.service.js` (NUEVO v2.0)

```js
const config = require('../config/pse.config');
const { TRANSACTION_STATES } = require('../config/constants');
const logger = require('../utils/logger');
const errorMessages = require('../utils/errorMessages');
const TransactionModel = require('../models/transaction.model');

/**
 * Servicio de control de doble pago (Anexo 1.3 ACH)
 * Verifica que no exista una transacción con el mismo ticketId
 * en estado PENDIENTE o APROBADO.
 */
class DoublePaymentService {
  /**
   * Verifica si el ticketId tiene una transacción pendiente o aprobada
   * @param {string|number} ticketId
   * @param {string} trazabilityCode - CUS de la transacción actual (opcional, para excluirla)
   * @returns {Promise<{exists: boolean, state?: string, trazabilityCode?: string}>}
   */
  async check(ticketId, trazabilityCode = null) {
    if (!config.doublePaymentCheck) {
      return { exists: false };
    }

    try {
      const existing = await TransactionModel.findByTicketId(ticketId, trazabilityCode);
      
      if (!existing) {
        return { exists: false };
      }

      // Estados finales → no se permite nuevo pago
      if (existing.transaction_state === TRANSACTION_STATES.OK) {
        return { 
          exists: true, 
          state: TRANSACTION_STATES.OK, 
          trazabilityCode: existing.trazability_code 
        };
      }

      // Estado PENDIENTE → no se permite nuevo pago hasta que se resuelva
      if (existing.transaction_state === TRANSACTION_STATES.PENDING) {
        return { 
          exists: true, 
          state: TRANSACTION_STATES.PENDING, 
          trazabilityCode: existing.trazability_code 
        };
      }

      return { exists: false };
    } catch (error) {
      logger.error('Error en control doble pago:', error);
      // Si falla la verificación, no bloquear (fail-open)
      return { exists: false };
    }
  }

  /**
   * Genera el mensaje de error de doble pago según estado
   */
  getErrorMessage(check, ticketId) {
    return errorMessages.getDoublePaymentMessage(check.state, ticketId, check.trazabilityCode);
  }
}

module.exports = new DoublePaymentService();
```

### 9.8 `services/pse.service.js`

```js
const axios = require('axios');
const config = require('../config/pse.config');
const { TRANSACTION_STATES, FORBIDDEN_CHARS_REGEX } = require('../config/constants');
const encryptionService = require('./encryption.service');
const tokenService = require('./token.service');
const datesUtil = require('../utils/dates');
const logger = require('../utils/logger');

/**
 * Servicio principal de integración con PSE Avanza v21
 */
class PSEService {
  constructor() {
    this.apiKey = config.apiKey;
    this.entityCode = config.entityCode;
    this.serviceCode = config.serviceCode;
    this.ciiuCategory = config.ciiuCategory;
    this.companyName = config.companyName;
    this.apiBaseUrl = config.apiBaseUrl;
    this.returnUrl = config.returnUrl;
  }

  /**
   * Realiza una petición a la API de PSE
   */
  async makeRequest(endpoint, data, maxRetries = 1) {
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const token = await tokenService.getToken();
        const encryptedData = encryptionService.encrypt(data);

        logger.info(`📤 [Attempt ${attempt}] Enviando request a ${endpoint}`);

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

        const decryptedResponse = encryptionService.decrypt(response.data);
        logger.info(`📥 Respuesta de ${endpoint}: ${decryptedResponse.returnCode || 'OK'}`);
        return decryptedResponse;

      } catch (error) {
        lastError = error;
        logger.error(`❌ [Attempt ${attempt}] Error en ${endpoint}:`, error.response?.data || error.message);
        
        if (error.response) {
          throw new Error(`PSE API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
        }
        // Si es error de red, reintentar
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
    }
    
    throw new Error(`Network Error: ${lastError?.message}`);
  }

  /**
   * Obtiene la lista de bancos
   */
  async getBankList() {
    const data = { entityCode: this.entityCode };
    return await this.makeRequest('GetBankListNF', data);
  }

  /**
   * Crea una nueva transacción en PSE
   */
  async createTransaction(paymentData) {
    const transactionData = this.buildTransactionData(paymentData);
    this.validateTransactionData(transactionData);
    return await this.makeRequest('CreateTransactionPaymentNF', transactionData);
  }

  /**
   * Construye el payload para CreateTransactionPaymentNF
   * Junta Atlántico = desarrollo independiente
   */
  buildTransactionData(paymentData) {
    return {
      // Datos de la empresa
      entityCode: this.entityCode,
      serviceCode: this.serviceCode || paymentData.serviceCode,
      
      // Datos del banco
      financialInstitutionCode: paymentData.bankCode,
      
      // Datos del pago
      transactionValue: Number(paymentData.amount),
      vatValue: Number(paymentData.vat || 0),
      ticketId: paymentData.ticketId,
      entityurl: this.returnUrl,
      userType: paymentData.userType,
      // NUEVO v2.0: soliciteDate con zona horaria Colombia
      soliciteDate: datesUtil.nowColombiaISO(),
      paymentDescription: paymentData.description || 'Pago en Junta Atlántico',
      
      // Referencias
      referenceNumber1: paymentData.reference1 || paymentData.identificationNumber || '',
      referenceNumber2: paymentData.reference2 || '',
      referenceNumber3: paymentData.reference3 || '',
      
      // Datos del pagador
      identificationType: paymentData.identificationType,
      identificationNumber: paymentData.identificationNumber,
      fullName: paymentData.fullName,
      cellphoneNumber: paymentData.cellphoneNumber,
      address: paymentData.address,
      email: paymentData.email,
      
      // Datos del beneficiario (rol: desarrollo independiente)
      // Los beneficiaryEntity* son los mismos del comercio
      beneficiaryEntityIdentificationType: 'NIT',
      beneficiaryEntityIdentification: this.entityCode.replace(/-/g, '').slice(0, 15),
      beneficiaryEntityName: this.companyName,
      beneficiaryEntityCIIUCategory: this.ciiuCategory,
      beneficiaryIdentificationType: paymentData.identificationType,
      beneficiaryIdentification: paymentData.identificationNumber,
      indicator4per1000: parseInt(paymentData.indicator4per1000) || 0
    };
  }

  /**
   * Consulta el estado de una transacción con reintento y backoff
   * para FAIL_INVALIDTRAZABILITYCODE
   */
  async getTransactionInformation(trazabilityCode, maxAttempts = 3) {
    const backoff = [5000, 10000, 20000];
    const data = {
      entityCode: this.entityCode,
      trazabilityCode
    };

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = await this.makeRequest('GetTransactionInformationNF', data);
      
      if (result.returnCode !== 'FAIL_INVALIDTRAZABILITYCODE') {
        return result;
      }
      
      if (attempt < maxAttempts - 1) {
        logger.warn(`⚠️ FAIL_INVALIDTRAZABILITYCODE en intento ${attempt + 1}, reintentando en ${backoff[attempt]/1000}s...`);
        await new Promise(r => setTimeout(r, backoff[attempt]));
      }
    }

    return { returnCode: 'FAIL_INVALIDTRAZABILITYCODE' };
  }

  /**
   * NUEVO v2.0: Consulta detallada de una transacción (opcional)
   * Devuelve causal de rechazo, descripción de estado, etc.
   */
  async getTransactionInformationDetailed(trazabilityCode) {
    const data = {
      entityCode: this.entityCode,
      trazabilityCode
    };
    return await this.makeRequest('GetTransactionInformationDetailed', data);
  }

  /**
   * Finaliza una transacción en PSE
   */
  async finalizeTransaction(trazabilityCode, authorizationId = null) {
    const data = {
      entityCode: this.entityCode,
      trazabilityCode,
      entityAuthorizationId: authorizationId || `AUTH_${Date.now()}`
    };
    return await this.makeRequest('FinalizeTransactionPaymentNF', data);
  }

  /**
   * Valida que los datos requeridos estén presentes y correctos
   */
  validateTransactionData(data) {
    const required = [
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

    // Validar caracteres prohibidos
    const fieldsToCheck = ['paymentDescription', 'referenceNumber1', 'referenceNumber2', 'referenceNumber3'];
    for (const field of fieldsToCheck) {
      if (typeof data[field] === 'string' && FORBIDDEN_CHARS_REGEX.test(data[field])) {
        throw new Error(`El campo "${field}" contiene caracteres prohibidos (| o "). No se permite.`);
      }
    }

    // Validar longitud serviceCode
    if (String(data.serviceCode).length > 10) {
      throw new Error(`serviceCode no puede tener más de 10 caracteres (tiene ${String(data.serviceCode).length})`);
    }
  }
}

module.exports = new PSEService();
```

### 9.9 `utils/dates.js` (NUEVO v2.0)

```js
/**
 * Utilidades de fechas con zona horaria de Colombia
 * Requisito v21: soliciteDate debe usar zona horaria oficial de Colombia
 */
const COLOMBIA_OFFSET_HOURS = -5; // UTC-5 (no hay horario de verano en Colombia)

/**
 * Retorna la fecha/hora actual en formato ISO 8601 con offset -05:00 (Colombia)
 * @returns {string} Ej: "2026-07-17T15:30:45.123-05:00"
 */
function nowColombiaISO() {
  const now = new Date();
  // Construir la fecha en zona horaria Colombia
  const utcMs = now.getTime() + (now.getTimezoneOffset() * 60 * 1000);
  const colombiaMs = utcMs + (COLOMBIA_OFFSET_HOURS * 60 * 60 * 1000);
  const colombia = new Date(colombiaMs);
  
  // Formato ISO 8601 con offset
  const pad = (n, w = 2) => String(n).padStart(w, '0');
  const yyyy = colombia.getUTCFullYear();
  const mm = pad(colombia.getUTCMonth() + 1);
  const dd = pad(colombia.getUTCDate());
  const hh = pad(colombia.getUTCHours());
  const mi = pad(colombia.getUTCMinutes());
  const ss = pad(colombia.getUTCSeconds());
  const ms = pad(colombia.getUTCMilliseconds(), 3);
  
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}.${ms}-05:00`;
}

module.exports = { nowColombiaISO, COLOMBIA_OFFSET_HOURS };
```

### 9.10 `utils/errorMessages.js` (NUEVO v2.0)

```js
/**
 * Mensajes LITERALES exigidos por ACH Colombia (Anexo 1.2)
 * Estos textos son INMODIFICABLES.
 */
const { TRANSACTION_STATES } = require('../config/constants');

module.exports = {
  // Mensajes por código de error de PSE
  PSE_ERROR_MESSAGES: {
    SUCCESS: 'Transacción procesada correctamente.',
    FAIL_ENTITYNOTEXISTSORDISABLED: 'No se pudo crear la transacción, por favor intente más tarde o comuníquese con la empresa',
    FAIL_BANKNOTEXISTSORDISABLED: 'El banco seleccionado no está disponible. Por favor seleccione otro.',
    FAIL_SERVICENOTEXISTSORNOTCONFIGURED: 'No se pudo crear la transacción, por favor intente más tarde o comuníquese con la empresa',
    FAIL_INVALIDAMOUNTORVATAMOUNT: 'El monto ingresado no es válido. Por favor verifique el valor.',
    FAIL_INVALIDSOLICITDATE: 'La fecha de solicitud no es válida. Por favor recargue la página.',
    FAIL_CANNOTGETCURRENTCYCLE: 'No se pudo crear la transacción, por favor intente más tarde o comuníquese con la empresa',
    FAIL_ACCESSDENIED: 'Acceso denegado. Por favor contacte a la empresa.',
    // LITERAL — Anexo 1.2 ACH
    FAIL_EXCEEDEDLIMIT: 'El monto de la transacción excede los límites establecidos en PSE para la empresa, por favor comuníquese con nuestras líneas de atención al cliente al teléfono (605) 333-XXXX o al correo electrónico facturacion@juntaatlantico.co',
    FAIL_TRANSACTIONNOTALLOWED: 'La transacción no está permitida en este momento. Por favor intente más tarde.',
    FAIL_INVALIDPARAMETERS: 'No se pudo crear la transacción, por favor intente más tarde o comuníquese con la empresa',
    FAIL_GENERICERROR: 'No se pudo crear la transacción, por favor intente más tarde o comuníquese con la empresa',
    // NUEVO v18
    FAIL_DISABLEDUSEREMAIL: 'El correo electrónico ingresado presenta restricciones. Por favor verifique o use otro correo de contacto.',
    // NUEVO v18 (multicrédito)
    FAIL_ERRORINCREDITS: 'Ocurrió un error al procesar los créditos. Por favor intente más tarde.',
    // v19 aclarado
    FAIL_INVALIDTRAZABILITYCODE: 'La transacción aún se está procesando. Por favor espere unos minutos.',
    // LITERAL — Anexo 1.2 ACH
    FAIL_BANKUNREACHEABLE: 'La entidad financiera no puede ser contactada para iniciar la transacción, por favor seleccione otra o intente más tarde',
    FAIL_TIMEOUT: 'El tiempo de espera ha expirado. Por favor intente más tarde.',
    FAIL_NOTCONFIRMEDBYBANK: 'No se pudo crear la transacción, por favor intente más tarde o comuníquese con la empresa',
    FAIL_INVALIDSTATE: 'La transacción no puede ser procesada en este momento. Por favor intente más tarde.',
    FAIL_INCONSISTENTFECHA: 'No se pudo crear la transacción, por favor intente más tarde o comuníquese con la empresa',
    FAIL_INVALIDBANKPROCESSINGDATE: 'No se pudo crear la transacción, por favor intente más tarde o comuníquese con la empresa',
    FAIL_INVALIDAUTHORIZEDAMOUNT: 'El valor devuelto por la Entidad Financiera es diferente al valor enviado. Por favor intente más tarde.'
  },

  // Errores de validación (custom)
  VALIDATION_ERRORS: {
    FAIL_RECAPTCHA: 'No se pudo verificar que no eres un robot. Por favor intenta de nuevo.',
    FAIL_RATE_LIMIT: 'Demasiadas solicitudes. Por favor intente en un minuto.',
    FAIL_INVALID_USER_TYPE: 'Si el tipo de persona es "person", el tipo de identificación no puede ser NIT. Si es "company", el único tipo válido es NIT.',
    FAIL_FORBIDDEN_CHARS: (field) => `El campo "${field}" no puede contener los caracteres "|" ni '"'. Estos caracteres generan conflicto con el motor de fraude Monitor Plus.`,
    FAIL_DOUBLEPAYMENT: (state, ticketId, cus) => {
      if (state === TRANSACTION_STATES.OK) {
        return `En este momento su #${ticketId} ha finalizado su proceso de pago y cuya transacción se encuentra APROBADA en su entidad financiera. Si desea más información sobre el estado de su operación puede comunicarse a nuestras líneas de atención al cliente 57-1-9999999 o enviar un correo electrónico a facturacion@juntaatlantico.co y preguntar por el estado de la transacción: ${cus}`;
      }
      if (state === TRANSACTION_STATES.PENDING) {
        return `En este momento su #${ticketId} presenta un proceso de pago cuya transacción se encuentra PENDIENTE de recibir confirmación por parte de su entidad financiera, por favor espere unos minutos y vuelva a consultar más tarde para verificar si su pago fue confirmado de forma exitosa. Si desea más información sobre el estado actual de su operación puede comunicarse a nuestras líneas de atención al cliente 57-1-9999999 o enviar un correo electrónico a facturacion@juntaatlantico.co y preguntar por el estado de la transacción: ${cus}`;
      }
      return 'Transacción duplicada detectada. Por favor verifique el estado de su pago.';
    }
  },

  /**
   * Retorna el mensaje literal para un código de error PSE
   */
  getPSEErrorMessage(code) {
    return this.PSE_ERROR_MESSAGES[code] || this.PSE_ERROR_MESSAGES.FAIL_GENERICERROR;
  },

  /**
   * Retorna el mensaje de doble pago
   */
  getDoublePaymentMessage(state, ticketId, cus) {
    return this.VALIDATION_ERRORS.FAIL_DOUBLEPAYMENT(state, ticketId, cus);
  }
};
```

### 9.11 `utils/paymentMode.js` (NUEVO v2.0)

```js
/**
 * Mapeo de paymentMode (response PSE v21) a etiqueta legible
 * Sección 9.2.3 — Descripción de Nuevos Métodos
 */
const PAYMENT_MODE_LABELS = {
  15: 'Débito en cuenta',
  50: 'Tarjeta de Crédito Visa',
  51: 'Tarjeta de Crédito MasterCard',
  52: 'Tarjeta de Crédito Diners Club',
  53: 'Tarjeta de Crédito Propia de la Entidad Financiera',
  54: 'Crédito Rotativo',
  55: 'Tarjeta de Crédito American Express',
  56: 'Tarjeta de Crédito Propia del Comercio'
};

const PAYMENT_ORIGIN_LABELS = {
  3: 'Débito',
  4: 'Crédito'
};

module.exports = {
  PAYMENT_MODE_LABELS,
  PAYMENT_ORIGIN_LABELS,
  getPaymentModeLabel: (code) => PAYMENT_MODE_LABELS[code] || `Modo ${code}`,
  getPaymentOriginLabel: (code) => PAYMENT_ORIGIN_LABELS[code] || `Origen ${code}`
};
```

### 9.12 `utils/causalRejection.js` (NUEVO v2.0)

```js
/**
 * Mapeo de causales de rechazo PSE (numeral 9.3 v21) a mensajes legibles.
 * Causales 15 y 26 tienen descripciones ampliadas en v19.
 */
const CAUSAL_REJECTION = {
  // ====== ENTIDAD FINANCIERA → PSE ======
  '00001': 'El usuario abandonó la transacción en el banco',
  '00002': 'Cuenta embargada',
  '00003': 'Cuenta inactiva',
  '00004': 'La cuenta no existe',
  '00005': 'La cuenta no está habilitada',
  '00006': 'La cuenta no ha sido habilitada para pagos',
  '00007': 'La cuenta está saldada',
  '00008': 'El usuario excede el límite transaccional autorizado por el banco',
  '00009': 'El banco no se encuentra disponible',
  '00010': 'Fallas técnicas en la Entidad Financiera',
  '00011': 'Fondos insuficientes',
  '00012': 'Inconsistencia en los datos de la transacción',
  '00013': 'La cuenta está cancelada',
  // AMPLIADO en v19
  '00015': 'La transacción no fue concluida en el banco. La entidad debe contar con un control de sesión (máximo 7 minutos) para no superar el tiempo de la sonda de PSE.',
  '00016': 'Datos de acceso inválidos en el portal de la Entidad Financiera',
  '00017': 'El usuario no tiene habilitado el servicio de PSE en su Entidad Financiera',
  '00024': 'Transacción rechazada por sospecha de fraude en la Entidad Financiera',

  // ====== PSE → USUARIO ======
  '00014': 'Cancelación de PSE: el banco no confirmó el estado de la transacción (3 intentos en 21 minutos)',
  '00018': 'Cambio de estado en la transacción (de aprobada a rechazada) realizado por la Entidad Financiera',
  '00019': 'Transacción declinada por el pre-autorizador (sospecha de fraude, Monitor Plus)',
  '00020': 'El usuario abandonó la transacción en PSE al regresar al comercio',
  '00021': 'El usuario abandonó la transacción en PSE al cerrar el navegador',
  '00022': 'El navegador utilizado no es compatible con PSE (versiones: Chrome 84+, Edge 18.18363+, Firefox 79+, Opera 69+, Safari 13.1+)',
  '00023': 'El usuario no presentó actividad en PSE (TIMEOUT)',
  '00025': 'Cancelada por PSE: Credibanco no confirmó la transacción',
  // AMPLIADO en v19 — v21
  '00026': 'OTP NO INFORMADO. El usuario no ingresó el código OTP después de agotar los reenvíos configurados por la entidad y finalizado el tiempo configurado en el último intento en PSE Avanza.',
  '00027': 'OTP INVÁLIDA. El usuario ingresó un OTP que no es válido o no cumple los requisitos.',

  // ====== FALLOS GENERALES ======
  '10001': 'La transacción excede el límite asignado a la empresa en PSE',
  '10002': 'No se puede conectar a la Entidad Financiera',
  '10003': 'La Entidad Financiera no aceptó iniciar la transacción'
};

module.exports = {
  CAUSAL_REJECTION,
  getCausalMessage: (code) => CAUSAL_REJECTION[code] || `Causal ${code}`
};
```

### 9.13 `utils/validators.js`

```js
const { USER_TYPES, VALID_ID_TYPES, FORBIDDEN_CHARS_REGEX } = require('../config/constants');

/**
 * Validador de datos de pago
 */
class PaymentValidator {
  /**
   * Validación cruzada userType vs identificationType (NUEVO v2.0)
   */
  static validateUserTypeCombination(userType, identificationType) {
    if (!USER_TYPES.includes(userType)) {
      throw new Error(`Tipo de persona inválido. Debe ser "person" o "company"`);
    }
    if (!VALID_ID_TYPES.includes(identificationType)) {
      throw new Error(`Tipo de identificación inválido: ${identificationType}`);
    }
    
    if (userType === 'person' && identificationType === 'NIT') {
      throw new Error('Si el tipo de persona es "person", el tipo de identificación no puede ser NIT');
    }
    
    if (userType === 'company' && identificationType !== 'NIT') {
      throw new Error('Si el tipo de persona es "company", el único tipo de identificación válido es NIT');
    }
  }

  /**
   * Filtro de caracteres prohibidos (NUEVO v2.0)
   */
  static validateNoForbiddenChars(field, value) {
    if (typeof value === 'string' && FORBIDDEN_CHARS_REGEX.test(value)) {
      throw new Error(`El campo "${field}" no puede contener los caracteres "|" ni '"'`);
    }
  }

  /**
   * Validación completa de paymentData
   */
  static validatePaymentData(data) {
    const required = [
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

    // 1. Validación cruzada userType vs identificationType
    this.validateUserTypeCombination(data.userType, data.identificationType);

    // 2. Caracteres prohibidos
    ['description', 'reference1', 'reference2', 'reference3'].forEach(field => {
      if (data[field]) this.validateNoForbiddenChars(field, data[field]);
    });

    // 3. Monto
    if (data.amount <= 0) {
      throw new Error('El monto debe ser mayor a 0');
    }

    // 4. Celular
    if (!/^\d{10}$/.test(String(data.cellphoneNumber).replace(/\D/g, ''))) {
      throw new Error('El número de celular debe tener 10 dígitos');
    }

    // 5. Email
    if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      throw new Error('Email inválido');
    }

    // 6. Description longitud
    if (data.description && data.description.length > 80) {
      throw new Error('La descripción no puede tener más de 80 caracteres');
    }
  }
}

module.exports = PaymentValidator;
```

### 9.14 `middleware/rateLimit.middleware.js` (NUEVO v2.0)

```js
const rateLimit = require('express-rate-limit');
const config = require('../config/pse.config');

/**
 * Rate limit específico para creación de transacciones (Sección 11 ACH)
 * Por defecto: 10 req/min por IP
 */
exports.pseTransactionLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'FAIL_RATE_LIMIT',
    message: 'Demasiadas solicitudes. Por favor intente en un minuto.'
  },
  keyGenerator: (req) => req.ip
});

/**
 * Rate limit global más permisivo para health checks y bancos
 */
exports.globalLimiter = rateLimit({
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

### 9.15 `middleware/recaptcha.middleware.js` (NUEVO v2.0)

```js
const recaptchaService = require('../services/recaptcha.service');
const { RECAPTCHA_ACTIONS } = require('../config/constants');
const errorMessages = require('../utils/errorMessages');

/**
 * Middleware de verificación de reCAPTCHA v3
 * Sección 11 ACH — Controles perimetrales de seguridad
 */
exports.verifyRecaptcha = (action = RECAPTCHA_ACTIONS.PAYMENT) => {
  return async (req, res, next) => {
    try {
      const token = req.body.recaptchaToken || req.headers['x-recaptcha-token'];
      
      const result = await recaptchaService.verify(token, req.ip, action);
      
      if (!result.success) {
        return res.status(400).json({
          success: false,
          code: 'FAIL_RECAPTCHA',
          message: errorMessages.VALIDATION_ERRORS.FAIL_RECAPTCHA
        });
      }
      
      // Adjuntar score al request para logs
      req.recaptchaScore = result.score;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        code: 'FAIL_RECAPTCHA',
        message: errorMessages.VALIDATION_ERRORS.FAIL_RECAPTCHA
      });
    }
  };
};
```

### 9.16 `controllers/pse.controller.js`

```js
const pseService = require('../services/pse.service');
const config = require('../config/pse.config');
const { TRANSACTION_STATES, FINAL_STATES } = require('../config/constants');
const doublePaymentService = require('../services/doublePayment.service');
const PaymentValidator = require('../utils/validators');
const errorMessages = require('../utils/errorMessages');
const logger = require('../utils/logger');

/**
 * Controlador de endpoints de PSE
 */
class PSEController {
  /**
   * GET /api/pse/banks
   */
  async getBankList(req, res) {
    try {
      const banks = await pseService.getBankList();
      res.json({
        success: true,
        data: banks,
        message: 'Lista de bancos obtenida exitosamente'
      });
    } catch (error) {
      logger.error('❌ Error en getBankList:', error.message);
      res.status(500).json({
        success: false,
        message: error.message || 'Error al obtener lista de bancos'
      });
    }
  }

  /**
   * POST /api/pse/transaction
   * Validaciones en orden: reCAPTCHA → rate limit (middleware) → 
   *   validación userType → caracteres prohibidos → doble pago → PSE
   */
  async createTransaction(req, res) {
    try {
      const paymentData = req.body;
      
      // Limpiar recaptchaToken antes de enviar a PSE
      delete paymentData.recaptchaToken;
      
      // 1. Validación de datos del formulario
      PaymentValidator.validatePaymentData(paymentData);
      
      // 2. Generar ticketId si no se proporcionó
      if (!paymentData.ticketId) {
        paymentData.ticketId = Date.now() + Math.floor(Math.random() * 1000);
      }
      
      // 3. Control de doble pago (Anexo 1.3 ACH)
      const doublePaymentCheck = await doublePaymentService.check(
        paymentData.ticketId
      );
      
      if (doublePaymentCheck.exists) {
        const message = doublePaymentService.getErrorMessage(
          doublePaymentCheck, 
          paymentData.ticketId
        );
        return res.status(409).json({
          success: false,
          code: 'FAIL_DOUBLEPAYMENT',
          message
        });
      }
      
      // 4. Crear transacción en PSE
      const result = await pseService.createTransaction(paymentData);
      
      if (result.returnCode === 'SUCCESS') {
        logger.info(`✅ Transacción creada: CUS=${result.trazabilityCode}, score=${req.recaptchaScore}`);
        return res.json({
          success: true,
          data: {
            trazabilityCode: result.trazabilityCode,
            pseURL: result.pseURL,
            ticketId: paymentData.ticketId,
            transactionCycle: result.transactionCycle
          },
          message: 'Transacción creada exitosamente'
        });
      }
      
      // 5. Error de PSE — retornar mensaje LITERAL
      return res.status(400).json({
        success: false,
        code: result.returnCode,
        message: errorMessages.getPSEErrorMessage(result.returnCode),
        details: result.errorDetails || null
      });
      
    } catch (error) {
      logger.error('❌ Error en createTransaction:', error.message);
      
      // Si es un error de validación conocido
      if (error.message.includes('persona') || 
          error.message.includes('NIT') ||
          error.message.includes('caracteres prohibidos')) {
        return res.status(400).json({
          success: false,
          code: 'FAIL_VALIDATION',
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: error.message || 'Error al crear la transacción'
      });
    }
  }

  /**
   * GET /api/pse/transaction/:cus/status
   * Con reintento y backoff para FAIL_INVALIDTRAZABILITYCODE
   */
  async getTransactionStatus(req, res) {
    try {
      const { trazabilityCode } = req.params;

      if (!trazabilityCode) {
        return res.status(400).json({
          success: false,
          message: 'Código de trazabilidad (CUS) requerido'
        });
      }

      const result = await pseService.getTransactionInformation(trazabilityCode);

      // Si la transacción tiene estado final, finalizarla automáticamente
      if (FINAL_STATES.includes(result.transactionState)) {
        try {
          if (result.transactionState === TRANSACTION_STATES.OK) {
            await pseService.finalizeTransaction(trazabilityCode, result.authorizationID);
          }
        } catch (finalizeError) {
          logger.warn('⚠️ Error al finalizar transacción:', finalizeError.message);
        }
      }

      res.json({
        success: true,
        data: result,
        message: 'Estado de transacción consultado exitosamente'
      });
    } catch (error) {
      logger.error('❌ Error en getTransactionStatus:', error.message);
      res.status(500).json({
        success: false,
        message: error.message || 'Error al consultar el estado de la transacción'
      });
    }
  }

  /**
   * GET /api/pse/transaction/:cus/detailed
   * NUEVO v2.0 — Información detallada con causal de rechazo
   */
  async getTransactionDetailed(req, res) {
    try {
      const { trazabilityCode } = req.params;

      if (!trazabilityCode) {
        return res.status(400).json({
          success: false,
          message: 'Código de trazabilidad (CUS) requerido'
        });
      }

      const result = await pseService.getTransactionInformationDetailed(trazabilityCode);

      res.json({
        success: true,
        data: result,
        message: 'Información detallada obtenida exitosamente'
      });
    } catch (error) {
      logger.error('❌ Error en getTransactionDetailed:', error.message);
      res.status(500).json({
        success: false,
        message: error.message || 'Error al obtener información detallada'
      });
    }
  }

  /**
   * POST /api/pse/transaction/finalize
   */
  async finalizeTransaction(req, res) {
    try {
      const { trazabilityCode, authorizationId } = req.body;

      if (!trazabilityCode) {
        return res.status(400).json({
          success: false,
          message: 'Código de trazabilidad (CUS) requerido'
        });
      }

      const result = await pseService.finalizeTransaction(trazabilityCode, authorizationId);

      res.json({
        success: true,
        data: result,
        message: 'Transacción finalizada exitosamente'
      });
    } catch (error) {
      logger.error('❌ Error en finalizeTransaction:', error.message);
      res.status(500).json({
        success: false,
        message: error.message || 'Error al finalizar la transacción'
      });
    }
  }
}

module.exports = new PSEController();
```

### 9.17 `routes/pse.routes.js`

```js
const express = require('express');
const router = express.Router();
const pseController = require('../controllers/pse.controller');
const { verifyRecaptcha } = require('../middleware/recaptcha.middleware');
const { pseTransactionLimiter } = require('../middleware/rateLimit.middleware');
const { RECAPTCHA_ACTIONS } = require('../config/constants');

// Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// Lista de bancos (sin reCAPTCHA, rate limit más permisivo)
router.get('/banks', pseController.getBankList);

// Crear transacción (con reCAPTCHA v3 + rate limit estricto)
router.post('/transaction',
  pseTransactionLimiter,
  verifyRecaptcha(RECAPTCHA_ACTIONS.PAYMENT),
  pseController.createTransaction
);

// Estado de transacción
router.get('/transaction/:trazabilityCode/status', pseController.getTransactionStatus);

// Información detallada (NUEVO v2.0)
router.get('/transaction/:trazabilityCode/detailed', pseController.getTransactionDetailed);

// Finalizar transacción
router.post('/transaction/finalize', pseController.finalizeTransaction);

module.exports = router;
```

### 9.18 `models/transaction.model.js` (NUEVO v2.0)

```js
const crypto = require('crypto');
const config = require('../config/pse.config');
const logger = require('../utils/logger');

/**
 * Modelo de Transacción con cifrado en reposo
 * Implementación de referencia — adaptar a la BD real del proyecto
 * (PostgreSQL, MySQL, MongoDB, etc.)
 */
class TransactionModel {
  constructor() {
    // Clave separada para cifrado en reposo (no compartir con PSE)
    this.restKey = Buffer.from(
      process.env.DB_ENCRYPTION_KEY || config.encryptionKey, 
      'base64'
    );
    this.algorithm = 'aes-256-gcm';
  }

  /**
   * Cifra un valor para almacenar en BD
   */
  encrypt(value) {
    if (value === null || value === undefined) return null;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(this.algorithm, this.restKey, iv);
    let encrypted = cipher.update(String(value), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  }

  /**
   * Descifra un valor almacenado en BD
   */
  decrypt(encryptedValue) {
    if (!encryptedValue) return null;
    try {
      const [ivHex, tagHex, encrypted] = encryptedValue.split(':');
      const iv = Buffer.from(ivHex, 'hex');
      const tag = Buffer.from(tagHex, 'hex');
      const decipher = crypto.createDecipheriv(this.algorithm, this.restKey, iv);
      decipher.setAuthTag(tag);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      logger.error('Error descifrando:', error);
      return null;
    }
  }

  /**
   * Busca una transacción por ticketId
   */
  async findByTicketId(ticketId, excludeCus = null) {
    // IMPLEMENTAR SEGÚN TU BD
    // Ejemplo PostgreSQL:
    // const result = await db.query(
    //   'SELECT * FROM transactions WHERE ticket_id_encrypted = $1 AND trazability_code != $2 ORDER BY created_at DESC LIMIT 1',
    //   [this.encrypt(ticketId), excludeCus]
    // );
    // return result.rows[0] || null;
    
    // MOCK para desarrollo:
    return null;
  }

  /**
   * Guarda una transacción nueva
   */
  async create(data) {
    // IMPLEMENTAR SEGÚN TU BD
    // const record = {
    //   ticket_id_encrypted: this.encrypt(data.ticketId),
    //   trazability_code: data.trazabilityCode,
    //   transaction_state: data.transactionState || 'PENDING',
    //   amount: data.amount,
    //   user_email_encrypted: this.encrypt(data.email),
    //   identification_number_encrypted: this.encrypt(data.identificationNumber),
    //   full_name_encrypted: this.encrypt(data.fullName),
    //   payment_mode: data.paymentMode,
    //   payment_origin: data.paymentOrigin,
    //   service_nit: data.serviceNIT,
    //   service_name: data.serviceName,
    //   cause_rejection: data.causeRejection,
    //   state_description: data.stateDescription,
    //   rejection_description: data.rejectionDescription,
    //   recaptcha_score: data.recaptchaScore,
    //   created_at: new Date(),
    //   updated_at: new Date()
    // };
    // return await db.query('INSERT INTO transactions ...', record);
    
    return { id: 'mock-id', ...data };
  }

  /**
   * Actualiza el estado de una transacción
   */
  async updateState(trazabilityCode, updates) {
    // IMPLEMENTAR SEGÚN TU BD
    return { trazabilityCode, ...updates };
  }
}

module.exports = new TransactionModel();
```

### 9.19 `server.js`

```js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const config = require('./config/pse.config');
const pseRoutes = require('./routes/pse.routes');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARES DE SEGURIDAD (Sección 11 ACH)
// ============================================
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
  origin: config.env === 'dev' 
    ? ['http://localhost:5173', 'http://localhost:3000'] 
    : ['https://www.juntaatlantico.co', 'https://juntaatlantico.co'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Recaptcha-Token']
}));

// Logging
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rutas
app.use('/api/pse', pseRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Endpoint no encontrado' });
});

// Error global
app.use((err, req, res, next) => {
  logger.error('❌ Error no manejado:', err.stack);
  res.status(500).json({ success: false, message: 'Error interno del servidor' });
});

app.listen(PORT, () => {
  logger.info(`🚀 Servidor PSE ejecutándose en puerto ${PORT}`);
  logger.info(`📋 Entorno: ${config.env}`);
  logger.info(`🔐 reCAPTCHA: ${config.recaptcha.secret ? 'activo' : 'INACTIVO'}`);
});
```

### 9.20 `utils/logger.js`

```js
const winston = require('winston');

const logger = winston.createLogger({
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
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/app.log',
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

module.exports = logger;
```

---

## 10. CÓDIGO FUENTE COMPLETO — FRONTEND

### 10.1 `package.json`

```json
{
  "name": "junta-atlantico-pse-frontend",
  "version": "2.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "lint": "eslint ."
  },
  "dependencies": {
    "axios": "^1.6.2",
    "pinia": "^2.1.7",
    "vue": "^3.4.0",
    "vue-recaptcha-v3": "^2.0.1",
    "vue-router": "^4.2.5"
  },
  "devDependencies": {
    "@vitejs/plugin-vue": "^5.0.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "tailwindcss": "^3.4.0",
    "vite": "^5.0.0"
  }
}
```

### 10.2 `src/services/recaptcha.service.js` (NUEVO v2.0)

```js
import { ReCaptchaInstance } from 'vue-recaptcha-v3';

/**
 * Servicio wrapper para reCAPTCHA v3
 * Sección 11 ACH — Controles perimetrales
 */
export default {
  /**
   * Inicializa reCAPTCHA con el site key de .env
   */
  init() {
    const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    if (!siteKey) {
      console.warn('⚠️ VITE_RECAPTCHA_SITE_KEY no configurado');
      return;
    }
    ReCaptchaInstance.init(siteKey);
  },

  /**
   * Ejecuta reCAPTCHA v3 con una acción específica
   * @param {string} action - 'pse_payment' | 'pse_bank_list'
   * @returns {Promise<string>} Token de reCAPTCHA
   */
  async execute(action = 'pse_payment') {
    try {
      return await ReCaptchaInstance.executeRecaptcha(action);
    } catch (error) {
      console.error('Error ejecutando reCAPTCHA:', error);
      throw new Error('No se pudo generar el token de reCAPTCHA');
    }
  }
};
```

### 10.3 `src/composables/useReCaptcha.js` (NUEVO v2.0)

```js
import { ref } from 'vue';
import recaptchaService from '../services/recaptcha.service';

/**
 * Composable para usar reCAPTCHA v3 en componentes Vue
 */
export function useReCaptcha() {
  const initialized = ref(false);
  const loading = ref(false);

  async function init() {
    if (initialized.value) return;
    loading.value = true;
    try {
      recaptchaService.init();
      initialized.value = true;
    } finally {
      loading.value = false;
    }
  }

  async function execute(action = 'pse_payment') {
    if (!initialized.value) await init();
    return await recaptchaService.execute(action);
  }

  return { init, execute, initialized, loading };
}
```

### 10.4 `src/composables/usePolling.js` (NUEVO v2.0)

```js
import { ref } from 'vue';

/**
 * Composable para polling de estado de transacción
 * Estandar ACH: 3 minutos entre reintentos
 */
export function usePolling() {
  const isPolling = ref(false);
  const attempts = ref(0);
  
  const INTERVAL_MS = parseInt(import.meta.env.VITE_POLLING_INTERVAL_MS || '180000', 10);
  const MAX_ATTEMPTS = parseInt(import.meta.env.VITE_MAX_POLLING_ATTEMPTS || '10', 10);

  /**
   * Ejecuta polling hasta que el callback retorne un estado final
   * @param {Function} checkFn - async () => { transactionState: string }
   * @param {Function} onResult - callback con cada resultado
   * @param {Function} onError - callback de error
   */
  async function start(checkFn, onResult, onError) {
    if (isPolling.value) return;
    isPolling.value = true;
    attempts.value = 0;

    while (isPolling.value && attempts.value < MAX_ATTEMPTS) {
      try {
        attempts.value++;
        const result = await checkFn();
        onResult(result);

        if (['OK', 'NOT_AUTHORIZED', 'FAILED'].includes(result.transactionState)) {
          isPolling.value = false;
          return result;
        }
      } catch (error) {
        onError?.(error);
      }

      if (isPolling.value && attempts.value < MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, INTERVAL_MS));
      }
    }

    isPolling.value = false;
    return { transactionState: 'TIMEOUT' };
  }

  function stop() {
    isPolling.value = false;
  }

  return { isPolling, attempts, start, stop };
}
```

### 10.5 `src/utils/validators.js` (frontend)

```js
/**
 * Validadores del lado del cliente
 */
export const FORBIDDEN_CHARS_REGEX = /[|"]/;

export function validateNoForbiddenChars(field, value) {
  if (typeof value === 'string' && FORBIDDEN_CHARS_REGEX.test(value)) {
    return `El campo "${field}" no puede contener los caracteres "|" ni '"'`;
  }
  return null;
}

export function validateUserTypeCombination(userType, identificationType) {
  if (userType === 'person' && identificationType === 'NIT') {
    return 'Si el tipo de persona es "Persona Natural", el tipo de identificación no puede ser NIT';
  }
  if (userType === 'company' && identificationType !== 'NIT') {
    return 'Si el tipo de persona es "Empresa", el único tipo de identificación válido es NIT';
  }
  return null;
}

export function validateForm(data) {
  const errors = {};
  
  // Campos requeridos
  if (!data.bankCode) errors.bankCode = 'Selecciona un banco';
  if (!data.identificationNumber) errors.identificationNumber = 'Requerido';
  if (!data.fullName) errors.fullName = 'Requerido';
  if (!data.cellphoneNumber) errors.cellphoneNumber = 'Requerido';
  if (!data.email) errors.email = 'Requerido';
  if (!data.address) errors.address = 'Requerida';
  if (!data.description) errors.description = 'Requerida';
  
  // Monto
  if (!data.amount || data.amount <= 0) errors.amount = 'El monto debe ser mayor a 0';
  
  // Email
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Email inválido';
  }
  
  // Celular (10 dígitos)
  if (data.cellphoneNumber && !/^\d{10}$/.test(data.cellphoneNumber.replace(/\D/g, ''))) {
    errors.cellphoneNumber = 'El celular debe tener 10 dígitos';
  }
  
  // Caracteres prohibidos
  const charErrors = [
    validateNoForbiddenChars('description', data.description),
    validateNoForbiddenChars('reference1', data.reference1),
    validateNoForbiddenChars('reference2', data.reference2),
    validateNoForbiddenChars('reference3', data.reference3)
  ].filter(Boolean);
  
  if (charErrors.length > 0) {
    errors.forbiddenChars = charErrors[0];
  }
  
  // Validación userType
  const userTypeError = validateUserTypeCombination(data.userType, data.identificationType);
  if (userTypeError) errors.userType = userTypeError;
  
  return errors;
}
```

### 10.6 `src/utils/errorMessages.js` (frontend — NUEVO v2.0)

```js
/**
 * Mensajes LITERALES para mostrar al usuario
 * Deben coincidir EXACTAMENTE con los del backend (errorMessages.js)
 */
export const PSE_ERROR_MESSAGES = {
  SUCCESS: 'Transacción procesada correctamente.',
  FAIL_EXCEEDEDLIMIT:
    'El monto de la transacción excede los límites establecidos en PSE para la empresa, ' +
    'por favor comuníquese con nuestras líneas de atención al cliente al teléfono ' +
    '(605) 333-XXXX o al correo electrónico facturacion@juntaatlantico.co',
  FAIL_BANKUNREACHEABLE:
    'La entidad financiera no puede ser contactada para iniciar la transacción, ' +
    'por favor seleccione otra o intente más tarde',
  FAIL_DISABLEDUSEREMAIL:
    'El correo electrónico ingresado presenta restricciones. ' +
    'Por favor verifique o use otro correo de contacto.',
  FAIL_ERRORINCREDITS:
    'Ocurrió un error al procesar los créditos. Por favor intente más tarde.',
  FAIL_INVALIDTRAZABILITYCODE:
    'La transacción aún se está procesando. Por favor espere unos minutos.',
  FAIL_BANKNOTEXISTSORDISABLED:
    'El banco seleccionado no está disponible. Por favor seleccione otro.',
  FAIL_INVALIDAMOUNT:
    'El monto ingresado no es válido. Por favor verifique el valor.',
  FAIL_INVALIDSOLICITDATE:
    'La fecha de solicitud no es válida. Por favor recargue la página.',
  FAIL_TRANSACTIONNOTALLOWED:
    'La transacción no está permitida en este momento. Por favor intente más tarde.',
  FAIL_TIMEOUT:
    'El tiempo de espera ha expirado. Por favor intente más tarde.',
  FAIL_GENERICERROR:
    'No se pudo crear la transacción, por favor intente más tarde o comuníquese con la empresa.',
  FAIL_ACCESSDENIED:
    'Acceso denegado. Por favor contacte a la empresa.',
  FAIL_RECAPTCHA:
    'No se pudo verificar que no eres un robot. Por favor intenta de nuevo.',
  FAIL_RATE_LIMIT:
    'Demasiadas solicitudes. Por favor intente en un minuto.',
  FAIL_DOUBLEPAYMENT: 'Verifique el estado de su pago antes de iniciar uno nuevo.',
  FAIL_VALIDATION: 'Por favor verifica los datos ingresados.'
};

export const getErrorMessage = (code) =>
  PSE_ERROR_MESSAGES[code] || PSE_ERROR_MESSAGES.FAIL_GENERICERROR;
```

### 10.7 `src/utils/paymentMode.js` (frontend)

```js
export const PAYMENT_MODE_LABELS = {
  15: 'Débito en cuenta',
  50: 'Tarjeta de Crédito Visa',
  51: 'Tarjeta de Crédito MasterCard',
  52: 'Tarjeta de Crédito Diners Club',
  53: 'Tarjeta de Crédito Propia de la Entidad Financiera',
  54: 'Crédito Rotativo',
  55: 'Tarjeta de Crédito American Express',
  56: 'Tarjeta de Crédito Propia del Comercio'
};

export const PAYMENT_ORIGIN_LABELS = {
  3: 'Débito',
  4: 'Crédito'
};

export const getPaymentModeLabel = (code) =>
  PAYMENT_MODE_LABELS[code] || `Modo ${code}`;

export const getPaymentOriginLabel = (code) =>
  PAYMENT_ORIGIN_LABELS[code] || `Origen ${code}`;
```

### 10.8 `src/utils/causalRejection.js` (frontend)

```js
export const CAUSAL_REJECTION = {
  '00001': 'El usuario abandonó la transacción en el banco',
  '00002': 'Cuenta embargada',
  '00003': 'Cuenta inactiva',
  '00004': 'La cuenta no existe',
  '00005': 'La cuenta no está habilitada',
  '00006': 'La cuenta no ha sido habilitada para pagos',
  '00007': 'La cuenta está saldada',
  '00008': 'Excediste el límite transaccional autorizado por tu banco',
  '00009': 'El banco no se encuentra disponible',
  '00010': 'Fallas técnicas en la Entidad Financiera',
  '00011': 'Fondos insuficientes',
  '00012': 'Inconsistencia en los datos de la transacción',
  '00013': 'La cuenta está cancelada',
  '00015': 'La transacción no fue concluida en el banco en el tiempo máximo permitido (7 min).',
  '00016': 'Datos de acceso inválidos en el portal de la Entidad Financiera',
  '00017': 'No tienes habilitado el servicio de PSE en tu Entidad Financiera',
  '00024': 'Transacción rechazada por sospecha de fraude en la Entidad Financiera',
  '00014': 'El banco no confirmó el estado de la transacción en el tiempo establecido.',
  '00018': 'La transacción fue cambiada de aprobada a rechazada por la Entidad Financiera.',
  '00019': 'Transacción declinada por sospecha de fraude (Monitor Plus).',
  '00020': 'Abandonaste la transacción al regresar al comercio.',
  '00021': 'Abandonaste la transacción al cerrar el navegador.',
  '00022': 'Tu navegador no es compatible con PSE. Usa Chrome 84+, Edge 18+, Firefox 79+, Opera 69+ o Safari 13.1+.',
  '00023': 'No presentaste actividad en PSE (TIMEOUT).',
  '00025': 'Credibanco no confirmó la transacción.',
  '00026': 'OTP no informado. Agotaste los reenvíos configurados por la Entidad Financiera.',
  '00027': 'OTP inválida. Verifica el código enviado por tu banco.',
  '10001': 'La transacción excede el límite asignado a la empresa en PSE.',
  '10002': 'No se puede conectar a la Entidad Financiera.',
  '10003': 'La Entidad Financiera no aceptó iniciar la transacción.'
};

export const getCausalMessage = (code) =>
  CAUSAL_REJECTION[code] || `Causal ${code}`;
```

### 10.9 `src/services/api.service.js`

```js
import axios from 'axios';
import recaptchaService from './recaptcha.service';

class APIService {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/pse';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' }
    });

    this.client.interceptors.response.use(
      response => response,
      error => {
        if (error.response) {
          throw {
            status: error.response.status,
            code: error.response.data?.code,
            message: error.response.data?.message || error.message,
            data: error.response.data
          };
        } else if (error.request) {
          throw { status: 0, code: 'NETWORK_ERROR', message: 'No se pudo conectar con el servidor' };
        } else {
          throw { status: 0, code: 'UNKNOWN', message: error.message };
        }
      }
    );
  }

  async getBanks() {
    const response = await this.client.get('/banks');
    return response.data;
  }

  /**
   * Crea una nueva transacción (con reCAPTCHA v3)
   */
  async createTransaction(data) {
    // Generar token de reCAPTCHA v3
    let recaptchaToken = null;
    try {
      recaptchaToken = await recaptchaService.execute('pse_payment');
    } catch (err) {
      console.warn('reCAPTCHA no disponible, continuando sin él:', err);
    }

    const response = await this.client.post('/transaction', {
      ...data,
      recaptchaToken
    });
    return response.data;
  }

  async getTransactionStatus(trazabilityCode) {
    const response = await this.client.get(`/transaction/${trazabilityCode}/status`);
    return response.data;
  }

  /**
   * NUEVO v2.0 — Información detallada con causal de rechazo
   */
  async getTransactionDetailed(trazabilityCode) {
    const response = await this.client.get(`/transaction/${trazabilityCode}/detailed`);
    return response.data;
  }

  async finalizeTransaction(data) {
    const response = await this.client.post('/transaction/finalize', data);
    return response.data;
  }
}

export default new APIService();
```

### 10.10 `src/components/PaymentForm.vue`

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
          <span class="text-xs text-gray-500">Cédula de ciudadanía</span>
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

    <!-- Tipo y Número de Identificación -->
    <div class="grid grid-cols-2 gap-4">
      <div>
        <label for="identificationType" class="block text-sm font-medium text-gray-700 mb-1">
          Tipo de identificación <span class="text-red-500">*</span>
        </label>
        <select
          id="identificationType"
          v-model="form.identificationType"
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          :class="{ 'border-red-500': fieldErrors.identificationType }"
          required
        >
          <option v-if="form.userType === 'person'" value="CedulaDeCiudadania">Cédula de Ciudadanía</option>
          <option v-if="form.userType === 'person'" value="CedulaDeExtranjeria">Cédula de Extranjería</option>
          <option v-if="form.userType === 'person'" value="Pasaporte">Pasaporte</option>
          <option v-if="form.userType === 'person'" value="TarjetaDeIdentidad">Tarjeta de Identidad</option>
          <option v-if="form.userType === 'person'" value="DocumentoDeIdentificacionExtranjero">Doc. de Identificación Extranjero</option>
          <option v-if="form.userType === 'company'" value="NIT">NIT</option>
        </select>
        <p v-if="fieldErrors.identificationType" class="mt-1 text-xs text-red-600">
          {{ fieldErrors.identificationType }}
        </p>
      </div>
      <div>
        <label for="identificationNumber" class="block text-sm font-medium text-gray-700 mb-1">
          Número de identificación <span class="text-red-500">*</span>
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
        placeholder="Ej: Juan Pérez Gómez"
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
          Correo electrónico <span class="text-red-500">*</span>
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

    <!-- Dirección -->
    <div>
      <label for="address" class="block text-sm font-medium text-gray-700 mb-1">
        Dirección <span class="text-red-500">*</span>
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

    <!-- Descripción (con validación de caracteres prohibidos) -->
    <div>
      <label for="description" class="block text-sm font-medium text-gray-700 mb-1">
        Descripción del pago <span class="text-red-500">*</span>
      </label>
      <input
        id="description"
        v-model="form.description"
        type="text"
        @input="validateForbiddenChars"
        class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        :class="{ 'border-red-500': fieldErrors.description || fieldErrors.forbiddenChars }"
        placeholder="Ej: Pago de calificación de invalidez"
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

    <!-- Badge reCAPTCHA (NUEVO v2.0) -->
    <p class="text-xs text-gray-500 text-center">
      Este sitio está protegido por reCAPTCHA y se aplican la
      <a href="https://policies.google.com/privacy" class="underline" target="_blank">Política de privacidad</a> y
      <a href="https://policies.google.com/terms" class="underline" target="_blank">Términos del servicio</a> de Google.
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
        <span v-else>Débito Bancario PSE</span>
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
        <span class="mr-2">❌</span>
        <span>{{ error }}</span>
      </p>
    </div>
  </form>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import BankList from './BankList.vue';
import apiService from '../services/api.service';
import { useReCaptcha } from '../composables/useReCaptcha';
import { validateForm, validateNoForbiddenChars, validateUserTypeCombination } from '../utils/validators';
import { getErrorMessage } from '../utils/errorMessages';

const emit = defineEmits(['success', 'cancel', 'error', 'loading']);

const loading = ref(false);
const error = ref('');
const fieldErrors = ref({});
const loadingMessage = ref('Procesando…');

const { init: initRecaptcha } = useReCaptcha();
initRecaptcha();

const form = reactive({
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

const isFormValid = computed(() => {
  return (
    form.bankCode &&
    form.identificationNumber?.trim() &&
    form.fullName?.trim() &&
    form.cellphoneNumber?.trim() &&
    form.email?.trim() &&
    form.address?.trim() &&
    form.amount > 0 &&
    form.description?.trim()
  );
});

/**
 * Cambia el tipo de persona y resetea identificationType según las reglas v2.0
 */
function setUserType(type) {
  form.userType = type;
  if (type === 'company') {
    form.identificationType = 'NIT';
  } else {
    form.identificationType = 'CedulaDeCiudadania';
  }
}

/**
 * Valida caracteres prohibidos en tiempo real
 */
function validateForbiddenChars() {
  const err = validateNoForbiddenChars('description', form.description);
  if (err) {
    fieldErrors.value.forbiddenChars = err;
  } else {
    delete fieldErrors.value.forbiddenChars;
  }
}

watch(() => form.cellphoneNumber, (newVal) => {
  form.cellphoneNumber = String(newVal).replace(/\D/g, '').slice(0, 10);
});

watch(loading, (newVal) => {
  loadingMessage.value = newVal ? 'Creando transacción…' : 'Procesando…';
  emit('loading', newVal);
});

async function handleSubmit() {
  error.value = '';
  fieldErrors.value = {};
  
  // 1. Validar formulario en cliente
  const errors = validateForm(form);
  if (Object.keys(errors).length > 0) {
    fieldErrors.value = errors;
    error.value = 'Por favor completa todos los campos requeridos correctamente';
    window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }

  if (!form.serviceCode) {
    error.value = 'Error de configuración: Código de servicio no definido';
    return;
  }

  loading.value = true;

  try {
    // 2. Crear transacción (reCAPTCHA se ejecuta dentro de api.service)
    const response = await apiService.createTransaction(form);
    
    if (response.success) {
      emit('success', {
        trazabilityCode: response.data.trazabilityCode,
        pseURL: response.data.pseURL,
        ticketId: response.data.ticketId,
        formData: { ...form }
      });
    } else {
      // Mostrar mensaje LITERAL de ACH
      const message = response.message || getErrorMessage(response.code);
      error.value = message;
      emit('error', { code: response.code, message });
    }
  } catch (err) {
    const message = err.message || getErrorMessage(err.code);
    error.value = message;
    emit('error', { code: err.code, message });
  } finally {
    loading.value = false;
  }
}
</script>
```

### 10.11 `src/components/RejectionReason.vue` (NUEVO v2.0)

```vue
<template>
  <div v-if="causeRejection" class="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
    <div class="flex items-start">
      <div class="flex-shrink-0">
        <span class="text-2xl">⚠️</span>
      </div>
      <div class="ml-3 flex-1">
        <h4 class="text-sm font-semibold text-red-800">¿Por qué fue rechazada?</h4>
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

<script setup>
import { computed } from 'vue';
import { getCausalMessage } from '../utils/causalRejection';

const props = defineProps({
  causeRejection: { type: String, default: null },
  rejectionDescription: { type: String, default: null },
  stateDescription: { type: String, default: null }
});

defineEmits(['retry']);

const friendlyCausal = computed(() => 
  props.causeRejection ? getCausalMessage(props.causeRejection) : ''
);
</script>
```

### 10.12 `src/views/PaymentReturn.vue` (NUEVO v2.0)

```vue
<template>
  <div class="min-h-screen bg-gray-50 py-12 px-4 sm:flex sm:items-center sm:justify-center">
    <div class="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden">
      <div class="p-6 text-center">
        <!-- Header con logo -->
        <img src="/junta-atlantico-logo.svg" alt="Junta Atlántico" class="h-12 mx-auto mb-4" />

        <!-- Loading -->
        <div v-if="loading" class="py-12">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p class="mt-4 text-gray-600">Verificando el estado de tu pago...</p>
        </div>

        <!-- Estado: Aprobado -->
        <div v-else-if="transactionState === 'OK'" class="py-8">
          <div class="text-green-600 text-6xl mb-4">✅</div>
          <h2 class="text-2xl font-bold text-gray-900">¡Pago aprobado!</h2>
          <p class="text-gray-600 mt-2">Tu transacción se ha completado exitosamente</p>
          
          <div class="mt-6 p-4 bg-gray-50 rounded-lg text-left">
            <h3 class="font-medium text-gray-700 mb-3">Detalles de la transacción</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500">CUS:</span>
                <span class="font-mono">{{ transaction.trazabilityCode }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Ticket ID:</span>
                <span class="font-mono">{{ transaction.ticketId }}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-500">Valor:</span>
                <span class="font-bold">${{ formatCurrency(transaction.transactionValue) }}</span>
              </div>
              <div class="flex justify-between" v-if="transaction.paymentMode">
                <span class="text-gray-500">Medio de pago:</span>
                <span>{{ paymentModeLabel }}</span>
              </div>
              <div class="flex justify-between" v-if="transaction.paymentOrigin">
                <span class="text-gray-500">Tipo:</span>
                <span>{{ paymentOriginLabel }}</span>
              </div>
              <div class="flex justify-between" v-if="transaction.bankProcessDate">
                <span class="text-gray-500">Fecha:</span>
                <span>{{ formatDate(transaction.bankProcessDate) }}</span>
              </div>
            </div>
          </div>
          
          <p class="mt-4 text-xs text-gray-500">
            Recibirás el soporte de pago en tu correo electrónico.
          </p>
        </div>

        <!-- Estado: Rechazado / Fallido -->
        <div v-else-if="['NOT_AUTHORIZED', 'FAILED'].includes(transactionState)" class="py-8">
          <div class="text-red-600 text-6xl mb-4">❌</div>
          <h2 class="text-xl font-bold text-gray-900">
            {{ transactionState === 'NOT_AUTHORIZED' ? 'Pago rechazado' : 'Pago fallido' }}
          </h2>
          <p class="text-gray-600 mt-2">
            {{ transactionState === 'NOT_AUTHORIZED' 
               ? 'La transacción no fue autorizada por tu banco' 
               : 'Ocurrió un error al procesar tu pago' }}
          </p>
          
          <!-- Causal de rechazo (NUEVO v2.0) -->
          <RejectionReason
            :cause-rejection="detailed?.causeRejection"
            :rejection-description="detailed?.rejectionDescription"
            :state-description="detailed?.stateDescription"
            @retry="goToCheckout"
          />
        </div>

        <!-- Estado: Pendiente -->
        <div v-else-if="transactionState === 'PENDING'" class="py-8">
          <div class="text-yellow-600 text-6xl mb-4">⏳</div>
          <h2 class="text-xl font-bold text-gray-900">Pago pendiente</h2>
          <p class="text-gray-600 mt-2">
            Tu pago está siendo procesado por tu entidad financiera. 
            Te notificaremos por correo en unos minutos.
          </p>
          <div class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p class="text-sm text-yellow-700">
              CUS: <span class="font-mono font-bold">{{ transaction.trazabilityCode }}</span>
            </p>
          </div>
        </div>

        <!-- Botón de volver -->
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

<script setup>
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import apiService from '../services/api.service';
import RejectionReason from '../components/RejectionReason.vue';
import { formatCurrency } from '../utils/formatters';
import { getPaymentModeLabel, getPaymentOriginLabel } from '../utils/paymentMode';
import { usePolling } from '../composables/usePolling';

const router = useRouter();
const loading = ref(true);
const error = ref('');
const transaction = ref({});
const transactionState = ref('');
const detailed = ref(null);

const { start: startPolling, stop: stopPolling } = usePolling();

const paymentModeLabel = computed(() => 
  transaction.value.paymentMode ? getPaymentModeLabel(transaction.value.paymentMode) : ''
);
const paymentOriginLabel = computed(() => 
  transaction.value.paymentOrigin ? getPaymentOriginLabel(transaction.value.paymentOrigin) : ''
);

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota' });
  } catch {
    return iso;
  }
}

onMounted(async () => {
  let trazabilityCode = new URLSearchParams(window.location.search).get('trazabilityCode');
  if (!trazabilityCode) {
    trazabilityCode = sessionStorage.getItem('pse_trazability_code');
  }

  if (!trazabilityCode) {
    error.value = 'No se encontró información de la transacción';
    loading.value = false;
    return;
  }

  await checkTransactionWithPolling(trazabilityCode);
});

async function checkTransactionWithPolling(trazabilityCode) {
  try {
    loading.value = true;
    
    const result = await startPolling(
      async () => {
        const r = await apiService.getTransactionStatus(trazabilityCode);
        if (r.success) {
          transaction.value = r.data;
          transactionState.value = r.data.transactionState;
        }
        return { transactionState: transactionState.value, ...r.data };
      },
      (res) => {
        if (res.transactionState !== 'PENDING') {
          loadDetailedIfNeeded(trazabilityCode);
        }
      },
      (err) => {
        error.value = err.message || 'Error al consultar el estado';
      }
    );
    
    if (result?.transactionState === 'TIMEOUT') {
      error.value = 'La transacción está tardando más de lo esperado. Verifica el estado más tarde.';
    }
  } catch (err) {
    error.value = err.message || 'Error al consultar el estado del pago';
  } finally {
    loading.value = false;
  }
}

/**
 * NUEVO v2.0: Cargar información detallada si la transacción no está aprobada
 */
async function loadDetailedIfNeeded(trazabilityCode) {
  if (transactionState.value === 'OK') {
    // Limpiar sessionStorage
    sessionStorage.removeItem('pse_trazability_code');
    sessionStorage.removeItem('pse_ticket_id');
    sessionStorage.removeItem('pse_form_data');
    return;
  }
  
  try {
    const r = await apiService.getTransactionDetailed(trazabilityCode);
    if (r.success) {
      detailed.value = r.data;
    }
  } catch (err) {
    console.warn('No se pudo cargar detalle:', err);
    // No es crítico
  }
}

function goToCheckout() {
  stopPolling();
  router.push('/checkout');
}
</script>
```

### 10.13 `src/main.js` (con reCAPTCHA inicializado)

```js
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { VueReCaptcha } from 'vue-recaptcha-v3';
import App from './App.vue';
import router from './router';
import recaptchaService from './services/recaptcha.service';

const app = createApp(App);

app.use(createPinia());
app.use(router);

// Inicializar reCAPTCHA v3
app.use(VueReCaptcha, {
  siteKey: import.meta.env.VITE_RECAPTCHA_SITE_KEY,
  loaderOptions: {
    autoHideBadge: false
  }
});

app.mount('#app');

// Inicializar servicio
recaptchaService.init();
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
npm install express cors dotenv helmet morgan axios winston express-rate-limit
npm install -D nodemon jest eslint

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

npm install axios pinia vue-recaptcha-v3
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
npm run build
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
- [ ] `main.js` con `VueReCaptcha` inicializado

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
