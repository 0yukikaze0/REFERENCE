# -*- mode: ruby -*-
# vi: set ft=ruby :

# This vagrantfile creates a VM with the development environment
# configured and ready to go.
#
# The setup script (env var $script) in this file installs docker.
# This is not in the setup.sh file because the docker install needs
# to be secure when running on a real linux machine.
# The docker environment that is installed by this script is not secure,
# it depends on the host being secure.
#
# At the end of the setup script in this file, a call is made
# to run setup.sh to create the developer environment.

# This is the mount point for the sync_folders of the source
SRCMOUNT = "/hyperledger"
LOCALDEV = "/local-dev"

$script = <<SCRIPT
set -x

export DOCKER_STORAGE_BACKEND="#{ENV['DOCKER_STORAGE_BACKEND']}"

cd #{SRCMOUNT}/devenv
./setup.sh

SCRIPT

baseimage_release = File.read '../.baseimage-release'

Vagrant.require_version ">= 1.7.4"
Vagrant.configure('2') do |config|
  config.vm.define "fabric" do |fabric|
    fabric.vm.box = "hyperledger/fabric-baseimage"
    fabric.vm.box_version = ENV['USE_LOCAL_BASEIMAGE'] ? "0": baseimage_release # Vagrant does not support versioning local images, the local version is always implicitly version 0

    fabric.vm.network "private_network", ip: "10.10.10.100"

    fabric.vm.network :forwarded_port, guest: 7050, host: 7050 # Openchain REST services
    fabric.vm.network :forwarded_port, guest: 7051, host: 7051 # Openchain gRPC services
    fabric.vm.network :forwarded_port, guest: 7054, host: 7054 # Membership service
    fabric.vm.network :forwarded_port, guest: 7053, host: 7053 # GRPCCient gRPC services

    fabric.vm.synced_folder "..", "#{SRCMOUNT}"
    fabric.vm.synced_folder "..", "/opt/gopath/src/github.com/hyperledger/fabric"
    fabric.vm.synced_folder ENV.fetch('LOCALDEVDIR', ".."), "#{LOCALDEV}"

    fabric.vm.provider :virtualbox do |vb|
      vb.name = "hyperledger_fab"
      vb.customize ['modifyvm', :id, '--memory', '4096']
      vb.cpus = 2

      storage_backend = ENV['DOCKER_STORAGE_BACKEND']
      case storage_backend
      when nil,"","aufs","AUFS"
        # No extra work to be done
      when "btrfs","BTRFS"
        # Add a second disk for the btrfs volume
        IO.popen("VBoxManage list systemproperties") { |f|

          success = false
          while line = f.gets do
            # Find the directory where the machine images are stored
            machine_folder = line.sub(/^Default machine folder:\s*/,"")

            if line != machine_folder
              btrfs_disk = File.join(machine_folder, vb.name, 'btrfs.vdi')

              unless File.exist?(btrfs_disk)
                # Create the disk if it doesn't already exist
                vb.customize ['createhd', '--filename', btrfs_disk, '--format', 'VDI', '--size', 20 * 1024]
              end

              # Add the disk to the VM
              vb.customize ['storageattach', :id, '--storagectl', 'SATA Controller', '--port', 1, '--device', 0, '--type', 'hdd', '--medium', btrfs_disk]
              success = true

              break
            end
          end
          raise Vagrant::Errors::VagrantError.new, "Could not provision btrfs disk" if !success
        }
      else
        raise Vagrant::Errors::VagrantError.new, "Unknown storage backend type: #{storage_backend}"
      end
    end
  end
  config.vm.provision :shell, inline: $script

  config.vm.define "hfc" do |hfc|
    hfc.vm.box = "hyperledger/fabric-baseimage"
    hfc.vm.box_version = ENV['USE_LOCAL_BASEIMAGE'] ? "0": baseimage_release # Vagrant does not support versioning local images, the local version is always implicitly version 0

    hfc.vm.network "private_network", ip: "10.10.10.200"

    hfc.vm.network :forwarded_port, guest: 7050, host: 7060 # Openchain REST services
    hfc.vm.network :forwarded_port, guest: 7051, host: 7061 # Openchain gRPC services
    hfc.vm.network :forwarded_port, guest: 7054, host: 7064 # Membership service
    hfc.vm.network :forwarded_port, guest: 7053, host: 7063 # GRPCCient gRPC services

    hfc.vm.synced_folder "..", "#{SRCMOUNT}"
    hfc.vm.synced_folder "..", "/opt/gopath/src/github.com/hyperledger/fabric"
    hfc.vm.synced_folder ENV.fetch('LOCALDEVDIR', ".."), "#{LOCALDEV}"

    hfc.vm.provider :virtualbox do |vb|
      vb.name = "hfc"
      vb.customize ['modifyvm', :id, '--memory', '4096']
      vb.cpus = 2

      storage_backend = ENV['DOCKER_STORAGE_BACKEND']
      case storage_backend
      when nil,"","aufs","AUFS"
        # No extra work to be done
      when "btrfs","BTRFS"
        # Add a second disk for the btrfs volume
        IO.popen("VBoxManage list systemproperties") { |f|

          success = false
          while line = f.gets do
            # Find the directory where the machine images are stored
            machine_folder = line.sub(/^Default machine folder:\s*/,"")

            if line != machine_folder
              btrfs_disk = File.join(machine_folder, vb.name, 'btrfs.vdi')

              unless File.exist?(btrfs_disk)
                # Create the disk if it doesn't already exist
                vb.customize ['createhd', '--filename', btrfs_disk, '--format', 'VDI', '--size', 20 * 1024]
              end

              # Add the disk to the VM
              vb.customize ['storageattach', :id, '--storagectl', 'SATA Controller', '--port', 1, '--device', 0, '--type', 'hdd', '--medium', btrfs_disk]
              success = true

              break
            end
          end
          raise Vagrant::Errors::VagrantError.new, "Could not provision btrfs disk" if !success
        }
      else
        raise Vagrant::Errors::VagrantError.new, "Unknown storage backend type: #{storage_backend}"
      end
    end
  config.vm.provision :shell, inline: $script
  end
end
