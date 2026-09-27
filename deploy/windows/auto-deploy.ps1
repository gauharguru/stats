<#
  AHS Fee Manager - automatic update. install.ps1 runs this every 5 minutes as a
  scheduled task ("AHS-SFM Auto Update"). Nothing connects to this server from
  outside: it only reads the public GitHub repository.

  When a new version has been pushed to the tracked branch it
    1. downloads it and builds it (the running software keeps working meanwhile)
    2. backs up the database if the new version changes the database
    3. stops the software, applies the database changes, starts the new version
    4. checks that the new version answers; if not, goes back to the old version
  Software and database are always updated together; the software refuses to
  start on a database that is not up to date.

  Log: C:\AHS-SFM-tools\logs\deploy.log     Run by hand:  auto-deploy.ps1 -Force
#>
param(
  [string]$Branch = '',
  [string]$ToolsDir = 'C:\AHS-SFM-tools',
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$AppDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$Log = "$ToolsDir\logs\deploy.log"
$Lock = "$ToolsDir\deploy.lock"
New-Item -ItemType Directory -Force -Path "$ToolsDir\logs" | Out-Null
$env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + $env:Path
# never wait for a login prompt (the GitHub login for a private repository is stored by install.ps1)
$env:GIT_TERMINAL_PROMPT = '0'; $env:GCM_INTERACTIVE = 'never'

function LogLine($t) { $l = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')  $t"; Add-Content -Path $Log -Value $l; Write-Host $l }
function Run($exe, [string[]]$argList) {
  $ErrorActionPreference = 'Continue'   # npm/git write progress and warnings to stderr
  $out = & $exe @argList 2>&1
  $code = $LASTEXITCODE
  $out | ForEach-Object { Add-Content -Path $Log -Value "    $_" }
  if ($code -ne 0) { throw "$exe $($argList -join ' ') failed (exit $code)" }
}
function GitOut([string[]]$argList) { $ErrorActionPreference = 'Continue'; return (& git -C $AppDir @argList 2>$null) }
function Healthy($commit) {
  for ($i = 0; $i -lt 45; $i++) {
    Start-Sleep -Seconds 2
    try {
      $h = Invoke-RestMethod 'http://127.0.0.1:4000/api/health' -TimeoutSec 3
      if ($h.ok -and ($h.version -eq $commit)) { return $true }
    } catch { }
  }
  return $false
}
function Build($commit) {
  Push-Location $AppDir
  try {
    Run 'npm' @('--prefix', 'server', 'ci', '--no-audit', '--no-fund')
    Run 'npm' @('--prefix', 'web', 'ci', '--no-audit', '--no-fund')
    Run 'npm' @('run', 'build')
    $v = @{ commit = $commit; deployedAt = (Get-Date).ToUniversalTime().ToString('o') } | ConvertTo-Json -Compress
    [IO.File]::WriteAllText((Join-Path $AppDir (Join-Path "server" (Join-Path "dist" "version.json"))), $v, (New-Object Text.UTF8Encoding($false)))
  } finally { Pop-Location }
}

# one run at a time (a build can take longer than 5 minutes)
if (Test-Path $Lock) {
  if ((Get-Item $Lock).LastWriteTime -gt (Get-Date).AddMinutes(-60)) { exit 0 }
  Remove-Item $Lock -Force
}
New-Item -ItemType File -Path $Lock -Force | Out-Null
try {
  if (-not $Branch) { $Branch = (GitOut @('rev-parse', '--abbrev-ref', 'HEAD')) }
  Run 'git' @('-C', $AppDir, 'fetch', '--quiet', 'origin', $Branch)
  $old = (GitOut @('rev-parse', 'HEAD'))
  $new = (GitOut @('rev-parse', "origin/$Branch"))
  $running = $null
  try { $running = (Invoke-RestMethod 'http://127.0.0.1:4000/api/health' -TimeoutSec 3).version } catch { }
  if (($old -eq $new) -and ($running -eq $new) -and -not $Force) { exit 0 }
  # a version that failed once is not retried every 5 minutes; wait for a newer one (or -Force)
  $failedFile = Join-Path $ToolsDir 'failed-version.txt'
  if ((Test-Path $failedFile) -and ((Get-Content $failedFile -Raw).Trim() -eq $new) -and -not $Force) { exit 0 }

  $short = $new.Substring(0, 7)
  LogLine "New version $short on '$Branch' (running: $(if ($running) { $running } else { 'unknown' })) - updating"
  $dbChanged = $old -ne $new -and [bool](GitOut @('diff', '--name-only', $old, $new, '--', 'database/migrations'))

  # 1. new code + build while the current version keeps serving
  Run 'git' @('-C', $AppDir, 'reset', '--hard', '--quiet', $new)
  try {
    Build $new
  } catch {
    LogLine "Build failed - staying on the current version. $_"
    Run 'git' @('-C', $AppDir, 'reset', '--hard', '--quiet', $old)
    Build $old
    throw
  }

  # 2. safety backup when the database will change
  Push-Location $AppDir
  try { Run 'npm' @('run', 'db:backup') } finally { Pop-Location }

  # 3. switch: stop, update database, start
  Stop-Service 'AHS-SFM' -Force
  $migrated = $false
  try {
    Push-Location $AppDir
    try { Run 'npm' @('run', 'db:setup') } finally { Pop-Location }
    $migrated = $true
  } catch {
    # each database script runs in a transaction, so a failed one leaves the database unchanged
    LogLine "Database update failed - going back to the previous version. $_"
    Run 'git' @('-C', $AppDir, 'reset', '--hard', '--quiet', $old)
    Build $old
    Start-Service 'AHS-SFM'
    throw
  }
  Start-Service 'AHS-SFM'
  Start-Service 'AHS-SFM-Caddy' -ErrorAction SilentlyContinue

  # 4. check
  if (Healthy $new) {
    LogLine "Updated to $short$(if ($dbChanged) { ' (database updated)' }) - OK"
  } else {
    if ($dbChanged -and $migrated) {
      # the database already has the new structure; old code would refuse to start on it
      LogLine "WARNING: $short does not answer after the database update. See $ToolsDir\logs\AHS-SFM*.log. The pre-update backup is in SQL Server's backup folder."
    } else {
      LogLine "$short does not answer - going back to the previous version."
      Stop-Service 'AHS-SFM' -Force
      Run 'git' @('-C', $AppDir, 'reset', '--hard', '--quiet', $old)
      Build $old
      Start-Service 'AHS-SFM'
    }
    Set-Content -Path (Join-Path $ToolsDir 'failed-version.txt') -Value $new
    exit 1
  }
} catch {
  LogLine "Update failed: $_"
  if ($new) { Set-Content -Path (Join-Path $ToolsDir 'failed-version.txt') -Value $new }
  exit 1
} finally {
  Remove-Item $Lock -Force -ErrorAction SilentlyContinue
}
