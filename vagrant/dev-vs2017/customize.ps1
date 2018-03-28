# Disable UAC
New-ItemProperty -Path HKLM:Software\Microsoft\Windows\CurrentVersion\policies\system -Name EnableLUA -PropertyType DWord -Value 0 -Force

# Enable Telnet Client
dism /online /Enable-Feature /FeatureName:TelnetClient /NoRestart

# Disable Windows Media Player
dism /online /Disable-Feature /FeatureName:WindowsMediaPlayer /NoRestart

# Show file extensions
reg add HKCU\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced /v HideFileExt /t REG_DWORD /d 0 /f

# Set Chrome as default browser
c:\windows\temp\SetDefaultBrowser.exe chrome
