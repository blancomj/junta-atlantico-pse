# CERTIFICACION PSE - ACH Colombia

## Flujo de Certificacion

### Paso 1: Solicitar credenciales

Contactar a ACH Colombia para obtener:

| Credencial          | Descripcion |
|---                  |---|
| `PSE_API_KEY`       | Clave de acceso a la API |
| `PSE_CLIENT_ID`     | Identificacion del cliente OAuth |
| `PSE_CLIENT_SECRET` | Secreto del cliente OAuth |
| `PSE_ENCRYPTION_KEY`| Clave de cifrado AES-256 (base64) |
| `PSE_ENCRYPTION_IV` | Vector de inicializacion (base64) |
| `PSE_ENTITY_CODE`   | Codigo de la empresa (NIT sin guion) |
| `PSE_SERVICE_CODE`  | Codigo del servicio en PSE |

Solicitar acceso al **ambiente de certificacion**:
- URL Token: `https://apicer.pse.com.co/oauth/client_credential/accesstoken?grant_type=client_credentials`
- URL API: `https://apicer.pse.com.co/v2/psewebapinf/api`

---

### Paso 2: Configurar variables de entorno

```bash
# Backend .env
PSE_ENV=cert
PSE_API_KEY=<solicitar>
PSE_CLIENT_ID=<solicitar>
PSE_CLIENT_SECRET=<solicitar>
PSE_ENCRYPTION_KEY=<solicitar>
PSE_ENCRYPTION_IV=<solicitar>
PSE_ENTITY_CODE=901234567
PSE_SERVICE_CODE=<solicitar>
PSE_CIIU_CATEGORY=8692
PSE_COMPANY_NAME=JUNTA REGIONAL DE CALIFICACION DE INVALIDEZ DEL ATLANTICO
PSE_TOKEN_URL=https://apicer.pse.com.co/oauth/client_credential/accesstoken?grant_type=client_credentials
PSE_API_BASE_URL=https://apicer.pse.com.co/v2/psewebapinf/api
PSE_RETURN_URL=https://www.juntaatlantico.co/retorno-pago
```

---

### Paso 3: Pruebas de certificacion

#### 3.1 Obtener token OAuth

```bash
curl -X POST "https://apicer.pse.com.co/oauth/client_credential/accesstoken?grant_type=client_credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=TU_CLIENT_ID&client_secret=TU_CLIENT_SECRET"
```

Respuesta esperada:
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIs...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

**Verificar**: Token con prefijo `eyJhbGciOiJSUzI1NiIs...`

---

#### 3.2 Obtener lista de bancos

```bash
curl -X GET "https://apicer.pse.com.co/v2/psewebapinf/api/Bank/getBankListNF" \
  -H "Authorization: Bearer TU_TOKEN"
```

Respuesta esperada:
```json
{
  "returnCode": "SUCCESS",
  "banks": [
    {
      "bankCode": "001",
      "bankName": "BANCO DE BOGOTA"
    },
    ...
  ]
}
```

**Verificar**: Lista de al menos 30 bancos colombianos

---

#### 3.3 Crear transaccion (Persona Natural)

**Request**:
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

```bash
curl -X POST "https://apicer.pse.com.co/v2/psewebapinf/api/PSE/CreateTransactionPaymentNF" \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d @request.json
```

Respuesta esperada:
```json
{
  "returnCode": "SUCCESS",
  "trazabilityCode": "CUS-XXXXXX",
  "pseURL": "https://..."
}
```

**Verificar**:
- `returnCode` = "SUCCESS"
- `trazabilityCode` inicia con "CUS-"
- `pseURL` es URL valida para redirigir al banco

---

#### 3.4 Crear transaccion (Empresa)

**Request**:
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

**Verificar**:
- `returnCode` = "SUCCESS"
- `vat` calculado correctamente (IVA)

---

#### 3.5 Consultar estado de transaccion

