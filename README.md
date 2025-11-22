# 🌊 Universal Vibe Template

This is a modular Next.js 16 starter designed for high-speed "Vibe Coding" using the **Sculptor Method** - build the complete monolith, then carve away what you don't need.

## 🎯 The Carving Instructions (CRITICAL - Read First!)

This template uses an interactive setup script that lets you **remove unused modules** after cloning. This is the core "Vibe Coding" philosophy:

1. **Clone the template** (contains everything)
2. **Run `pnpm setup`** - Interactive CLI asks which modules to keep
3. **Unused modules are deleted** - Clean project with only what you need

### Why This Approach?

- ✅ **Faster than adding** - Deleting folders is instant, wiring up SDKs takes time
- ✅ **Less errors** - Pre-configured integrations work out of the box
- ✅ **AI-friendly** - Cursor/AI understands the complete structure before carving

## 🚀 Standard Operating Procedure (SOP)

### Step 1: Clone & Detach

```bash
git clone <this-repo-url> my-new-app
cd my-new-app
rm -rf .git  # Windows: rmdir /s /q .git
git init     # Start fresh
```

### Step 2: Carve Your Stack

Run the interactive setup to remove unused modules:

```bash
pnpm install
pnpm setup
```

**Select modules you need:**
- ✅ Stripe (Payments) - Selected by default
- ⬜ Mux (Video)
- ⬜ Twilio (SMS/Voice)
- ⬜ ElevenLabs (AI Voice)
- ✅ Inngest (Background Jobs) - Selected by default

**What happens:**
- Unselected service folders are deleted (`src/services/<name>`)
- `.env.example` is cleaned (removes unused ENV sections)
- `.env` file is generated with only selected modules

### Step 3: Start the Engine

```bash
# Start Supabase locally
npx supabase start

# Generate migration from TypeScript schema
pnpm db:generate

# Apply schema to database
pnpm db:push

# Seed test user (test@example.com / Testing123)
pnpm db:reset

# Start dev server
pnpm dev
```

### Step 4: Push to New Repo

```bash
git add .
git commit -m "Initial Vibe Commit"
git remote add origin https://github.com/yourusername/my-new-app.git
git push -u origin main
```

## 🏗️ Architecture Overview

```
universal-vibe-starter/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (marketing)/        # Public landing page
│   │   ├── auth/               # Login, signup, OAuth callback
│   │   ├── dashboard/          # Protected app area
│   │   └── api/                # Webhooks only (Stripe, Inngest)
│   ├── actions/                # Server Actions (no API routes)
│   ├── components/
│   │   ├── ui/                 # Shadcn UI components
│   │   └── global/             # Global components
│   ├── db/                     # Drizzle ORM
│   │   ├── schema.ts          # Single source of truth
│   │   ├── index.ts           # DB client
│   │   └── seed.ts            # Seed script
│   ├── services/               # Modular integrations (A La Carte)
│   │   ├── stripe/            # Payments (can be deleted)
│   │   ├── mux/               # Video (can be deleted)
│   │   ├── twilio/            # SMS (can be deleted)
│   │   └── elevenlabs/        # AI Voice (can be deleted)
│   ├── inngest/               # Background jobs
│   │   └── functions/        # Inngest functions
│   └── utils/
│       └── supabase/          # SSR clients (server, client, middleware)
├── scripts/
│   └── setup.ts               # The "Carving Knife" CLI
└── supabase/
    └── migrations/            # SQL migrations (auto-generated + RLS)
```

## 🧩 Available Modules

### Core (Always Included)
- **Next.js 16** - App Router, Server Components, Server Actions
- **Supabase** - Auth, Database, RLS policies
- **Drizzle ORM** - Type-safe database queries
- **Tailwind CSS** - Styling with Shadcn UI

### Optional Modules (Can Be Removed)

- **Stripe** (`src/services/stripe`) - Payment processing
  - Checkout sessions
  - Customer portal
  - Webhook handling
  - Plan management

- **Mux** (`src/services/mux`) - Video hosting
  - Upload URLs
  - Video processing
  - Playback management

- **Twilio** (`src/services/twilio`) - SMS/Voice
  - Send SMS messages
  - Voice calls

- **ElevenLabs** (`src/services/elevenlabs`) - AI Voice
  - Text-to-speech generation

- **Inngest** (`src/inngest`) - Background jobs
  - Drip campaigns
  - Async processing
  - Scheduled tasks

## 🔒 Security & Database

### Row Level Security (RLS)

All tables have RLS enabled with user-scoped policies:
- Users can only access their own data
- Organizations are owner-scoped
- Videos are user-scoped (if Mux module is used)

**Migration workflow:**
1. Define schema in `src/db/schema.ts`
2. Run `pnpm db:generate` - Auto-generates SQL from TypeScript
3. Apply RLS policies manually in `supabase/migrations/20241122000001_rls_policies.sql`

### Authentication

- Email/password signup and login
- OAuth support (Google, GitHub, etc.)
- Protected routes via middleware
- Server-side session management

## 📝 Development Workflow

### Adding a New Feature

1. **Database changes:** Edit `src/db/schema.ts`
2. **Run:** `pnpm db:generate` (creates migration)
3. **Apply:** `pnpm db:push` (local) or deploy migration (production)

### Adding a New Service Module

1. Create folder: `src/services/<name>`
2. Add ENV section to `.env.example` with start/end markers
3. Update `scripts/setup.ts` to include in module selection
4. Use dynamic imports in Inngest functions if optional

## 🚢 Deployment

### Vercel (Web)

1. Connect GitHub repo
2. Add environment variables
3. Deploy (one click)

### Supabase Cloud

1. Create new project
2. Run migrations: `npx supabase db push`
3. Update `NEXT_PUBLIC_SUPABASE_URL` and keys

## 📚 Key Principles

1. **Modular Strategy** - Services are self-contained and deletable
2. **Server Actions First** - No API routes except webhooks
3. **Drizzle-First** - Schema in TypeScript, generate SQL
4. **RLS Always** - Every table has security policies
5. **Dynamic Imports** - Optional services use `await import()` in Inngest

## 🆘 Troubleshooting

**Setup script doesn't remove modules?**
- Check that `.env.example` has proper start/end markers
- Verify folder structure matches `src/services/<name>`

**Database connection fails?**
- Ensure Supabase is running: `npx supabase status`
- Check `DATABASE_URL` in `.env.local`

**RLS policies blocking queries?**
- Verify user is authenticated
- Check policies in `supabase/migrations/20241122000001_rls_policies.sql`

---

**Built with ❤️ for Vibe Coding**