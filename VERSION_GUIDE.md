# 📦 Version Guide & Testing Checklist

## Current Stable Versions (November 2025)

### Web Stack (Next.js)
| Package | Version | Status | Notes |
|---------|---------|--------|-------|
| Next.js | `16.0.3` | ✅ Latest Stable | Released Nov 2025, React 19 support |
| React | `19.0.0+` | ✅ Stable | Released Dec 2024 |
| React DOM | `19.0.0+` | ✅ Stable | Matches React version |
| Node.js | `20.18.0` | ✅ Recommended | Minimum 18.17.0 |
| npm | `9.0.0+` | ✅ Recommended | Comes with Node.js |

### Mobile Stack (React Native)
| Package | Version | Status | Notes |
|---------|---------|--------|-------|
| Expo SDK | `52` | ✅ Latest Stable | Released Nov 2024 |
| React Native | `0.77` | ⚠️ No React 19 | 0.78+ needed for React 19 |
| React | `18.x` | ⚠️ Expo SDK 52 | React 19 support coming |

**Note:** React Native 0.78+ ships with React 19 support, but Expo SDK 52 uses 0.77. Future updates will align mobile with React 19.

## Version Verification

### Automated Checks (Built into Setup Wizard)

The setup wizard (`npm run setup`) automatically:
1. ✅ Checks Node.js version (requires 18.17+, recommends 20+)
2. ✅ Validates npm version (recommends 9+)
3. ✅ Verifies Supabase CLI availability
4. ✅ Confirms package.json versions before install
5. ✅ Validates installed versions after `npm install`

### Manual Verification

**Check your environment:**
```bash
# Node.js version (should be v20.18.0 or v18.17+)
node --version

# npm version (should be 9.x+)
npm --version

# Verify installed packages
npm list next react react-dom --depth=0
```

**Expected output:**
```
├── next@16.0.3
├── react@19.0.0
└── react-dom@19.0.0
```

## Testing Checklist

### 1. Fresh Clone & Setup
```bash
# Clone your template
git clone <your-template-repo> my-new-project
cd my-new-project

# Verify Node version
node --version  # Should be v20.x or v18.17+

# If using nvm
nvm use  # Uses .nvmrc (20.18.0)

# Install dependencies
npm install

# Run setup wizard
npm run setup
```

**Expected:** Setup wizard completes successfully with green checkmarks.

### 2. Version Validation

After `npm install`, the wizard should show:
```
🔍 Verifying installed package versions...

  ✅ Next.js: v16.0.3 (latest stable)
  ✅ React: v19.0.0 (latest stable)
```

**Red flags:**
- ❌ Next.js v15.x detected → Check package.json
- ❌ React v18.x detected → Delete node_modules and reinstall
- ⚠️  Node.js v18.x → Works but v20+ recommended

### 3. Local Development Launch

```bash
# Start development server
npm run dev
```

**Expected:**
- Server starts on http://localhost:3000
- No compilation errors
- Login page loads correctly
- Can navigate to /dashboard (after auth)

**Test:**
- [ ] Server starts without errors
- [ ] Hot reload works
- [ ] TypeScript has no errors
- [ ] Login page renders
- [ ] Can authenticate with test credentials
- [ ] Dashboard loads with user data

### 4. Database Setup (Next.js only)

```bash
# If not done by wizard
npx supabase start
npm run db:push
npm run db:reset
```

**Test:**
- [ ] Supabase starts successfully
- [ ] Migrations apply without errors
- [ ] Test user created (test@example.com)
- [ ] Can log in with test credentials
- [ ] RLS policies are active

### 5. Build & Production

```bash
# Test production build
npm run build
npm run start
```

**Expected:**
- Build completes successfully
- No webpack/turbopack errors
- Production server starts
- App works in production mode

## Troubleshooting

### Issue: Wrong Next.js version installed

**Symptoms:**
- `npm list next` shows v15.x
- Setup wizard shows warning

**Fix:**
```bash
rm -rf node_modules package-lock.json
# Verify package.json has "next": "^16.0.3"
npm install
```

### Issue: React 18 instead of React 19

**Symptoms:**
- `npm list react` shows v18.x
- New React 19 features don't work

**Fix:**
```bash
rm -rf node_modules package-lock.json
# Verify package.json has "react": "^19.0.0"
npm install
```

### Issue: Node.js too old

**Symptoms:**
- Setup wizard shows Node.js version error
- npm install fails with engine errors

**Fix:**
```bash
# Install Node.js 20
# Option 1: Download from nodejs.org
# Option 2: Use nvm
nvm install 20
nvm use 20

# Then retry
npm install
```

### Issue: Packages install but app won't start

**Possible causes:**
1. TypeScript errors → Run `npm run build` to see errors
2. Missing env variables → Run setup wizard again
3. Supabase not running → Run `npx supabase start`
4. Port 3000 in use → Change port or kill process

## Version Update Strategy

When new versions are released:

1. **Test in development branch first**
   ```bash
   git checkout -b test-next-update
   # Update package.json versions
   npm install
   npm run dev
   npm run build
   ```

2. **Check for breaking changes**
   - Review Next.js release notes
   - Test all features
   - Update migration guide if needed

3. **Update template files**
   - `package.json` (both in root and build.js)
   - `README.md`
   - `VERSION_GUIDE.md` (this file)
   - `.cursor/plans/` documents

4. **Commit and tag**
   ```bash
   git commit -m "chore: update to Next.js X.X.X"
   git tag vX.X.X
   git push --tags
   ```

## Resources

- [Next.js Releases](https://github.com/vercel/next.js/releases)
- [React Blog](https://react.dev/blog)
- [React Native Releases](https://github.com/facebook/react-native/releases)
- [Expo Changelog](https://expo.dev/changelog)
- [Node.js Releases](https://nodejs.org/en/about/previous-releases)

---

**Last Updated:** November 23, 2025
**Template Version:** 1.0.0
**Maintained By:** Universal Starter Team

