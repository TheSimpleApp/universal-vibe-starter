# 🌊 Universal Vibe Template

This is a **dynamic, multi-platform starter** designed for high-speed "Vibe Coding" using the **Sculptor Method** - build the complete monolith, then carve away what you don't need.

**Supports:**
- ✅ **Next.js 16** (Web) - App Router, Server Components, Server Actions
- ✅ **React Native / Expo** (Mobile) - Expo Router, NativeWind, Reanimated
- ✅ **Both** - Choose one or both platforms during setup

## 🎯 The Carving Instructions (CRITICAL - Read First!)

This template uses an **interactive onboarding wizard** that guides you through the entire setup process. This is the core "Vibe Coding" philosophy:

1. **Clone the template** (contains everything)
2. **Run `npm run setup`** - Interactive wizard handles everything
3. **Launch immediately** - Your app is ready to go!

### Why This Approach?

- ✅ **Faster than adding** - Deleting folders is instant, wiring up SDKs takes time
- ✅ **Less errors** - Pre-configured integrations work out of the box
- ✅ **AI-friendly** - Cursor/AI understands the complete structure before carving
- ✅ **Zero-config launch** - Wizard sets up Supabase, database, and environment automatically

## 🚀 Quick Start (The Magic)

### Step 1: Clone & Detach

```bash
git clone <this-repo-url> my-new-app
cd my-new-app
rm -rf .git  # Windows: rmdir /s /q .git
git init     # Start fresh
```

### Step 2: Run the Onboarding Wizard

```bash
npm install
npm run setup
```

**The wizard will:**
1. ✅ **Check prerequisites** - Node.js, npm, Supabase CLI, Expo CLI (if needed)
2. 🎯 **Select platform** - Choose Next.js, React Native, or both
3. 📦 **Select modules** - Choose which services to keep (Stripe, Mux, Twilio, etc.)
4. 🏗️ **Setup platform structure** - Scaffold Next.js and/or Expo app structure
5. 🗄️ **Setup Supabase** - Local development (recommended) or cloud project
6. 🧹 **Clean up** - Remove unused modules automatically
7. ⚙️ **Configure environment** - Generate `.env.local` with correct values
8. 📊 **Setup database** - Push schema and optionally seed test data (Next.js only)

**At the end, you can:**
- Launch the dev server immediately
- Access Supabase dashboard (if local)
- Start coding right away!

### Step 3: Start Building

```bash
npm run dev
```

Visit `http://localhost:3000` and you're ready to code! 🎉

### Manual Setup (If You Prefer)

If you skip the wizard or want to do things manually:

```bash
# Start Supabase locally
npx supabase start

# Push database schema
npm run db:push

# Seed test user (optional)
npm run db:reset

# Start dev server
npm run dev
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
│   └── setup.ts               # Interactive onboarding wizard
└── supabase/
    └── migrations/            # SQL migrations (auto-generated + RLS)
```

## 🧩 Available Modules

### Core (Platform-Specific)

**Next.js (Web):**
- **Next.js 16** - App Router, Server Components, Server Actions
- **Supabase** - Auth, Database, RLS policies
- **Drizzle ORM** - Type-safe database queries
- **Tailwind CSS** - Styling with Shadcn UI

**React Native (Mobile):**
- **Expo** - React Native framework with Expo Router
- **NativeWind** - Tailwind CSS for React Native
- **Reanimated** - Smooth animations
- **Supabase** - Auth and database (client-side)

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

**Setup wizard fails?**
- Ensure Node.js 18+ is installed
- Check that npm is available: `npm --version`
- For Supabase CLI issues, install manually: `npm install -g supabase`

**Database connection fails?**
- Ensure Supabase is running: `npx supabase status`
- Check `DATABASE_URL` in `.env.local`
- Verify `.env.local` exists (wizard creates it automatically)

**Setup script doesn't remove modules?**
- Check that `.env.example` has proper start/end markers
- Verify folder structure matches `src/services/<name>`

**RLS policies blocking queries?**
- Verify user is authenticated
- Check policies in `supabase/migrations/20241122000001_rls_policies.sql`

**Can't find Supabase CLI?**
- The wizard will offer to install it automatically
- Or install manually: `npm install -g supabase`
- Or use: `brew install supabase/tap/supabase` (macOS)

---

**Built with ❤️ for Vibe Coding**