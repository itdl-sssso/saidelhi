# Staging / prod deploy (Docker)

One VM runs: MySQL 8 + the Next.js app in Docker Compose (`deploy/compose.yml`), nginx + certbot on the host.
Hosts `staging.saidelhi.org` (site, portal, form links) and `api.staging.saidelhi.org` (`/<path>` → `/api/v1/<path>`,
for the WhatsApp webhook and outside callers) both proxy to `127.0.0.1:3000`.

```
internet ─▶ nginx :80/:443 ─▶ app 127.0.0.1:3000 (host network) ─▶ mysql 127.0.0.1:3307
                               └ /srv/saidelhi/{media,media-private,hf-cache}
host cron ─▶ deploy/cron/run-job.sh ─▶ 127.0.0.1:3000/api/v1/cron/<job>
```

The image is built **on the server** (Oracle A1 is ARM; cross-building on x86 is slow). `next build` reads the live DB
because Cache Components prerender `"use cache"` pages, so the build runs on the host network and gets the env file as a
BuildKit secret (not stored in any layer).

## 1. One-time server setup (Ubuntu 24.04)

```bash
sudo timedatectl set-timezone UTC
# Docker CE from Docker's repo (Ubuntu's docker.io lacks buildx, which compose needs for build secrets)
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER   # log out/in
sudo apt install -y nginx certbot python3-certbot-nginx git
# 2 GB swap: next build peaks well above 1 GB
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Oracle Cloud only: open 80/443 in the VCN Security List **and** on the VM (the image ships iptables REJECT rules):

```bash
sudo iptables -I INPUT 6 -p tcp -m multiport --dports 80,443 -j ACCEPT && sudo netfilter-persistent save
```

## 2. App

```bash
sudo mkdir -p /opt/saidelhi /srv/saidelhi && sudo chown $USER /opt/saidelhi /srv/saidelhi
git clone <repo-url> /opt/saidelhi && cd /opt/saidelhi
cp deploy/.env.staging.example deploy/.env.staging && chmod 600 deploy/.env.staging
# fill every CHANGE_ME (openssl rand -hex 32); MYSQL_PASSWORD must match DATABASE_URL
deploy/deploy.sh
```

`deploy.sh` = fetch → checkout → start MySQL → `drizzle-kit migrate` (tools image) → build app → `up -d --wait`.
Images are tagged by git sha; rollback with `APP_TAG=<sha> docker compose -f deploy/compose.yml up -d app`.

First-time data (pick one), via the `tools` image:

```bash
c="docker compose -f deploy/compose.yml --profile tools run --rm tools"
$c pnpm exec tsx --conditions=react-server scripts/seed.ts            # dev fixtures + dev logins
# or legacy content: copy the dump to /srv/saidelhi/imports/ first (contains personal data)
$c pnpm exec tsx --conditions=react-server scripts/import-legacy.ts
```

Legacy media: rsync the old site's `media/` into `/srv/saidelhi/media/`.
Then rebuild once (`deploy/deploy.sh`) so prerendered pages pick up the data.

## 3. nginx + TLS

DNS first: A records `staging` and `api.staging` → the VM's (reserved) public IP.

```bash
sudo cp deploy/nginx/saidelhi-proxy.conf /etc/nginx/snippets/
sudo cp deploy/nginx/saidelhi-staging.conf /etc/nginx/sites-available/saidelhi-staging
sudo ln -s /etc/nginx/sites-available/saidelhi-staging /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d staging.saidelhi.org -d api.staging.saidelhi.org --redirect
```

## 4. Cron

```bash
sudo cp deploy/cron/saidelhi /etc/cron.d/saidelhi   # paths assume /opt/saidelhi
```

## Day to day

| Task | Command |
|---|---|
| Deploy main / a branch | `deploy/deploy.sh` / `deploy/deploy.sh origin/<branch>` |
| Logs (OTP codes with `WHATSAPP_PROVIDER=console`) | `docker compose -f deploy/compose.yml logs -f app` |
| DB shell | `docker compose -f deploy/compose.yml exec mysql mysql -uapp -p saidelhi` |
| Run a job now | `deploy/cron/run-job.sh publish-scheduled` |
| Local model | `docker compose -f deploy/compose.yml --profile ai up -d ollama` then `docker exec … ollama pull smollm2:360m`, set `EXTRACTOR_PROVIDER=ollama` |

Notes
- MySQL is published on loopback only; Docker-published ports skip ufw.
- The app listens on `0.0.0.0:3000` (host network; `HOSTNAME` must not be `127.0.0.1`/`localhost`, see compose.yml),
  so port 3000 must stay closed in the firewall / Oracle security list. Only 22, 80, 443 open.
- `/api/v1/cron/*` returns 404 through nginx; jobs only run over loopback.
- Staging sends `X-Robots-Tag: noindex`. Keep the `discourses` flag off and `WHATSAPP_PROVIDER=console` until approved.
- `PORT` must stay `3000` = Next's listen port (proxy 404 self-fetch, `src/proxy.ts`).
