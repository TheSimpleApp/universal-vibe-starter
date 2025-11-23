# 🧪 Testing Guide for Template Maintainers

This guide is for testing the Universal Starter template before pushing to GitHub or after making changes.

## Quick Test Checklist

### Before Every Commit

- [ ] `npm install` completes without errors
- [ ] `npm run dev` starts successfully
- [ ] No TypeScript errors
- [ ] `npm run build` succeeds

### Before Pushing to GitHub

- [ ] Fresh clone test (see below)
- [ ] Setup wizard completes successfully
- [ ] All version checks pass
- [ ] Database migrations work
- [ ] Test user can log in

## Comprehensive Testing Procedure

### 1. Simulate Fresh Clone

Test as if a user is cloning your template for the first time:

```bash
# Move to temp directory
cd /tmp

# Clone your template (or copy the folder)
git clone <your-template-url> test-universal-starter
cd test-universal-starter

# Check Node version
node --version  # Should match .nvmrc (20.18.0)
```

### 2. Run Setup Wizard

```bash
# Install dependencies
npm install

# Run the setup wizard
npm run setup
```

**Watch for:**
- ✅ All prerequisite checks pass
- ✅ Version validation shows correct versions
- ✅ Platform selection works
- ✅ Module selection works
- ✅ Supabase setup completes
- ✅ Database migrations apply
- ✅ Environment file is generated
- ✅ Final version verification passes

**Interactive selections to test:**

**Test Case 1: Next.js with all modules**
- Platform: Next.js
- Modules: All selected
- Auth: Supabase (local)
- Database: Yes, seed data

**Test Case 2: Next.js minimal**
- Platform: Next.js
- Modules: None (or just Stripe)
- Auth: Supabase (local)
- Database: Yes, no seed data

**Test Case 3: Skip wizard**
- Just answer "No" to launch
- Manually setup later

### 3. Verify Setup Results

After wizard completes:

```bash
# Check generated files
ls -la .env.local  # Should exist with correct values
cat .env.local     # Verify DATABASE_URL and Supabase keys

# Check deleted modules (if any were unselected)
# Example: If Mux was unselected
test -d src/services/mux && echo "ERROR: Mux not deleted" || echo "OK: Mux removed"

# Verify package versions
npm list next react react-dom --depth=0
# Should show:
# next@16.0.3
# react@19.0.0
# react-dom@19.0.0
```

### 4. Launch Development Server

```bash
npm run dev
```

**Test in browser:**
1. Visit http://localhost:3000
2. Should see marketing/landing page
3. Click login → redirects to /auth/login
4. Try logging in with test@example.com / Testing123
5. Should redirect to /dashboard
6. Verify user data is displayed
7. Click logout → should return to home

**Check console:**
- No errors in terminal
- No errors in browser console
- Hot reload works (edit a file and save)

### 5. Test Database Functionality

```bash
# Check Supabase is running
npx supabase status

# Access Supabase Studio
# Open http://127.0.0.1:54323 in browser

# Verify tables exist:
# - users
# - organizations (if applicable)
# - videos (if Mux module selected)

# Verify RLS policies are active
# Try to query without auth → should fail
```

### 6. Test Production Build

```bash
# Build for production
npm run build

# Should complete without errors
# Check build output for:
# - Route sizes
# - No errors or warnings
# - All pages compile successfully

# Start production server
npm run start

# Test in browser (same as dev)
# http://localhost:3000
```

### 7. Test Module Removal

Test that module removal works correctly:

```bash
# Start fresh
cd /tmp
git clone <your-template-url> test-module-removal
cd test-module-removal
npm install

# Run setup, deselect modules
npm run setup
# Deselect: Mux, Twilio, ElevenLabs

# Verify deletions
test -d src/services/mux && echo "FAIL" || echo "PASS"
test -d src/services/twilio && echo "FAIL" || echo "PASS"
test -d src/services/elevenlabs && echo "FAIL" || echo "PASS"

# Check .env.local doesn't have removed module keys
grep "MUX" .env.local && echo "FAIL: Mux keys present" || echo "PASS"
grep "TWILIO" .env.local && echo "FAIL: Twilio keys present" || echo "PASS"
grep "ELEVENLABS" .env.local && echo "FAIL: ElevenLabs keys present" || echo "PASS"

# App should still work
npm run dev
```

### 8. Test Manual Setup (Skip Wizard)

```bash
# Fresh clone
cd /tmp
git clone <your-template-url> test-manual
cd test-manual
npm install

# Skip the wizard, do manual setup
npx supabase start
npm run db:push
npm run db:reset

# Start dev server
npm run dev

# Should work!
```

## Automated Test Script

Create this script as `test.sh` in project root:

```bash
#!/bin/bash

set -e

echo "🧪 Starting Universal Starter Tests..."

# Check Node version
echo "Checking Node.js version..."
NODE_VERSION=$(node --version)
echo "Node.js: $NODE_VERSION"

# Install dependencies
echo "Installing dependencies..."
npm install

# Verify versions
echo "Verifying package versions..."
npm list next react react-dom --depth=0

# Build
echo "Testing production build..."
npm run build

# Check TypeScript
echo "Checking TypeScript..."
npx tsc --noEmit

echo "✅ All tests passed!"
```

Make executable: `chmod +x test.sh`

Run: `./test.sh`

## CI/CD Testing (GitHub Actions)

Add `.github/workflows/test.yml`:

```yaml
name: Test Template

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20.18.0'
    
    - name: Install dependencies
      run: npm install
    
    - name: Verify versions
      run: |
        npm list next react react-dom --depth=0
    
    - name: Type check
      run: npx tsc --noEmit
    
    - name: Build
      run: npm run build
```

## Common Issues to Check

### Issue: Setup wizard hangs
- Check for missing `prompts` package
- Verify Node.js version compatibility
- Check terminal supports interactive prompts

### Issue: Database migrations fail
- Verify Supabase is running: `npx supabase status`
- Check DATABASE_URL in .env.local
- Verify migrations syntax in `supabase/migrations/`

### Issue: TypeScript errors
- Run `npm install` again
- Check `tsconfig.json` is correct
- Verify all @types packages are installed

### Issue: Build fails
- Check for import errors
- Verify all files have correct extensions
- Check for missing dependencies

## Checklist Before GitHub Push

- [ ] All tests pass locally
- [ ] Fresh clone test successful
- [ ] Setup wizard works end-to-end
- [ ] README is up to date
- [ ] VERSION_GUIDE.md is current
- [ ] .nvmrc has correct Node version
- [ ] package.json has correct versions
- [ ] No sensitive data in files
- [ ] .gitignore is complete
- [ ] All documentation is accurate

## After Pushing to GitHub

1. Create a new test repository
2. Clone your template repository
3. Run through the setup wizard
4. Verify everything works as documented

---

**Remember:** This template is meant to be a starting point for new projects. Test thoroughly before recommending it to others!

