# Integracion Hexnode (KOVIX)

Esta integracion permite que KOVIX aplique politicas de Hexnode automaticamente cuando cambia el estado del dispositivo.

## Variables requeridas (`backend/.env`)

```env
HEXNODE_PORTAL=tu_subdominio
HEXNODE_API_KEY=tu_api_key_hexnode
HEXNODE_POLICY_ACTIVO=KOVIX_ACTIVO
HEXNODE_POLICY_PAGO_PENDIENTE=KOVIX_ACTIVO
HEXNODE_POLICY_SOLO_LLAMADAS=KOVIX_BLOQUEADO
HEXNODE_POLICY_BLOQUEADO=KOVIX_BLOQUEADO TOTAL
```

Opcional para pruebas con un unico equipo:

```env
HEXNODE_DEFAULT_DEVICE_ID=123
```

## Mapeo de estado KOVIX -> politica Hexnode

- `ACTIVO` -> `HEXNODE_POLICY_ACTIVO`
- `PAGO_PENDIENTE` -> `HEXNODE_POLICY_PAGO_PENDIENTE` (por defecto usa `KOVIX_ACTIVO`)
- `SOLO_LLAMADAS` -> `HEXNODE_POLICY_SOLO_LLAMADAS`
- `BLOQUEADO` -> `HEXNODE_POLICY_BLOQUEADO`

## Flujo automatico

Cuando KOVIX cambia estado:

1. Remueve politicas KOVIX anteriores del equipo (si existen).
2. Asocia la politica destino.
3. Ejecuta `scan_device` para que el cambio llegue rapido al telefono.

## Endpoint manual de prueba

`POST /devices/:id/sync-hexnode`

Aplica en Hexnode la politica correspondiente al estado actual del equipo.
