# INSTALACION - PSE Junta Atlantico

## Deploy en Hostinger Web App

### Prerequisitos

- Cuenta Hostinger con plan Business o superior
- Dominio `juntaatlantico.co` configurado
- Acceso a Panel de Hostinger
- Credenciales PSE de ACH Colombia

---

## 1. Preparar el proyecto para deploy

### 1.1 Build del frontend (local)

```bash
cd junta-atlantico-pse/frontend
npm install
npm run build
```

Esto genera `dist/` con los archivos estaticos.

### 1.2 Build del backend (local)

```bash
cd junta-atlantico-pse/backend
npm install
npm run build
```

Esto genera `dist/` con archivos TypeScript compilados.

### 1.3 Estructura final para subir

```
junta-atlantico-pse/
├── backend/
│   ├── dist/              # Compilado JS
│   ├── node_modules/      # Produccion
│   ├── package.json
│   ├── ecosystem.config.js
│   └── .env               # Variables de entorno
├── frontend/
│   ├── dist/              # Archivos estaticos
│   └── (no necesita node_modules en server)
└── docs/
```

---

## 2. Configurar Hostinger Web App

### 2.1 Crear la Web App

1. Ir a **hPanel** > **Hosting** > tu plan
2. Ir a **Websites** > **Add Website**
3. Seleccionar **Node.js** como runtime
4. Seleccionar **Node.js 18+**
5. Nombre: `pse-backend`

### 2.2 Configuracion de la Web App

En el panel de la Web App, configurar:

| Campo                     | Valor             |
|---                        |---                |
| Application root          | `/`               |
| Application startup file  | `dist/server.js`  |
| Node.js version           | 18+               |
| Install node modules      | Si (o subirlos)   |

### 2.3 Subir archivos

**Opcion A: File Manager de Hostinger**
1. Ir a **File Manager**
2. Navegar a `public_html/`
3. Subir toda la carpeta `backend/`
4. Subir el contenido de `frontend/dist/` a una subcarpeta `frontend/`

**Opcion B: Git (recomendado)**
1. Conectar repositorio via SSH
2. Clonar el proyecto
3. Ejecutar build en el servidor

```bash
# Via SSH en Hostinger
cd ~/junta-atlantico-pse/backend
npm install --production
npm run build
```

---

## 3. Variables de Entorno

Crear/editar `backend/.env` en el servidor:

```bash
# ============================================
# CONFIGURACION PSE - CERTIFICACION
# ============================================
PSE_ENV=cert

# Credenciales OAuth 2.0 (solicitar a ACH Colombia)
PSE_API_KEY=tu-api-key-aqui
PSE_CLIENT_ID=tu-client-id-aqui
PSE_CLIENT_SECRET=tu-client-secret-aqui

# Credenciales cifrado AES-256-GCM
PSE_ENCRYPTION_KEY=base64-32-bytes-key
PSE_ENCRYPTION_IV=base64-12-bytes-iv

# Datos empresa
PSE_ENTITY_CODE=901234567-8
PSE_SERVICE_CODE=XXXXX
PSE_CIIU_CATEGORY=8692
PSE_COMPANY_NAME=JUNTA REGIONAL DE CALIFICACION DE INVALIDEZ DEL ATLANTICO

# URLs PSE - CERTIFICACION
PSE_TOKEN_URL=https://apicer.pse.com.co/oauth/client_credential/accesstoken?grant_type=client_credentials
PSE_API_BASE_URL=https://apicer.pse.com.co/v2/psewebapinf/api
PSE_RETURN_URL=https://www.juntaatlantico.co/retorno-pago

# Seguridad
RECAPTCHA_SECRET=tu-recaptcha-secret
RECAPTCHA_SCORE_MIN=0.5
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQ=10

# Servidor
PORT=3000
NODE_ENV=production
ALLOWED_ORIGIN=https://www.juntaatlantico.co
```

**IMPORTANTE**: Cambiar a URLs de produccion (`apiprd.pse.com.co`) cuando pase la certificacion.

---

## 4. Configurar PM2

### 4.1 Editar ecosystem.config.js

```javascript
module.exports = {
  apps: [{
    name: 'pse-backend',
    script: 'dist/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '256M',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: 'logs/err.log',
    out_file: 'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

### 4.2 Iniciar con PM2

```bash
cd ~/junta-atlantico-pse/backend
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 4.3 Verificar estado

```bash
pm2 status
pm2 logs pse-backend
```

---

## 5. Configurar Proxy Reverso (Nginx)

En Hostinger, ir a **Advanced** > **Nginx Config**:

```nginx
server {
    listen 80;
    server_name www.juntaatlantico.co;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name www.juntaatlantico.co;

    ssl_certificate /etc/letsencrypt/live/juntaatlantico.co/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/juntaatlantico.co/privkey.pem;

    # Frontend estatico
    location / {
        root /home/u123456789/domains/juntaatlantico.co/public_html/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # API Backend
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**NOTA**: Ajustar la ruta `/home/u123456789/` segun el usuario de Hostinger.

---

## 6. SSL con Let's Encrypt

1. En hPanel ir a **SSL** > **Let's Encrypt**
2. Seleccionar dominio `juntaatlantico.co`
3. Click **Install**
4. Verificar que **Force HTTPS** este activado

---

## 7. Verificacion post-deploy

### 7.1 Test de salud

```bash
curl https://www.juntaatlantico.co/api/pse/health
```

Respuesta esperada:
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

### 7.2 Test de bancos

```bash
curl https://www.juntaatlantico.co/api/pse/banks
```

### 7.3 Verificar frontend

Abrir `https://www.juntaatlantico.co` en el navegador.

---

## 8. Troubleshooting

### Error: Cannot find module './dist/server.js'

```bash
cd backend
npm run build
```

### Error: EACCES permission denied

```bash
chmod -R 755 ~/junta-atlantico-pse/backend/dist
```

### Error: Port already in use

```bash
pm2 delete pse-backend
pm2 start ecosystem.config.js
```

### Logs no se escriben

```bash
mkdir -p ~/junta-atlantico-pse/backend/logs
chmod 755 ~/junta-atlantico-pse/backend/logs
```

### CORS error en frontend

Verificar que `ALLOWED_ORIGIN` en `.env` coincida con el dominio exacto.

---

## 9. Comandos utiles

```bash
# Ver estado
pm2 status

# Reiniciar
pm2 restart pse-backend

# Ver logs
pm2 logs pse-backend

# Detener
pm2 stop pse-backend

# Monitoreo en tiempo real
pm2 monit
```

---

## 10. Estructura de archivos en servidor

```
~/junta-atlantico-pse/
├── backend/
│   ├── dist/
│   │   ├── server.js
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   └── utils/
│   ├── logs/
│   │   ├── app.log
│   │   └── error.log
│   ├── node_modules/
│   ├── package.json
│   ├── ecosystem.config.js
│   └── .env
├── frontend/
│   └── dist/
│       ├── index.html
│       └── assets/
└── docs/
```
