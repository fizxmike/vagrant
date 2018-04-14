big thanks to these guys: https://github.com/rgl/windows-2016-vagrant

# VMX Prep

* Downloaded Most Recent Windows 2006 Server
* Enabled NestedVM/HyperV Passthrough (check boxes under settings>Hardware>Processors>Virtualize Intel and CPU Perf Counters)
* Installed all updates
* Installed winrm using ../scripts/winrm.ps1
  * (you are welcome to try to figure out how to make the proper Autounattended.xml file - but how to enable VMWare hyperv passthrough?)
* Installed Docker-For-Windows

# Setup
* Set path to above vmx file in packer.json
* run build.bat from command line