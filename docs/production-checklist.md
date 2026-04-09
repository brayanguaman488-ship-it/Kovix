# KOVIX Production Checklist

## 1. Variables y secretos

1. Copia `.env.prod.example` a `.env.prod`.
2. Define valores reales:
   - `WEB_DOMAIN`
   - `API_DOMAIN`
   - `POSTGRES_PASSWORD`
   - `JWT_SECRET`
   - `ADMIN_PASSWORD`
3. No publiques `.env.prod` en repositorios.

## 2. Levantar stack productivo con HTTPS

1. Asegura que `WEB_DOMAIN` y `API_DOMAIN` apunten al servidor (DNS A/AAAA).
2. Ejecuta:

```powershell
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

3. Verifica:
   - `https://$WEB_DOMAIN`
   - `https://$API_DOMAIN/health`

## 3. Backup de base de datos

Generar backup:

```powershell
powershell -ExecutionPolicy Bypass -File .\ops\backup-db.ps1 -OutputDir .\backups -ComposeFile docker-compose.prod.yml -DbUser kovix -DbName kovix_db
```

## 4. Restore de base de datos

Restaurar backup (destructivo):

```powershell
powershell -ExecutionPolicy Bypass -File .\ops\restore-db.ps1 -BackupFile .\backups\kovix-backup-YYYYMMDD-HHMMSS.dump -ComposeFile docker-compose.prod.yml -DbUser kovix -DbName kovix_db -Force
```

## 5. Operacion diaria recomendada

1. Programar backup diario y retencion (minimo 7-14 dias).
2. Monitorear salud de servicios con:

```powershell
docker compose -f docker-compose.prod.yml ps
```

3. Revisar logs cuando haya incidentes:

```powershell
docker compose -f docker-compose.prod.yml logs backend --tail 200
docker compose -f docker-compose.prod.yml logs web --tail 200
docker compose -f docker-compose.prod.yml logs db --tail 200
```

## 6. Seguridad minima obligatoria

1. Cambiar `ADMIN_PASSWORD` despues del primer ingreso.
2. Usar `JWT_SECRET` largo, aleatorio y unico.
3. Limitar acceso SSH al servidor por IP o clave publica.
4. No exponer `5432` a internet.
5. Mantener Docker y sistema operativo actualizados.
