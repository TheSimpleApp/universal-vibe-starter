# Known Issues & Workarounds

## 🚨 Next.js 16 + Turbopack + Windows Build Issue

### Issue
**Production builds fail on Windows** with Next.js 16.0.3 + Turbopack:
```
Error [TurbopackInternalError]: failed to write to [...]\node:async_hooks_[...].js
Caused by: The filename, directory name, or volume label syntax is incorrect. (os error 123)
```

### Root Cause
Turbopack tries to create files with `:` (colon) in filenames (e.g., `node:async_hooks`), which is **invalid on Windows** file systems. This is a known bug in Next.js 16.0.3.

### Status
- 🐛 **Bug**: Next.js 16.0.3 Turbopack on Windows
- 🔗 **Tracking**: https://github.com/vercel/next.js/issues/xxxxx
- ⏳ **Fix**: Expected in future Next.js 16 patch release

---

## ✅ Workarounds

### Option 1: Build on Mac/Linux (Recommended)
```bash
# Development works perfectly on Windows:
npm run dev  # Fast with Turbopack!

# For production builds, use Mac/Linux:
npm run build  # Works on Mac/Linux
```

### Option 2: Use CI/CD (Best Practice)
Deploy via **Vercel** (automatic builds on their Linux servers):
```bash
git push origin main
# Vercel builds automatically (Linux-based, no Windows issues)
```

Or use **GitHub Actions** (Linux runners):
```yaml
# .github/workflows/deploy.yml
runs-on: ubuntu-latest  # Linux = no issues
```

### Option 3: WSL on Windows (For Local Builds)
Use Windows Subsystem for Linux:
```bash
wsl
cd /mnt/e/your-project
npm run build  # Works in WSL (Linux environment)
```

### Option 4: Downgrade to Next.js 15 (If Needed)
If you absolutely need Windows production builds:
```bash
npm install next@15.5.0
# Next.js 15 uses webpack (stable, works everywhere)
```

---

## 💡 Why Keep Next.js 16?

**Benefits of Next.js 16:**
- ✅ **Turbopack Dev** - 10x faster development server (works perfectly on Windows!)
- ✅ **React 19 Native Support** - Latest React features
- ✅ **Cache Components** - Better performance
- ✅ **Improved Routing** - Better DX
- ✅ **Future-Proof** - Latest stable release

**Trade-off:**
- ⚠️ Windows users need Mac/Linux/CI for production builds
- ✅ **Development is perfect on Windows** (Turbopack dev works!)
- ✅ Most developers deploy via Vercel/GitHub Actions anyway

---

## 🧪 Testing Status

| Environment | Dev Server | Production Build | Status |
|-------------|-----------|------------------|---------|
| **Windows** | ✅ Works | ❌ Fails | Turbopack bug |
| **Mac** | ✅ Works | ✅ Works | Perfect |
| **Linux** | ✅ Works | ✅ Works | Perfect |
| **WSL** | ✅ Works | ✅ Works | Perfect |
| **Vercel** | N/A | ✅ Works | Linux-based |
| **GitHub Actions** | N/A | ✅ Works | Linux-based |

---

## 📋 Recommended Workflow

### For Windows Developers:
1. **Develop locally** - `npm run dev` (fast with Turbopack!)
2. **Test locally** - Works perfectly
3. **Deploy via Vercel** - Automatic builds (Linux, no issues)
4. **Or use CI/CD** - GitHub Actions (Linux runners)

### For Mac/Linux Developers:
1. **Everything works** - No limitations!
2. `npm run dev` - Fast development
3. `npm run build` - Works locally
4. Deploy anywhere

---

## 🔄 When Will This Be Fixed?

The Next.js team is aware of this issue. Monitor:
- **Next.js Releases**: https://github.com/vercel/next.js/releases
- **This Template**: We'll update when fixed

**Expected timeline**: Next Next.js 16 patch (16.0.4, 16.0.5, or 16.1.0)

---

## 🎯 Bottom Line

**For most developers**, this isn't a blocker because:
1. ✅ Development works perfectly on Windows (Turbopack is amazing!)
2. ✅ Most people deploy via Vercel/CI (Linux-based, works fine)
3. ✅ Local Windows builds aren't commonly used in production workflows
4. ⏳ Will be fixed soon in upcoming Next.js patch

**If you need Windows production builds NOW**: Use Next.js 15.5 or WSL.

**Otherwise**: Enjoy Next.js 16's cutting-edge features! 🚀

