$ErrorActionPreference="Stop"

# Install Chocolatey
$env:chocolateyUseWindowsCompression = 'false'
Invoke-WebRequest -Uri 'https://chocolatey.org/install.ps1' -UseBasicParsing | Invoke-Expression

# Install basic tools
choco install -y 7zip GoogleChrome foxitreader flashplayerplugin notepadplusplus

# Install Office 365
choco install -y office365business
