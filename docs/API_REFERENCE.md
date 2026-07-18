# API Reference - PSE Junta Atlantico

Base URL: `https://www.juntaatlantico.co/api/pse`

---

## Endpoints

### Health Check

```
GET /health
```

Verifica el estado de los servicios.

**Rate Limit**: Sin limite

**Response 200**:
```json
{
  "status": "OK",
  "timestamp": "2026-07-17T20:00:00.000Z",
  "environment": "production",
  "services": {
    "pseApi": "ok",
    "encryption": "ok",
    "token": "ok"
  }
}
```

**Response 503** (servicio degradado):
```json
{
  "status": "DEGRADED",
  "timestamp": "2026-07-17T20:00:00.000Z",
  "environment": "production",
  "services": {
    "pseApi": "error",
    "encryption": "ok",
    "token": "error"
  }
}
```

---

### Get Bank List

```
GET /banks
```

Obtiene la lista de bancos disponibles en PSE.

**Rate Limit**: 10 req/min

**Response 200**:
```json
{
  "success": true,
  "data": {
    "returnCode": "SUCCESS",
    "banks": [
      {
        "bankCode": "001",
        "bankName": "BANCO DE BOGOTA"
      },
      {
        "bankCode": "007",
        "bankName": "BANCO DAVIVIENDA"
      }
    ]
  },
  "message": "Lista de bancos obtenida exitosamente"
}
```

**Response 500**:
```json
{
  "success": false,
  "message": "Error al obtener lista de bancos"
}
```

---

### Create Transaction

```
POST /transaction
```

Crea una nueva transaccion de pago PSE.

**Rate Limit**: 10 req/min

**Headers**:
```
Content-Type: application/json
X-Recaptcha-Token: <token>
```

**Request Body**:

| Campo                 | Tipo   | Requerido  | Descripcion                   |
|---                    |---     |---         |---                            |
| `bankCode`            | string | Si         | Codigo del banco (ej: "001")  |
| `amount`              | number | Si         | Monto a pagar (minimo 1)      |
| `userType`            | string | Si         | "person" o "company"          |
| `identificationType`  | string | Si         | Tipo de identificacion        |
| `identificationNumber`| string | Si         | Numero de identificacion      |
| `fullName`            | string | Si         | Nombre completo (max 200)     |
| `cellphoneNumber`     | string | Si         | Celular (10 digitos)          |
| `email`               | string | Si         | Correo electronico            |
| `address`             | string | Si         | Direccion (max 200)           |
| `description`         | string | Si         | Descripcion del pago (max 80) |
| `reference1`          | string | No         | Referencia 1 (max 80)         |
| `reference2`          | string | No         | Referencia 2 (max 80)         |
| `reference3`          | string | No         | Referencia 3 (max 80)         |
| `vat`                 | number | No         | IVA (default: 0)              |
| `serviceCode`         | string | No         | Codigo de servicio (max 10)   |
| `indicator4per1000`   | number | No         | Indicador 4x1000 (0 o 1)      |
| `ticketId`            | string\|number      | No | ID del ticket para doble pago |

**Tipos de identificacion validos**:
- `RegistroCivilDeNacimiento`
- `TarjetaDeIdentidad`
- `CedulaDeCiudadania`
- `TarjetaDeExtranjeria`
- `CedulaDeExtranjeria`
- `Pasaporte`
- `DocumentoDeIdentificacionExtranjero`
- `NIT`

**Validaciones de negocio**:
- Si `userType=person`, `identificationType` NO puede ser `NIT`
- Si `userType=company`, `identificationType` DEBE ser `NIT`
- Campos `description`, `reference1`, `reference2`, `reference3` NO pueden contener `|` ni `"`

**Request Ejemplo (Persona)**:
```json
{
  "bankCode": "001",
  "amount": 10000,
  "userType": "person",
  "identificationType": "CedulaDeCiudadania",
  "identificationNumber": "1234567890",
  "fullName": "Juan Perez Martinez",
  "cellphoneNumber": "3001234567",
  "email": "juan.perez@email.com",
  "address": "Calle 123 No 45-67",
  "description": "Pago de servicio",
  "reference1": "REF-001",
  "reference2": "",
  "reference3": "",
  "vat": 0,
  "serviceCode": "",
  "indicator4per1000": 0,
  "ticketId": "TICKET-001"
}
```

**Request Ejemplo (Empresa)**:
```json
{
  "bankCode": "001",
  "amount": 50000,
  "userType": "company",
  "identificationType": "NIT",
  "identificationNumber": "9012345678",
  "fullName": "EMPRESA S.A.S.",
  "cellphoneNumber": "3001234567",
  "email": "contacto@empresa.com",
  "address": "Carrera 45 No 12-34",
  "description": "Pago facturas",
  "reference1": "FACT-001",
  "reference2": "",
  "reference3": "",
  "vat": 8000,
  "serviceCode": "",
  "indicator4per1000": 0,
  "ticketId": "TICKET-002"
}
```

