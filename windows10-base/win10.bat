set starttime=%time%
set /P token=Enter VagrantCloud token:
set ACCESSKEY=%token%
rmdir /s /q .\output
packer build packer.json 
rem vagrant box add windows10.box --name windows10 --force --clean
echo start time was: %starttime%
echo end time is   : %time%
