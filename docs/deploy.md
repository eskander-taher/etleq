# Deploy runbook (VPS)

One Next.js + Payload app per environment on the founders' VPS, behind Nginx and Cloudflare.
Production and staging share the box but not the database or the env file.

| | Production | Staging |
| --- | --- | --- |
| Host | `etleq.com` | `staging.etleq.com` |
| PM2 app | `etleq-production` (cluster ×2, port 3000) | `etleq-staging` (fork, port 3001) |
| Code | `/srv/etleq/production/current` → `releases/<timestamp>` | `/srv/etleq/staging` (git checkout) |
| Env file | `/srv/etleq/production/shared/.env` (`SITE_ENV=production`) | `/srv/etleq/staging/.env` (`SITE_ENV=staging`) |
| Database | `etleq` | `etleq_staging` |
| Deploy | Manual: Actions → Deploy → `production` | Automatic on push to `main` |

## 1. Server setup (once)

```bash
# Node LTS (24.x) + pnpm via corepack, PM2, Nginx
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs nginx git
sudo corepack enable && corepack prepare pnpm@11.20.0 --activate
sudo npm i -g pm2@6
pm2 startup systemd   # run the printed command, then `pm2 save` after first start

sudo adduser --disabled-password deploy
sudo mkdir -p /srv/etleq/{production/{releases,shared/media},staging} /var/log/etleq
sudo chown -R deploy:deploy /srv/etleq /var/log/etleq
```

As `deploy`:

```bash
# Production: a bare mirror the deploy job clones releases from
git clone --mirror git@github.com:<org>/etleq-website.git /srv/etleq/production/repo.git
# Staging: plain checkout of main
git clone git@github.com:<org>/etleq-website.git /srv/etleq/staging
cp .env.example /srv/etleq/production/shared/.env   # fill it in, chmod 600
cp .env.example /srv/etleq/staging/.env             # fill it in, chmod 600
```

Give the server a read-only GitHub deploy key. GitHub Actions secrets (per environment):
`STAGING_SSH_HOST`, `STAGING_SSH_USER`, `STAGING_SSH_KEY`, optional `STAGING_SSH_PORT`, `STAGING_APP_DIR`;
`PROD_SSH_HOST`, `PROD_SSH_USER`, `PROD_SSH_KEY`, optional `PROD_SSH_PORT`. Protect the `production`
environment with required reviewers.

First start: build each environment once by hand, then

```bash
pm2 start /srv/etleq/staging/ecosystem.config.cjs --only etleq-staging
pm2 start /srv/etleq/production/current/ecosystem.config.cjs --only etleq-production
pm2 save
```

## 2. MongoDB (replica set, auth, localhost only)

`/etc/mongod.conf`:

```yaml
net:
  bindIp: 127.0.0.1
  port: 27017
security:
  authorization: enabled
  keyFile: /etc/mongod.keyfile        # required with auth + replSet (openssl rand -base64 756; chmod 400; owner mongodb)
replication:
  replSetName: rs0
```

```js
// mongosh, once, before enabling auth
rs.initiate({ _id: 'rs0', members: [{ _id: 0, host: '127.0.0.1:27017' }] })
use admin
db.createUser({ user: 'admin', pwd: '<strong>', roles: ['root'] })
db.createUser({ user: 'etleq', pwd: '<strong>', roles: [{ role: 'readWrite', db: 'etleq' }] })
db.createUser({ user: 'etleq_staging', pwd: '<strong>', roles: [{ role: 'readWrite', db: 'etleq_staging' }] })
db.createUser({ user: 'backup', pwd: '<strong>', roles: ['backup', 'restore'] })
```

`DATABASE_URL=mongodb://etleq:<pwd>@127.0.0.1:27017/etleq?replicaSet=rs0&authSource=admin`.
The firewall (ufw) allows only 22, 80 and 443; port 27017 is never exposed.

## 3. Nginx

`/etc/nginx/conf.d/etleq.conf` (TLS is Cloudflare Origin CA; Cloudflare SSL mode **Full (strict)**):

```nginx
# Only POSTs (server actions, forms) count against the forms zone; an empty key is not limited.
map $request_method $form_key { POST $binary_remote_addr; default ""; }
limit_req_zone $form_key zone=forms:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=login:10m rate=5r/m;
# Real client IP from Cloudflare (keep the list in sync with https://www.cloudflare.com/ips/)
real_ip_header CF-Connecting-IP;
# set_real_ip_from <each Cloudflare range>;

upstream etleq_prod    { server 127.0.0.1:3000; keepalive 32; }
upstream etleq_staging { server 127.0.0.1:3001; keepalive 8; }

# http → https and www → apex (one hop, 301)
server {
  listen 80;
  server_name etleq.com www.etleq.com staging.etleq.com;
  return 301 https://$host$request_uri;
}
server {
  listen 443 ssl;
  http2 on;
  server_name www.etleq.com;
  ssl_certificate     /etc/ssl/cloudflare/etleq.pem;
  ssl_certificate_key /etc/ssl/cloudflare/etleq.key;
  return 301 https://etleq.com$request_uri;
}

server {
  listen 443 ssl;
  http2 on;
  server_name etleq.com;
  ssl_certificate     /etc/ssl/cloudflare/etleq.pem;
  ssl_certificate_key /etc/ssl/cloudflare/etleq.key;
  client_max_body_size 6m;   # CVs are capped at 5 MB

  # No trailing slash (except root), lowercase handled by the app; 301 once.
  rewrite ^/(.+)/$ /$1 permanent;

  location = /admin/login { limit_req zone=login burst=5 nodelay; proxy_pass http://etleq_prod; include /etc/nginx/snippets/proxy.conf; }
  location ~ ^/api/users/(login|forgot-password) { limit_req zone=login burst=5 nodelay; proxy_pass http://etleq_prod; include /etc/nginx/snippets/proxy.conf; }
  # Server actions POST to page URLs; only POSTs are limited (see map above).
  location / {
    limit_req zone=forms burst=5 nodelay;
    limit_req_status 429;
    proxy_pass http://etleq_prod;
    include /etc/nginx/snippets/proxy.conf;
  }
  location /_next/static/ { proxy_pass http://etleq_prod; include /etc/nginx/snippets/proxy.conf; expires 1y; add_header Cache-Control "public, immutable"; }
}

server {
  listen 443 ssl;
  http2 on;
  server_name staging.etleq.com;
  ssl_certificate     /etc/ssl/cloudflare/etleq.pem;
  ssl_certificate_key /etc/ssl/cloudflare/etleq.key;
  auth_basic "Etleq staging";
  auth_basic_user_file /etc/nginx/.htpasswd-staging;   # htpasswd -c ...
  add_header X-Robots-Tag "noindex, nofollow" always;
  location /hooks/ { auth_basic off; proxy_pass http://etleq_staging; include /etc/nginx/snippets/proxy.conf; }
  location / { proxy_pass http://etleq_staging; include /etc/nginx/snippets/proxy.conf; }
}
```

