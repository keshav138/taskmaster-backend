1. Virtualization software that makes developing and deploying software easy. Packages application with all the necessary dependencies, configurations, system tools and runtime environment into a single container.
2. Allows all developers working on a single project on different os, to only download one image that works on all systems.
3. Docker uses a hypervisor layer with a lightweight linux distro, to provide the required linux kernel, which most popular services are based on.
4. Docker desktop includes
	1. Docker Engine - A server with long running process daemon process called 'dockerd'. Manages engine and containers
	2. Daemon process - A daemon process is a long-running, non-interactive background process in Unix-like operating systems that operates without a controlling terminal, typically handling system-level tasks. Starting at boot and running until shutdown, daemon processes often end in 'd'.
	3. Docker CLI - to execute docker commands
---
### Docker Image
Like a zip or tarfile or jar file.
Executable Application artifact.
Contains the app source code, but also the complete environment configurations.
Add env variables, create directory files etc.

### Docker Container
Actually starts the application.
The running instance of the image.
We can run multiple instances/container of the same image for increased performance.

### Docker Registry / Docker Hub
Ready docker images in a storage that are pre-built by the service providers like redis, mongoDB, etc along with additional images from the docker community.

### Docker Commands
[[Docker Commands]]
[[Docker Image and Docker Compose]]

Docker Registry - A service providing storage, collection of repositories
Docker Repository - Collection of related images with same name but different versions.... 


---
### a. Docker Vs Virtual Machine
While both **Docker** and **Virtual Machines (VMs)** allow you to run isolated environments, they do so at completely different levels of the "computer stack."

The simplest way to think about it: **A VM simulates hardware, while Docker simulates the operating system.**

A virtual machine imitates the os kernel as well as the os application layer, whereas docker only imitates the os application layer, along with a few applications on top.

---

## 1. Virtual Machines: The "Whole House"

A VM is a complete, heavy-duty imitation of a physical computer. When you run a VM (using VMware or VirtualBox):

- **The Hypervisor:** This is the software that sits on your laptop and "slices" your hardware (CPU, RAM, Disk) into chunks.
    
- **The Guest OS:** Each VM must install a **full operating system**. If you want to run a tiny Python script in a VM, you have to install all 2GB+ of Linux or Windows first.
    
- **Resources:** If you give a VM 4GB of RAM, that RAM is "locked" to that VM, even if the VM is just sitting idle.
    

---

## 2. Docker Containers: The "Apartment"

Docker doesn't try to simulate hardware. Instead, it "borrows" the **Kernel** (the brain) of the Host OS you are already running.

- **The Docker Engine:** Instead of a hypervisor, the Docker Engine manages the containers.
    
- **Shared Kernel:** All containers on your machine share the same Linux kernel. They don't need to boot up a whole OS; they just start the specific files and libraries needed for your app.
    
- **Efficiency:** If a container isn't doing anything, it consumes almost zero RAM. You can run dozens of containers on a laptop that would struggle to run two VMs.
    

---

## 3. Head-to-Head Comparison

|**Feature**|**Virtual Machines (VM)**|**Docker Containers**|
|---|---|---|
|**Isolation**|Fully isolated (Hardest to hack)|Process isolated (Very secure, but shares kernel)|
|**OS**|Each VM has its own full OS|All containers share the Host OS|
|**Size**|Gigabytes (GB)|Megabytes (MB)|
|**Boot Time**|Minutes (needs to "boot up")|Seconds (just starts a process)|
|**Performance**|Slower (due to hardware emulation)|Near-native speed|

---
