REM Show file extensions
reg add HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced /v HideFileExt /t REG_DWORD /d 0 /f

REM Set Chrome as default browser
c:\vagrant\SetDefaultBrowser.exe chrome

REM activate Windows
start cmd.exe /k slmgr.vbs /ipk %LICENSEKEY%
start cmd.exe /k slmgr.vbs /ato

REM install the Janban board for Outlook
choco install -y git
rmdir /s /q c:\janban
"c:\Program Files\Git\bin\git.exe" clone https://github.com/janvv/janban.git c:\janban

REM import my prefered Outlook settings
regedit /s c:\vagrant\outlook.settings.reg

REM just in case this service is still set to delayed
sc config "WinRM" start=auto
