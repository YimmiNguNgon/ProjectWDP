# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An eBay-like e-commerce platform with three user roles: **buyer**, **seller**, and **admin**. The repo has two main apps:
- `be/` — Node.js/Express REST API + Socket.IO backend
- `fe/` — Vite + React + TypeScript frontend

`Ebay_admina/` is a legacy snapshot; avoid modifying it unless the task explicitly targets it.

## Development Commands

### Backend (`cd be`)
```bash
npm install          # install dependencies
npm run dev          # nodemon on src/server.js (port 8080)
npm start            # production run
npm test             # Jest
```

### Frontend (`cd fe`)
```bash
npm install          # install dependencies
npm run dev          # Vite dev server (port 5173)
npm run build        # tsc -b && vite build
npm run lint         # ESLint flat config
npm run preview      # preview production build
```

Before opening a PR, always run `npm run lint` and `npm run build` in `fe`.

## Environment Variables

**`be/.env`** — MongoDB URI, JWT secret, Cloudinary, Nodemailer (Gmail), Google OAuth, `PORT=8080`, `CLIENT_URL=http://localhost:5173`

**`fe/.env`** — `VITE_API_URL=http://localhost:8080`, Cloudinary cloud name/upload preset

## Architecture

### Backend (`be/src/`)

Entry point: `server.js` — mounts all routes under `/api/*`, connects to MongoDB, initializes Passport (Google OAuth), seeds default `admin`/`seller` accounts on startup, and starts the Express server.

Real-time: `socket.js` wraps the HTTP server with Socket.IO for chat/notifications.

Scheduled jobs (`jobs/`): node-cron tasks for deal expiration, refund processing, seller stage promotion, and verified badge re-evaluation.

**Domain structure** (each domain has aligned route/controller/service files):
- **Auth** — JWT access tokens (Bearer) + refresh tokens (httpOnly cookies), bcrypt passwords, Google OAuth via Passport, email verification, password reset
- **Users** — profile, addresses, seller application flow
- **Products** — CRUD, image upload via Cloudinary (`multer` → `uploadController`), category management, keyword moderation
- **Orders/Cart** — `CartItem` → `Cart` → `Order` → `OrderGroup`, checkout, shipping status, seller order management
- **Reviews/Feedback** — buyer leaves feedback, seller can request revisions (`FeedbackRevisionRequest`)
- **Seller Trust System** — `SellerTrustScore` model, tier-based moderation, `SellerRiskHistory`, verified badge (`VerifiedBadge`)
- **Promotions/Vouchers** — seller promotion requests, global admin vouchers, `VoucherRequest` approval flow
- **Moderation** — `UserViolation`, `BanAppeal`, `AuditLog`, `Complaint` with automated keyword scanning and `conversationModerationService`
- **Notifications** — `Notification` model + `notificationService`, email via Nodemailer
- **Chat** — `Conversation` + `Message` models, Socket.IO real-time, `chatHistoryService`
- **Search** — `SavedSearch`, `Watchlist`, saved sellers

Middleware: `auth.js` (JWT verify + banned-user check), `authMiddleware.js` (role checks), `auditLogMiddleware.js`, `errorHandler.js`, `sellerEmailNotify.js`.

### Frontend (`fe/src/`)

Entry point: `main.tsx` — wraps the app in `AuthProvider` (holds user state, token, sign-in/up/out/refresh), `CartProvider`, `BrowserRouter`, and `Toaster`.

**Routing** (`routes/index.tsx`): Three layout trees:
- `/` — `MainLayout` (with `SocketProvider` for real-time) — public + buyer routes
- `/admin` — `AdminLayout` — guarded by `RoleGuard requireRole="admin"`
- `/seller` — `SellerLayout` — seller dashboard

Route guards: `ProtectedRoute` (requires authentication), `RoleGuard` (requires specific role).

**HTTP client** (`lib/axios.ts`): Axios instance pointing to `VITE_API_URL`. Automatically attaches `Authorization: Bearer <token>` from `localStorage`. Intercepts 401s to attempt a silent token refresh via `/api/auth/refresh` before redirecting to sign-in.

**Auth flow**: Token stored in `localStorage` as `"token"`. `AuthContext` (from `hooks/use-auth.ts`) exposes `user`, `payload`, `loading`, and auth methods. `setToken` decodes the JWT to update `payload`.

**Key contexts**: `AuthContext` (auth state), `CartProvider` (cart state).

**UI**: shadcn/ui component library (Radix UI primitives + Tailwind CSS v4). Components live in `components/ui/`. Page-level components in `pages/`, shared components in `components/`.

## Coding Conventions

- **Backend**: CommonJS (`require`/`module.exports`), 2-space indent, semicolons, double quotes. Files named in camelCase.
- **Frontend**: TypeScript, React function components, PascalCase component files, `use`-prefixed hooks. 2-space indent, semicolons, double quotes.
- Keep route/controller/service/model files aligned by domain feature.
- Commit format: Conventional Commits (`feat:`, `fix:`, `chore:`, etc.).
