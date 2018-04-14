set starttime=%time%
rmdir /s /q .\output
packer build -debug -on-error=ask packer.json
echo start time was: %starttime%
echo end time is   : %time%
