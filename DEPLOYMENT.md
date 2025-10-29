# Deployment Guide - Email Marketing Platform

This application is now ready to be deployed to the internet so anyone can access it without sharing your IP address.

## Option 1: Render (Recommended - FREE)

Render is a free hosting platform perfect for Node.js applications.

### Steps:

1. **Create a GitHub Repository**
   - Go to https://github.com and create a new repository
   - Upload your project files (without node_modules and uploads folders)

2. **Sign up for Render**
   - Go to https://render.com
   - Sign up using your GitHub account

3. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name**: your-app-name
     - **Environment**: Node
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
     - **Instance Type**: Free

4. **Add Environment Variables**
   - In Render dashboard, go to "Environment"
   - Add your SMTP credentials:
     ```
     SESSION_SECRET=your-random-secret-key-here
     GMAIL_SERVICE=gmail
     GMAIL_USER=your-email@gmail.com
     GMAIL_PASSWORD=your-app-password
     ```

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Your app will be live at: `https://your-app-name.onrender.com`

---

## Option 2: Railway (FREE)

Railway offers free hosting with automatic GitHub integration.

### Steps:

1. **Create GitHub Repository** (same as above)

2. **Sign up for Railway**
   - Go to https://railway.app
   - Sign up with GitHub

3. **Deploy**
   - Click "New Project" → "Deploy from GitHub repo"
   - Select your repository
   - Railway auto-detects Node.js

4. **Add Environment Variables**
   - Go to Variables tab
   - Add the same variables as Render

5. **Access Your App**
   - Railway provides a public URL: `https://your-app.up.railway.app`

---

## Option 3: Heroku (FREE Tier Available)

### Steps:

1. **Install Heroku CLI**
   - Download from https://devcenter.heroku.com/articles/heroku-cli

2. **Login and Create App**
   ```bash
   heroku login
   heroku create your-app-name
   ```

3. **Set Environment Variables**
   ```bash
   heroku config:set SESSION_SECRET=your-secret-key
   heroku config:set GMAIL_SERVICE=gmail
   heroku config:set GMAIL_USER=your-email@gmail.com
   heroku config:set GMAIL_PASSWORD=your-app-password
   ```

4. **Deploy**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push heroku main
   ```

---

## Option 4: Vercel (FREE)

Vercel is great for quick deployments.

### Steps:

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Follow prompts** and your app will be deployed!

---

## Important Notes

1. **File Uploads**: Free hosting services have temporary file storage. Uploaded files will be lost on restart. For permanent storage, consider:
   - AWS S3
   - Cloudinary
   - MongoDB GridFS

2. **Database**: Current app uses in-memory storage. For production, add:
   - MongoDB (free at MongoDB Atlas)
   - PostgreSQL (free at ElephantSQL)

3. **Session Storage**: Use Redis or MongoDB for persistent sessions in production

4. **Custom Domain**: All platforms support custom domains (optional)

---

## Quick Start (Render - Recommended)

1. Create GitHub account if you don't have one
2. Create new repository and push your code
3. Go to Render.com
4. Click "New Web Service"
5. Connect GitHub repo
6. Add environment variables
7. Deploy!

Your app will be accessible worldwide at a public URL! 🌍

---

## Accessing Your Deployed App

Once deployed, share the URL with anyone:
- `https://your-app-name.onrender.com` (Render)
- `https://your-app-name.up.railway.app` (Railway)
- `https://your-app-name.herokuapp.com` (Heroku)

Anyone can visit this URL and:
1. Register an account
2. Login
3. Use all features (send emails, upload HTML, track campaigns)
4. All data is isolated per user!

No IP address sharing required! 🎉
