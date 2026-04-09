# KOVIX en Railway (Guia Rapida)

Esta guia publica todo KOVIX en Railway:

- `PostgreSQL` (base de datos)
- `backend` (API Express + Prisma)
- `web` (Next.js panel)

## 1) Crear proyecto en Railway

1. Entra a Railway y crea un proyecto nuevo.
2. Agrega servicio `PostgreSQL` desde plantilla.
3. Conecta tu repositorio GitHub con el proyecto.

## 2) Desplegar Backend

1. Crea servicio nuevo desde repo.
2. Selecciona carpeta raiz del servicio: `backend`.
3. Configura:
   - Build Command: `npm install`
   - Start Command: `npm run start`
4. Variables de entorno (backend):
   - `DATABASE_URL` = variable interna de Railway PostgreSQL
   - `JWT_SECRET` = secreto largo
   - `ADMIN_USERNAME` = usuario admin inicial
   - `ADMIN_PASSWORD` = clave admin inicial
   - `WEB_ORIGIN` = URL publica de tu web (`https://panel...`)
   - `PORT` = Railway la inyecta automaticamente (opcional no fijar)
   - `FIREBASE_PROJECT_ID` (si usas push inmediato)
   - `FIREBASE_CLIENT_EMAIL` (si usas push inmediato)
   - `FIREBASE_PRIVATE_KEY` (si usas push inmediato, conservar `\n`)
5. En consola del backend, ejecuta una vez:
   - `npm run prisma:migrate:deploy`

## 3) Desplegar Web

1. Crea otro servicio desde repo.
2. Selecciona carpeta raiz: `web`.
3. Configura:
   - Build Command: `npm run build`
   - Start Command: `npm run start`
4. Variables de entorno (web):
   - `NEXT_PUBLIC_API_BASE` = URL publica del backend (`https://api...`)
   - `PORT` = Railway la inyecta automaticamente

## 4) Dominios

Recomendado:

- `api.tudominio.com` -> backend
- `panel.tudominio.com` -> web

En backend actualiza `WEB_ORIGIN` con el dominio final del panel.

## 5) Verificaciones rapidas

1. Backend:
   - `GET https://api.tudominio.com/health` debe responder `{ ok: true }`
2. Web:
   - Login con admin funcionando.
3. Flujo:
   - Cambiar estado de dispositivo desde panel y verificar Android.

## 6) Android para produccion

1. En la app cliente usa `baseUrl = https://api.tudominio.com`.
2. Para Device Owner por QR, en dashboard completa:
   - URL publica del APK
   - SHA-256 Base64 del mismo APK exacto
3. Si usas push inmediato:
   - `google-services.json` en `android-client/app/`
   - Firebase variables activas en backend.
