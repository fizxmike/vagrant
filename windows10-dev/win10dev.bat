set starttime=%time%
vagrant destroy --force
vagrant up
@echo off
echo "Now install Visual Studio manually"
echo "Press any key when ready..."
pause
vagrant package --output win10dev.box
rem vagrant box add win10dev.box --name win10dev --force --clean
vagrant destroy --force
echo start time was: %starttime%
echo end time is   : %time%