```bash
curl -X GET "https://apicer.pse.com.co/v2/psewebapinf/api/PSE/GetTransactionInformationNF/CUS-XXXXXX" \
  -H "Authorization: Bearer TU_TOKEN"
```

Respuesta esperada:
```json
{
  "returnCode": "SUCCESS",
  "transactionState": "PENDING",
  "trazabilityCode": "CUS-XXXXXX",
  "bankProcessingDate": "2026-07-17T15:30:00",
  "authorizationID": null
}
```

**Estados posibles**:
- `PENDING` - Transaccion en curso
- `OK` - Pago aprobado
- `NOT_AUTHORIZED` - Pago rechazado
- `FAILED` - Error en el proceso

---

#### 3.6 Finalizar transaccion

```bash
curl -X POST "https://apicer.pse.com.co/v2/psewebapinf/api/PSE/FinalizeTransactionPaymentNF" \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "trazabilityCode": "CUS-XXXXXX",
    "authorizationId": "AUTH-12345"
  }'
```

**Verificar**: `returnCode` = "SUCCESS"

---

#### 3.7 Probar pago aprobado

1. En ambiente de certificacion, usar datos de prueba proporcionados por ACH
2. El pago debe retornar estado `OK` inmediatamente
3. Verificar que `authorizationID` no sea null
4. Verificar que `FinalizeTransactionPaymentNF` funcione correctamente

---

#### 3.8 Probar pago rechazado

1. Usar datos de prueba que generen rechazo
2. Verificar que `transactionState` = `NOT_AUTHORIZED`
3. Verificar que el usuario vea el mensaje de rechazo correcto
4. No debe intentar finalizar la transaccion

---

#### 3.9 Probar pago pendiente

1. Usar datos de prueba que generen estado pendiente
2. Verificar que `transactionState` = `PENDING`
3. Verificar que el polling funcione (cada 3 segundos)
4. Verificar que despues de un tiempo cambie a estado final

---

#### 3.10 Probar mensajes de error

| Codigo de error                   | Mensaje esperado                                            |
|---                                |---                                                          |
| `FAIL_ENTITYNOTEXISTSORDISABLED`  | "No se pudo crear la transaccion..."                        |
| `FAIL_BANKNOTEXISTSORDISABLED`    | "El banco seleccionado no esta disponible..."               |
| `FAIL_INVALIDAMOUNTORVATAMOUNT`   | "El monto ingresado no es valido..."                        |
| `FAIL_EXCEEDEDLIMIT`              | "El monto de la transaccion excede..."                      |
| `FAIL_DISABLEDUSEREMAIL`          | "El correo electronico ingresado presenta restricciones..." |
| `FAIL_TIMEOUT`                    | "El tiempo de espera ha expirado..."                        |
| `FAIL_BANKUNREACHEABLE`           | "La entidad financiera no puede ser contactada..."          |

---

#### 3.11 Probar pagina de retorno

1. Completar una transaccion
2. Ser redirigido al banco
3. Simular aprobacion
4. Retornar a `PSE_RETURN_URL` con parametros
5. Verificar que la pagina muestre:
   - Estado del pago
   - Codigo CUS
   - Monto pagado
   - Fecha y hora

---

#### 3.12 Probar doble pago

1. Crear una transaccion con un `ticketId`
2. Intentar crear otra transaccion con el mismo `ticketId`
3. Verificar que retorne error `FAIL_DOUBLEPAYMENT`
4. Verificar que el mensaje incluya el estado anterior

---

### Paso 4: Validacion de reglas de negocio

#### 4.1 Validaciones de persona

| Regla                                   | Test                                                      | Esperado  |
|---                                      |---                                                        |---        |
| Persona natural no puede usar NIT       | `userType=person, identificationType=NIT`                 | Error 400 |
| Persona puede usar CedulaDeCiudadania   | `userType=person, identificationType=CedulaDeCiudadania`  | OK        |
| Persona puede usar CedulaDeExtranjeria  | `userType=person, identificationType=CedulaDeExtranjeria` | OK        |
| Persona puede usar Pasaporte            | `userType=person, identificationType=Pasaporte`           | OK        |

