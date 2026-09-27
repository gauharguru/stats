<#
  AHS Fee Manager - one-time installer for the college's Windows server.

  What it does
    1. checks Node.js (installs the LTS version with winget if missing)
    2. asks for the SQL Server connection and writes server\.env
       (optionally creates the database + a dedicated SQL login)
    3. builds the software and creates / updates the database tables
    4. installs two Windows services that start automatically:
         AHS-SFM        the fee software (listens only on 127.0.0.1:4000)
         AHS-SFM-Caddy  HTTPS web server for the domain (free Let's Encrypt
                        certificate, renewed automatically)
    5. opens ports 80 and 443 in Windows Firewall

  Before running
    - In the domain's DNS (cPanel -> Zone Editor) add an A record:
        fees  ->  <public IP of this server>
    - Run in PowerShell *as Administrator* from the extracted folder:
        powershell -ExecutionPolicy Bypass -File deploy\windows\install.ps1
    - Re-running is safe: existing settings (.env) and data are kept.
#>
param(
  [string]$Domain = 'fees.ahscollege.ac.in',
  [string]$ToolsDir = 'C:\AHS-SFM-tools'
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$AppDir = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$ServerDir = Join-Path $AppDir 'server'
$EnvFile = Join-Path $ServerDir '.env'

function Step($t) { Write-Host ''; Write-Host "==> $t" -ForegroundColor Cyan }
function Warn($t) { Write-Host "    ! $t" -ForegroundColor Yellow }
function Ask($q, $default) {
  $a = Read-Host "$q [$default]"
  if ([string]::IsNullOrWhiteSpace($a)) { return $default } else { return $a.Trim() }
}
function AskSecret($q) {
  $s = Read-Host $q -AsSecureString
  return [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($s))
}
function RandomHex($bytes) {
  $b = New-Object byte[] $bytes
  [Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($b)
  return -join ($b | ForEach-Object { $_.ToString('x2') })
}
# .env value: quoted so that '#', spaces etc. are kept
function EnvValue($v) { if ($v -notmatch "'") { return "'$v'" } else { return '"' + $v + '"' } }
function Run($exe, [string[]]$argList) {
  & $exe @argList
  if ($LASTEXITCODE -ne 0) { throw "$exe $($argList -join ' ') failed (exit $LASTEXITCODE)" }
}

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
  throw 'Please run PowerShell as Administrator.'
}
Write-Host "AHS Fee Manager installer - folder $AppDir, address https://$Domain" -ForegroundColor Green

# ---------------------------------------------------------------- 1. Node.js
Step 'Checking Node.js'
$node = Get-Command node -ErrorAction SilentlyContinue
$needNode = $true
if ($node) {
  $v = (& node -v).TrimStart('v').Split('.')[0]
  if ([int]$v -ge 20) { $needNode = $false; Write-Host "    Node.js $(& node -v) found" }
}
if ($needNode) {
  if (Get-Command winget -ErrorAction SilentlyContinue) {
    Run 'winget' @('install', '-e', '--id', 'OpenJS.NodeJS.LTS', '--accept-source-agreements', '--accept-package-agreements')
    $env:Path = [Environment]::GetEnvironmentVariable('Path', 'Machine') + ';' + [Environment]::GetEnvironmentVariable('Path', 'User')
  } else {
    throw 'Node.js 20 or newer is needed. Install the LTS version from https://nodejs.org, then run this script again.'
  }
}
$NodeExe = (Get-Command node).Source

# ---------------------------------------------------------------- 2. settings
Step 'Database connection settings'
if (Test-Path $EnvFile) {
  Write-Host "    Keeping existing settings in $EnvFile (delete it to enter them again)"
} else {
  $dbServer = Ask 'SQL Server name or IP (as used in SSMS; for a named instance use its fixed port)' 'localhost'
  $dbPort = Ask 'SQL Server port' '1433'
  $dbName = Ask 'Database name' 'AHS_SFM'
  $dbUser = Ask 'SQL login the software will use' 'ahs_app'
  $dbPass = AskSecret "Password for SQL login '$dbUser'"
  $adminPass = AskSecret "First password for the software's 'admin' user (must be changed at first login)"

  $create = Ask "Create database '$dbName' and login '$dbUser' now using your Windows login (needs sysadmin on SQL Server)? Y/N" 'Y'
  if ($create -match '^[Yy]') {
    $sqlcmd = Get-Command sqlcmd -ErrorAction SilentlyContinue
    if (-not $sqlcmd) {
      Warn 'sqlcmd not found - create the database and login in SSMS (see deploy\windows\create-login.sql).'
    } else {
      $p = $dbPass.Replace("'", "''")
      $q = @"
IF DB_ID(N'$dbName') IS NULL CREATE DATABASE [$dbName];
IF SUSER_ID(N'$dbUser') IS NULL CREATE LOGIN [$dbUser] WITH PASSWORD = N'$p', CHECK_POLICY = ON, DEFAULT_DATABASE = [$dbName];
"@
      $q2 = @"
IF USER_ID(N'$dbUser') IS NULL CREATE USER [$dbUser] FOR LOGIN [$dbUser];
ALTER ROLE db_owner ADD MEMBER [$dbUser];
"@
      $target = if ($dbPort -eq '1433') { $dbServer } else { "$dbServer,$dbPort" }
      Run 'sqlcmd' @('-S', $target, '-E', '-C', '-b', '-Q', $q)
      Run 'sqlcmd' @('-S', $target, '-E', '-C', '-b', '-d', $dbName, '-Q', $q2)
      Write-Host "    Database and login ready"
    }
  }

  $lines = @(
    '# Written by deploy\windows\install.ps1',
    "DB_SERVER=$dbServer",
    "DB_PORT=$dbPort",
    "DB_NAME=$dbName",
    "DB_USER=$dbUser",
    "DB_PASSWORD=$(EnvValue $dbPass)",
    'DB_ENCRYPT=false',
    'DB_TRUST_SERVER_CERTIFICATE=true',
    'PORT=4000',
    'HOST=127.0.0.1',
    'NODE_ENV=production',
    "JWT_SECRET=$(RandomHex 48)",
    'JWT_HOURS=10',
    'BUSINESS_TIMEZONE=Asia/Kolkata',
    'ADMIN_USERNAME=admin',
    "ADMIN_PASSWORD=$(EnvValue $adminPass)"
  )
  [IO.File]::WriteAllText($EnvFile, ($lines -join "`r`n") + "`r`n", (New-Object Text.UTF8Encoding($false)))
  # only Administrators and SYSTEM may read the passwords
  & icacls $EnvFile /inheritance:r /grant:r '*S-1-5-32-544:F' '*S-1-5-18:F' | Out-Null
  Write-Host "    Saved $EnvFile"
}

# ---------------------------------------------------------------- 3. build + database
Step 'Installing packages and building (a few minutes)'
foreach ($svc in 'AHS-SFM-Caddy', 'AHS-SFM') {
  if ((Get-Service -Name $svc -ErrorAction SilentlyContinue).Status -eq 'Running') { Stop-Service $svc -Force }
}
Push-Location $AppDir
try {
  Run 'npm' @('--prefix', 'server', 'ci')
  Run 'npm' @('--prefix', 'web', 'ci')
  Run 'npm' @('run', 'build')
  Step 'Creating / updating database tables'
  Run 'npm' @('run', 'db:setup')
} finally { Pop-Location }

# ---------------------------------------------------------------- 4. services
Step 'Downloading service tools'
New-Item -ItemType Directory -Force -Path $ToolsDir, "$ToolsDir\caddy-data", "$ToolsDir\logs" | Out-Null
$winsw = "$ToolsDir\winsw.exe"
if (-not (Test-Path $winsw)) {
  Invoke-WebRequest 'https://github.com/winsw/winsw/releases/download/v2.12.0/WinSW-x64.exe' -OutFile $winsw -UseBasicParsing
}
$caddy = "$ToolsDir\caddy.exe"
if (-not (Test-Path $caddy)) {
  Invoke-WebRequest 'https://caddyserver.com/api/download?os=windows&arch=amd64' -OutFile $caddy -UseBasicParsing
}

@"
# HTTPS for the fee software. Certificates are obtained and renewed automatically.
$Domain {
	encode gzip
	reverse_proxy 127.0.0.1:4000
}
"@ | Set-Content -Path "$ToolsDir\Caddyfile" -Encoding ASCII

function Install-Svc($id, $name, $desc, $exe, $arguments, $workdir, [string]$extra = '') {
  $svcExe = "$ToolsDir\$id.exe"
  $existing = Get-Service -Name $id -ErrorAction SilentlyContinue
  if ($existing) {
    if ($existing.Status -ne 'Stopped') { Stop-Service $id -Force }
    & $svcExe uninstall | Out-Null
    Start-Sleep -Seconds 2
  }
  Copy-Item $winsw $svcExe -Force
  @"
<service>
  <id>$id</id>
  <name>$name</name>
  <description>$desc</description>
  <executable>$exe</executable>
  <arguments>$arguments</arguments>
  <workingdirectory>$workdir</workingdirectory>
  <startmode>Automatic</startmode>
  <onfailure action="restart" delay="10 sec"/>
  <resetfailure>1 hour</resetfailure>
  <logpath>$ToolsDir\logs</logpath>
  <log mode="roll-by-size"><sizeThreshold>10240</sizeThreshold><keepFiles>8</keepFiles></log>
  $extra
</service>
"@ | Set-Content -Path "$ToolsDir\$id.xml" -Encoding UTF8
  Run $svcExe @('install')
}

Step 'Installing Windows services'
Install-Svc 'AHS-SFM' 'AHS Fee Manager' 'AHS Nursing College fee software (API + web app on 127.0.0.1:4000)' `
  $NodeExe 'dist\index.js' $ServerDir '<env name="NODE_ENV" value="production"/>'
Install-Svc 'AHS-SFM-Caddy' 'AHS Fee Manager HTTPS' "HTTPS for https://$Domain" `
  $caddy "run --config `"$ToolsDir\Caddyfile`" --adapter caddyfile" $ToolsDir `
  "<env name=`"XDG_DATA_HOME`" value=`"$ToolsDir\caddy-data`"/><env name=`"XDG_CONFIG_HOME`" value=`"$ToolsDir\caddy-data`"/><depend>AHS-SFM</depend>"

Step 'Opening ports 80 and 443 in Windows Firewall'
if (-not (Get-NetFirewallRule -DisplayName 'AHS Fee Manager HTTPS' -ErrorAction SilentlyContinue)) {
  New-NetFirewallRule -DisplayName 'AHS Fee Manager HTTPS' -Direction Inbound -Protocol TCP -LocalPort 80, 443 -Action Allow | Out-Null
}

Step 'Starting'
Start-Service 'AHS-SFM'
$ok = $false
for ($i = 0; $i -lt 30 -and -not $ok; $i++) {
  Start-Sleep -Seconds 2
  try { $ok = (Invoke-RestMethod 'http://127.0.0.1:4000/api/health' -TimeoutSec 3).ok } catch { }
}
if (-not $ok) { throw "The fee software did not start. See the log files in $ToolsDir\logs" }
Write-Host '    Fee software is running'
$busy = Get-NetTCPConnection -LocalPort 80, 443 -State Listen -ErrorAction SilentlyContinue |
  Where-Object { (Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).ProcessName -ne 'caddy' }
if ($busy) {
  Warn "Port 80/443 is already used by another program (process id $(($busy.OwningProcess | Select-Object -Unique) -join ', '); often IIS)."
  Warn 'Stop it, or use IIS as the HTTPS proxy instead (see deploy\windows\README.md). The fee software itself is running.'
} else {
  Start-Service 'AHS-SFM-Caddy'
}

# ---------------------------------------------------------------- 5. checks
Step 'Checking the domain'
try {
  $publicIp = (Invoke-RestMethod 'https://api.ipify.org' -TimeoutSec 10).ToString().Trim()
  $dns = (Resolve-DnsName $Domain -Type A -ErrorAction Stop | Where-Object { $_.IPAddress } | Select-Object -ExpandProperty IPAddress)
  if ($dns -contains $publicIp) {
    Write-Host "    $Domain points to this server ($publicIp)"
  } else {
    Warn "$Domain points to '$($dns -join ', ')' but this server's public IP is $publicIp."
    Warn "Fix the A record in cPanel -> Zone Editor. HTTPS starts working by itself once DNS is correct."
  }
} catch {
  Warn "$Domain does not resolve yet. Add the A record 'fees' -> this server's public IP in cPanel -> Zone Editor."
}

Write-Host ''
Write-Host "Done. Open https://$Domain and log in as 'admin'." -ForegroundColor Green
Write-Host '  - Also allow ports 80 and 443 in the data centre firewall (if they have one).'
Write-Host '  - Do NOT open SQL Server port 1433 to the internet.'
Write-Host "  - Logs: $ToolsDir\logs    Update later: deploy\windows\update.ps1"
