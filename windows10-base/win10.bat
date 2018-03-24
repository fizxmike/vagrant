set starttime=%time%
rmdir /s /q .\output
packer build packer.json
vagrant box add windows10.box --name windows10 --force --clean
echo start time was: %starttime%
echo end time is   : %time%




