#!/bin/bash
# Exit on error
set -e

# Disable ICU dependency for the .NET CLI run inside the build container
export DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=1

# Download the .NET SDK installation script if not present
if [ ! -f ./dotnet-install.sh ]; then
  curl -sSL https://dot.net/v1/dotnet-install.sh > dotnet-install.sh
  chmod +x dotnet-install.sh
fi

# Install .NET SDK 8.0 locally
./dotnet-install.sh -c 8.0 -InstallDir ./dotnet
chmod -R +x ./dotnet/   # REQUIRED: Cloudflare CI strips execute bits from all binaries

# Clean old output to prevent stale files
rm -rf output dist

# Publish the application using the local SDK installation without runtime relinking
./dotnet/dotnet publish src/BrowserVector.App/BrowserVector.App.csproj -c Release -o output -p:UsingBrowserRuntimeWorkload=false
