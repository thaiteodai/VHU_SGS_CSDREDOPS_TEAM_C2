[![Built with TideCloak](https://tide.org/badges/built-with-tidecloak.svg)](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked)

## Project overview

_Panic Plan turns a deadline into a public commitment: you set a target, invite a friend to witness it, and the app escalates a roast as the clock runs down._

Built with [TideCloak](https://tide.org/tidecloak?utm_source=github&utm_medium=readme&utm_campaign=unlocked).

### 1. Vision & originality

Most deadline apps let you snooze, reschedule and quietly abandon things. The
abandonment is invisible, so nothing ever changes. Panic Plan makes the
*failure* the product:

- Every target has a **deadline, a chaos level and a deadline personality**.
  The personality ("The Overconfident Optimist", "The Silent Slobber", "The
  Methodical Masochist") colours every message the app writes about it.
- The **roast escalation** is deterministic, never random. As the deadline
  approaches, the app moves through five tiers — *Polite*, *Passive-Aggressive*,
  *Legal*, *Desperate*, *Cosmic Despair*. The clock decides the tier; your
  chaos level (1–5) shifts it one step softer or harsher.
- An **accountability buddy** can be invited to a single target. Buddies can
  deploy the roast on you, and you can deploy it on them. The relationship is
  scoped to one target, never the whole account.
- Finishing a target triggers a **victory lap**: confetti and a sarcastic
  eulogy for the deadline that died. Missing one puts it on the **Wall of
  Shame** — but only if you opted in.
- Every roast carries a **meme**, rendered server-side from a live template
  pool, so the escalation actually lands.

Nobody can move the line. There is no admin override, no "move my friend's
queue position" button, and the role model is enforced on the server.

### 2. Trust constraint insight

Deadlines fail for a boring reason: nobody is watching. The usual fix is
nagging — WhatsApp messages, reminder apps, a colleague being polite. All of
them are soft. You can mute a friend, you can dismiss a notification, you can
quietly slip a date, and no one notices or can prove anything.

The real blocker is **verifiable accountability without surveillance**. To hold
someone to a deadline you need to know who they are, you need to know the
promise was made, and you need everyone else to be able to check that the same
rules applied to everybody. Today you can have any one of those on its own, but
not all three at once — and the moment you ask for the third, you hand over
your data to a platform that has no incentive to keep it narrow.

Panic Plan shows that this constraint is removable. Identity comes from
TideCloak, so a member carries one verifiable identity across sign-in methods
instead of a new silo of app-specific accounts. The commitment and its
witnesses are first-class records with an append-only public log, so the
accountability is legible to everyone without handing anyone a dossier. The
roast is the enforcement: social consequence, not institutional surveillance.

Privacy is not a policy page here, it is the mechanism. A buddy sees one
target. A stranger gets a 403 from the server, not a hidden button. The Wall of
Shame is opt-in per member. You can export everything we hold about you as
JSON, or delete it, and deletion scrubs your identifiers immediately.

### 3. Value & impact

Students, freelancers, students-of-music, and anyone with a "self-imposed
deadline" that has quietly stopped existing.

Concrete example: Sam has promised a thesis chapter by Friday. In Panic Plan he
creates the target, invites Riley as a witness, and picks chaos level 4. On
Wednesday the app starts escalating past *Legal*: "I have started a formal
record of this." Riley can see the target and the panic meter, but cannot see
Riley's other data, cannot edit the target, and cannot extend the deadline.
When Sam finishes, the log shows a target completed on time with two witnesses
on the record — which is exactly the kind of evidence a supervisor, a client
or a funding body asks for and nobody can currently produce.

The secondary benefit is that **the app is fun to fail at**. Deadlines get
completed partly because the failure mode is a joke rather than a nag, and
partly because the social cost of missing is legible and shared rather than
private and ashamed.

### 4. Why TideCloak matters

TideCloak is not a login button bolted onto this app. It is the identity
substrate that makes the trust story work.

**Hybrid (BFF) mode.** We run the SDK in `authMode: "hybrid"`. The browser
never receives a TideCloak token. The SDK generates a PKCE verifier, redirects
to TideCloak, and on the callback hands the authorization code to *our*
server. The server performs the code exchange, verifies the ID token against
the realm's JWKS, and issues our own httpOnly session cookie. Tokens never
reach the browser, so there is nothing in localStorage to steal and nothing in
a tab for an extension to read.

**One identity, many sign-in paths.** A member can sign up with email and
password, or sign in with TideCloak, and both converge on the same account —
the link is made by verified email, so the two paths never fork into two
half-identities.

**Roles that mean something.** The realm defines `MEMBER`, `MODERATOR` and
`ADMIN` as first-class realm roles, and the realm ships with the app (imported
on first boot). A moderator can hide a roast; an admin can change a role. But
the TideCloak role is only the *outer* layer: ownership of a target is checked
per resource on the server. Identity proves *who you are*; the database decides
*what you may touch*. Getting that separation right is what stops a deadline
tool from becoming a surveillance tool.

**Verifiable, self-hosted identity.** The realm is a file in this repository.
Anyone can run the whole thing, including the IdP, with one command, and
inspect exactly what the identity provider holds.

### 5. Prototype & storytelling

The prototype is a working full-stack application, not a mockup. Everything
below works, including the parts that are usually faked.

**The moment to watch: the escalation.** Create a target due tomorrow with
chaos level 4, press *Deploy a roast*, and watch the tier climb from
*Passive-Aggressive* through *Legal* to *Desperate* as the deadline approaches.
The copy changes, the panic meter fills, and each roast carries a meme
rendered through our own server. A buddy signs in, sees only that one target,
and can deploy a roast of their own.

**Live, not simulated:**

- Real sign-up, email verification and password reset (the links are printed
  to the server log when SMTP is not configured, so the flow is demonstrable
  offline).
- Real TideCloak sign-in in hybrid mode against a live
  `tideorg/tidecloak-dev` container, with the realm imported from
  `server/tidecloak/panicplan-realm.json`.
- Real PostgreSQL with committed Prisma migrations, real session rotation,
  real server-enforced roles, real data export and real deletion.
- A public audit log that records every action, and a Wall of Shame that only
  shows members who opted in.

**The trust demo:** sign in as a stranger and request a buddy's target. The
server returns 403. The data is never sent, and no amount of poking at the
client will reveal it. Then open Settings → *Export my data* and show a JSON
file with everything we hold — and that there is no password hash in it.

## Setup

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

The `panicplan` realm is imported automatically on first boot, so TideCloak
sign-in works out of the box. Seed the demo accounts with:

```bash
docker compose --profile seed run --rm seed
```

### Local development

```bash
createdb panicplan
psql -c "CREATE USER panicplan WITH PASSWORD 'panicplan' CREATEDB;"

cd server
cp .env.example .env
npm install
npx prisma migrate deploy
npx prisma generate
npm run prisma:seed
npm run dev                    # http://localhost:4000

cd ..
npm install
npm run dev                    # http://localhost:5173
```

### Demo accounts

Password for all of them: `Password123!`

| Email | Role |
|---|---|
| `ada@panicplan.local` | ADMIN |
| `morgan@panicplan.local` | MODERATOR |
| `sam@panicplan.local` | MEMBER |
| `riley@panicplan.local` | MEMBER, on the Wall of Shame |

TideCloak: `tide@panicplan.local` / `Password123!` (imported with the realm).

### Tests and checks

```bash
npm test                       # client
cd server && npm test          # server: 39 API and unit tests
cd server && npm run typecheck # tsc --noEmit
npm run lint                   # both
./scripts/smoke.sh             # end-to-end against a running stack
./scripts/backup.sh create     # pg_dump backup
```

## How it is built

```
.
├── src/                     React client (Vite) - design system, one file per screen
│   ├── components/          UI primitives, meme card, panic meter, onboarding
│   ├── lib/                 api, auth, tidecloak, validation, format, analytics
│   └── pages/               Home, Target, Login, Register, Settings, Admin, ...
├── server/                  Express + TypeScript API
│   ├── prisma/              schema, migrations, seed
│   ├── src/
│   │   ├── middleware/      auth, RBAC, optional auth, error handling
│   │   ├── routes/          auth, targets, shame, memes, users, analytics, audit
│   │   └── services/        auth, email, roast engine, memes, tidecloak
│   ├── data/meme-pack.json  curated meme templates
│   ├── tidecloak/           realm import file
│   └── tests/               39 API and unit tests
├── scripts/                 backup.sh, smoke.sh
├── docker-compose.yml        production
└── docker-compose.staging.yml
```

**Stack:** React 19 + Vite · React Router · TanStack Query · Express ·
TypeScript · Prisma · PostgreSQL 16 · Zod · TideCloak (hybrid) · Docker Compose
· Vitest · GitHub Actions.

More detail in [docs/OPERATIONS.md](docs/OPERATIONS.md) — deployment,
health checks, backups, logs and secret rotation.

## Team

VHU_SGS_CSDREDOPS_TEAM_C2

## Licence

MIT
