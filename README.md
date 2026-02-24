# BUBA Catering Order System — Build Plan

## Instructions for Claude Code

This project is built in 5 sequential phases. **You must complete them in order.**

1. Read and build ONLY `phase-1.md` first.
2. Do NOT read or reference any later phase files until the current phase is fully complete and working.
3. When you finish a phase, stop and tell the user. Wait for them to confirm before moving to the next phase.
4. Do not skip ahead, combine phases, or build anything not described in the current phase file.

## Phase Overview

- **Phase 1**: Backend — database, API routes, data models (Turso + Next.js)
- **Phase 2**: Customer-facing order form UI
- **Phase 3**: Admin dashboard with auth
- **Phase 4**: Prep sheet PDF generation + email notifications
- **Phase 5**: Polish, settings page, rate limiting, deployment prep

## Tech Stack

- Next.js 14+ (App Router), TypeScript
- Turso (libSQL) for database
- Tailwind CSS for styling
- Resend for email
- @react-pdf/renderer for PDF generation
- jose for JWT auth

## Environment Variables

The user will fill in `.env.local` with real values. The required vars are:

```
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
RESEND_API_KEY=
ADMIN_USER=
ADMIN_PASS=
KITCHEN_EMAIL=
BUBA_CONTACT_EMAIL=
```

Start with Phase 1 now.
