# Repository Guidelines

## Project Structure & Module Organization
- `be/`: Node.js/Express backend (`src/server.js` entrypoint).
- `be/src/`: organized by domain: `controller/`, `routes/`, `models/`, `services/`, `middleware/`, `jobs/`, `config/`, `utils/`, `views/`.
- `fe/`: Vite + React + TypeScript frontend.
- `fe/src/`: feature code in `pages/`, `components/`, `routes/`, `services/`, `api/`, `hooks/`, `contexts/`, `layouts/`, `schema/`, `lib/`.
- `fe/public/`: static assets served directly by Vite.
- `Ebay_admina/`: separate legacy project snapshot; avoid changes unless the task explicitly targets it.

## Build, Test, and Development Commands
- Backend setup: `cd be && npm install`
- Backend dev server: `npm run dev` (nodemon on `src/server.js`)
- Backend production run: `npm start`
- Backend tests: `npm test` (Jest)
- Frontend setup: `cd fe && npm install`
- Frontend dev server: `npm run dev` (Vite local server)
- Frontend build: `npm run build` (TypeScript project build + Vite bundle)
- Frontend preview: `npm run preview`
- Frontend lint: `npm run lint` (ESLint flat config)

## Coding Style & Naming Conventions
- Use 2-space indentation, semicolons, and double quotes (consistent with current `be/src` and `fe/src` code).
- Frontend: TypeScript + React function components; component files in PascalCase (for example `ProductCard.tsx`), hooks in camelCase prefixed with `use`.
- Backend: CommonJS modules (`require/module.exports`), route and service files in camelCase.
- Keep folders domain-oriented (route/controller/service/model aligned by feature).

## Testing Guidelines
- Backend uses Jest (`be`, via `npm test`).
- Name tests `*.test.js` or `*.spec.js`, colocated with code or under a nearby test folder.
- Frontend test runner is not configured yet; at minimum, run `npm run lint` and `npm run build` in `fe` before opening a PR.
- Prioritize tests for auth, cart/checkout flows, and permission checks.

## Commit & Pull Request Guidelines
- Recent history mixes Conventional Commits (`feat:`, `fix:`) and plain messages; prefer Conventional Commit format going forward.
- Keep commits focused and atomic (one logical change per commit).
- PRs should include: purpose, affected areas (`be`/`fe`), manual test steps, linked issue/ticket, and UI screenshots for frontend changes.
- Rebase or merge target branch cleanly; avoid including unrelated files (especially `node_modules` or local env changes).
