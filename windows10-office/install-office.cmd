choco install -y git office365business
regedit /s c:\vagrant\outlook.settings.reg
"c:\Program Files\Git\bin\git.exe" clone https://github.com/janvv/janban.git c:\janban
"C:\Program Files\Common Files\Microsoft Shared\ClickToRun\OfficeC2RClient.exe" /update user updatepromptuser=false forceappshutdown=true displaylevel=true

