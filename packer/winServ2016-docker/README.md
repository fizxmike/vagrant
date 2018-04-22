# VMX Prep
You are welcome to try to build from ISO and use the proper Autounattended.xml file [these peeps got one](https://github.com/rgl/windows-2016-vagrant). However, I didn't see how to enable VMWare NestedVM support with the [vmware builder](https://www.packer.io/docs/builders/vmware-iso.html). So we proceed manually using the steps below:

* Starting with VMWare Workstation
* Downloaded Most Recent Windows 2016 Server
* Enabled NestedVM (HyperV) Guest Support
  * In VMWare Workstation 14, check boxes under: Settings > Hardware > Processors > "Virtualize..."
  * [Reference](https://communities.vmware.com/thread/498837)
* Installed [Docker-For-Windows](https://docs.docker.com/docker-for-windows/install/)
* Installed all windows updates

# Build
* Shutdown the VM above
* Set path to above vmx_file in packer.json
* run build.bat from command line
  * currently debug mode is set, but you can probably remove that flag
