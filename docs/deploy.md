# Deploy (Vercel + MongoDB Atlas)

One Next.js app: the public site, the admin at `/admin` and the CMS data layer (`src/cms`). Data lives in MongoDB (Atlas in production), including uploaded images and private PDFs.

## 1. Database

1. Create an Atlas cluster (the free M0 tier is enough to start). Region: closest to the Vercel function region (e.g. `fra1` ↔ Frankfurt).
2. Create a database user with `readWrite` on the database (e.g. `etleq`), and allow access from anywhere (`0.0.0.0/0`). Vercel has no fixed IPs unless you pay for them.
3. Connection string: `mongodb+srv://<user>:<pwd>@<cluster>/etleq?retryWrites=true&w=majority`. If the string has no database name, set `DATABASE_NAME=etleq`.
4. Once, from your machine with `DATABASE_URL` pointing at Atlas:
   - `pnpm db:indexes` creates the indexes.
   - `pnpm seed` creates the first admin user (`admin@etleq.local`, password from `SEED_ADMIN_PASSWORD`), the founders and sample content. **It wipes public content collections**, so only run it on an empty database. Then log in, create real users, and delete or unpublish the samples.

## 2. Vercel project

Import the GitHub repo. The framework preset is Next.js; the build command (`pnpm build`) runs `check:samples` first.

Environment variables (Production, and Preview if you use it with a separate database):

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Atlas connection string |
| `DATABASE_NAME` | Only if the URL has no database name |
| `AUTH_SECRET` | 32+ random characters. Signs admin sessions and scorecard result links. Changing it logs everyone out |
| `NEXT_PUBLIC_SITE_URL` | `https://etleq.com` |
| `SITE_ENV` | `production` (indexable, samples forbidden). Use `staging` for preview deployments |
| `CRON_SECRET` | Random string; Vercel Cron sends it to `/api/cron/retention` |
| `SMTP_*`, `LEAD_ALERT_EMAILS`, `LEAD_ALERT_WEBHOOK` | Email and lead alerts (emails are logged when `SMTP_HOST` is empty) |
| `TURNSTILE_*`, `CAL_*`, `WHATSAPP_NUMBER`, analytics ids, `INDEXNOW_KEY`, `GOOGLE_INDEXING_SA_JSON` | As in `.env.example` |

With `SITE_ENV=production` the build fails if the database is unreachable or a published sample exists (`scripts/check-samples.ts`).

## 3. Cron

`vercel.json` schedules `/api/cron/retention` daily at 02:30 UTC. It anonymises leads and applications past `retainUntil` and deletes expired CVs. The Hobby plan runs crons once a day, which is all this needs.

## 4. Limits to know

- **Request body: 4.5 MB** on Vercel functions. CV uploads and admin image uploads are capped at 4 MB.
- **Images** are stored in MongoDB (collection `upload-files`) and served from `/media/<id>/<filename>` with a one-year immutable cache, then resized by `next/image`. Keep originals reasonable (under 1–2 MB). If the media library grows into hundreds of MB, move binaries to Vercel Blob or R2.
- **Rate limiting** of public forms is in memory, per function instance. Turnstile and the honeypot do the real work. Add Vercel's firewall rules if spam gets through.
- **Revalidation**: saving in the admin revalidates the affected pages immediately (`revalidatePath` / `revalidateTag`).

## 5. Local development

```bash
docker compose up -d          # MongoDB replica set on 127.0.0.1:27018 (or: pnpm db:dev for an in-memory one)
cp .env.example .env          # set DATABASE_URL and AUTH_SECRET
pnpm seed                     # sample content + admin@etleq.local / etleq-dev-123
pnpm dev                      # http://localhost:3000, admin at /admin
```
