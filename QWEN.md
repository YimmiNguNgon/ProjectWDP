# WDP Project Context

## Project Overview

**WDP** is a full-stack e-commerce marketplace application inspired by eBay, built with a **Node.js/Express backend** and a **React + TypeScript + Vite frontend**. The platform supports multiple user roles (buyer, seller, admin) with features including product listings, auctions/deals, shopping cart, orders, messaging, promotions, vouchers, and seller applications.

### Architecture

- **Monorepo structure** with separate `be/` (backend) and `fe/` (frontend) directories
- **Backend**: Express.js + MongoDB (Mongoose) + Socket.IO for real-time features
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui components
- **Authentication**: JWT-based auth with Google OAuth2 support
- **Real-time**: Socket.IO for messaging and notifications

### Key Features

- Multi-role system: buyer, seller, admin
- Product catalog with categories, reviews, and search
- Shopping cart, watchlist, and order management
- Real-time messaging between users
- Seller application workflow
- Promotion and voucher system
- Feedback revision requests
- User violation/ban tracking
- Email verification and password reset
- Google OAuth authentication

---

## Directory Structure

```
WDP/
├── be/                          # Backend (Node.js/Express)
│   ├── src/
│   │   ├── config/              # DB, Passport OAuth config
│   │   ├── controller/          # Request handlers
│   │   ├── middleware/          # Auth, error handling, etc.
│   │   ├── models/              # Mongoose schemas (20+ models)
│   │   ├── routes/              # API route definitions
│   │   ├── services/            # Business logic layer
│   │   ├── jobs/                # Cron jobs (deal expiration)
│   │   ├── utils/               # Helper functions
│   │   ├── views/               # EJS templates
│   │   ├── server.js            # Express entry point
│   │   └── socket.js            # Socket.IO handlers
│   ├── data/                    # Seed data
│   ├── *.js                     # Utility scripts (scan, flag violations)
│   └── package.json
├── fe/                          # Frontend (Vite + React + TS)
│   ├── src/
│   │   ├── api/                 # API client wrappers
│   │   ├── components/          # Reusable UI (shadcn/ui)
│   │   ├── contexts/            # React contexts (Auth, Cart)
│   │   ├── hooks/               # Custom hooks (use-auth, etc.)
│   │   ├── layouts/             # Layout components (Main, Admin, Seller)
│   │   ├── lib/                 # Utilities (axios, utils)
│   │   ├── pages/               # Page components by role
│   │   │   ├── admin/           # Admin dashboard pages
│   │   │   ├── buyer/           # Buyer-specific pages
│   │   │   ├── seller/          # Seller dashboard pages
│   │   │   └── *.tsx            # Public/auth pages
│   │   ├── routes/              # React Router config
│   │   ├── schema/              # Zod validation schemas
│   │   ├── services/            # Frontend services
│   │   ├── assets/              # Static assets
│   │   ├── main.tsx             # React entry point
│   │   └── index.css            # Tailwind CSS
│   ├── public/                  # Static assets
│   ├── components.json          # shadcn/ui config
│   ├── vite.config.ts           # Vite configuration
│   ├── tsconfig*.json           # TypeScript config
│   └── package.json
├── Ebay_admina/                 # Legacy project snapshot (DO NOT MODIFY)
├── .zencoder/                   # CI/CD workflow configs
├── .zenflow/                    # Workflow automation
├── package.json                 # Root dependencies (pdfkit, radix-ui)
├── AGENTS.md                    # Repository guidelines
└── QWEN.md                      # This file
```

---

## Building and Running

### Prerequisites

- **Node.js**: v18+ recommended
- **MongoDB**: Running instance (local or cloud like MongoDB Atlas)
- **Environment variables**: See `.env` setup below

### Environment Setup

Create `.env` files in both `be/` and `fe/` directories:

**Backend (`be/.env`):**
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/wdp
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1d
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email
EMAIL_PASS=your_password
REDIS_URL=redis://localhost:6379
```

**Frontend (`fe/.env`):**
```env
VITE_API_URL=http://localhost:5000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### Development

```bash
# Backend setup and dev server
cd be
npm install
npm run dev           # Starts nodemon on src/server.js

# Frontend setup and dev server (in new terminal)
cd fe
npm install
npm run dev           # Starts Vite dev server
```

### Production Build

```bash
# Backend
cd be
npm start             # Runs node src/server.js

# Frontend
cd fe
npm run build         # TypeScript compile + Vite bundle
npm run preview       # Preview production build locally
```

### Testing

```bash
# Backend tests (Jest)
cd be
npm test

# Frontend lint
cd fe
npm run lint
```

