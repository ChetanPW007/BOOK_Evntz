# Backend Deployment Guide

## The Problem
Your Vercel frontend is trying to connect to `localhost:5000/api` which doesn't exist in production.

## Solution Options

### Option 1: Deploy Backend Separately (Recommended)

You need to deploy your Flask backend to a hosting service. Here are your options:

#### **1A. Deploy to Render.com (Free & Easy)**
1. Go to https://render.com and sign up
2. Click "New +" → "Web Service"
3. Connect your GitHub repo
4. Configure:
   - **Name**: `book-evntz-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn server:app`
   - **Add Environment Variables**: Add your Google Sheets credentials
5. Click "Create Web Service"
6. Copy the deployed URL (e.g., `https://book-evntz-backend.onrender.com`)

#### **1B. Deploy to Railway.app (Alternative)**
1. Go to https://railway.app
2. Create new project from GitHub repo
3. Select the `backend` folder
4. Add environment variables
5. Deploy and copy the URL

#### **1C. Deploy to Python Anywhere (Free tier available)**
1. Go to https://www.pythonanywhere.com
2. Upload your backend code
3. Configure WSGI file
4. Copy the URL

### Option 2: Use Vercel for Backend (More Complex)

Vercel can host Python backends using Serverless Functions:
1. Create a `api/` folder in your root
2. Convert Flask routes to Vercel Serverless Functions
3. This requires restructuring your backend

---

## After Backend is Deployed

### Step 1: Add Environment Variable to Vercel

1. Go to your Vercel project dashboard
2. Go to **Settings** → **Environment Variables**
3. Add a new variable:
   - **Name**: `VITE_API_BASE_URL`
   - **Value**: `https://your-backend-url.com/api` (replace with your actual backend URL)
   - **Select**: All environments (Production, Preview, Development)
4. Click **Save**

### Step 2: Redeploy

After adding the environment variable, trigger a new deployment:
- Go to **Deployments** → Click the **•••** menu on latest deployment
- Click **Redeploy**

---

## For Local Development

Your local setup will continue to work because:
- Vite proxy redirects `/api` to `localhost:5000`
- The code defaults to `/api` if no env variable is set

---

## Quick Test (Skip Backend for Now)

If you want to test the frontend without backend:
1. Comment out or mock the API calls temporarily
2. Use static data for testing

---

## Summary

**Current Status:**
- ✅ Frontend code is ready
- ✅ Environment variable support added
- ⚠️ Backend needs to be deployed separately

**Next Steps:**
1. Choose a backend hosting service (Render.com recommended)
2. Deploy your Flask backend
3. Add `VITE_API_BASE_URL` to Vercel environment variables
4. Redeploy frontend

**Estimated Time:** 15-30 minutes
