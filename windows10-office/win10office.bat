set starttime=%time%
vagrant destroy --force
vagrant up
vagrant package --output win10office.box
vagrant box add win10office.box --name win10office --force --clean
vagrant destroy --force
echo start time was: %starttime%
echo end time is   : %time%
