# Panic Plan

**Absurdly accountable deadlines and target manager.**

Set a deadline. Invite a friend to hold you to it. When the clock gets scary, we
deploy a roast. Nobody gets to move the line.

Built with [TideCloak](https://tide.org/tidecloak) for identity, in hybrid
(BFF) mode — the browser never holds an identity token.

---

## The idea in one minute

A normal deadline app lets you snooze, reschedule and quietly abandon things.
Panic Plan makes the abandonment *public*:

1. You create a **target** — a title, a deadline, and how much chaos you want.
2. You invite a **buddy**. They can see the target and deploy roasts on it.
3. As the deadline approaches, the **roast tier escalates automatically**, from
   *Polite* through *Legal* to *Cosmic Despair*.
4. When you finish, you get a **victory lap** and a sarcastic eulogy for the
   deadline that died.
5. Miss it, and (only if you opted in) it goes on the **Wall of Shame**.

The escalation tier is derived from the clock, never from randomness:

| Tier | When it hits | Vibe |
|---|---|---|
| 1 · Polite | more than 7 days out | "just a friendly heads-up" |
| 2 · Passive-aggressive | 3 to 7 days out | "I looked it up so you don't have to" |
| 3 · Legal | 1 to 3 days out | "I have started a formal record of this" |
| 4 · Desperate | less than a day | "I am using your full name now" |
| 5 · Cosmic | overdue | "I have taken up a new hobby of disappointment" |

Your **chaos level** (1–5) shifts the tier one step softer or harsher. Your
**deadline personality** (The Overconfident Optimist, The Silent Slobber, The
Methodical Masochist…) colours the copy.

---

## Quick start

### Docker (one command)

```bash
cp .env.example .env          # edit the secrets
docker compose up -d --build
```

| Service | URL |
|---|---|
| App | http://localhost:8080 |
| API health | http://localhost:4000/api/health |
| TideCloak admin | http://localhost:8081 (admin / password) |

The first boot imports the `panicplan` realm automatically, so TideCloak sign-in
works immediately.

### Local development

```bash
# 1. Database
createdb panicplan
psql -c "CREATE USER panicplan WITH PASSWORD 'panicplan' CREATEDB;"

# 2. API
cd server
cp .env.example .env           # point DATABASE_URL at your local postgres
npm install
npx prisma migrate deploy
npx prisma generate
npm run prisma:seed
npm run dev                    # http://localhost:4000

# 3. Client
cd ..
npm install
npm run dev                    # http://localhost:5173
```

### Demo accounts

Seeded local accounts (password `Password123!`):

| Email | Role |
|---|---|
| `ada@panicplan.local` | ADMIN |
| `morgan@panicplan.local` | MODERATOR |
| `sam@panicplan.local` | MEMBER |
| `riley@panicplan.local` | MEMBER (on the Wall of Shame) |

TideCloak account: `tide@panicplan.local` / `Password123!` (imported with the realm).

---

## How TideCloak is used

We use **hybrid / BFF mode** rather than the browser flow:

```
browser ──redirect──> TideCloak ──code+PKCE──> browser
                                              │
                                              ▼
                              our server exchanges the code
                                              │
                                              ▼
                              httpOnly session cookie + our own JWT
```

* The TideCloak access token **never touches the browser**.
* The server performs the code exchange, calls the userinfo endpoint, and
  links the TideCloak identity to a Panic Plan account by email — so signing in
  with TideCloak and with a password converge on one account.
* Roles are enforced **server-side** on every route. The client only decides
  what to render; it never decides what is allowed.

The realm, client, roles and demo user live in
[`server/tidecloak/panicplan-realm.json`](server/tidecloak/panicplan-realm.json)
and are imported on first boot.

---

## What is implemented

### Core
- End-to-end journey: sign up → verify email → create a target → add steps →
  invite a buddy → get roasted → complete it → take the victory lap.
- Every control is wired. No placeholder screens, no dead buttons.

### Auth & identity
- Email + password (bcrypt, cost 12) **and** TideCloak SSO.
- Email verification and password reset via one-time hashed tokens (24h / 1h).
- Sessions: 15-minute access token in memory, rotating refresh token in an
  httpOnly cookie, 7-day or 30-day ("remember me"), revocable server-side.
- Roles `MEMBER` / `MODERATOR` / `ADMIN` enforced by middleware, plus
  per-target ownership checks (owner, buddy, stranger).

### Data & persistence
- PostgreSQL 16 with Prisma. Migrations are committed and run automatically on
  deploy (`prisma migrate deploy`).
- Zod validation on both sides — the client mirrors the server schemas for
  instant feedback, the server is the authority.
- Backups via `scripts/backup.sh`; per-user JSON export in Settings; deletion
  on request scrubs identifiers immediately.

### UX & accessibility
- Mobile-responsive from 320px up.
- Keyboard navigable, focus trapped in dialogs, `aria-live` announcements,
  labelled inputs with `aria-describedby` errors, visible focus rings.
- One design system (CSS custom properties for space, colour, type).
- Optimistic interactions, skeleton loaders, and empty/error states on every
  screen. Destructive actions get a confirmation, and the ones that can be
  undone get an **Undo** toast.

### Quality
- 39 server tests (Vitest + Supertest) and 24 client tests (Vitest + Testing
  Library).
- ESLint, Prettier, and `tsc --noEmit` on the TypeScript server, all in CI.
- Sentry error tracking (DSN via env, no-op when unset) and first-party
  analytics stored in our own database — no third-party tracker.

### Deployment & ops
- `docker compose up -d --build` for production,
  `docker-compose.staging.yml` as a separate staging environment with its own
  database and ports.
- Every secret comes from the environment; `.env` is gitignored.
- `/api/health` (liveness) and `/api/health/ready` (database) plus container
  healthchecks.
- Structured request logs via morgan, readable with `docker compose logs -f`.

### Trust
- [Privacy policy](src/pages/Privacy.jsx) and [terms of service](src/pages/Terms.jsx)
  with real content, not placeholders.
- In-app [help and onboarding](src/pages/Help.jsx).
- [Feedback channel](src/pages/Feedback.jsx) that works signed in or out.

---

## Meme sourcing

Every roast carries a meme. Templates come from a live pool
(`api.memegen.link`, cached server-side for 6 hours) plus a curated pack in
[`server/data/meme-pack.json`](server/data/meme-pack.json) that the team
extends with formats spotted on the Instagram community.

Images are rendered and proxied through `/api/memes/render`, so the browser
never calls a third party and repeat views are served from disk. If the meme
service is down, the UI falls back to a pure-CSS text card rather than a broken
image. No third-party image is vendored into this repository.

---

## Tests

```bash
npm test                      # client
cd server && npm test         # server
cd server && npm run typecheck
npm run lint                  # both
```

---

## Project layout

```
.
├── src/                     React client (Vite)
│   ├── components/          UI primitives, meme card, panic meter, dialogs
│   ├── lib/                 api, auth, tidecloak, validation, format, analytics
│   └── pages/               one file per screen
├── server/                  Express + TypeScript API
│   ├── prisma/              schema, migrations, seed
│   ├── src/
│   │   ├── middleware/      auth, RBAC, error handling
│   │   ├── routes/          auth, targets, shame, memes, users, analytics, audit
│   │   └── services/        auth, email, roast engine, memes, tidecloak
│   ├── data/meme-pack.json  curated meme templates
│   ├── tidecloak/           realm import file
│   └── tests/               API and unit tests
├── scripts/backup.sh        pg_dump backup and restore
├── docker-compose.yml        production
└── docker-compose.staging.yml
```

---

## Team

VHU_SGS_CSDREDOPS_TEAM_C2

## Licence

MIT
