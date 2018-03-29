set starttime=%time%
rmdir /s /q .\output
packer build packer.json 
echo start time was: %starttime%
echo end time is   : %time%
