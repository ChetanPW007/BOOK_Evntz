# 🆓 PythonAnywhere Deployment (Free - No Credit Card)

## ✅ Why PythonAnywhere?
- 100% Free tier available
- No credit card required
- Perfect for Flask applications
- Easy web-based interface

---

## 📋 Step-by-Step Deployment

### Step 1: Create Account

1. Go to https://www.pythonanywhere.com
2. Click **"Pricing & signup"** → **"Create a Beginner account"**
3. Fill in:
   - Username (this will be in your URL: `username.pythonanywhere.com`)
   - Email
   - Password
4. Click **"Register"**
5. **Verify your email**

### Step 2: Upload Your Code

#### Option A: Use Git (Recommended)

1. Open a **Bash console** from the dashboard
2. Clone your repository:
   ```bash
   git clone https://github.com/ChetanPW007/BOOK_Evntz.git
   cd BOOK_Evntz/backend
   ```

#### Option B: Upload Files Manually

1. Click **"Files"** tab
2. Navigate to your home directory
3. Click **"Upload a file"**
4. Upload all files from your `backend` folder

### Step 3: Create Virtual Environment

In the Bash console:

```bash
cd ~/BOOK_Evntz/backend
python3.10 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Step 4: Upload Google Credentials

1. Go to **"Files"** tab
2. Navigate to `BOOK_Evntz/backend/config/`
3. Click **"Upload a file"**
4. Upload your `credentials.json` file

### Step 5: Configure Web App

1. Go to **"Web"** tab
2. Click **"Add a new web app"**
3. Choose **"Manual configuration"**
4. Select **"Python 3.10"**
5. Click **"Next"**

### Step 6: Configure WSGI File

1. In the **"Web"** tab, find **"Code"** section
2. Click on the **WSGI configuration file** link (e.g., `/var/www/username_pythonanywhere_com_wsgi.py`)
3. **Delete all content** and replace with:

```python
import sys
import os

# Add your project directory to the sys.path
project_home = '/home/USERNAME/BOOK_Evntz'  # Replace USERNAME with your actual username
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# Activate virtual environment
activate_this = '/home/USERNAME/BOOK_Evntz/backend/venv/bin/activate_this.py'  # Replace USERNAME
exec(open(activate_this).read(), {'__file__': activate_this})

# Import Flask app
from backend.server import app as application
```

4. **Replace `USERNAME`** with your actual PythonAnywhere username
5. Click **"Save"**

### Step 7: Set Environment Variables (Optional)

If you want to use environment variables instead of the credentials file:

1. In the **"Web"** tab, scroll to **"Virtualenv"** section
2. Set the path: `/home/USERNAME/BOOK_Evntz/backend/venv`
3. In the **WSGI file**, add before importing the app:

```python
# Set environment variables
os.environ['GOOGLE_SHEETS_CREDS'] = '''
{
  "type": "service_account",
  "project_id": "your-project",
  ...entire credentials.json content...
}
'''
```

### Step 8: Reload Web App

1. Scroll to the top of the **"Web"** tab
2. Click the big green **"Reload"** button
3. Wait for it to complete

### Step 9: Test Your Backend

1. Your URL will be: `https://USERNAME.pythonanywhere.com`
2. Open it in a browser
3. You should see:
   ```json
   {"message": "Backend running successfully and connected to Google Sheets!"}
   ```

### Step 10: Update Vercel

1. Go to Vercel Dashboard
2. Your project → **Settings** → **Environment Variables**
3. Add/Update:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://USERNAME.pythonanywhere.com/api`
4. **Redeploy** your frontend

---

## ⚡ Quick Troubleshooting

### If you see "Something went wrong"

1. Check the **"Error log"** in the Web tab
2. Common issues:
   - Wrong path in WSGI file
   - Virtual environment not activated
   - Missing credentials file

### If imports fail

Make sure your WSGI file has the correct paths and imports

### If Google Sheets connection fails

1. Check that `credentials.json` is uploaded
2. Verify the file path in your code
3. Check error logs for specific errors

---

## 📊 Free Tier Limits

- **Disk Space**: 512 MB
- **Bandwidth**: Limited but sufficient for development
- **Always On**: Web app goes to sleep after inactivity (wakes on request)

---

## 🎉 Advantages

✅ No credit card required
✅ Easy to set up
✅ Web-based file editor
✅ Built-in console for debugging
✅ Perfect for Flask apps

---

## 🔄 Updating Your Code

When you make changes:

```bash
# In PythonAnywhere Bash console
cd ~/BOOK_Evntz
git pull origin main
# Then reload the web app from the Web tab
```

---

## ✨ Done!

Your backend is now live at: `https://USERNAME.pythonanywhere.com`

Test it and update your Vercel environment variable!
