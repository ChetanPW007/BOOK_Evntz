# 🚀 Render.com Deployment - Step by Step Guide

## ✅ Files Ready for Deployment
- ✅ `render.yaml` - Blueprint configuration
- ✅ `backend/requirements.txt` - Python dependencies (with gunicorn)
- ✅ `backend/server.py` - Flask application
- ✅ `backend/config/credentials.json` - Google Sheets credentials

---

## 📋 Step-by-Step Deployment Instructions

### Step 1: Push Changes to GitHub

First, commit and push the new files:

```bash
git add .
git commit -m "Add Render.com deployment configuration"
git push origin main
```

### Step 2: Create Render.com Account

1. Go to https://render.com
2. Click **"Get Started for Free"**
3. Sign up with **GitHub** (recommended)
4. Authorize Render to access your repositories

### Step 3: Deploy with Blueprint

#### Option A: Use Blueprint (Automated - Recommended)

1. On Render dashboard, click **"New +"** → **"Blueprint"**
2. Connect your GitHub repository: `ChetanPW007/BOOK_Evntz`
3. Render will detect `render.yaml` automatically
4. Click **"Apply"**
5. Wait for it to create the service

#### Option B: Manual Web Service (If Blueprint Doesn't Work)

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Configure settings:
   - **Name**: `book-evntz-backend`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn server:app`

### Step 4: Add Environment Variables

This is **CRITICAL** - you need to add your Google Sheets credentials:

1. In your Render service, go to **"Environment"** tab
2. Click **"Add Environment Variable"**
3. Add the following:

#### Required Environment Variables:

| Key | Value | How to Get |
|-----|-------|------------|
| `PYTHON_VERSION` | `3.11.0` | Just type this |
| `GOOGLE_SHEETS_CREDS` | `{entire JSON}` | Copy entire contents of `backend/config/credentials.json` |
| `SPREADSHEET_ID` | `1dvo_lNlxHBRNa3jkwBzVqEjNqcCKFuwFchbjzBvPdGc` | Already in your config |

#### How to Add Google Credentials:

1. Open `backend/config/credentials.json` in VS Code
2. **Select ALL** content (Ctrl+A)
3. Copy it (Ctrl+C)
4. In Render, create environment variable:
   - **Key**: `GOOGLE_SHEETS_CREDS`
   - **Value**: Paste the entire JSON
5. Click **"Save Changes"**

### Step 5: Update Backend Code to Use Environment Variables

The credentials file won't exist on Render, so we need to use environment variables instead.

I'll update the code to handle this automatically.

### Step 6: Wait for Deployment

1. Render will automatically build and deploy
2. Watch the **"Logs"** tab for progress
3. Wait for **"Build succeeded"** and **"Service is live"**
4. This takes about 3-5 minutes

### Step 7: Get Your Backend URL

1. Once deployed, you'll see a URL like:
   ```
   https://book-evntz-backend.onrender.com
   ```
2. **Copy this URL** - you'll need it for Step 8

### Step 8: Test Your Backend

Open your backend URL in a browser. You should see:
```json
{"message": "Backend running successfully and connected to Google Sheets!"}
```

### Step 9: Configure Vercel Frontend

1. Go to Vercel dashboard
2. Open your `book-evntz` project
3. Go to **Settings** → **Environment Variables**
4. Add/Update:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://book-evntz-backend.onrender.com/api`
   - **Environments**: Check all (Production, Preview, Development)
5. Click **"Save"**
6. Go to **Deployments** tab
7. Click **"Redeploy"** on the latest deployment

---

## ⚠️ Important Notes

### Free Tier Limitations:
- Render free tier spins down after 15 minutes of inactivity
- First request after inactivity takes 30-60 seconds to wake up
- This is normal and expected

### CORS Configuration:
Your backend already has CORS enabled for all origins:
```python
CORS(app, supports_credentials=True, resources={r"/*": {"origins": "*"}})
```

### Troubleshooting:

**If deployment fails:**
1. Check the **Logs** tab in Render
2. Look for error messages
3. Common issues:
   - Missing environment variables
   - Wrong Python version
   - Missing dependencies in requirements.txt

**If you see "Service Unavailable":**
- Wait 1 minute - service might be starting
- Check logs for errors

**If Google Sheets connection fails:**
- Verify `GOOGLE_SHEETS_CREDS` environment variable is set correctly
- Make sure the JSON is valid (no extra quotes or escaping)
- Check that your service account has access to the spreadsheet

---

## 🎉 Success Checklist

- [ ] Backend deployed to Render.com
- [ ] Backend URL is accessible (shows success message)
- [ ] Environment variables configured on Render
- [ ] Vercel environment variable `VITE_API_BASE_URL` updated
- [ ] Frontend redeployed on Vercel
- [ ] Login works on production site

---

## Next Step

**I'll now update your backend code to properly use environment variables for Google credentials.**

After that, you just need to:
1. Push to GitHub
2. Follow the steps above to deploy on Render
3. Update Vercel environment variable
4. Done! 🚀
