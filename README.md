# 🌊 Universal Vibe Template

> **⚡ New here?** Check [QUICK_START.md](./QUICK_START.md) for a 30-second reference card!

This is a **dynamic, multi-platform starter** designed for high-speed "Vibe Coding" using the **Sculptor Method** - build the complete monolith, then carve away what you don't need.

**Supports:**
- ✅ **Next.js 16.0.3** (Web) - App Router, React 19, Server Components, Server Actions
- ✅ **React Native / Expo** (Mobile) - Expo Router, NativeWind, Reanimated
- ✅ **Both** - Choose one or both platforms during setup

**Latest Stable Versions:**
- Next.js: `16.0.3` (with React 19 support)
- React: `19.0.0+` (stable as of December 2024)
- Node.js: `20.18.0+` recommended (minimum 18.17.0)

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

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js 18.17+** (20.18.0+ recommended for best performance)
- **npm 9+** (comes with Node.js)
- **Git** (for version control)
- **Supabase CLI** (optional, wizard can install it for you)

**Quick check:**
```bash
node --version  # Should be v20.x or v18.17+
npm --version   # Should be 9.x or higher
```

**Using nvm?** This project includes `.nvmrc`:
```bash
nvm use  # Automatically uses Node.js 20.18.0
```

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
npm install  # Uses --legacy-peer-deps (see .npmrc)
npm run setup
```

> **Note:** This project uses `.npmrc` with `legacy-peer-deps=true` to handle peer dependency warnings from `next-themes` (doesn't support React 19 peer deps yet, but works fine).

> **Note:** If you see TypeScript errors in your IDE before running `npm install`, this is normal! TypeScript needs installed dependencies to resolve types. All errors will disappear after installation. See [TYPESCRIPT_SETUP.md](./TYPESCRIPT_SETUP.md) for details.

**The wizard will:**
1. ✅ **Check prerequisites** - Node.js 18.17+, npm 9+, Supabase CLI
   - Validates Node.js version (recommends 20+)
   - Verifies npm version
   - Checks Supabase CLI availability
2. 🎯 **Select platform** - Choose Next.js, React Native, or both
3. 📦 **Select modules** - Choose which services to keep (Stripe, Mux, Twilio, etc.)
4. 🏗️ **Setup platform structure** - Scaffold Next.js and/or Expo app structure
5. 🗄️ **Setup Supabase** - Local development (recommended) or cloud project
6. 🧹 **Clean up** - Remove unused modules automatically
7. ⚙️ **Configure environment** - Generate `.env.local` with correct values
8. 📊 **Setup database** - Push schema and optionally seed test data (Next.js only)
9. 🔍 **Verify installations** - Confirms Next.js 16 and React 19 are properly installed

**At the end, you can:**
- Launch the dev server immediately
- Access Supabase dashboard (if local)
- Start coding right away!

### Step 3: Start Building

```bash
npm run dev
```

Visit `http://localhost:3000` and you're ready to code! 🎉

> **💡 Pro Tip:** If you see TypeScript errors before running `npm install`, that's normal! See [TYPESCRIPT_SETUP.md](./TYPESCRIPT_SETUP.md) for details.

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
- **Next.js 16.0.3** - App Router, Server Components, Server Actions, Turbopack
- **React 19** - Latest stable with new features (Actions, useOptimistic, etc.)
- **Supabase** - Auth, Database, RLS policies
- **Drizzle ORM** - Type-safe database queries
- **Tailwind CSS** - Styling with Shadcn UI
- **Framer Motion** - Smooth animations

**React Native (Mobile):**
- **Expo SDK 52** - Latest stable (React Native 0.77)
- **Expo Router** - File-based routing
- **NativeWind** - Tailwind CSS for React Native
- **Reanimated** - Smooth animations
- **Supabase** - Auth and database (client-side)
- **Note:** React Native 0.78+ required for React 19 support (planned for future update)

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

**Node.js version too old?**
- Download latest from [nodejs.org](https://nodejs.org/)
- Or use nvm: `nvm install 20 && nvm use 20`
- This project includes `.nvmrc` for automatic version management

**Setup wizard fails?**
- Ensure Node.js 18.17+ is installed
- Check that npm is available: `npm --version`
- For Supabase CLI issues, install manually: `npm install -g supabase`

**Wrong Next.js or React version installed?**
- Check package.json has `next: "^16.0.3"` and `react: "^19.0.0"`
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again
- The setup wizard will verify versions after installation

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

## 📚 Additional Documentation

- **[QUICK_START.md](./QUICK_START.md)** ⚡ - 30-second reference card (commands, fixes, tips)
- **[VERSION_GUIDE.md](./VERSION_GUIDE.md)** - Version information, verification steps, and update strategy
- **[TESTING.md](./TESTING.md)** - Comprehensive testing guide for template maintainers
- **[KNOWN_ISSUES.md](./KNOWN_ISSUES.md)** 🚨 - Known issues and workarounds (Windows build, etc.)
- **[TYPESCRIPT_SETUP.md](./TYPESCRIPT_SETUP.md)** - TypeScript configuration and troubleshooting

## ⚠️ Known Limitations

- **Windows Production Builds**: Next.js 16 + Turbopack has a known bug preventing production builds on Windows. **Development works perfectly!** For builds, use Mac/Linux, CI/CD, or WSL. See [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) for details and workarounds.

---

**Built with ❤️ for Vibe Coding**