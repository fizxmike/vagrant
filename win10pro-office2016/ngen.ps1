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
. c:\Windows\Microsoft.NET\Framework64\v4.0.30319\ngen.exe executeQueuedItems
