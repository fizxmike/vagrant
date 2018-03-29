$ErrorActionPreference="Stop"

# Install Chocolatey
$env:chocolateyUseWindowsCompression = 'false'
Invoke-WebRequest -Uri 'https://chocolatey.org/install.ps1' -UseBasicParsing | Invoke-Expression

# Install basic tools
choco install -y 7zip GoogleChrome foxitreader flashplayerplugin notepadplusplus

# Install basic development tools
choco install -y git poshgit jdk8 nodejs visualstudiocode winscp sql-server-management-studio

# install SqlServer Management Studio
choco feature enable -n allowGlobalConfirmation
choco install -y sql-server-management-studio

# Enable Telnet Client
dism /online /Enable-Feature /FeatureName:TelnetClient /NoRestart

# Disable Windows Media Player
dism /online /Disable-Feature /FeatureName:WindowsMediaPlayer /NoRestart

# Install Visual Studio 2017 Enterprise
Write-Host "Installing Visual Studio.."
\\VBOXSVR\vs2017setup\vs_setup.exe --includeRecommended --includeOptional --passive --norestart --wait `
 --add Microsoft.VisualStudio.Workload.CoreEditor `
 --add Microsoft.VisualStudio.Workload.Azure `
 --add Microsoft.VisualStudio.Workload.Data `
 --add Microsoft.VisualStudio.Workload.ManagedDesktop `
 --add Microsoft.VisualStudio.Workload.NetCoreTools `
 --add Microsoft.VisualStudio.Workload.NetWeb `
 --add Microsoft.VisualStudio.Workload.Office `
 --add Microsoft.VisualStudio.Workload.VisualStudioExtension `
 --add Component.GitHub.VisualStudio `
 --add Microsoft.VisualStudio.Component.LinqToSql | Out-Null
