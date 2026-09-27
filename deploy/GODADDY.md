# Front page on GoDaddy (Plesk): https://fees.ahscollege.ac.in

```
Staff browser ──▶ https://fees.ahscollege.ac.in       GoDaddy Plesk hosting (148.72.90.60)
                   front page only: deploy/godaddy/index.html
                     │ loads the screens and all data from
                     ▼
                  https://feesapi.ahscollege.ac.in     college's dedicated server
                   fee software + SQL Server, updates itself (deploy/windows)
Android app ─────▶ https://feesapi.ahscollege.ac.in
```

The page on GoDaddy is a small front page that never changes. The software itself, and every future change, comes from the dedicated server. You therefore never have to upload anything after a change. Plesk's **Deploy using Git** keeps the front page in sync with GitHub anyway.

## 1. Deploy using Git (sub-domain fees.ahscollege.ac.in)

1. In Plesk open **fees.ahscollege.ac.in → Get Started → Deploy using Git**.
2. Fill in:
   - **Repository:** *Remote Git hosting*. URL: `https://github.com/gauharguru/stats.git`. The repository is public, so no password or SSH key is needed.
   - **Branch:** `claude/student-fees-management-l8fa11`. This is the same branch the dedicated server follows.
   - **Deployment mode:** *Automatic*.
   - **Deployment path / server path:** leave the default, the sub-domain's folder (e.g. `/fees.ahscollege.ac.in`).
3. Click **Create** (or **OK**). Plesk downloads the repository into that folder.
4. **Hosting & DNS → Hosting** (Hosting settings): change **Document root** to that folder plus `/deploy/godaddy`, e.g. `fees.ahscollege.ac.in/deploy/godaddy`, and save. Only the front page (`index.html`, `web.config`) is then visible on the web; the rest of the repository is not.
5. Optional, for instant updates: in Plesk's Git settings for this repository, copy the **Webhook URL**. In GitHub open the repository → *Settings → Webhooks → Add webhook*, paste the URL and save. Without it, the button *Pull updates* in Plesk does the same.

## 2. HTTPS for the front page

**Hosting & DNS → SSL/TLS Certificates → Install** a free *Let's Encrypt* certificate for `fees.ahscollege.ac.in`. Then, in Hosting settings, tick **Permanent SEO-safe 301 redirect from HTTP to HTTPS**.

## 3. DNS record for the dedicated server

Add an **A record** where the DNS of ahscollege.ac.in is managed. That is either Plesk → *ahscollege.ac.in → Hosting & DNS → DNS*, or GoDaddy → *My Products → Domain → DNS*.

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `feesapi` | public IP of the dedicated server (the one used for Remote Desktop) | 1 hour |

Do **not** change the `fees` record. It must stay on the GoDaddy hosting (148.72.90.60).

## 4. Dedicated server

Run `deploy\windows\install.ps1` as described in [windows/README.md](windows/README.md). It serves `https://feesapi.ahscollege.ac.in` and allows the front page `https://fees.ahscollege.ac.in` to use it (`CORS_ORIGINS` in `server\.env`).

## Check

- `https://feesapi.ahscollege.ac.in/api/health` shows `{"ok":true,...}`.
- `https://fees.ahscollege.ac.in` shows the login page. If it says *"The fee server cannot be reached"*, check step 3 and that the dedicated server's services are running.
