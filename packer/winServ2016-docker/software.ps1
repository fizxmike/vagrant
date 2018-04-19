$ErrorActionPreference="Stop"

# Enable Telnet Client
dism /online /Enable-Feature /FeatureName:TelnetClient /NoRestart

# Disable Windows Media Player
dism /online /Disable-Feature /FeatureName:WindowsMediaPlayer /NoRestart

# Install visual studio 2017 cummunity
Write-Host "Installing Visual Studio... (this will take a long time and will provide no feedback, ironic really)"
[system.io.directory]::CreateDirectory("C:\temp")
Invoke-Webrequest "https://download.visualstudio.microsoft.com/download/pr/12043557/045b56eb413191d03850ecc425172a7d/vs_Community.exe" -OutFile c:\temp\vs_Community.exe
c:\temp\vs_Community.exe --includeRecommended --includeOptional --passive --norestart --wait `
 --add Microsoft.VisualStudio.Workload.CoreEditor `
 --add Microsoft.VisualStudio.Workload.NetCoreTools `
 --add Microsoft.VisualStudio.Workload.NetWeb `
 --add Component.GitHub.VisualStudio `
 --add Microsoft.VisualStudio.Workload.Azure `
 --add Microsoft.VisualStudio.Component.LinqToSql | Out-Null

 # also, Installing Azure workload kills powershell processes !?
# https://github.com/jberezanski/ChocolateyPackages/issues/35#issuecomment-370054633
