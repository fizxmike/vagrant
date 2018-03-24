# Base Windows 10 Box
The base windows 10 box has:
- The VirtualBox Guest Additions installed
- Remote Desktop enabled in the firewall
- Some basic tooling like 7zip, Notepad++, etc

## Prerequisites: Windows ISO file
You have to have your own ISO file for Windows 10, with your own product key, obviously. Copy it to the windows10-base folder and rename it to windows10.iso. Do not forget to change the iso_checksum variables in the packer.json file accordingly. If you do not have the checksum value, then generate it by a tool like [Raymond Lin's generator](https://raylin.wordpress.com/downloads/md5-sha-1-checksum-utility/)

## Building the box
The box can be built by running the win10.bat batch file.
This batch first removes the output folder if it already exists.
Then it builds the box by running the Packer definition in packer.json.
It runs a bunch of powershell scripts to install basic tools and to stop a lot of services that cause disk writes.






