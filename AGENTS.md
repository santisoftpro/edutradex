# Repository Guidelines

## Project Structure & Module Organization
- `client/` — Next.js 16 app router in TypeScript. Pages live in `src/app`, shared UI in `src/components`, hooks in `src/hooks`, state in `src/store`, helpers in `src/lib`, and global styles in `src/app/globals.css`. Static assets sit in `public/`.
- `server/` — Express + WebSocket API in TypeScript. Entrypoint `src/app.ts`, request handlers under `src/routes`, business logic under `src/services`, config in `src/config`, Prisma schema/migrations in `prisma/`, and file uploads served from `uploads/`.
- `shared/types` — TS contracts shared between client and server; prefer importing from here before redefining shapes.
- `deploy/` — VPS helper scripts (PM2, Nginx) plus sample configs for production rollout.

## Build, Test, and Development Commands
- Client: `cd client && npm run dev` (Next dev server on 3000); `npm run build` to create `.next`; `npm run start` for production; `npm run lint` for ESLint checks.
- Server: `cd server && npm run dev` (watch mode on 5000); `npm run build` to emit `dist/`; `npm start` to run built API; `npm run lint` for a type-check pass.
- Database: from `server/`, use `npm run db:generate` to refresh Prisma client and `npm run db:migrate` (or `npm run db:push` during local prototyping) once schema changes.

## Coding Style & Naming Conventions
- TypeScript-first everywhere. Keep imports typed, prefer explicit return types in services, and favor functional React components with hooks.
- Follow existing formatting: 2-space indentation, single quotes, and trailing commas where already present. Keep components/pages PascalCased, hooks/use* camelCased, and route/service files kebab-cased (e.g., `payment-method.routes.ts`).
- Reuse utilities from `shared/types` and `client/src/lib/utils.ts` to avoid drift between client and API contracts.

## Testing Guidelines
- No automated test suite is in place; run `npm run lint` (client and server) before committing. Add focused tests when touching critical logic—place UI tests alongside components (`*.test.tsx`) and API/unit tests near services/routes (`*.test.ts`), keeping them deterministic.
- Manual smoke checks: hit `http://localhost:5000/health` after starting the server and load `http://localhost:3000` for the client; verify WebSocket-backed features still update live data.

## Commit & Pull Request Guidelines
- Use concise, Conventional Commit-style messages seen in history (`feat: …`, `chore: …`). One logical change per commit when possible.
- Pull requests should include: what changed and why, setup steps (env vars, migrations, seed data), and evidence (screenshots or curl responses) for user-facing or API changes. Link related issues/trello cards when applicable.
- If you modify database schema or environment requirements, mention the new `DATABASE_URL`/`JWT_SECRET` expectations and include the Prisma command you ran so reviewers can reproduce.

## Environment & Deployment Notes
- Server expects a `.env` with `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`, and SMTP/Deriv/Finnhub settings (see `server/src/config/env.ts`). Defaults assume localhost but production should use the deploy scripts in `deploy/` (PM2 + Nginx). Keep secrets out of commits.
