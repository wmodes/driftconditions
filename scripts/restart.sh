#!/bin/bash

# Just to be sure, let's make sure all current modules are installed
cd AdminServer
npm install
cd ../MixEngine
npm install
cd ..

# Restart Caddy service
sudo systemctl restart caddy
echo "Caddy service has been restarted."

# Restart adminserver.service
sudo systemctl restart adminserver.service
echo "AdminServer service has been restarted."

# Restart mixengine.service
sudo systemctl restart mixengine.service
echo "MixEngine service has been restarted."

# Restart icecast
sudo systemctl restart icecast2
echo "Icecast service has been restarted."

# Restart liquidsoap
sudo systemctl restart liquidsoap
echo "Liquidsoap service has been restarted."