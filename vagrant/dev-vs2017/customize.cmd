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

REM install basic development tools
choco install -y git poshgit jdk8 nodejs visualstudiocode winscp sql-server-management-studio

REM install SqlServer Management Studio
choco feature enable -n allowGlobalConfirmation
choco install -y sql-server-management-studio

REM install Visual Studio 2017 Enterprise (do NOT use the --quiet option here, otherwise the setup will fail)
c:\vs2017setup\vs_setup.exe --includeRecommended --includeOptional --passive --norestart --wait ^
 --add Microsoft.VisualStudio.Workload.CoreEditor ^
 --add Microsoft.VisualStudio.Workload.Azure ^
 --add Microsoft.VisualStudio.Workload.Data ^
 --add Microsoft.VisualStudio.Workload.ManagedDesktop ^
 --add Microsoft.VisualStudio.Workload.NetCoreTools ^
 --add Microsoft.VisualStudio.Workload.NetWeb ^
 --add Microsoft.VisualStudio.Workload.Office ^
 --add Microsoft.VisualStudio.Workload.VisualStudioExtension ^
 --add Component.GitHub.VisualStudio ^
 --add Microsoft.VisualStudio.Component.LinqToSql

REM --layout c:\xxxx --all --clean