# KOVIX Android API Contract

Este documento define los endpoints que debe consumir la app Android del dispositivo vendido.

## 1) Credenciales del dispositivo

Cada dispositivo registrado en panel admin tiene:

- `installCode` (identificador funcional)
- `clientSecret` (secreto privado del cliente Android)

La app Android debe enviar `clientSecret` en header:

- `x-client-secret: <clientSecret>`

## 2) Obtener estado del dispositivo

- `GET /devices/client/:installCode/status`

Headers obligatorios:

- `x-client-secret`

Respuestas:

- `200`: estado actual disponible
- `401`: secreto faltante o invalido
- `404`: dispositivo no encontrado

Ejemplo `200`:

```json
{
  "ok": true,
  "device": {
    "id": "cmxxx",
    "installCode": "KOVIX-ABC-01",
    "status": "PAGO_PENDIENTE",
    "customerName": "Juan Perez",
    "message": "Tienes un pago pendiente. Regulariza para evitar restricciones.",
    "updatedAt": "2026-03-30T19:00:00.000Z",
    "policy": {
      "nextCheckInSeconds": 300,
      "warningAfterDaysLate": 1,
      "callsOnlyAfterDaysLate": 7,
      "blockedAfterDaysLate": 30
    }
  }
}
```

## 3) Heartbeat de la app Android

- `POST /devices/client/:installCode/heartbeat`

Headers obligatorios:

- `x-client-secret`

Body opcional:

```json
{
  "battery": 0.74,
  "appVersion": "1.0.0"
}
```

Actualmente el backend usa heartbeat para actualizar:

- `isRegistered = true`
- `lastSeenAt = now`

Respuestas:

- `200`: heartbeat aceptado
- `401`: secreto faltante o invalido
- `404`: dispositivo no encontrado

## 4) Estados funcionales esperados en Android

- `ACTIVO`: uso normal.
- `PAGO_PENDIENTE`: advertencia visible.
- `SOLO_LLAMADAS`: modo restringido.
- `BLOQUEADO`: pantalla de bloqueo por incumplimiento.

## 5) Recomendacion cliente Android

- Polling cada `policy.nextCheckInSeconds` segundos.
- Forzar reintento con backoff cuando no haya red.
- Mostrar ultima hora de sincronizacion para soporte tecnico.

## 6) Operacion desde panel admin

Para seguridad operativa, el backend incluye:

- `POST /devices/:id/rotate-client-secret`

Esto permite invalidar secretos antiguos y forzar actualizacion del cliente Android.
