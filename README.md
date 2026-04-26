# W Money — Financial Model

Secure, password-protected interactive financial model.  
Built with Next.js. Deployed on Vercel.

---

## Deploy to Vercel (10 minutes)

### Step 1 — Push to GitHub

1. Create a new **private** repo on GitHub (github.com → New repository → Private)
2. Upload this entire folder to that repo (drag and drop in the GitHub UI, or use git)

### Step 2 — Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → Sign up / Log in
2. Click **Add New → Project**
3. Import your GitHub repo
4. Click **Deploy** (default settings are fine)

### Step 3 — Set environment variables

After deploy, go to:  
**Vercel → Your project → Settings → Environment Variables**

Add these two variables:

| Name | Value |
|---|---|
| `MODEL_PASSWORD` | Choose a strong password (e.g. `w-money-2026!`) |
| `AUTH_TOKEN` | A random string — generate at https://generate-secret.vercel.app/32 |

Then go to **Deployments → Redeploy** so the variables take effect.

### Step 4 — Share

Your model is now live at `https://your-project.vercel.app`  
Share that URL + the password with Zowie.

---

## Security

- All routes are protected by middleware — no page is accessible without the correct password
- Password is stored as an environment variable, never in code
- Auth token is set as an `httpOnly; Secure; SameSite=Strict` cookie (cannot be stolen by JS)
- Session lasts 24 hours, then requires re-login
- Set the GitHub repo to **Private** so the source code is not public

---

## Local development

```bash
# 1. Copy env file
cp .env.example .env.local
# Edit .env.local and set MODEL_PASSWORD and AUTH_TOKEN

# 2. Install dependencies
npm install

# 3. Run locally
npm run dev
# Open http://localhost:3000
```

---

## Changing the password

Go to Vercel → Settings → Environment Variables → edit `MODEL_PASSWORD` → Redeploy.  
No code changes needed.