---

## API Endpoints

| Route Prefix | Description |
|--------------|-------------|
| `/api/auth` | Authentication (register, login, refresh, OAuth) |
| `/api/users` | User profile and management |
| `/api/products` | Product CRUD and listings |
| `/api/categories` | Category management |
| `/api/cart` | Shopping cart operations |
| `/api/orders` | Order management |
| `/api/watchlist` | Watchlist CRUD |
| `/api/addresses` | User addresses |
| `/api/search` | Product search |
| `/api/reviews` | Product reviews |
| `/api/chats` | Real-time messaging |
| `/api/notifications` | User notifications |
| `/api/promotions` | Promotion requests |
| `/api/vouchers` | Voucher management |
| `/api/feedback-revision` | Feedback revision requests |
| `/api/seller-applications` | Seller application workflow |
| `/api/admin` | Admin-only operations |
| `/api/saved-searches` | Saved search management |
| `/api/saved-sellers` | Saved seller management |

---

## Database Models

The application uses 20+ Mongoose models:

- **User** - User accounts with role-based access (buyer/seller/admin)
- **Product** - Product listings with auction/deal support
- **Category** - Product categorization
- **Cart/CartItem** - Shopping cart
- **Order** - Order management
- **Review** - Product reviews
- **Message/Conversation** - Real-time messaging
- **Notification** - User notifications
- **Watchlist** - Saved products
- **Address** - User shipping addresses
- **SellerApplication** - Seller registration requests
- **PromotionRequest** - Product promotion requests
- **Voucher/VoucherRequest** - Discount voucher system
- **FeedbackRevisionRequest** - Feedback modification requests
- **SavedSearch/SavedSeller** - User preferences
- **Complaint** - User complaints
- **UserViolation** - Violation tracking
- **Session** - User sessions
- **MessageDebugLog** - Message debugging

---

## Development Conventions

### Code Style

- **Indentation**: 2 spaces
- **Quotes**: Double quotes
- **Semicolons**: Required
- **Backend**: CommonJS (`require`/`module.exports`)
- **Frontend**: ES Modules + TypeScript

### Naming Conventions

- **Frontend components**: PascalCase (e.g., `ProductCard.tsx`)
- **Frontend hooks**: camelCase with `use` prefix (e.g., `use-auth.ts`)
- **Backend files**: camelCase (e.g., `authRoutes.js`, `errorHandler.js`)
- **Test files**: `*.test.js` or `*.spec.js`

### Folder Organization

- **Domain-oriented structure**: Routes, controllers, services, and models are organized by feature
- **Frontend**: Feature-based organization in `pages/`, `components/`, `layouts/`
- **Backend**: Layered architecture (routes → controllers → services → models)

### Git & Commits

- **Format**: Conventional Commits preferred (`feat:`, `fix:`, `chore:`, etc.)
- **PRs should include**: Purpose, affected areas, manual test steps, linked issues, UI screenshots (for frontend)
- **Avoid committing**: `node_modules/`, `.env`, build artifacts, `Ebay_admina/`

---

## Key Implementation Details

### Authentication Flow

1. JWT-based authentication with access + refresh tokens
2. Google OAuth2 support via Passport.js
3. Email verification for new registrations
4. Password reset via email tokens
5. Token stored in localStorage + httpOnly cookies for refresh

### Role-Based Access Control

- **Buyer**: Browse, purchase, review, message sellers
- **Seller**: List products, manage orders, apply for promotions
- **Admin**: Full system access, user/product/feedback management

### Real-Time Features

- Socket.IO for instant messaging
- Real-time notifications
- Chat history persistence

### Security Features

- Helmet.js for HTTP headers
- CORS configuration for development
- bcryptjs for password hashing
- User violation/ban tracking system
- Messaging restrictions for problematic users

---

## Troubleshooting

### Common Issues

1. **MongoDB connection failed**: Ensure MongoDB is running and `MONGO_URI` is correct
2. **CORS errors**: Check frontend is accessing correct backend URL
3. **OAuth failures**: Verify Google Cloud Console credentials and callback URL
4. **Token expiration**: Refresh token endpoint handles automatic renewal

### Default Test Accounts

The backend creates default accounts on first run:
- **Admin**: `admin` / `admin`
- **Seller**: `seller` / `seller`

---

## Related Documentation

- [`AGENTS.md`](./AGENTS.md) - Detailed repository guidelines and coding conventions
- [`be/README.md`](./be/README.md) - Backend-specific documentation (if exists)
- [`fe/README.md`](./fe/README.md) - Frontend-specific documentation (if exists)
