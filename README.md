# Tally — Split purchases with friends

A mobile-first web app for tracking shared expenses and generating Venmo request drafts.

## Quick Start

```bash
cd tally
npm install

# Set up environment
cp .env.example .env

# Create database + run migrations
npm run db:push

# Seed demo data
npm run db:seed

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — optimized for mobile viewport.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + shadcn/ui |
| ORM | Prisma |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Validation | Zod |
| Forms | React Hook Form |
| State | Zustand + React Server Components |
| Testing | Jest + ts-jest |

---

## Project Structure

```
tally/
├── app/                        # Next.js App Router pages
│   ├── page.tsx                # Dashboard
│   ├── _components/            # Dashboard client components
│   ├── purchases/
│   │   ├── new/                # Add purchase (manual + Apple Pay sim)
│   │   └── [id]/               # Purchase detail + split
│   ├── balances/               # Outstanding balance overview
│   ├── contacts/               # Contact list + detail
│   ├── requests/               # Venmo request drafts
│   ├── history/                # Full purchase history
│   ├── settings/               # Profile, stats, demo reset
│   └── api/                    # API routes (purchase fetch, demo reset)
│
├── components/
│   ├── ui/                     # shadcn/ui primitives
│   ├── layout/                 # BottomNav, PageHeader
│   ├── shared/                 # AmountDisplay, ContactAvatar, EmptyState
│   └── splits/                 # SplitModal (4-step flow)
│
├── lib/
│   ├── db.ts                   # Prisma singleton
│   ├── utils.ts                # cn, formatDate, getInitials
│   ├── domain/                 # Pure business logic (no framework deps)
│   │   ├── splits.ts           # Split calculation engine
│   │   ├── balances.ts         # Balance ledger operations
│   │   └── settlements.ts      # Venmo draft + settlement logic
│   ├── actions/                # Next.js server actions
│   │   ├── purchases.ts
│   │   ├── splits.ts
│   │   ├── contacts.ts
│   │   └── settlements.ts
│   └── validations/            # Shared Zod schemas
│       ├── purchase.ts
│       ├── contact.ts
│       └── split.ts
│
├── prisma/
│   ├── schema.prisma           # Full data model
│   └── seed.ts                 # Demo data (1 user, 4 contacts, 4 purchases)
│
└── __tests__/
    └── splits.test.ts          # Unit tests for split engine
```

---

## Key Commands

```bash
npm run dev          # Development server (http://localhost:3000)
npm run build        # Production build
npm test             # Run split calculation unit tests
npm run db:push      # Apply schema changes to SQLite
npm run db:seed      # Re-seed demo data
npm run db:studio    # Open Prisma Studio (http://localhost:5555)
```

---

## Core Features

### Dashboard
- Outstanding balance summary
- Recent purchases list
- Quick Add + Simulate Apple Pay buttons

### Add Purchase
- Manual entry (merchant, amount, tax, tip, category, date, notes)
- Simulated Apple Pay (randomizes merchant + amount, triggers same flow)
- Receipt upload placeholder (ready for OCR integration)

### Split Flow (4 steps)
1. **Prompt** — "Split this purchase?" modal
2. **Select** — Choose contacts
3. **Configure** — Split method (equal / percentage / fixed), tax/tip toggles
4. **Preview** — Review amounts, confirm

### Balance Ledger
- Per-contact outstanding balance
- Payment history + settlements
- Progress bar showing paid %

### Venmo Request Drafts
- Auto-generated message with merchant + amount
- Editable message
- Copy to clipboard (includes Venmo deep link if handle is set)
- Mark as sent / settled

---

## Split Calculation

The split engine (`lib/domain/splits.ts`) is a **pure TypeScript module** with no framework dependencies:

- **Equal** — distributes remainder cents one-by-one (no rounding errors)
- **Percentage** — normalizes to 100%, distributes remainder
- **Fixed** — uses exact amounts directly
- **Item-based** — uses pre-computed per-item allocations

Total allocated always equals input total (verified in tests).

---

## Data Model

```
User ──< Purchase ──< PurchaseItem
              │
              └──< SplitParticipant ──< SplitAllocation
                         │
                       Contact ──── Balance ──< Settlement
                         │
                         └──< RequestDraft
```

All monetary values stored as **integer cents** to avoid floating-point errors.

---

## Production Deployment

1. Set up PostgreSQL and update `DATABASE_URL`:
   ```
   DATABASE_URL="postgresql://user:pass@host:5432/tally"
   ```

2. Update `prisma/schema.prisma` provider:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

3. Run migrations:
   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```

4. Deploy to Vercel, Railway, or any Node.js host.

---

## Future: Native Mobile App

The domain layer (`lib/domain/`) contains zero framework dependencies and can be extracted as a shared package for React Native. The API routes provide clean REST boundaries that a mobile client can consume directly.

Recommended path:
1. Extract `lib/domain/` → shared npm package
2. Build React Native app consuming the existing API routes
3. Add push notifications for payment reminders
4. Integrate real Venmo OAuth (when available via official API)
