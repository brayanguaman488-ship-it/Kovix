# KOVIX Ops Scripts

## Backup

```powershell
powershell -ExecutionPolicy Bypass -File .\ops\backup-db.ps1 -OutputDir .\backups
```

## Restore

```powershell
powershell -ExecutionPolicy Bypass -File .\ops\restore-db.ps1 -BackupFile .\backups\archivo.dump -Force
```

Puedes usar `-ComposeFile docker-compose.prod.yml` para operar sobre stack productivo.
