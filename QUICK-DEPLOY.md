# Quick Deployment Guide - Step by Step

## Step 1: Upload to GitHub

### If you don't have Git installed:
1. Go to https://github.com
2. Click "+" → "New repository"
3. Name it: `email-marketing-platform`
4. Click "Create repository"
5. Click "uploading an existing file"
6. Drag and drop ALL files from your project folder EXCEPT:
   - node_modules folder
   - uploads folder
   - .env file (keep your passwords private!)
7. Click "Commit changes"

### If you have Git installed:
```bash
cd "c:\Users\Eliza\Desktop\webemailsending"
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/email-marketing-platform.git
git push -u origin main
```

---

## Step 2: Deploy to Render (Easiest & FREE)

1. **Go to https://render.com**
2. **Click "Get Started for Free"**
3. **Sign up with GitHub**
4. **Click "New +" → "Web Service"**
5. **Connect your repository** (email-marketing-platform)
6. **Configure:**
   - Name: `my-email-platform` (or any name you like)
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Instance Type: `Free`

7. **Click "Advanced" and add Environment Variables:**
   ```
   SESSION_SECRET = make-this-a-long-random-string-abc123xyz
   ```

8. **Click "Create Web Service"**
9. **Wait 5-10 minutes** for deployment
10. **Your app will be live!** 🎉

---

## Your App is Now Live!

Once deployed, Render will give you a URL like:
```
https://my-email-platform.onrender.com
```

**Share this URL with anyone!** They can:
- ✅ Register an account
- ✅ Login from anywhere in the world  
- ✅ Send emails
- ✅ Upload HTML files
- ✅ Track email campaigns
- ✅ Use all features independently

---

## Adding SMTP Email Providers

Users can add their own SMTP credentials after login through the "Upload Files" tab, OR you can set default providers:

In Render → Environment → Add these variables:
```
GMAIL_SERVICE = gmail
GMAIL_USER = your-email@gmail.com
GMAIL_PASSWORD = your-app-password
```

*(Get app password from Google Account → Security → 2-Step Verification → App passwords)*

---

## Important Notes

1. **Free Tier Limitations:**
   - App sleeps after 15 minutes of inactivity
   - First request after sleep takes 30-60 seconds to wake up
   - 750 hours/month free (enough for most use cases)

2. **To Keep App Always On:**
   - Upgrade to paid tier ($7/month) on Render
   - OR use a free uptime monitoring service like UptimeRobot.com to ping your app every 14 minutes

3. **File Storage:**
   - Uploaded HTML files are temporary on free tier
   - They're deleted when app restarts
   - For permanent storage, upgrade or use cloud storage

---

## That's It!

Your email marketing platform is now:
- ✅ Accessible worldwide
- ✅ No IP address needed
- ✅ Multi-user ready
- ✅ Professional and secure

Anyone with the URL can register and use it! 🌍🚀
