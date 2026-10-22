# Operations guide

How to run Panic Plan, keep it alive, and read the logs when it breaks.

---

## Deploy

### Production

```bash
cp .env.example .env
# edit .env: set JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, POSTGRES_PASSWORD
docker compose up -d --build
```

| Service | Address |
|---|---|
| Client (nginx) | http://localhost:8080 |
| API | http://localhost:4000 |
| Database | postgres://panicplan:panicplan@db:5432/panicplan |
| TideCloak | http://localhost:8081 |

### Staging

Staging is a separate stack with its own database volume, its own TideCloak
instance and its own ports. It never touches production data.

```bash
docker compose -f docker-compose.yml -f docker-compose.staging.yml up -d --build
```

| Service | Address |
|---|---|
| Client | http://localhost:8081 |
| API | http://localhost:4001 |
| TideCloak | http://localhost:8082 |
| Database | `panicplan_staging` |

### Updating an existing deployment

```bash
git pull
docker compose up -d --build
```

Migrations run automatically inside the server container on start
(`prisma migrate deploy`). If a migration fails, the server exits rather than
serving requests against a half-migrated schema.

---

## Health checks and uptime monitoring

| Endpoint | Meaning | Use for |
|---|---|---|
| `GET /api/health` | process is alive | liveness probe, uptime check |
| `GET /api/health/ready` | database reachable | readiness probe, load balancer |
| `GET /healthz` (client) | nginx is serving | static health check |

Point an external monitor at `https://<your-host>/api/health`. Any non-200 is
an alert. The `ready` endpoint is the one that catches a broken database
connection, which liveness alone will not.

The compose file already defines healthchecks for all four services, so
`docker compose ps` shows health status directly.

---

## Logs

```bash
docker compose logs -f server        # API request log
docker compose logs -f client        # nginx access and error logs
docker compose logs -f tidecloak     # IdP
docker compose logs -f db            # database
```

The API logs one line per request in the standard combined format: method,
path, status, response time, and the requesting user agent. A failing request
shows a non-2xx status and a longer response time.

For a single request path:

```bash
docker compose logs server | grep "POST /api/auth/login"
```

Structured errors are logged with a full stack trace. To get a request-scoped
trace id in the log lines, add the `X-Request-Id` header — it is echoed back
in the response.

Sentry receives unhandled exceptions when `SENTRY_DSN` is set. Without it,
error tracking is a no-op and errors only appear in the logs.

---

## Backups

```bash
# create
./scripts/backup.sh create

# list
./scripts/backup.sh list

# restore (asks for confirmation)
./scripts/backup.sh restore backups/panicplan-20261022-120000.sql.gz
```

The script uses `pg_dump` with `DATABASE_URL` from the environment. Dumps are
written to `backups/` (gitignored). Schedule it with cron:

```cron
0 3 * * * cd /srv/panicplan && DATABASE_URL=... ./scripts/backup.sh create /var/backups/panicplan
```

Restore drills matter more than backups. Test one per quarter.

---

## Database migrations

```bash
cd server
npx prisma migrate dev --name describe_your_change   # create + apply locally
npx prisma migrate status                             # what is applied
npx prisma migrate deploy                             # apply in production
```

Never edit a migration that has already been applied. Add a new one.

---

## Secrets

* Every secret lives in the environment. `.env` is gitignored and must never be
  committed.
* `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` should be long random strings:
  `openssl rand -base64 48`.
* Rotating `JWT_ACCESS_SECRET` invalidates every access token immediately.
  Rotating `JWT_REFRESH_SECRET` invalidates every refresh token, so members are
  signed out.
* The TideCloak client is a public client using PKCE. `TIDECLOAK_CLIENT_SECRET`
  is empty by design and stays that way; there is no client secret to leak.

---

## Scaling notes

* The API is stateless apart from the database, so it scales horizontally.
* The client is static files behind nginx.
* Refresh tokens are stored hashed in the database, so signing a member out on
  one instance signs them out everywhere.
* Meme rendering is cached on disk per container. With multiple API replicas,
  mount a shared volume at `server/cache` or accept per-replica caching.
