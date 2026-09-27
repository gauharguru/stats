<#
  AHS Fee Manager - install a new version. Settings (server\.env) and all data are kept.
    1. Get the new code:  if this folder is a git clone it is pulled automatically;
       otherwise extract the new ZIP over this folder first (server\.env is not in the ZIP).
    2. Run in PowerShell as Administrator:
         powershell -ExecutionPolicy Bypass -File deploy\windows\update.ps1
  Take a database backup before updating.
#>
$ErrorActionPreference = 'Stop'
$AppDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
function Run($exe, [string[]]$argList) {
  & $exe @argList
  if ($LASTEXITCODE -ne 0) { throw "$exe $($argList -join ' ') failed (exit $LASTEXITCODE)" }
}

Push-Location $AppDir
try {
  if ((Test-Path '.git') -and (Get-Command git -ErrorAction SilentlyContinue)) { Run 'git' @('pull', '--ff-only') }
  Stop-Service 'AHS-SFM-Caddy', 'AHS-SFM' -Force -ErrorAction SilentlyContinue
  Run 'npm' @('--prefix', 'server', 'ci')
  Run 'npm' @('--prefix', 'web', 'ci')
  Run 'npm' @('run', 'build')
  Run 'npm' @('run', 'db:setup')   # applies only the new database scripts
} finally {
  Pop-Location
  Start-Service 'AHS-SFM'
  Start-Service 'AHS-SFM-Caddy' -ErrorAction SilentlyContinue
}
Write-Host 'Updated and restarted.' -ForegroundColor Green
