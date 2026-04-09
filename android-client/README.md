# KOVIX Android Client (Starter)

Este modulo es un esqueleto funcional para Android Studio que consume:

- `GET /devices/client/:installCode/status`
- `POST /devices/client/:installCode/heartbeat`

## 1) Abrir en Android Studio

1. Open Project
2. Selecciona la carpeta `android-client`
3. Espera sincronizacion de Gradle

## 2) Configuracion inicial en la app

En la pantalla principal llena:

- `Base URL`: para emulador usa `http://10.0.2.2:4000`
- `Install Code`: codigo del dispositivo creado en panel web
- `Client Secret`: secreto del dispositivo (visible en dashboard web)

Luego pulsa:

- `Guardar config`
- `Sincronizar`

## 3) Flujo esperado

- La app consulta estado y pinta pantalla por:
  - `ACTIVO`
  - `PAGO_PENDIENTE`
  - `SOLO_LLAMADAS`
  - `BLOQUEADO`
- Envia heartbeat para actualizar `lastSeenAt` en backend.
- Repite polling cada 5 minutos.
- Tambien ejecuta sincronizacion en segundo plano (Foreground Service).

## 4) Notas

- La efectividad total depende de activar Device Owner en equipos de fabrica.
- Si no se activa Device Owner, la app funciona en modo estandar (sin control total del sistema).

## 5) Device Owner (bloqueo real para equipos de caja)

La app ya incluye estructura de administracion empresarial:

- `DeviceAdminReceiver`
- politicas de `DevicePolicyManager`
- modo kiosco (`Lock Task`)
- restriccion de desinstalacion (`DISALLOW_UNINSTALL_APPS`)

### Activacion para pruebas (dispositivo limpio / emulador reset)

1. Instala la app en el dispositivo.
2. Ejecuta:

```bash
adb shell dpm set-device-owner com.kovix.client/.admin.KovixDeviceAdminReceiver
```

3. Abre la app. Debe mostrar: `Modo de control: DEVICE OWNER ACTIVO`.

### Importante

- Este comando solo funciona en equipos sin cuentas/configuracion previa (estado casi fabrica).
- Para produccion en volumen, se recomienda aprovisionamiento empresarial (QR/zero-touch) desde entrega.

## 6) Push inmediato (FCM)

La app ya incluye recepcion de mensajes push para reaccionar al cambio de estado casi en tiempo real.

Pasos de configuracion:

1. Crea proyecto Firebase y agrega app Android con package `com.kovix.client`.
2. Descarga `google-services.json` y colocalo en:

```text
android-client/app/google-services.json
```

3. Compila e instala la app nuevamente.
4. El backend debe tener variables Firebase configuradas (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`).

Si FCM no esta configurado, el sistema sigue funcionando por polling en segundo plano.

## 7) Build de produccion (APK/AAB firmado)

### 7.1 Crear keystore de release (una sola vez)

En PowerShell, dentro de `android-client`:

```powershell
keytool -genkeypair -v -keystore release-keystore.jks -alias kovix_release -keyalg RSA -keysize 2048 -validity 10000
```

### 7.2 Configurar `key.properties`

1. Copia el archivo de ejemplo:

```powershell
Copy-Item key.properties.example key.properties
```

2. Edita `key.properties` con tus datos reales:

```properties
storeFile=release-keystore.jks
storePassword=TU_PASSWORD
keyAlias=kovix_release
keyPassword=TU_PASSWORD
```

> `key.properties` y el keystore ya quedan ignorados por Git.

### 7.3 Generar artefactos release

```powershell
.\gradlew.bat clean assembleRelease
.\gradlew.bat bundleRelease
```

Salidas:

- APK: `app/build/outputs/apk/release/app-release.apk`
- AAB (Play Store): `app/build/outputs/bundle/release/app-release.aab`

### 7.4 Default de API en release

En build `release`, la app ya usa por defecto:

- `https://api.kovixec.com`

En `debug` mantiene:

- `http://10.0.2.2:4000`

Si quieres cambiar el dominio productivo, actualiza `DEFAULT_BASE_URL` en `app/build.gradle.kts` (buildType `release`).
