# VMX Prep

* Starting with VMWare Workstation
* Downloaded Most Recent Windows 2016 Server
* Enabled NestedVM/HyperV Passthrough (check boxes under settings>Hardware>Processors> "Virtualize Intel" and "CPU Perf Counters")
* Installed winrm using [winrm.ps1](winrm.ps1)
  * (you are welcome to try to figure out how to make the proper Autounattended.xml file - but how to enable VMWare hyperv passthrough?)
* Installed all windows updates updates
* Installed Docker-For-Windows

# Build
* Shutdown the VM above
* Set path to above vmx_file in packer.json
* run build.bat from command line
  * currently debug mode is set, but you can probably remove that flag