#### 4.2 Validaciones de empresa

| Regla                         | Test                                                      | Esperado  |
|---                            |---                                                        |---        |
| Empresa solo puede usar NIT   | `userType=company, identificationType=CedulaDeCiudadania` | Error 400 |
| Empresa con NIT valido        | `userType=company, identificationType=NIT`                | OK        |
| NIT con guion                 | `identificationNumber=901234567-8`                        | OK        |

#### 4.3 Caracteres prohibidos

| Campo       | Input             | Esperado  |
|---          |---                |---        |
| description | `Pago "servicio"` | Error 400 |
| description | `Pago\|servicio`  | Error 400 |
| description | `Pago servicio`   | OK        |
| reference1  | `REF-001`         | OK        |

#### 4.4 Validaciones de formato

| Campo           | Input valido      | Input invalido            |
|---              |---                |---                        |
| cellphoneNumber | `3001234567`      | `300123456` (9 digitos)   |
| email           | `test@email.com`  | `test@email` (sin dominio)|
| amount          | `10000`           | `-1000` (negativo)        |
| amount          | `10000`           | `0` (cero)                |

---

### Paso 5: Pruebas de seguridad

#### 5.1 Rate Limiting

```bash
# Enviar 11 peticiones en 1 minuto
for i in {1..11}; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST http://localhost:3000/api/pse/transaction -H "Content-Type: application/json" -d @request.json
done
```

**Esperado**: La 11a peticion retorna `429 Too Many Requests`

#### 5.2 Headers de seguridad

```bash
curl -I http://localhost:3000/api/pse/health
```

**Esperado**:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

#### 5.3 Request ID

```bash
curl -v http://localhost:3000/api/pse/health
```

**Esperado**: Header `X-Request-Id` en respuesta

---

### Paso 6: Documentacion para ACH

Preparar los siguientes documentos para enviar a ACH:

1. **URL del sitio**: `https://www.juntaatlantico.co`
2. **URL de retorno**: `https://www.juntaatlantico.co/retorno-pago`
3. **Descripcion del servicio**: "Pago en linea de servicios de la Junta Regional de Calificacion del Atlantico"
4. **CIIU**: 8692 (Actividades de atencion de la salud humana)
5. **Logo de la empresa**: Formato PNG, fondo transparente
6. **Screenshot del flujo de pago**: Capturas de cada paso

---

### Paso 7: Criterios de aceptacion

La certificacion se aprueba cuando:

- [x] El token OAuth se obtiene correctamente
- [x] La lista de bancos se muestra completa
- [x] Una transaccion se crea y retorna CUS y URL de pago
- [x] El usuario puede pagar en el banco y retornar
- [x] El estado de la transaccion se consulta correctamente
- [x] La transaccion se finaliza correctamente
- [x] Los mensajes de error son los oficiales de ACH
- [x] El rate limiting funciona (max 10 req/min)
- [x] Los headers de seguridad estan presentes
- [x] El doble pago se detecta correctamente
- [x] La pagina de retorno muestra la informacion correcta
- [x] El diseno es responsive (mobile y desktop)
- [x] Los caracteres prohibidos (| y ") se rechazan

---

### Paso 8: Cambio a produccion

Una vez aprobada la certificacion:

1. Actualizar variables de entorno:
```bash
PSE_ENV=production
PSE_TOKEN_URL=https://apiprd.pse.com.co/oauth/client_credential/accesstoken?grant_type=client_credentials
PSE_API_BASE_URL=https://apiprd.pse.com.co/v2/psewebapinf/api
```

2. Reiniciar PM2:
```bash
pm2 restart pse-backend
```

3. Verificar funcionamiento en produccion

4. Monitorear logs durante las primeras 24 horas
