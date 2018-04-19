set starttime=%time%
rmdir /s /q .\output
REM use this for debug: -debug
packer build -on-error=ask packer.json
echo start time was: %starttime%
echo end time is   : %time%
