$ErrorActionPreference="Stop"

Write-Output "Disabling disk defragmentation job"
If ((Get-ScheduledTask -TaskName 'ScheduledDefrag').State -eq 'Ready') {
    Disable-ScheduledTask -TaskName 'ScheduledDefrag' -TaskPath '\Microsoft\Windows\Defrag'
}

Write-Output "Disabling Diagnostics Policy Service"
Set-Service -Name "DPS" -StartupType disabled

Write-Output "Disabling Registry Backups"
schtasks /change /tn "microsoft\windows\Registry\RegIdleBackup" /disable

# Not supported on windows server
# Write-Output "Disabling System Restore"
# Disable-ComputerRestore -Drive $env:SystemDrive 
# Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\SystemRestore" -Name "DisableSR" -Value 1

Write-Output "Disabling Automatic Windows Update"
Stop-Service -Name "wuauserv" -Force
Set-Service -Name "wuauserv" -StartupType disabled

$WindowsUpdatePath = "HKLM:SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\"
$AutoUpdatePath = "HKLM:SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU"

If(Test-Path -Path $WindowsUpdatePath) {
    Remove-Item -Path $WindowsUpdatePath -Recurse
}

New-Item -Path $WindowsUpdatePath
New-Item -Path $AutoUpdatePath
Set-ItemProperty -Path $AutoUpdatePath -Name NoAutoUpdate -Value 1

# not supported on windows server
# Write-Output "Switching Hibernation off"
# powercfg /hibernate off

