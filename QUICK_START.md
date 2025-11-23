# ⚡ Universal Starter - Quick Start Reference Card

## 🎯 30-Second Setup

```bash
git clone <your-repo> my-app && cd my-app
nvm use              # Use Node.js 20.18.0
npm install          # Install dependencies
npm run setup        # Interactive wizard
npm run dev          # Start coding! 🚀
```

## 📋 Prerequisites Check

```bash
node --version       # Need: v20.18.0 or v18.17+
npm --version        # Need: v9.0.0+
```

## 🔧 Common Commands

| Command | What It Does |
|---------|--------------|
| `npm run setup` | Interactive onboarding wizard |
| `npm run dev` | Start dev server (http://localhost:3000) |
| `npm run build` | Build for production |
| `npm run start` | Run production build |
| `npm run db:push` | Apply database migrations |
| `npm run db:reset` | Reset DB + seed test data |
| `npx supabase start` | Start local Supabase |
| `npx supabase status` | Check Supabase status |

## ✅ Quick Verification

```bash
# Verify versions
npm list next react react-dom --depth=0

# Expected output:
# ├── next@16.0.3
# ├── react@19.0.0
# └── react-dom@19.0.0
```

## 🚨 Quick Fixes

### Wrong Node version?
```bash
nvm use          # Uses .nvmrc (20.18.0)
# or
nvm install 20 && nvm use 20
```

### Wrong package versions?
```bash
rm -rf node_modules package-lock.json
npm install
```

### Setup wizard fails?
```bash
# Check prerequisites
node --version   # v20.x or v18.17+
npm --version    # 9.x+

# Try manual setup
npx supabase start
npm run db:push
npm run db:reset
npm run dev
```

### TypeScript errors?
```bash
npm install      # Reinstall types
npm run build    # See actual errors
```

### Port 3000 in use?
```bash
# Find and kill process
# Windows:
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:3000 | xargs kill -9
```

## 🔑 Test Credentials

After running `npm run db:reset`:

- **Email:** test@example.com
- **Password:** Testing123

## 📚 Need More Help?

- **Full Guide:** [README.md](./README.md)
- **Version Info:** [VERSION_GUIDE.md](./VERSION_GUIDE.md)
- **Testing:** [TESTING.md](./TESTING.md)
- **Troubleshooting:** See README.md → Troubleshooting section

## 🎨 Project Structure

```
src/
├── app/              # Next.js App Router
│   ├── (marketing)/  # Public pages
│   ├── auth/         # Login, signup
│   ├── dashboard/    # Protected area
│   └── api/          # Webhooks only
├── components/       # React components
│   ├── ui/           # Shadcn UI
│   └── global/       # Shared components
├── db/               # Drizzle ORM
│   ├── schema.ts     # Database schema
│   └── seed.ts       # Test data
└── services/         # Optional integrations
    ├── stripe/       # Payments
    ├── mux/          # Video
    ├── twilio/       # SMS
    └── elevenlabs/   # AI Voice
```

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Push to GitHub first
git add .
git commit -m "Initial commit"
git push

# Then deploy
vercel
```

### Environment Variables (Vercel)
```bash
# Required for production:
DATABASE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Optional (if modules selected):
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
MUX_TOKEN_ID
MUX_TOKEN_SECRET
TWILIO_ACCOUNT_SID
# ... etc
```

## 💡 Pro Tips

1. **Use nvm** - `.nvmrc` ensures correct Node version
2. **Run setup wizard** - Handles everything automatically
3. **Test locally first** - `npm run build` before pushing
4. **Keep modules minimal** - Only select what you need
5. **Use local Supabase** - Faster development

## 📦 Tech Stack Summary

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 16.0.3 |
| UI Library | React | 19.0.0 |
| Styling | Tailwind CSS | 3.4+ |
| Database | PostgreSQL | via Supabase |
| ORM | Drizzle | 0.36+ |
| Auth | Supabase Auth | 2.45+ |
| Animations | Framer Motion | 11.0+ |
| Runtime | Node.js | 20.18.0 |

---

**Quick Question?** Check [README.md](./README.md)  
**Deep Dive?** Check [VERSION_GUIDE.md](./VERSION_GUIDE.md)  
**Testing?** Check [TESTING.md](./TESTING.md)  

**Happy Coding! 🎉**

