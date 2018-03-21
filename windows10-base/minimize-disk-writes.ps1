$ErrorActionPreference="Stop"

Write-Output "Disabling disk defragmentation job"
If ((Get-ScheduledTask -TaskName 'ScheduledDefrag').State -eq 'Ready') {
    Disable-ScheduledTask -TaskName 'ScheduledDefrag' -TaskPath '\Microsoft\Windows\Defrag'
}

Write-Output "Disabling Diagnostics Policy Service"
Set-Service -Name "DPS" -StartupType disabled

Write-Output "Disabling Registry Backups"
schtasks /change /tn "microsoft\windows\Registry\RegIdleBackup" /disable

Write-Output "Disabling System Restore"
Disable-ComputerRestore -Drive $env:SystemDrive 
Set-ItemProperty -Path "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\SystemRestore" -Name "DisableSR" -Value 1

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

Write-Output "Switching Hibernation off"
powercfg /hibernate off

Write-Output "Disabling ngen scheduled task"
$tasks = @(
    "\Microsoft\Windows\.NET Framework\.NET Framework NGEN v4.0.30319"
    "\Microsoft\Windows\.NET Framework\.NET Framework NGEN v4.0.30319 64"
    "\Microsoft\Windows\.NET Framework\.NET Framework NGEN v4.0.30319 64 Critical"
    "\Microsoft\Windows\.NET Framework\.NET Framework NGEN v4.0.30319 Critical"
    )

foreach ($task in $tasks) {
    $parts = $task.split('\')
    $name = $parts[-1]
    $path = $parts[0..($parts.length-2)] -join '\'
    Disable-ScheduledTask -TaskName "$name" -TaskPath "$path" -ErrorAction SilentlyContinue
    }

# running ngen one time for all .net executables
Write-Output "Running ngen.exe for all .net executables"
. c:\Windows\Microsoft.NET\Framework64\v4.0.30319\ngen.exe executeQueuedItems | out-null
