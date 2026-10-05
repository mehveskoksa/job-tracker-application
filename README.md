# Job Application Tracker

A full-stack web app to discover job listings, rank them against your profile, and track every application on a kanban board.

**Live demo:** https://job-tracker-application-beta.vercel.app

## About this project

I built this as a portfolio project to show that I can take a system from end to end: authentication, a relational data model, an external API with caching, a ranking algorithm, an interactive UI, and a real deployment.

I want to be upfront about the scope. The goal was a working end-to-end system, not a finished product. The limitations are real and I list them on purpose in the section below.

## Features

- **Authentication:** email and password registration and login with Auth.js (NextAuth v5), plus protected routes.
- **Profile:** skills, desired role, desired location, job type and work mode.
- **Job search:** listings from the public Arbeitnow API, cached in Redis for 10 minutes.
- **Match score (0-100):** each listing is scored against the profile. Listings that are not relevant to the desired role or skills, or that are outside the desired location, are hidden by default. A "Show all" toggle reveals them.
- **Track:** save a listing to your board in one click. Tracking the same listing twice is prevented.
- **Kanban board:** Applied, Interviewing, Offer and Rejected columns. Cards are moved with drag and drop (dnd-kit). The UI updates immediately and rolls back if saving fails.
- **Board filters:** filter tracked applications by location, job type and work mode.

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | Next.js (App Router), React, TypeScript |
| Styling | Tailwind CSS |
| Auth | Auth.js (NextAuth v5, credentials) |
| Database | PostgreSQL with Prisma |
| Cache | Redis (ioredis) |
| Drag and drop | dnd-kit |
| Local development | Docker Compose (Postgres and Redis) |
| Hosting | Vercel, Neon (Postgres), Upstash (Redis) |

## How the matching works

Each listing gets a score from the profile preferences that are filled in:

- Desired role against the listing title (35 points). Spelling variants such as "full-stack" and "fullstack" are treated as the same, and related titles such as "backend" or "software engineer" earn partial credit.
- Skills against the title, tags and description (35 points). Matching is whole-word, so "java" does not match "javascript".
- Location or remote work (20 points). City and region aliases are supported, for example "Veneto" also matches Padova and Verona. Several places can be separated with commas.
- Job type (10 points).

A listing is shown only if it is relevant to the role or skills and matches the location (or is remote). The rest are counted and can be revealed with "Show all".

## Known limitations

- **Few results.** The listing source is Arbeitnow, which focuses on Germany and the DACH region. With a specific role and location the filters leave only a handful of listings. That is the coverage of the source, not a failure of the pipeline.
- **A thin profile.** There is no seniority, spoken languages or excluded keywords yet, so senior positions can appear for a mid-level profile, and listings in German or French can appear for someone who does not speak those languages.
- **Rule-based matching.** Scoring uses keyword and title rules, not semantic understanding.
- **Tracking.** A tracked listing starts in the Applied column. There is no separate "Saved" status yet, and the applied date is not set automatically.
- **No automated tests yet.**
- The demo runs on free hosting tiers, so the first request after a quiet period can be slow.

## Getting started locally

Requirements: Node.js and Docker.

```bash
git clone https://github.com/mehveskoksa/job-tracker-application.git
cd job-tracker-application
npm install
cp .env.example .env
docker compose up -d
npx prisma migrate dev
npm run dev
```

Open http://localhost:3000.

### Environment variables

| Name | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. Locally, use the credentials from `docker-compose.yml` with host `localhost` and port `5432`. |
| `REDIS_URL` | Redis connection string, for example `redis://localhost:6379`. Use a `rediss://` URL for hosted Redis with TLS. |
| `NEXTAUTH_SECRET` | Random secret used to sign sessions. Generate one with `openssl rand -base64 32`. On Vercel, the same value is set as `AUTH_SECRET`. |
| `NEXTAUTH_URL` | Base URL of the app. Needed locally, not on Vercel. |

The `.env` file is ignored by git. `.env.example` lists the names only.

## Deployment

The app is deployed on Vercel with a managed Postgres database on Neon and a managed Redis database on Upstash.

1. Create the database and Redis instances and copy their connection strings.
2. Apply the migrations to the production database: `DATABASE_URL='<production url>' npx prisma migrate deploy`.
3. Import the repository in Vercel and set `DATABASE_URL`, `REDIS_URL` and `AUTH_SECRET`.
4. A `postinstall` script runs `prisma generate` so the Prisma client is created on every install.

## Project structure

```
app/            Pages (search, board, profile, login, register) and API routes
components/     Navbar, job search list, kanban board
lib/            Prisma and Redis clients, Arbeitnow client, matching logic
prisma/         Schema and migrations
```

## Ideas for next steps

- More profile fields: seniority, spoken languages, excluded keywords and several target roles.
- Import skills from a CV (PDF) so the profile can be filled in automatically.
- Add more listing sources, including ones that cover Italy.
- Add automated tests for the matching logic.
