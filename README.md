# Vagrant
I have been playing around with Packer and Vagrant to automate the deployment of my virtual machines for development. The most annoying things I ran into are the extreme slowness of exporting a virtual machine to an OVF appliance, and the fact that it is a lot of work to make the process of making machines completely unattended.
So in the end I decided to include some manual steps to save time and to have more control over what happens when a step in the process fails for some reason.

I chose to make a base Windows box which is the starting point for creating other boxes. Installing Windows and going through the Windows Update cycle can take a lot of time - several hours if you are 'lucky' - so by having a base Windows box you do not need to do that for each other box again. It might be good, though, to update the base box from time to time, every two or three months.
I try to make each box as static as possible by disabling a lot of scheduled tasks that have a lot of disk i/o.

## Prerequisites
### Packer, Vagrant and VirtualBox
I assume Packer, Vagrant and VirtualBox have already been installed.
That can easily be done by Chocolatey:
```
choco install virtualbox vagrant packer -y
```
# Boxes
This repository has the instructions to build several Windows boxes. Each folder has its own README file describing the steps you need to do make the box.

- *windows10-base:* A bare Windows machine with all updates. The ideal starting point for building customized machines. 