`/etc/nginx/snippets/proxy.conf`:

```nginx
proxy_http_version 1.1;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto https;
proxy_set_header Connection "";
proxy_read_timeout 60s;
```

## 4. Cloudflare

- DNS: `etleq.com`, `www`, `staging` proxied (orange cloud). SSL/TLS **Full (strict)** with an Origin CA certificate; Always Use HTTPS on; HSTS is sent by the app.
- Caching: respect origin headers; no "cache everything" on HTML (pages are ISR at the origin). Cache `/_next/static/*` and media.
- **AI crawler controls (brief §12):** Search = allow, Agent = allow, Training = allow (do not block Training unless a test proves Googlebot and Bingbot still get through). Keep "Block AI bots" and any generic AI-bot rule **off**. Never block `Perplexity-User`. robots.txt is the source of truth (`/robots.txt`, toggled from the CMS).
- Bot Fight Mode off (it can challenge verified crawlers); use WAF managed rules instead.
- **Cloudflare Access** application on `etleq.com/admin*` and `etleq.com/api*` (and the staging equivalents): email-OTP or Google login, allow-list the founders and editors. Bypass policy for `/api/media/*` only if media is not served from the bucket CDN.
- Webhooks under `/hooks/*` are not behind Access; they verify signatures.
- After launch: check Security → Events and Search Console crawl stats for blocked bots.

## 5. Deploys

- **Staging:** every push to `main` runs `.github/workflows/deploy.yml` → SSH → `git pull --ff-only && pnpm install --frozen-lockfile && pnpm build && pm2 reload etleq-staging`.
- **Production:** Actions → Deploy → Run workflow → `production` (optional ref). It clones a new dir under `releases/`, links `shared/.env` and `shared/media`, installs, builds (the build fails if published samples exist), switches `current`, and `pm2 reload`s with zero downtime. The five newest releases are kept.

### Rollback

```bash
cd /srv/etleq/production
ls -1dt releases/*                 # newest first
ln -sfn "$(ls -1dt releases/* | sed -n 2p)" current   # previous release
pm2 reload current/ecosystem.config.cjs --only etleq-production --update-env
```

Database migrations are additive by convention, so a code rollback does not need a DB restore.
Staging rollback: `git reset --hard <sha>` in `/srv/etleq/staging`, rebuild, reload.

## 6. Backups (daily, encrypted, off-server)

`/etc/cron.d/etleq-backup`: `30 2 * * * deploy /srv/etleq/bin/backup.sh >> /var/log/etleq/backup.log 2>&1`

```bash
#!/usr/bin/env bash
# /srv/etleq/bin/backup.sh
set -euo pipefail
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUT=/var/backups/etleq/etleq-$STAMP.archive.gz.age
mkdir -p /var/backups/etleq
mongodump --uri "$BACKUP_DATABASE_URL" --db etleq --archive --gzip \
  | age -r "$BACKUP_AGE_RECIPIENT" > "$OUT"          # public key only on the server
rclone copy "$OUT" "offsite:etleq-backups/db/"        # e.g. an R2/B2 bucket in another account, versioned
find /var/backups/etleq -name '*.age' -mtime +7 -delete
```

- Keep 30 daily + 12 monthly copies off-server (bucket lifecycle rules). The private key (`age`) is held offline by the founders, never on the server.
- Media and private files: enable bucket versioning on the public and private buckets.
- Alert if the newest off-site backup is older than 26 hours (uptime monitor "heartbeat" pinged at the end of the script).

### Restore drill (before launch, then quarterly and after major upgrades)

```bash
rclone copy offsite:etleq-backups/db/etleq-<stamp>.archive.gz.age .
age -d -i ~/etleq-backup.key etleq-<stamp>.archive.gz.age \
  | mongorestore --uri "$STAGING_RESTORE_URL" --archive --gzip --drop \
      --nsFrom 'etleq.*' --nsTo 'etleq_restore.*'
```

Point a staging instance at `etleq_restore`, log in to `/admin`, open a lead, a job application CV and a model page, then record the date, backup age and time taken in `docs/decisions.md`.

## 7. Monitoring

- Uptime checks on `/`, `/en` and `/robots.txt`; alert on 5xx spikes (Nginx logs) and disk > 80 %.
- `pm2 install pm2-logrotate`. Logs never contain form bodies, CVs or tokens.
- Error tracking via `SENTRY_DSN` when set.
