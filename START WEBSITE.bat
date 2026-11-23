@echo off
rem Opens the Exam Training Platform from this folder (USB friendly). Works offline.
rem Prefers Google Chrome, then Microsoft Edge, then the default browser.
set "PAGE=%~dp0public\index.html"
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" "%PAGE%"
  goto :eof
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
  start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" "%PAGE%"
  goto :eof
)
if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" (
  start "" "%LocalAppData%\Google\Chrome\Application\chrome.exe" "%PAGE%"
  goto :eof
)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" "%PAGE%"
  goto :eof
)
start "" "%PAGE%"