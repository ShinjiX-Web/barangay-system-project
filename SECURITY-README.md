# Security Setup for Barangay Management System

## 🔒 Protecting Your Firebase API Keys

### Important Note
While Firebase API keys can be safely exposed in client-side code (they're meant to identify your Firebase project, not authenticate users), it's still best practice to:
1. Keep them in environment variables for deployment flexibility
2. Ensure your Firestore Security Rules are properly configured (✓ Already done!)
3. Enable Firebase App Check for production

### Current Security Status
✅ **Firestore Rules**: Properly configured to require authentication
✅ **Environment Variables**: Set up with `.env` file
✅ **Git Protection**: `.env` file is in `.gitignore`

---

## 🚀 Setup Instructions

### For Development

1. **Ensure `.env` file exists** (already created)
   - Your Firebase credentials are stored in `.env`
   - This file is NOT committed to Git (protected by `.gitignore`)

2. **Build the project** before running:
   ```bash
   node build.js
   ```
   This will inject your environment variables into the config file

3. **Serve from the `public` directory**:
   ```bash
   firebase serve
   # or
   npx http-server public
   ```

### For Production Deployment

#### Option 1: Firebase Hosting (Recommended)
```bash
# Build first
node build.js

# Deploy
firebase deploy
```

#### Option 2: Other Hosting (Netlify, Vercel, etc.)
Set up environment variables in your hosting platform:
- `FIREBASE_API_KEY`
- `FIREBASE_AUTH_DOMAIN`
- `FIREBASE_PROJECT_ID`
- `FIREBASE_STORAGE_BUCKET`
- `FIREBASE_MESSAGING_SENDER_ID`
- `FIREBASE_APP_ID`

---

## 📋 Additional Security Recommendations

### 1. Enable Firebase App Check
```bash
firebase appcheck:register-web "1:595188953117:web:4371ec5d47b6d18da6d6f4"
```

### 2. Review and Enhance Firestore Rules
Your current rules require authentication (✓), but consider:
- Role-based access control (admin vs regular users)
- Field-level validation
- Rate limiting

Example enhanced rule:
```javascript
match /users/{userId} {
  allow read: if isAuthenticated();
  allow write: if isAuthenticated() && 
               (request.auth.uid == userId || isAdmin());
}

function isAdmin() {
  return isAuthenticated() && 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}
```

### 3. Rotate API Keys (if compromised)
If your API key was exposed publicly:
1. Go to Google Cloud Console
2. Navigate to "APIs & Services" > "Credentials"
3. Restrict your API key by HTTP referrers
4. Or create a new API key and update `.env`

### 4. Set Up HTTP Referrer Restrictions
In Google Cloud Console:
1. Go to "APIs & Services" > "Credentials"
2. Click on your API key
3. Under "Application restrictions", select "HTTP referrers"
4. Add your domain (e.g., `https://yourdomain.com/*`)

---

## 🛡️ Firestore Security Rules Checklist

Current rules status:
- ✅ Authentication required for all reads/writes
- ⚠️  Consider adding role-based permissions
- ⚠️  Consider adding field validation
- ⚠️  Consider adding read/write limits

---

## 📚 Resources

- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase App Check](https://firebase.google.com/docs/app-check)
- [API Key Best Practices](https://firebase.google.com/docs/projects/api-keys)
