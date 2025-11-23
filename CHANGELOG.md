# Changelog

All notable changes to the Universal Starter template will be documented in this file.

## [2.0.0] - November 23, 2025

### 🚀 Major Upgrades
- **Next.js**: 15.0.0 → 16.0.3 (Turbopack stable, React 19 native support)
- **next-themes**: 0.3.0 → 0.4.6 (React 19 peer dependency support)
- **@ai-sdk/openai**: 1.3.24 → 2.0.71
- **ai**: 4.3.19 → 5.0.100
- **@hookform/resolvers**: 3.10.0 → 5.2.2
- **@mux/mux-node**: 8.8.0 → 12.8.0
- **stripe**: 17.7.0 → 20.0.0
- **zod**: 3.25.76 → 4.1.12
- **framer-motion**: 11.18.2 → 12.23.24
- **sonner**: 1.7.4 → 2.0.7
- **tailwind-merge**: 2.6.0 → 3.4.0
- **eslint**: 8.57.1 → 9.39.1

### 📦 Minor/Patch Updates
- **drizzle-orm**: 0.36.4 → 0.44.7
- **drizzle-kit**: 0.28.1 → 0.31.7
- **@supabase/ssr**: 0.5.2 → 0.7.0
- **lucide-react**: 0.468.0 → 0.554.0
- **inngest**: 3.20.0 → 3.46.0
- **typescript**: 5.0.0 → 5.9.3
- **@types/node**: 20.0.0 → 24.10.1
- **tailwindcss**: 3.4.0 → 3.4.18

### ✨ New Features
- Added `.nvmrc` for Node.js version management (20.18.0)
- Added `.npmrc` for peer dependency handling
- Enhanced setup wizard with version validation
- Post-install version verification
- Comprehensive documentation suite

### 📚 Documentation
- Added `QUICK_START.md` - Quick reference card
- Added `VERSION_GUIDE.md` - Version info and troubleshooting
- Added `TESTING.md` - Testing guide for maintainers
- Added `KNOWN_ISSUES.md` - Known issues and workarounds
- Updated `README.md` with prerequisites and limitations

### 🐛 Bug Fixes
- Fixed React 19 peer dependency warnings
- Reduced deprecation warnings from 9 → 4
- Improved cross-platform compatibility

### ⚠️ Known Issues
- Windows production builds fail (Next.js 16 Turbopack bug)
- Workarounds: Build on Mac/Linux, use CI/CD, or WSL
- Dev server works perfectly on all platforms

### 🔧 Maintenance
- Moved build-only packages to devDependencies (chalk, prompts, fs-extra, dotenv)
- Removed empty `src/services/openai/` directory
- Cleaned up documentation redundancy

---

## [1.0.0] - November 2025

### Initial Release
- Next.js 15 with App Router
- React 19 support
- Supabase auth and database
- Drizzle ORM
- Interactive setup wizard
- Modular service architecture
- Shadcn UI components
- Framer Motion animations

