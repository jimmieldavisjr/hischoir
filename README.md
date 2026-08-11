# HisChoir

HisChoir is a full-stack Sabbath worship planning workspace. Directors can build
song sets from a YouTube playlist, order each Sabbath plan, add rehearsal notes,
and share a protected live view with the worship team.

The application uses Next.js, TypeScript, Tailwind CSS, PostgreSQL, Drizzle, and
the YouTube Data API. It is configured for deployment on Railway.

## Local development

Requirements:

- Node.js `>=22.13.0`
- PostgreSQL

Copy `.env.example` to `.env.local`, replace the placeholder values, and then run:

```bash
npm install
npm run db:migrate
npm run dev
```

Required environment variables:

```env
ADMIN_PASSCODE=
TEAM_PASSCODE=
SESSION_SECRET=
YOUTUBE_API_KEY=
DATABASE_URL=
```

`SESSION_SECRET` should contain at least 32 random characters. The YouTube key
may be left empty while developing; HisChoir will use its bundled playlist
snapshot until live syncing is configured.

## Railway deployment

1. Create a Railway project from this repository.
2. Add a PostgreSQL service to the project.
3. In the app service, add `DATABASE_URL` as a reference to the PostgreSQL
   service's `DATABASE_URL` variable.
4. Add `ADMIN_PASSCODE`, `TEAM_PASSCODE`, `SESSION_SECRET`, and
   `YOUTUBE_API_KEY` to the app service.
5. Deploy and generate a public domain from the app service's Networking tab.

`railway.json` builds the standalone Next.js server, applies the committed
Drizzle migrations before each release, and verifies `/api/health` before
traffic moves to the new deployment.

## Database migrations

After changing `db/schema.ts`, generate and review a migration:

```bash
npm run db:generate
```

Apply committed migrations locally with:

```bash
npm run db:migrate
```

The PostgreSQL migration creates the destination schema; it does not copy data
from an existing Cloudflare D1 database. If the D1 instance contains production
service plans, export and import those records before switching the public
domain to Railway.

## Validation

```bash
npm run lint
npm test
```
