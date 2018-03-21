# Vagrant
I have been playing around with Packer and Vagrant to automate the deployment of my virtual machines for development. The most annoying things I ran into are the extreme slowness of exporting a virtual machine to an OVF appliance, and the fact that it is a lot of work to make the process of making machines completely unattended.
So in the end I decided to include some manual steps to save time and to have more control over what happens when a step in the process fails for some reason.

## Prerequisites
### Packer, Vagrant and VirtualBox
I assume Packer, Vagrant and VirtualBox have already been installed.
That can easily be done by Chocolatey:
```
choco install virtualbox vagrant packer -y
```
### Windows ISO file
You have to have your own ISO file for Windows 10, with your own product key, obviously. Copy it to the windows10-base folder and rename it to windows10.iso. Do not forget to change the iso_checksum variables in the packer.json file accordingly.

# Boxes
## Base Windows 10 Box
The base windows 10 box has:
- The VirtualBox Guest Additions installed
- Remote Desktop enabled in the firewall

Build the virtual machine by opening a command shell or powershell in the windows10-base folder. Then run the Packer build:
```
packer build packer.json
```

I have tested several options to automate the Windows Updates. My experience is that they sometimes work really well, but other times I got stuck in reboot loops or waiting eternally for a pending reboot. So this can better be done as a manual step. 
- Wait until the packer build is ready. If it is successful you'll see a new folder 'output\win10' with two files in it: an ovf file and a vmdk file.
- Open the VirtualBox application.
- Choose File/Import Appliance and select the just created ovf file.
- Start the new win10 machine and log in as vagrant/vagrant.
- Do the Windows Updates manually as you would do on your local machine, and continue until no updates are available any more. This can take a long time, depending on how outdated your ISO file is.