**Response 200** (exito):
```json
{
  "success": true,
  "data": {
    "trazabilityCode": "CUS-XXXXXX",
    "pseURL": "https://apicer.pse.com.co/...",
    "ticketId": "TICKET-001",
    "transactionCycle": 1
  },
  "message": "Transaccion creada exitosamente"
}
```

**Response 400** (error de validacion):
```json
{
  "success": false,
  "code": "FAIL_VALIDATION",
  "message": "Si el tipo de persona es \"person\", el tipo de identificacion no puede ser NIT"
}
```

**Response 400** (error de caracteres prohibidos):
```json
{
  "success": false,
  "code": "FAIL_VALIDATION",
  "message": "El campo \"description\" no puede contener los caracteres \"|\" ni '\"'. Estos caracteres generan conflicto con el motor de fraude Monitor Plus."
}
```

**Response 409** (doble pago):
```json
{
  "success": false,
  "code": "FAIL_DOUBLEPAYMENT",
  "message": "En este momento su #TICKET-001 ha finalizado su proceso de pago y cuya transaccion se encuentra APROBADA en su entidad financiera. Si desea mas informacion sobre el estado de su operacion puede comunicarse a nuestras lineas de atencion al cliente 57-1-9999999 o enviar un correo electronico a facturacion@juntaatlantico.co y preguntar por el estado de la transaccion: CUS-XXXXXX"
}
```

**Response 429** (rate limit):
```json
{
  "success": false,
  "code": "FAIL_RATE_LIMIT",
  "message": "Demasiadas solicitudes. Por favor intente en un minuto."
}
```

**Response 500** (error de PSE):
```json
{
  "success": false,
  "code": "FAIL_ENTITYNOTEXISTSORDISABLED",
  "message": "No se pudo crear la transaccion, por favor intente mas tarde o comuniquese con la empresa"
}
```

**Codigos de error PSE**:

| Codigo | Mensaje |
|---|---|
| `SUCCESS` | Transaccion procesada correctamente. |
| `FAIL_ENTITYNOTEXISTSORDISABLED` | No se pudo crear la transaccion... |
| `FAIL_BANKNOTEXISTSORDISABLED` | El banco seleccionado no esta disponible... |
| `FAIL_SERVICENOTEXISTSORNOTCONFIGURED` | No se pudo crear la transaccion... |
| `FAIL_INVALIDAMOUNTORVATAMOUNT` | El monto ingresado no es valido... |
| `FAIL_INVALIDSOLICITDATE` | La fecha de solicitud no es valida... |
| `FAIL_CANNOTGETCURRENTCYCLE` | No se pudo crear la transaccion... |
| `FAIL_ACCESSDENIED` | Acceso denegado... |
| `FAIL_EXCEEDEDLIMIT` | El monto de la transaccion excede... |
| `FAIL_TRANSACTIONNOTALLOWED` | La transaccion no esta permitida... |
| `FAIL_INVALIDPARAMETERS` | No se pudo crear la transaccion... |
| `FAIL_GENERICERROR` | No se pudo crear la transaccion... |
| `FAIL_DISABLEDUSEREMAIL` | El correo electronico presenta restricciones... |
| `FAIL_ERRORINCREDITS` | Ocurrio un error al procesar los creditos... |
| `FAIL_INVALIDTRAZABILITYCODE` | La transaccion aun se esta procesando... |
| `FAIL_BANKUNREACHEABLE` | La entidad financiera no puede ser contactada... |
| `FAIL_TIMEOUT` | El tiempo de espera ha expirado... |
| `FAIL_NOTCONFIRMEDBYBANK` | No se pudo crear la transaccion... |
| `FAIL_INVALIDSTATE` | La transaccion no puede ser procesada... |
| `FAIL_INCONSISTENTFECHA` | No se pudo crear la transaccion... |
| `FAIL_INVALIDBANKPROCESSINGDATE` | No se pudo crear la transaccion... |
| `FAIL_INVALIDAUTHORIZEDAMOUNT` | El valor devuelto es diferente al enviado... |

---

### Get Transaction Status

```
GET /transaction/:trazabilityCode/status
```

Consulta el estado de una transaccion.

**Rate Limit**: Sin limite especial

**Parameters**:
- `trazabilityCode` (string, requerido): Codigo CUS de la transaccion

