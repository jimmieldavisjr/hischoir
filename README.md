# HisChoir

HisChoir is a full-stack Sabbath worship planning workspace. Directors can build
song sets from a YouTube playlist, order each Sabbath plan, add rehearsal notes,
and share a protected live view with the worship team.

## Architecture

The application is split across two deployments plus a managed database:

| Component | Stack | Host | Source |
| --- | --- | --- | --- |
| Front end | Next.js 16, React 19, Tailwind 4 | Vercel | [`apps/web`](apps/web) |
| API | NestJS 11, `pg` | Railway | [`apps/api`](apps/api) |
| Database | PostgreSQL, Drizzle migrations | Railway | [`apps/api/drizzle`](apps/api/drizzle) |

The browser loads the front end from Vercel, and the front end calls the API on
Railway directly. The API is the only component that reaches PostgreSQL, over
Railway's private network.

```
Browser ──▶ Vercel (apps/web)          static pages + client components
   │
   └──────▶ Railway (apps/api)         NestJS, credentialed CORS
                  │
                  └── private network ──▶ Railway PostgreSQL
```

### Cross-origin sessions

The front end and API are on different origins, so the signed `HttpOnly` session
cookie has to cross that boundary. Every request from the browser sends
`credentials: "include"`, and the API answers with an explicit
`Access-Control-Allow-Origin` — a wildcard is rejected, because credentialed CORS
forbids it.

There are two supported cookie configurations:

| Setup | `COOKIE_SAMESITE` | `COOKIE_DOMAIN` | Notes |
| --- | --- | --- | --- |
| `hischoir.vercel.app` + `*.up.railway.app` | `none` | unset | Cross-site. Requires `COOKIE_SECURE=true` and depends on third-party cookies, which Safari restricts. |
| `hischoir.org` + `api.hischoir.org` | `lax` | `.hischoir.org` | Same-site, because both share a registrable domain. **Recommended** — no third-party cookie exposure. |

Start on the first while testing, then move to the second once custom domains
are in place. Only `WEB_ORIGIN`, `COOKIE_SAMESITE`, `COOKIE_DOMAIN`, and
`NEXT_PUBLIC_API_URL` change; no code does.

## Local development

Requirements: Node.js `>=22.13.0` and PostgreSQL.

Run the API (terminal one):

```bash
cd apps/api
cp .env.example .env.local        # then fill in DATABASE_URL and SESSION_SECRET
npm install
npm run db:migrate
npm run dev                       # http://localhost:8080
```

Run the front end (terminal two):

```bash
cd apps/web
cp .env.example .env.local        # NEXT_PUBLIC_API_URL=http://localhost:8080
npm install
npm run dev                       # http://localhost:3000
```

Both origins are `localhost` in development, so the default `COOKIE_SAMESITE=lax`
works without any third-party cookie handling.

## Deploying the API to Railway

1. Create a Railway project from this repository.
2. Add a **PostgreSQL** service.
3. Add a service for the API and set its **Root Directory** to `apps/api`.
4. Set these variables on the API service:

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (a reference, not a pasted string) |
   | `SESSION_SECRET` | at least 32 random characters |
   | `ADMIN_PASSCODE` | director passcode |
   | `TEAM_PASSCODE` | team passcode |
   | `YOUTUBE_API_KEY` | optional; the bundled snapshot is used without it |
   | `WEB_ORIGIN` | the Vercel URL, e.g. `https://hischoir.vercel.app` |
   | `COOKIE_SAMESITE` | `none` (or `lax` with a shared parent domain) |
   | `COOKIE_SECURE` | `true` |

5. Generate a domain from the service's **Networking** tab.

[`apps/api/railway.json`](apps/api/railway.json) applies the committed Drizzle
migrations before each release and holds traffic until `/api/health` reports the
database is reachable.

## Deploying the front end to Vercel

1. Import this repository as a Vercel project.
2. Set **Root Directory** to `apps/web`. The framework preset is Next.js.
3. Set `NEXT_PUBLIC_API_URL` to the Railway API domain.
4. Deploy, then add the resulting URL to `WEB_ORIGIN` on the Railway service.

`NEXT_PUBLIC_API_URL` is inlined into the client bundle at build time, so
changing it requires a redeploy rather than just a restart.

## Database migrations

After changing [`apps/api/src/database/schema.ts`](apps/api/src/database/schema.ts):

```bash
cd apps/api
npm run db:generate     # write a migration
npm run db:migrate      # apply it locally
```

Committed migrations are applied automatically on each Railway release.

## Validation

```bash
cd apps/api && npm run lint && npm run typecheck && npm test
cd apps/web && npm run lint && npm run typecheck && npm run build
```
