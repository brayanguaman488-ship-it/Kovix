param(
  [Parameter(Mandatory = $true)]
  [string]$BackupFile,
  [string]$ComposeFile = "docker-compose.yml",
  [string]$DbService = "db",
  [string]$DbUser = "kovix",
  [string]$DbName = "kovix_db",
  [switch]$Force
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $BackupFile)) {
  throw "No existe el archivo de backup: $BackupFile"
}

if (-not $Force) {
  Write-Host "ATENCION: Esta operacion reemplaza datos actuales de la base '$DbName'."
  $confirmation = Read-Host "Escribe SI para continuar"
  if ($confirmation -ne "SI") {
    Write-Host "Operacion cancelada."
    exit 1
  }
}

$containerId = docker compose -f $ComposeFile ps -q $DbService
if (-not $containerId) {
  throw "No se encontro contenedor del servicio '$DbService'. Verifica que este arriba."
}

$backupName = [System.IO.Path]::GetFileName($BackupFile)
$containerPath = "/tmp/$backupName"

Write-Host "Copiando backup al contenedor..."
docker cp $BackupFile "${containerId}:$containerPath" | Out-Null

Write-Host "Reiniciando esquema public..."
docker exec $containerId psql -U $DbUser -d $DbName -c "DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;" | Out-Null

Write-Host "Restaurando backup..."
docker exec $containerId pg_restore -U $DbUser -d $DbName --no-owner --no-privileges $containerPath | Out-Null

Write-Host "Limpiando archivo temporal..."
docker exec $containerId rm -f $containerPath | Out-Null

Write-Host "Restore completado desde: $BackupFile"
