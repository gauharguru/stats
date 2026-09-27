<#
  AHS Fee Manager - install the latest version now instead of waiting for the
  5-minute automatic update. Settings (server\.env) and data are kept; the
  database is backed up first if the new version changes it.
    powershell -ExecutionPolicy Bypass -File deploy\windows\update.ps1
#>
& (Join-Path $PSScriptRoot 'auto-deploy.ps1') -Force
exit $LASTEXITCODE
