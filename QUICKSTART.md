# Quick Start Guide

## For Development (Right Now)

**Quick Fix:** Use the development config file temporarily:

1. Open your HTML files (login.html, index.html, etc.)
2. Find the import line that looks like:
   ```javascript
   import { auth, db } from './assets/js/firebase-config.js';
   ```
3. Change it to:
   ```javascript
   import { auth, db } from './assets/js/firebase-config.dev.js';
   ```

OR simply rename the files:
```bash
# Backup the template
ren assets\js\firebase-config.js firebase-config.template.js

# Use the dev version
ren assets\js\firebase-config.dev.js firebase-config.js
```

Your app will work immediately!

---

## For Production (Before Deploying)

1. **Restore the template:**
   ```bash
   ren assets\js\firebase-config.template.js firebase-config.js
   ```

2. **Run the build script:**
   ```bash
   node build.js
   ```

3. **Deploy the `public` folder:**
   ```bash
   firebase deploy
   ```

---

## The Problem Explained

- `firebase-config.js` has placeholders like `__FIREBASE_API_KEY__`
- The build script replaces these with actual values from `.env`
- Without running the build, the app tries to use `"__FIREBASE_API_KEY__"` as the actual key
- Firebase rejects it because it's not a valid API key

---

## Permanent Solutions

### Option A: Simple Development Workflow
Just use `firebase-config.dev.js` for local development (it has real keys and is in .gitignore)

### Option B: Build Script Workflow  
Always run `node build.js` before testing or deploying

### Option C: Revert to Original (Simplest)
If the build process is too complex, we can revert to having the keys directly in the file. The keys are relatively safe because:
- Your Firestore rules require authentication ✓
- Firebase keys are meant to be public (they identify your project)
- Real security comes from rules, not hiding keys

Let me know which approach you prefer!
