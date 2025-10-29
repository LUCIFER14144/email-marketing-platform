@echo off
echo ========================================
echo    DEPLOYING YOUR EMAIL PLATFORM
echo ========================================
echo.

REM Check if Git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git is not installed!
    echo.
    echo Please download Git from: https://git-scm.com/download/win
    echo After installing, run this script again.
    pause
    exit /b 1
)

echo [OK] Git is installed
echo.

REM Initialize Git repository
echo Step 1: Initializing Git repository...
git init
echo.

REM Add all files
echo Step 2: Adding files to Git...
git add .
echo.

REM Commit
echo Step 3: Creating initial commit...
git commit -m "Initial commit - Email Marketing Platform"
echo.

REM Rename branch to main
echo Step 4: Setting up main branch...
git branch -M main
echo.

echo ========================================
echo    GIT SETUP COMPLETE!
echo ========================================
echo.
echo Next Steps:
echo 1. Go to https://github.com
echo 2. Click '+' then 'New repository'
echo 3. Name it: email-marketing-platform
echo 4. Click 'Create repository'
echo 5. Copy the repository URL (looks like: https://github.com/USERNAME/email-marketing-platform.git)
echo 6. Run: git remote add origin YOUR-REPO-URL
echo 7. Run: git push -u origin main
echo.
echo Then go to https://render.com to deploy!
echo.
pause
