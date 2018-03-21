# Vagrant
I have been playing around with Packer and Vagrant to automate the deployment of my virtual machines for development. The most annoying things I ran into are the extreme slowness of exporting a virtual machine to an OVF appliance, and the fact that it is a lot of work to make the process of making machines completely unattended.
So in the end I decided to include some manual steps to save time and to have more control over what happens when a step in the process fails for some reason.

# Boxes

## Base Windows 10 Box
