param(
  [string]$OutputDir = ".\backups",
  [string]$ComposeFile = "docker-compose.yml",
  [string]$DbService = "db",
  [string]$DbUser = "kovix",
  [string]$DbName = "kovix_db"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $OutputDir)) {
  New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$containerId = docker compose -f $ComposeFile ps -q $DbService
if (-not $containerId) {
  throw "No se encontro contenedor del servicio '$DbService'. Verifica que este arriba."
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupName = "kovix-backup-$timestamp.dump"
$hostPath = Join-Path $OutputDir $backupName
$containerPath = "/tmp/$backupName"

Write-Host "Generando backup dentro del contenedor..."
docker exec $containerId pg_dump -U $DbUser -d $DbName -Fc -f $containerPath | Out-Null

Write-Host "Copiando backup al host: $hostPath"
docker cp "${containerId}:$containerPath" $hostPath | Out-Null

Write-Host "Limpiando archivo temporal en contenedor..."
docker exec $containerId rm -f $containerPath | Out-Null

Write-Host "Backup completado: $hostPath"
