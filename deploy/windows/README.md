# Fee server on the college's dedicated server: https://feesapi.ahscollege.ac.in

The fee software and SQL Server run on the dedicated server. Staff open **https://fees.ahscollege.ac.in**, a front page on the GoDaddy Plesk hosting (see [../GODADDY.md](../GODADDY.md)) that loads everything from this server. The Android app talks to this server directly.

```
Browser ──▶ fees.ahscollege.ac.in (GoDaddy, front page) ──▶ feesapi.ahscollege.ac.in (this server, ports 80/443)
Android app ────────────────────────────────────────────▶      Caddy (HTTPS, free certificate)
                                                                  └─▶ fee software 127.0.0.1:4000 ──▶ SQL Server (not open to the internet)
```

## 1. DNS (5 minutes)

Where the DNS of ahscollege.ac.in is managed (Plesk → *Hosting & DNS → DNS*, or GoDaddy → *Domain → DNS*), add an **A record**: Name `feesapi`, Value `<public IP of the dedicated server>`. Leave the `fees` record as it is; it points at the GoDaddy hosting.

`nslookup feesapi.ahscollege.ac.in` should return the server's IP within a few minutes, or up to a few hours with some providers.

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
5. Open **https://feesapi.ahscollege.ac.in** (and, once the GoDaddy front page is set up, **https://fees.ahscollege.ac.in**) and log in as `admin` with the password you gave the installer. You will be asked to change it at first login.

HTTPS starts automatically once DNS points at the server. The certificate is from Let's Encrypt, free, and renewed by itself. Port 80 must stay open for the renewal.

## Android app

On first start the app suggests `https://feesapi.ahscollege.ac.in`. Tap **Connect**. It then works from anywhere with internet, not only on the college Wi-Fi.

## Automatic updates (software and database together)

The installer creates the scheduled task **AHS-SFM Auto Update**. Every 5 minutes it checks the GitHub branch the server follows (`claude/student-fees-management-l8fa11`). When a new version has been pushed, it does the following:

1. It downloads and builds the new version while the current one keeps working.
2. If the new version changes the database, it takes a **safety backup** first. The backup is a `.bak` file in SQL Server's backup folder, named `AHS_SFM_before_update_<date>.bak`.
3. It stops the software, applies the database changes and starts the new version. Staff see about 10-30 seconds of "cannot reach server".
4. It checks that the new version answers. If anything fails, it goes back to the previous version. Each database change runs in a transaction, so a failed change leaves the database untouched.

The software also checks at start-up that the database is up to date, and refuses to run on an older database. The running version and its update time are shown at the bottom of the menu. Every update is logged in `C:\AHS-SFM-tools\logs\deploy.log`.

Nobody logs in to the server from outside. The server only *reads* the public GitHub repository, so no server, Plesk or SQL Server passwords are ever shared. Only people who can push to the GitHub repository can change what runs.

- **Install an update now** instead of waiting: `powershell -ExecutionPolicy Bypass -File deploy\windows\update.ps1`
- **Pause updates:** Task Scheduler → *AHS-SFM Auto Update* → Disable. Enable it again to resume.
- **Follow a different branch** (e.g. `master`, so that changes go live only after you merge them): run `install.ps1 -Branch master` again.
- A version that failed to install is not retried until a newer one is pushed. Run `update.ps1` to retry it.

## If IIS already uses ports 80/443 on this server

The installer detects this and does not start Caddy. Either stop IIS's default website, or use IIS as the HTTPS proxy:
1. Install **URL Rewrite** and **Application Request Routing** (enable *proxy* in ARR server settings).
2. Create a site with host name `feesapi.ahscollege.ac.in` and a reverse-proxy rule to `http://127.0.0.1:4000`.
3. Add a certificate with win-acme.
4. Disable the `AHS-SFM-Caddy` service.

## Troubleshooting

| Problem | Where to look |
|---|---|
| Site does not open | `services.msc`: are **AHS Fee Manager** and **AHS Fee Manager HTTPS** running? Logs are in `C:\AHS-SFM-tools\logs` |
| Browser warns about the certificate | DNS not pointing at the server yet, or port 80 blocked by the data-centre firewall (see `AHS-SFM-Caddy` log) |
| "Login failed for user" in the AHS-SFM log | SQL login or password wrong in `server\.env`, or SQL authentication mode not enabled |
| Works on the server, not outside | Data-centre firewall: open 80/443 |