**Response 200**:
```json
{
  "success": true,
  "data": {
    "returnCode": "SUCCESS",
    "transactionState": "PENDING",
    "trazabilityCode": "CUS-XXXXXX",
    "bankProcessingDate": "2026-07-17T15:30:00",
    "authorizationID": null
  },
  "message": "Estado de transaccion consultado exitosamente"
}
```

**Estados posibles**:
- `PENDING` - Transaccion en curso
- `OK` - Pago aprobado
- `NOT_AUTHORIZED` - Pago rechazado
- `FAILED` - Error en el proceso

**Response 500**:
```json
{
  "success": false,
  "message": "Error al consultar el estado de la transaccion"
}
```

---

### Get Transaction Detailed

```
GET /transaction/:trazabilityCode/detailed
```

Obtiene informacion detallada de una transaccion.

**Rate Limit**: Sin limite especial

**Parameters**:
- `trazabilityCode` (string, requerido): Codigo CUS de la transaccion

**Response 200**:
```json
{
  "success": true,
  "data": {
    "returnCode": "SUCCESS",
    "transactionState": "OK",
    "trazabilityCode": "CUS-XXXXXX",
    "bankProcessingDate": "2026-07-17T15:30:00",
    "authorizationID": "AUTH-12345",
    "bankCode": "001",
    "amount": 10000,
    "vat": 0
  },
  "message": "Informacion detallada obtenida exitosamente"
}
```

**Response 500**:
```json
{
  "success": false,
  "message": "Error al obtener informacion detallada"
}
```

---

### Finalize Transaction

```
POST /transaction/finalize
```

Finaliza una transaccion (llamado automaticamente cuando estado es OK).

**Rate Limit**: Sin limite especial

**Request Body**:

| Campo | Tipo | Requerido | Descripcion |
|---|---|---|---|
| `trazabilityCode` | string | Si | Codigo CUS de la transaccion |
| `authorizationId` | string | No | ID de autorizacion del banco |

**Request Ejemplo**:
```json
{
  "trazabilityCode": "CUS-XXXXXX",
  "authorizationId": "AUTH-12345"
}
```

**Response 200**:
```json
{
  "success": true,
  "data": {
    "returnCode": "SUCCESS"
  },
  "message": "Transaccion finalizada exitosamente"
}
```

**Response 500**:
```json
{
  "success": false,
  "message": "Error al finalizar la transaccion"
}
```

---

## Headers de Respuesta

Todos los endpoints retornan:

| Header | Descripcion |
|---|---|
| `X-Request-Id` | Identificador unico de la peticion |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `Content-Type` | `application/json` |

---

## Rate Limiting

| Endpoint | Limite | Ventana |
|---|---|---|
| `POST /transaction` | 10 req | 1 min |
| `GET /banks` | 10 req | 1 min |
| Otros | Sin limite especial | - |

Cuando se excede el limite:
```json
{
  "success": false,
  "code": "FAIL_RATE_LIMIT",
  "message": "Demasiadas solicitudes. Por favor intente en un minuto."
}
```

---

## Autenticacion

### OAuth 2.0 con ACH Colombia

El backend obtiene automaticamente un token de ACH Colombia usando las credenciales configuradas en `.env`:

```
POST https://apicer.pse.com.co/oauth/client_credential/accesstoken?grant_type=client_credentials
Content-Type: application/x-www-form-urlencoded

client_id=TU_CLIENT_ID&client_secret=TU_CLIENT_SECRET
```

El token se cachea y se renueva automaticamente antes de expirar.

### reCAPTCHA v3

El frontend genera un token de reCAPTCHA v3 que se envia en el header `X-Recaptcha-Token` para el endpoint `POST /transaction`.

---

## Cifrado

Los datos sensibles se cifran con **AES-256-GCM** antes de enviarlos a PSE:

- **Clave**: 32 bytes en base64
- **IV**: 12 bytes en base64
- **Formato**: `{ ciphertext}.{authTag}`

Campos cifrados:
- `identificationNumber`
- `cellphoneNumber`
- `email`
- `address`
- `description`

---

## Ejemplo de flujo completo

```
1. Frontend -> GET /banks
   Retorna lista de bancos

2. Frontend -> POST /transaction
   Crea transaccion y retorna CUS + URL de pago

3. Frontend redirige a -> pseURL
   Usuario paga en su banco

4. Banco redirige a -> PSE_RETURN_URL
   Con parametros de respuesta

5. Frontend -> GET /transaction/:trazabilityCode/status
   Consulta estado (polling cada 3 seg)

6. Si estado = OK:
   Backend -> POST /transaction/finalize
   Finaliza la transaccion automaticamente

7. Frontend muestra -> /retorno
   Pagina de confirmacion
```
