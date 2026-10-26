@echo off
chcp 65001 >nul
setlocal

cd /d "%~dp0"

echo ==============================================
echo    Upload project to Gitee / GitHub
echo ==============================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] git not found in PATH.
  echo Please reopen a new terminal and try again.
  pause
  exit /b 1
)

git --version
echo.

echo --------------------------------------------------
echo  Paste your repository URL, then press Enter.
echo  Example: https://gitee.com/yourname/english-learning-app.git
echo --------------------------------------------------
echo.
set /p REPO=URL: 

if "%REPO%"=="" (
  echo.
  echo [ERROR] Empty URL. Aborted.
  pause
  exit /b 1
)

echo.
echo [1/5] git init
if exist ".git" (
  echo       already a repo, skip
) else (
  git init -b main
)

echo.
echo [2/5] git add
git add -A
if errorlevel 1 goto fail

echo.
echo [3/5] git commit
git commit -m "feat: English learning app with SM-2 spaced repetition" 2>nul
echo       done

echo.
echo [4/5] set remote origin
git remote remove origin >nul 2>nul
git remote add origin "%REPO%"
if errorlevel 1 goto fail

echo.
echo [5/5] push to server
echo.
echo  [!] If asked for credentials:
echo  [!]  Username = your Gitee account name
echo  [!]  Password = your Gitee account password
echo.
git -c credential.helper= push -u origin main
if errorlevel 1 goto fail

echo.
echo ==============================================
echo                S U C C E S S
echo ==============================================
echo.
git remote -v
echo.
echo Your code is now online. Refresh the repo page.
pause
exit /b 0

:fail
echo.
echo ==============================================
echo                   F A I L E D
echo ==============================================
echo.
echo Check the error message above.
echo   "Repository not found"     -^> URL wrong, or repo not created
echo   "Authentication failed"    -^> wrong username / password
echo   "Failed to connect"        -^> network problem, run again
echo.
pause
exit /b 1
