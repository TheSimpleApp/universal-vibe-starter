# ⚡ Fast Prototype Mode

## TL;DR - 30 Second Setup

```bash
./setup.sh

# When prompted:
# 1. Select platform: Next.js
# 2. Select modules: None (or what you need)
# 3. Auth provider: ⚡ Mock Auth (FASTEST)
# 4. Start coding!

npm run dev
```

**Login with:**
- Email: `test@example.com`
- Password: `Test123`

That's it! No Docker, no Supabase, no waiting.

---

## What is Fast Prototype Mode?

A **zero-setup development mode** for rapid prototyping:

- ✅ **SQLite database** (file-based, no Docker)
- ✅ **Mock authentication** (instant login, no real auth)
- ✅ **Instant startup** (< 5 seconds total)
- ✅ **No external services** (works offline)
- ✅ **No configuration** (works out of the box)

Perfect for:
- UI/UX prototyping
- Testing features quickly
- Demos and POCs
- Learning the stack
- When you don't need real auth yet

---

## How It Works

### Mock Auth
- Pre-configured test users
- No database queries for auth
- Instant login/logout
- Session stored in memory

**Test Credentials:**
```
User:  test@example.com  / Test123
Admin: admin@example.com / Admin123
```

### SQLite Database
- Single file: `dev.db`
- No Docker containers
- No Supabase CLI needed
- Drizzle ORM works the same
- View data with: `npm run db:studio:sqlite`

---

## Setup Instructions

### Option 1: Using Setup Wizard (Recommended)

```bash
./setup.sh
```

When prompted:
1. **Platform:** Next.js
2. **Modules:** Select what you need (or none)
3. **Auth Provider:** `⚡ Mock Auth (FASTEST)`
4. **Database:** Auto-configured to SQLite

### Option 2: Manual Configuration

```bash
# 1. Install dependencies
npm install

# 2. Create .env.local
echo "AUTH_PROVIDER=mock" > .env.local
echo "DATABASE_URL=file:./dev.db" >> .env.local

# 3. Push schema to SQLite
npm run db:push:sqlite

# 4. Start dev server
npm run dev
```

---

## Development Commands

```bash
# Start dev server
npm run dev

# View database (SQLite Studio)
npm run db:studio:sqlite

# Push schema changes
npm run db:push:sqlite
```

---

## Switching to Production Auth Later

When ready for real authentication:

### Switch to Supabase:
```bash
# 1. Start Supabase
npx supabase start

# 2. Update .env.local
#    Change AUTH_PROVIDER=mock → remove it
#    Add Supabase credentials

# 3. Push schema to Supabase
npm run db:push

# 4. Restart dev server
npm run dev
```

### Switch to Firebase/Other:
```bash
# 1. Install SDK
npm install firebase  # or your auth provider

# 2. Update auth logic
#    Replace mock-auth imports with real auth

# 3. Update .env.local with credentials

# 4. Restart dev server
```

---

## File Structure (Fast Prototype Mode)

```
your-project/
├── dev.db                  # SQLite database (auto-created)
├── src/
│   ├── db/
│   │   ├── sqlite.ts      # SQLite client
│   │   └── schema.ts      # Your schema
│   └── utils/
│       └── mock-auth/
│           └── index.ts   # Mock auth functions
├── drizzle.config.sqlite.ts  # SQLite config
└── .env.local             # AUTH_PROVIDER=mock
```

---

## Mock Auth API

```typescript
import { mockLogin, mockSignup, getCurrentUser } from '@/utils/mock-auth';

// Login
const user = await mockLogin('test@example.com', 'Test123');
if (user) {
  setCurrentUser(user);
  // redirect to dashboard
}

// Get current user
const currentUser = getCurrentUser();

// Logout
await mockLogout();
setCurrentUser(null);
```

---

## SQLite Database API

```typescript
import { db } from '@/db/sqlite';
import { users } from '@/db/schema';

// Same Drizzle ORM API as Supabase!
const allUsers = await db.select().from(users);
const user = await db.select().from(users).where(eq(users.id, '1'));
```

---

## Benefits

| Feature | Fast Prototype Mode | Supabase Local | Supabase Cloud |
|---------|---------------------|----------------|----------------|
| **Setup Time** | < 5 seconds | 2-3 min (first time) | 1-2 min |
| **Requires Docker** | ❌ No | ✅ Yes | ❌ No |
| **Requires Account** | ❌ No | ❌ No | ✅ Yes |
| **Works Offline** | ✅ Yes | ✅ Yes | ❌ No |
| **Real Auth** | ❌ No | ✅ Yes | ✅ Yes |
| **Production Ready** | ❌ No | ⚠️ Dev only | ✅ Yes |
| **Best For** | Prototyping | Local dev | Production |

---

## Limitations

**Not suitable for:**
- ❌ Production use
- ❌ Real user authentication
- ❌ Multi-user testing
- ❌ Security testing
- ❌ RLS policy testing

**Perfect for:**
- ✅ UI/UX prototyping
- ✅ Feature testing
- ✅ Demos and presentations
- ✅ Learning the stack
- ✅ Quick iterations

---

## Example Workflow

```bash
# Morning: Start prototyping
./setup.sh  # Select Mock Auth
npm run dev
# Build features all day (instant login, no waiting)

# Afternoon: Ready for real auth
npx supabase start
# Update .env.local with Supabase
npm run db:push
npm run dev
# Now using real authentication
```

---

## Troubleshooting

**SQLite file not created?**
```bash
npm run db:push:sqlite
```

**Want to reset data?**
```bash
rm dev.db
npm run db:push:sqlite
```

**Want to view/edit data?**
```bash
npm run db:studio:sqlite
# Opens Drizzle Studio at http://localhost:4983
```

---

**Happy Fast Prototyping! ⚡**

