REM Show file extensions
reg add HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced /v HideFileExt /t REG_DWORD /d 0 /f

REM Set Chrome as default browser
c:\vagrant\SetDefaultBrowser.exe chrome

REM activate Windows
start cmd.exe /k slmgr.vbs /ipk %LICENSEKEY%
REM start cmd.exe /k slmgr.vbs /ato

REM Disable UAC
reg add HKLM\Software\Microsoft\Windows\CurrentVersion\policies\system /v EnableLUA /t REG_DWORD /d 0 /f

REM Enable Telnet Client
dism /online /Enable-Feature /FeatureName:TelnetClient /NoRestart

REM Disable Windows Media Player
dism /online /Disable-Feature /FeatureName:WindowsMediaPlayer /NoRestart

REM just in case this service is still set to delayed
sc config "WinRM" start=auto

REM --layout c:\xxxx --all --clean