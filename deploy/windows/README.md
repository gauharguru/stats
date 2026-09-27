# Putting the fee software online at https://fees.ahscollege.ac.in

The main college website stays where it is (shared hosting). Only the sub-domain `fees` is pointed at the college's dedicated server, which runs SQL Server and the fee software.

```
Browser / Android app ──HTTPS──▶ fees.ahscollege.ac.in  (dedicated server, ports 80/443)
                                   Caddy (HTTPS, free certificate)
                                     └─▶ fee software 127.0.0.1:4000 ──▶ SQL Server (not open to the internet)
ahscollege.ac.in (main website) ──▶ shared hosting, unchanged
```

## 1. DNS (5 minutes, in the website's cPanel)

1. Log in to cPanel for ahscollege.ac.in → **Zone Editor** (or *Domains → DNS*). If the domain's DNS is managed at the registrar instead (e.g. GoDaddy/ERNET), make the change there.
2. Add an **A record**: Name `fees`, Address `<public IP of the dedicated server>`, TTL 300.
3. Do not create `fees` as a cPanel sub-domain. That would point it at the shared hosting.

`nslookup fees.ahscollege.ac.in` should return the server's IP within a few minutes, or up to a few hours with some providers.

## 2. On the dedicated server (Remote Desktop, as Administrator)

1. SQL Server: enable *SQL Server and Windows Authentication* mode and TCP/IP (see the main README).
2. Download the code: on GitHub choose **Code → Download ZIP** and extract it to e.g. `C:\AHS-SFM`. Alternatively, install Git and `git clone`, so that updates are one command.
3. Open **PowerShell as Administrator** and run:
   ```powershell
   cd C:\AHS-SFM
   powershell -ExecutionPolicy Bypass -File deploy\windows\install.ps1
   ```
   The installer does the following:
   - asks for the SQL Server details;
   - creates the database and a dedicated login if you allow it (otherwise run `create-login.sql` in SSMS);
   - builds the software and creates the tables;
   - installs two automatic Windows services, **AHS-SFM** and **AHS-SFM-Caddy**;
   - opens ports 80/443 in Windows Firewall.
4. If the data centre has its own firewall or security group, allow inbound **TCP 80 and 443** there too. Never open **1433** (SQL Server) or **4000** to the internet.
5. Open **https://fees.ahscollege.ac.in** and log in as `admin` with the password you gave the installer. You will be asked to change it at first login.

HTTPS starts automatically once DNS points at the server. The certificate is from Let's Encrypt, free, and renewed by itself. Port 80 must stay open for the renewal.

## Android app

On first start the app suggests `https://fees.ahscollege.ac.in`. Tap **Connect**. It then works from anywhere with internet, not only on the college Wi-Fi.

## Updating to a new version

Take a database backup, get the new code (git pull, or extract the new ZIP over the folder; `server\.env` is kept), then run:

```powershell
powershell -ExecutionPolicy Bypass -File deploy\windows\update.ps1
```

## If IIS already uses ports 80/443 on this server

The installer detects this and does not start Caddy. Either stop IIS's default website, or use IIS as the HTTPS proxy:
1. Install **URL Rewrite** and **Application Request Routing** (enable *proxy* in ARR server settings).
2. Create a site with host name `fees.ahscollege.ac.in` and a reverse-proxy rule to `http://127.0.0.1:4000`.
3. Add a certificate with win-acme.
4. Disable the `AHS-SFM-Caddy` service.

## Troubleshooting

| Problem | Where to look |
|---|---|
| Site does not open | `services.msc`: are **AHS Fee Manager** and **AHS Fee Manager HTTPS** running? Logs are in `C:\AHS-SFM-tools\logs` |
| Browser warns about the certificate | DNS not pointing at the server yet, or port 80 blocked by the data-centre firewall (see `AHS-SFM-Caddy` log) |
| "Login failed for user" in the AHS-SFM log | SQL login or password wrong in `server\.env`, or SQL authentication mode not enabled |
| Works on the server, not outside | Data-centre firewall: open 80/443 |
