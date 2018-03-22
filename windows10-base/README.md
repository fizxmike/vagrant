# Base Windows 10 Box
The base windows 10 box has:
- The VirtualBox Guest Additions installed
- Remote Desktop enabled in the firewall
- All Windows Updates installed
- Some basic tooling like 7zip, Notepad++, etc

## Prerequisites: Windows ISO file
You have to have your own ISO file for Windows 10, with your own product key, obviously. Copy it to the windows10-base folder and rename it to windows10.iso. Do not forget to change the iso_checksum variables in the packer.json file accordingly.

## Building the box
**Be aware that building this base box is a time-consuming process. It takes me an entire evening**

Making the machine is a multi-step process. First setting up Windows and some settings, followed by a manual Windows Updates cycle. And finally running a few scripts to tweak the machine for optimal use as a virtual machine.

The first step is done by opening a command shell or powershell in the windows10-base folder. Then run the Packer build:
```
packer build packer.json
```

I have tested several options to automate the Windows Updates. My experience is that they sometimes work really well, but other times I got stuck in reboot loops or waiting eternally for a pending reboot. So this can better be done as a manual step. 
- Wait until the packer build is ready. If it is successful you'll see a new folder 'output\win10' with two files in it: an ovf file and a vmdk file.
- Open the VirtualBox application.
- Choose Import Appliance in the File menu and select the just created ovf file.
- Start the new win10 machine.
- Do the Windows Updates manually as you would do on your local machine, and repeat checking updates until no updates are available any more. This can take a loooong time, depending on how outdated your ISO file is. Just be patient, reboot the system a few times, until the Windows Update screen says that your device is up to date.

The last steps are important if you want to limit the disk writes to your virtual hard disk. This is especially useful if you are planning to use linked clones.
Open a powershell prompt as administrator and run `.\windows\temp\minimize-disk-writes.ps1` (this file has been copied to the machine by the Packer build)
Read the script carefully before running it and taylor to your own needs. I might disable services that you prefer to leave enabled.

Finally clean up and defragment the disk before packaging. This is recommended to do on each virtual machine before create the Vagrant box. 
This powershell script has also been copied to the windows\temp folder: `.windows\temp\clean-and-defrag.ps1`.
This script runs about 30 to 45 minutes (on my machine).

Now you can create a vagrant box from this virtual machine by typing: `vagrant package --output win10.box --base win10` on your host machine. The VM will be shut down, and a win10.box file will be created in your local folder.
Add this box to your local vagrant repository with `vagrant box add windows10 win10.box`.

You can clean up after you by deleting the win10 VirtualBox machine and the output folder:
```
vboxmanage unregistervm win10 --delete
rmdir /s /q output
del win10.box
```






